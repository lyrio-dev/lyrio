import { forwardRef, Inject } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from "@nestjs/websockets";

import { Server, Socket } from "socket.io"; // eslint-disable-line import/no-extraneous-dependencies
import SocketIOParser from "socket.io-msgpack-parser";
import { Redis } from "ioredis";

import { logger } from "@/logger";
import { AlternativeUrlFor, FileService } from "@/file/file.service";
import { SubmissionProgress } from "@/submission/submission-progress.interface";
import { ConfigService } from "@/config/config.service";
import { EventReportService, EventReportType } from "@/event-report/event-report.service";
import { RedisService } from "@/redis/redis.service";
import { LockService } from "@/redis/lock.service";

import { JudgeClientService } from "./judge-client.service";
import { JudgeClientEntity } from "./judge-client.entity";
import { JudgeQueueService, JudgeTask, JudgeTaskMeta, JudgeTaskExtraInfo } from "./judge-queue.service";
import { JudgeClientSystemInfo } from "./judge-client-system-info.interface";

interface JudgeClientState {
  judgeClient: JudgeClientEntity;
  pendingTasks: Set<JudgeTask<JudgeTaskExtraInfo>>;
}

interface SubmissionProgressMessage {
  taskMeta: JudgeTaskMeta;
  progress: SubmissionProgress;
}

// If a judge client is disconnected temporarily (within 1 minute), don't report it with event reporter
const REDIS_KEY_JUDGE_CLIENT_TEMPORARILY_DISCONNENTED = "judge-client-temporarily-disconnected:%d";
const JUDGE_CLIENT_TEMPORARILY_DISCONNENTED_MAX_TIME = 60;

const REDIS_LOCK_JUDGE_CLIENT_CONNECT_DISCONNECT = "judge-client-connect-disconnect:%d";

const REDIS_CHANNEL_CANCEL_TASK = "cancel-task";

@WebSocketGateway({
  maxHttpBufferSize: 1e9,
  namespace: "judge",
  path: "/api/socket",
  transports: ["websocket"],
  parser: SocketIOParser
})
export class JudgeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private mapSessionIdToJudgeClient: Map<string, JudgeClientState> = new Map();

  private mapTaskIdToSocket: Map<string, Socket> = new Map();

  private redis: Redis;

  // To subscribe the "cancel task" event
  private redisForSubscribe: Redis;

  constructor(
    private readonly judgeClientService: JudgeClientService,
    private readonly judgeQueueService: JudgeQueueService,
    private readonly fileService: FileService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => EventReportService))
    private readonly eventReportService: EventReportService,
    private readonly redisService: RedisService,
    private readonly lockService: LockService
  ) {
    this.redis = this.redisService.getClient();

    this.redisForSubscribe = this.redisService.getClient();

    this.redisForSubscribe.on("message", (channel: string, message: string) => {
      this.onCancelTask(message);
    });
    this.redisForSubscribe.subscribe(REDIS_CHANNEL_CANCEL_TASK);
  }

  // Send the cancel task operation to ALL nodes
  cancelTask(taskId: string) {
    this.redis.publish(REDIS_CHANNEL_CANCEL_TASK, taskId);
  }

  onCancelTask(taskId: string): void {
    const client = this.mapTaskIdToSocket.get(taskId);
    if (!client) return;

    client.emit("cancel", taskId);
  }

  private async checkConnection(client: Socket): Promise<boolean> {
    if (!client.connected) return false;

    const { judgeClient } = this.mapSessionIdToJudgeClient.get(client.id);
    if (!(await this.judgeClientService.checkJudgeClientSession(judgeClient, client.id))) {
      client.disconnect(true);
      return false;
    }
    return true;
  }

  async handleConnection(client: Socket): Promise<void> {
    const key = (client.handshake.query.key as string).split(" ").pop();
    const judgeClient = await this.judgeClientService.findJudgeClientByKey(key);

    if (!judgeClient) {
      logger.verbose(`Client ${client.id} connected with invalid key`);
      client.emit("authenticationFailed");
      // Delay the disconnection to make the authenticationFailed event able to be sent to the client
      setImmediate(() => client.disconnect(true));
      return;
    }

    // Maybe the socket "disconnect" event is emitted before the query finished
    if (!client.connected) return;

    await this.lockService.lock(REDIS_LOCK_JUDGE_CLIENT_CONNECT_DISCONNECT.format(judgeClient.id), async () => {
      await this.judgeClientService.setJudgeClientOnlineSessionId(judgeClient, client.id);

      if (!client.connected) {
        await this.judgeClientService.disconnectJudgeClient(judgeClient);
      }

      this.mapSessionIdToJudgeClient.set(client.id, {
        judgeClient,
        pendingTasks: new Set()
      });
    });

    if (!client.connected) {
      return;
    }

    // Now we are ready for consuming task
    client.emit("ready", judgeClient.name, this.configService.config.judge);

    const message = `Judge client ${client.id} (${judgeClient.name}) connected from ${client.handshake.address}.`;
    logger.log(message);
    if ((await this.redis.del(REDIS_KEY_JUDGE_CLIENT_TEMPORARILY_DISCONNENTED.format(judgeClient.id))) === 0) {
      // If the judge client is NOT temporarily disconnected, report it with event-reporter
      this.eventReportService.report({
        type: EventReportType.Success,
        message
      });
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      logger.log(`Judge client ${client.id} disconnected before initialized, ignoring`);
      return; // Initialization has not been complated
    }

    const message = `Judge client ${client.id} (${state.judgeClient.name}) disconnected.`;
    logger.log(message);

    this.mapSessionIdToJudgeClient.delete(client.id);

    // Another "connect" may be fired before the disconnect event
    // So directly call "disconnectJudgeClient" will disconnect the newly connected client
    await this.lockService.lock(REDIS_LOCK_JUDGE_CLIENT_CONNECT_DISCONNECT.format(state.judgeClient.id), async () => {
      // Ensure if this session holds the client
      if (await this.judgeClientService.checkJudgeClientSession(state.judgeClient, client.id))
        await this.judgeClientService.disconnectJudgeClient(state.judgeClient);
    });

    if (state.pendingTasks.size !== 0) {
      logger.log(
        `Repushing ${state.pendingTasks.size} tasks consumed by judge client ${client.id} (${state.judgeClient.name}).`
      );
      // Push the pending tasks back to the queue
      await Promise.all(
        Array.from(state.pendingTasks.values()).map(async task => {
          this.mapTaskIdToSocket.delete(task.taskId);
          await this.judgeQueueService.pushTask(task.taskId, task.type, task.priority, true);
        })
      );
    }

    // Report event
    await this.redis.setex(
      REDIS_KEY_JUDGE_CLIENT_TEMPORARILY_DISCONNENTED.format(state.judgeClient.id),
      JUDGE_CLIENT_TEMPORARILY_DISCONNENTED_MAX_TIME,
      "1"
    );
    setTimeout(async () => {
      if (!(await this.judgeClientService.isJudgeClientOnline(state.judgeClient))) {
        this.eventReportService.report({
          type: EventReportType.Warning,
          message
        });
      }
    }, JUDGE_CLIENT_TEMPORARILY_DISCONNENTED_MAX_TIME * 1000);
  }

  @SubscribeMessage("systemInfo")
  async onSystemInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() systemInfo: JudgeClientSystemInfo
  ): Promise<void> {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      logger.warn(`"systemInfo" emitted from an unknown client ${client.id}, ignoring`);
      return;
    }

    await this.judgeClientService.updateJudgeClientSystemInfo(state.judgeClient, systemInfo);
  }

  @SubscribeMessage("requestFiles")
  async onRequestFiles(@ConnectedSocket() client: Socket, @MessageBody() fileUuids: string[]): Promise<string[]> {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      logger.warn(`"requestFiles" emitted from an unknown client ${client.id}, ignoring`);
      return [];
    }

    logger.log(`Judge client ${client.id} (${state.judgeClient.name}) requested ${fileUuids.length} files`);
    return await Promise.all(
      fileUuids.map(
        async fileUuid =>
          await this.fileService.signDownloadLink({
            uuid: fileUuid,
            downloadFilename: null,
            noExpire: true,
            useAlternativeEndpointFor: AlternativeUrlFor.Judge
          })
      )
    );
  }

  @SubscribeMessage("consumeTask")
  async onConsumeTask(@ConnectedSocket() client: Socket, @MessageBody() threadId: number): Promise<void> {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      logger.warn(`"consumeTask" emitted from an unknown client ${client.id}, ignoring`);
      return;
    }

    /* eslint-disable no-await-in-loop */
    while (await this.checkConnection(client)) {
      const task = await this.judgeQueueService.consumeTask();
      if (!task) continue;

      if (!(await this.checkConnection(client))) {
        logger.verbose(
          `Consumed task for client ${client.id} (${state.judgeClient.name}), but connection became invalid, repushing task back to queue`
        );
        await this.judgeQueueService.pushTask(task.taskId, task.type, task.priority, true);
      }

      state.pendingTasks.add(task);
      this.mapTaskIdToSocket.set(task.taskId, client);
      client.emit("task", threadId, task, () => {
        logger.verbose(
          `Judge client ${client.id} (${state.judgeClient.name}) acknowledged task { taskId: ${task.taskId}, type: ${task.type} }`
        );
        state.pendingTasks.delete(task);
        this.mapTaskIdToSocket.delete(task.taskId);
      });

      return;
    }
    /* eslint-enable no-await-in-loop */
  }

  @SubscribeMessage("progress")
  async onProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: SubmissionProgressMessage
  ): Promise<void> {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      logger.warn(`"progress" emitted from an unknown client ${client.id}, ignoring`);
      return;
    }

    const notCanceled = await this.judgeQueueService.onTaskProgress(message.taskMeta, message.progress);
    if (!notCanceled) {
      logger.log(`Emitting cancel event for task ${message.taskMeta.taskId}`);
      client.emit("cancel", message.taskMeta.taskId);
    }
  }
}
