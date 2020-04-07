import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

import { JudgeClientService } from "./judge-client.service";
import { JudgeClientEntity } from "./judge-client.entity";
import { JudgeQueueService, JudgeTask, JudgeTaskMeta, JudgeTaskExtraInfo } from "./judge-queue.service";
import { JudgeClientSystemInfo } from "./judge-client-system-info.interface";
import { FileService } from "@/file/file.service";
import { SubmissionProgress } from "@/submission/submission-progress.interface";

interface JudgeClientState {
  judgeClient: JudgeClientEntity;
  pendingTasks: Set<JudgeTask<JudgeTaskExtraInfo>>;
}

interface SubmissionProgressMessage {
  taskMeta: JudgeTaskMeta;
  progress: SubmissionProgress;
}

@WebSocketGateway({ namespace: "judge", path: "/api/socket", transports: ["websocket"] })
export class JudgeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;
  private mapSessionIdToJudgeClient: Map<string, JudgeClientState> = new Map();
  private mapTaskIdToSocket: Map<string, Socket> = new Map();

  constructor(
    private readonly judgeClientService: JudgeClientService,
    private readonly judgeQueueService: JudgeQueueService,
    private readonly fileService: FileService
  ) {}

  cancelTask(taskId: string) {
    const client = this.mapTaskIdToSocket.get(taskId);
    if (!client) {
      Logger.warn(
        `JudgeGateway.cancelTask() called with a task that we can't determine its judging client socket, ignoring`
      );
      return;
    }

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

  async handleConnection(client: Socket) {
    const key = client.handshake.query["key"].split(" ").pop();
    const judgeClient = await this.judgeClientService.findJudgeClientByKey(key);

    if (!judgeClient) {
      Logger.verbose(`Client ${client.id} connected with invalid key`);
      client.emit("authenticationFailed");
      // Delay the disconnection to make the authenticationFailed event able to be sent to the client
      setImmediate(() => client.disconnect(true));
      return;
    }

    // Maybe the socket "disconnect" event is emitted before the query finished
    if (!client.connected) return;

    await this.judgeClientService.setJudgeClientOnlineSessionId(judgeClient, client.id);
    if (!client.connected) {
      await this.judgeClientService.disconnectJudgeClient(judgeClient);
    }

    this.mapSessionIdToJudgeClient.set(client.id, {
      judgeClient: judgeClient,
      pendingTasks: new Set()
    });

    // Now we are ready for consuming task
    client.emit("ready", judgeClient.name);
    Logger.log(`Judge client ${client.id} (${judgeClient.name}) initialized.`);
  }

  async handleDisconnect(client: Socket) {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      Logger.log(`Judge client ${client.id} disconnected before initialized, ignoring`);
      return; // Initialization has not been complated
    }

    Logger.log(`Judge client ${client.id} (${state.judgeClient.name}) disconnected.`);
    this.mapSessionIdToJudgeClient.delete(client.id);

    await this.judgeClientService.disconnectJudgeClient(state.judgeClient);

    if (state.pendingTasks.size === 0) return;
    Logger.log(
      `Repushing ${state.pendingTasks.size} tasks consumed by judge client ${client.id} (${state.judgeClient.name}).`
    );
    // Push the pending tasks back to the queue
    for (const task of state.pendingTasks.values()) {
      this.mapTaskIdToSocket.delete(task.taskId);
      await this.judgeQueueService.pushTask(task.taskId, task.type, task.priority, task.priorityId, true);
    }
  }

  @SubscribeMessage("systemInfo")
  async onSystemInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() systemInfo: JudgeClientSystemInfo
  ): Promise<void> {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      Logger.warn(`"systemInfo" emitted from an unknown client ${client.id}, ignoring`);
      return;
    }

    await this.judgeClientService.updateJudgeClientSystemInfo(state.judgeClient, systemInfo);
  }

  @SubscribeMessage("requestFiles")
  async onRequestFiles(@ConnectedSocket() client: Socket, @MessageBody() fileUuids: string[]): Promise<string[]> {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      Logger.warn(`"requestFiles" emitted from an unknown client ${client.id}, ignoring`);
      return;
    }

    Logger.log(`Judge client ${client.id} (${state.judgeClient.name}) requested ${fileUuids.length} files`);
    return await Promise.all(
      fileUuids.map(async fileUuid => await this.fileService.getDownloadLink(fileUuid, null, true))
    );
  }

  @SubscribeMessage("consumeTask")
  async onConsumeTask(@ConnectedSocket() client: Socket, @MessageBody() threadId: number): Promise<void> {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      Logger.warn(`"consumeTask" emitted from an unknown client ${client.id}, ignoring`);
      return;
    }

    while (await this.checkConnection(client)) {
      const task = await this.judgeQueueService.consumeTask();
      if (!task) continue;

      if (!(await this.checkConnection(client))) {
        Logger.verbose(
          `Consumed task for client ${client.id} (${state.judgeClient.name}), but connection became invalid, repushing task back to queue`
        );
        await this.judgeQueueService.pushTask(task.taskId, task.type, task.priority, task.priorityId, true);
      }

      state.pendingTasks.add(task);
      this.mapTaskIdToSocket.set(task.taskId, client);
      client.emit("task", threadId, task, () => {
        Logger.verbose(
          `Judge client ${client.id} (${state.judgeClient.name}) acknowledged task { taskId: ${task.taskId}, type: ${task.type} }`
        );
        state.pendingTasks.delete(task);
        this.mapTaskIdToSocket.delete(task.taskId);
      });

      return;
    }
  }

  @SubscribeMessage("progress")
  async onProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: SubmissionProgressMessage
  ): Promise<void> {
    const state = this.mapSessionIdToJudgeClient.get(client.id);
    if (!state) {
      Logger.warn(`"progress" emitted from an unknown client ${client.id}, ignoring`);
      return;
    }

    const notCanceled = await this.judgeQueueService.onTaskProgress(message.taskMeta, message.progress);
    if (!notCanceled) {
      Logger.log(`Emitting cancel event for task ${message.taskMeta.taskId}`);
      client.emit("cancel", message.taskMeta.taskId);
    }
  }
}
