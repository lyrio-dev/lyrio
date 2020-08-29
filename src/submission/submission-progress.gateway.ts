import { Logger, Inject, forwardRef } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import { diff } from "jsondiffpatch";

import { SubmissionProgress, SubmissionProgressType } from "./submission-progress.interface";
import { ConfigService } from "@/config/config.service";
import { SubmissionService } from "./submission.service";
import { SubmissionBasicMetaDto } from "./dto";
import { SubmissionResult } from "./submission-result.interface";
import { SubmissionStatus } from "./submission-status.enum";
import { SubmissionEventType } from "./submission-progress.service";

export enum SubmissionProgressSubscriptionType {
  Meta,
  Detail
}

export interface SubmissionProgressSubscription {
  type: SubmissionProgressSubscriptionType;
  submissionIds: number[];
}

interface SubmissionProgressMessage {
  // These properties exist if finished
  // "resultMeta" always exists while "resultDetail" only exists when the client subscribes the detail
  resultMeta?: SubmissionBasicMetaDto;
  resultDetail?: SubmissionResult;

  // These properties exist if NOT finished
  // "progressMeta" always exists while "progressDetail" only exists when the client subscribes the detail
  // null if the task is still waiting in queue
  progressMeta?: SubmissionProgressType; // status and score are not pushed to reduce server load
  progressDetail?: SubmissionProgress;
}

// TODO: This should be refactored if we add hack, custom judge, etc
//       Maybe refactor to a general "task progress"
@WebSocketGateway({ namespace: "submission-progress", path: "/api/socket", transports: ["websocket"] })
export class SubmissionProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;
  private secret: string;

  // We don't use Socket.IO rooms since we push message additionally
  // rooms: each set is created on first joins and deleted on last leaves
  private rooms: Map<string, Set<string>> = new Map();
  // clientJoinedRooms: each set is created and deleted on the client connects and disconnects
  private clientJoinedRooms: Map<string, Set<string>> = new Map();

  // This map of arraies is used to store the last message sent to each client,
  // to help us calculate the delta with jsondiffpatch
  // clientId => (submissionId => message)
  private clientLastMessages: Map<string, Map<number, SubmissionProgressMessage>> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService
  ) {
    // Use a different key with session secret to prevent someone attempt to use the session key
    // as subscription key
    this.secret = this.configService.config.security.sessionSecret + "SubmissionProgress";
  }

  // A subscription key is send to the client to let it connect to the WebSocket gateway to subscribe some
  // submission's progress. The authorization is done before the key is encoded, and when a client connect
  // to the WebSocket, we don't require its user id or session key, only the key is verified.
  encodeSubscription(subscription: SubmissionProgressSubscription): string {
    return jwt.sign(subscription, this.secret);
  }

  decodeSubscription(subscriptionKey: string): SubmissionProgressSubscription {
    try {
      return jwt.verify(subscriptionKey, this.secret) as SubmissionProgressSubscription;
    } catch (e) {
      Logger.log(`Invalid subscription key: ${subscriptionKey}`);
      return null;
    }
  }

  private getRoom(subscriptionType: SubmissionProgressSubscriptionType, submissionId: number) {
    return subscriptionType + "_" + submissionId;
  }

  private joinRoom(client: Socket, room: string) {
    Logger.log(`Joining client ${client.id} to room ${room}`);
    const joinedRooms = this.clientJoinedRooms.get(client.id);
    if (!joinedRooms) {
      // Already disconnected
      return;
    }

    joinedRooms.add(room);
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room).add(client.id);
  }

  private leaveRoom(client: Socket, room: string) {
    Logger.log(`Leaving client ${client.id} from room ${room}`);
    const joinedRooms = this.clientJoinedRooms.get(client.id);
    if (!joinedRooms) {
      // Already disconnected
      return;
    }

    joinedRooms.delete(room);
    const roomClients = this.rooms.get(room);
    if (!roomClients) {
      // Already leaved and room became empty
      return;
    }
    roomClients.delete(client.id);
    if (roomClients.size === 0) this.rooms.delete(room);

    if (joinedRooms.size === 0) client.disconnect(true);
  }

  private clearRoom(room: string) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;
    for (const client of roomClients) {
      const joinedRooms = this.clientJoinedRooms.get(client);
      joinedRooms.delete(room);
      if (joinedRooms.size === 0 && this.server.sockets[client]) {
        this.server.sockets[client].disconnect();
      }
    }
    this.rooms.delete(room);
  }

  // sendMessage: send a message to a client or a room of clients
  private sendMessage(to: Socket | string, submissionId: number, message: SubmissionProgressMessage) {
    // sendTo: calculate the message delta and send to a specfied client
    const sendTo = (clientId: string) => {
      const lastMessageBySubmissionId = this.clientLastMessages.get(clientId);
      if (!lastMessageBySubmissionId) {
        // Already disconnected
        return;
      }

      const lastMessage = lastMessageBySubmissionId.get(submissionId);
      const delta = diff(lastMessage, message);
      lastMessageBySubmissionId.set(submissionId, message);
      if (delta) this.server.to(clientId).send(submissionId, delta);
    };

    Logger.log(`Sending to ${typeof to === "string" ? to : (to as Socket).id}: ${JSON.stringify(message)}`);

    if (typeof to === "object") sendTo(to.id);
    else for (const client of this.rooms.get(to) || []) sendTo(client);
  }

  handleDisconnect(client: Socket): void {
    const rooms = this.clientJoinedRooms.get(client.id);
    if (rooms) {
      this.clientJoinedRooms.delete(client.id);
      for (const room of rooms) {
        this.rooms.get(room).delete(client.id);
      }
    }
    this.clientLastMessages.delete(client.id);
  }

  async handleConnection(client: Socket): Promise<void> {
    const subscription = this.decodeSubscription(client.handshake.query["subscriptionKey"]);
    if (!subscription) {
      client.disconnect(true);
      return;
    }

    Logger.log(`Subscription: ${JSON.stringify(subscription)}`);

    this.clientJoinedRooms.set(client.id, new Set());
    this.clientLastMessages.set(client.id, new Map());

    // Join the rooms first to prevent missing the finished message
    for (const submissionId of subscription.submissionIds) {
      this.joinRoom(client, this.getRoom(subscription.type, submissionId));
    }

    // Send messages for the already finished submissions
    for (const submissionId of subscription.submissionIds) {
      const submission = await this.submissionService.findSubmissionById(submissionId);
      if (submission.status === SubmissionStatus.Pending) continue;

      // This submission has already finished
      const basicMeta = await this.submissionService.getSubmissionBasicMeta(submission);
      this.leaveRoom(client, this.getRoom(subscription.type, submissionId));

      switch (subscription.type) {
        case SubmissionProgressSubscriptionType.Meta:
          this.sendMessage(client, submissionId, {
            resultMeta: basicMeta
          });
          break;
        case SubmissionProgressSubscriptionType.Detail: {
          const submissionDetail = await this.submissionService.getSubmissionDetail(submission);
          this.sendMessage(client, submissionId, {
            resultMeta: basicMeta,
            resultDetail: submissionDetail.result
          });
          break;
        }
      }
    }
  }

  public async onSubmissionEvent(
    submissionId: number,
    type: SubmissionEventType,
    progress?: SubmissionProgress
  ): Promise<void> {
    if (type === SubmissionEventType.Progress && progress.progressType !== SubmissionProgressType.Finished) {
      this.sendMessage(this.getRoom(SubmissionProgressSubscriptionType.Meta, submissionId), submissionId, {
        progressMeta: progress.progressType
      });
      this.sendMessage(this.getRoom(SubmissionProgressSubscriptionType.Detail, submissionId), submissionId, {
        progressMeta: progress.progressType,
        progressDetail: progress
      });
    } else {
      // This is called after database updated

      if (type !== SubmissionEventType.Deleted) {
        const submission = await this.submissionService.findSubmissionById(submissionId);
        const submissionDetail = await this.submissionService.getSubmissionDetail(submission);
        // If the submission has been deleted, don't attempt to send the result.
        if (submission && submissionDetail) {
          const basicMeta = await this.submissionService.getSubmissionBasicMeta(submission);
          this.sendMessage(this.getRoom(SubmissionProgressSubscriptionType.Meta, submissionId), submissionId, {
            resultMeta: basicMeta
          });
          this.sendMessage(this.getRoom(SubmissionProgressSubscriptionType.Detail, submissionId), submissionId, {
            resultMeta: basicMeta,
            resultDetail: submissionDetail.result
          });
        }
      }

      this.clearRoom(this.getRoom(SubmissionProgressSubscriptionType.Meta, submissionId));
      this.clearRoom(this.getRoom(SubmissionProgressSubscriptionType.Detail, submissionId));
    }
  }
}
