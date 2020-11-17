import { cpus } from "os";
import cluster from "cluster";

import { Injectable, Inject, forwardRef } from "@nestjs/common";

import { ConfigService } from "@/config/config.service";

interface IpcMessage {
  channel: string;
  data: unknown;
}

@Injectable()
export class ClusterService {
  readonly enabled: boolean;

  readonly isMaster: boolean;

  readonly isWorker: boolean;

  private readonly messageListeners = new Map<string, Array<(data: unknown) => void>>();

  constructor(
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService
  ) {
    this.enabled = this.configService.config.server.clusters != null;
    this.isMaster = cluster.isMaster;
    this.isWorker = cluster.isWorker || !this.enabled;
  }

  async initialization(workerCallback: () => Promise<void>) {
    if (this.isWorker) {
      await workerCallback();
      return;
    }

    // Master -- create workers
    const count = this.configService.config.server.clusters || cpus().length;
    for (let i = 0; i < count; i++) {
      cluster.fork();
    }

    cluster.on("message", (worker, message: IpcMessage) => this.callMessageListeners(message));
  }

  private callMessageListeners(message: IpcMessage) {
    (this.messageListeners.get(message.channel) || []).forEach(callback => callback(message.data));
  }

  /**
   * If cluster is not enabled, the channel's callback will be called directly.
   */
  postMessageToMaster<T>(channel: string, data: T) {
    const message = {
      channel,
      data
    };

    if (this.isMaster) this.callMessageListeners(message);
    else process.send(message);
  }

  onMessageFromWorker<T>(channel: string, callback: (data: T) => void) {
    if (!this.messageListeners.has(channel)) this.messageListeners.set(channel, []);
    this.messageListeners.get(channel).push(callback);
  }
}
