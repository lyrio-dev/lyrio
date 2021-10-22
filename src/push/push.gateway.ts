import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from "@nestjs/websockets";

import { Server, Socket } from "socket.io"; // eslint-disable-line import/no-extraneous-dependencies
import jwt from "jsonwebtoken";
import SocketIOParser from "socket.io-msgpack-parser";

import { logger } from "@/logger";
import { ConfigService } from "@/config/config.service";

export type SubscriptionType = string | object;

interface PushSubscription<Subscription extends SubscriptionType> {
  type: string;
  subscription: Subscription;
}

export interface PushHandler<Subscription extends SubscriptionType, Message> {
  getInitialMessageForSubscription(subscription: Subscription): Promise<Message>;
  getRoomForSubscription(subscription: Subscription): string;
}

export interface PushService<Subscription extends SubscriptionType, Message> {
  encodeSubscription(subscription: Subscription): string;
  push(room: string, message: Message): void;
}

@WebSocketGateway({
  namespace: "push",
  path: "/api/socket",
  transports: ["websocket"],
  parser: SocketIOParser
})
export class PushGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server: Server;

  private secret: string;

  private pushHandlers = new Map<string, PushHandler<SubscriptionType, unknown>>();

  constructor(private readonly configService: ConfigService) {
    // Use a different key with session secret to prevent someone attempt to use the session key
    // as subscription key
    this.secret = `${this.configService.config.security.sessionSecret}Push`;
  }

  private encodeSubscription<Subscription extends SubscriptionType>(type: string, subscription: Subscription): string {
    return jwt.sign(
      <PushSubscription<Subscription>>{
        type,
        subscription
      },
      this.secret
    );
  }

  private decodeSubscription<Subscription extends SubscriptionType>(
    subscriptionKey: string
  ): PushSubscription<Subscription> {
    try {
      return jwt.verify(subscriptionKey, this.secret) as PushSubscription<Subscription>;
    } catch (e) {
      logger.log(`Invalid subscription key: ${subscriptionKey}`);
      return null;
    }
  }

  private getTypedRoomId(type: string, room: string) {
    return `${type}:${room}`;
  }

  registerPushType<Subscription extends SubscriptionType, Message>(
    type: string,
    handler: PushHandler<Subscription, Message>
  ): PushService<Subscription, Message> {
    this.pushHandlers.set(type, handler);
    return {
      encodeSubscription: subscription => this.encodeSubscription(type, subscription),
      push: (room, message) => {
        logger.verbose(`Pushing ${JSON.stringify(message)} to ${room}`);
        this.server.to(this.getTypedRoomId(type, room)).send(message);
      }
    };
  }

  async handleConnection(client: Socket) {
    const subscription = this.decodeSubscription(client.handshake.query.subscriptionKey);
    if (!subscription) {
      client.disconnect(true);
      return;
    }

    logger.verbose(`Subscription: ${JSON.stringify(subscription)}`);

    const room = this.pushHandlers.get(subscription.type).getRoomForSubscription(subscription.subscription);
    if (room) client.join(this.getTypedRoomId(subscription.type, room));
    logger.verbose(`Joining room: ${room}`);

    const message = await this.pushHandlers
      .get(subscription.type)
      .getInitialMessageForSubscription(subscription.subscription);
    if (message) client.send(message);

    if (!room) client.disconnect(true);
  }
}
