import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

import { RedisService } from "@/redis/redis.service";
import { JudgeTaskProgressReceiver } from "./judge-task-progress-receiver.interface";
import { JudgeTaskProgress } from "./judge-task-progress.interface";

// Smaller means higher priority
// With the same priority value, the smaller ID means higher priority
export enum JudgeTaskPriority {
  High = 0,
  Medium = 1,
  Low = 2,
  Lowest = 3
}

// Since multiple keys is not supported in Redis ZSET, we use "<key1>.<key2>" to simulate it
function combinePriority(id: number, priorityValue: JudgeTaskPriority): string {
  return priorityValue + "." + id;
}

export enum JudgeTaskType {
  Submission = "Submission",
  CustomTest = "CustomTest",
  Hack = "Hack"
}

export interface JudgeTaskMeta {
  taskId: string;
  type: JudgeTaskType;
}

export interface JudgeTaskExtraInfo {}

// Extra info is also send to judge client while ONLY meta is used to identity the task
export class JudgeTask<ExtraInfo extends JudgeTaskExtraInfo> implements JudgeTaskMeta {
  constructor(
    public taskId: string, // Passed by the task creator, to indentify the task
    public type: JudgeTaskType,
    public priority: JudgeTaskPriority,
    public priorityId: number, // Passed by the task creator, lower means higher priority
    public extraInfo: ExtraInfo
  ) {}

  public getMeta(): JudgeTaskMeta {
    return {
      taskId: this.taskId,
      type: this.type
    };
  }
}

const REDIS_KEY_JUDGE_QUEUE = "judgeQueue";
const REDIS_CONSUME_TIMEOUT = 10;

@Injectable()
export class JudgeQueueService {
  private readonly redisForPush: Redis;
  private readonly redisForConsume: Redis;
  private readonly taskProgressReceivers: Map<JudgeTaskType, JudgeTaskProgressReceiver<JudgeTaskProgress>> = new Map();

  constructor(private readonly redisService: RedisService) {
    this.redisForPush = this.redisService.getClient();
    this.redisForConsume = this.redisService.getClient();
  }

  public registerTaskType<TaskProgress>(
    taskType: JudgeTaskType,
    progressReceiver: JudgeTaskProgressReceiver<TaskProgress>
  ) {
    this.taskProgressReceivers.set(taskType, progressReceiver);
  }

  public async pushTask<ExtraInfo>(task: JudgeTask<ExtraInfo>, repush: boolean = false): Promise<void> {
    if (repush)
      Logger.verbose(
        `Repush judge task: { taskId: ${task.taskId}, type: ${task.type}, priority: ${
          JudgeTaskPriority[task.priority]
        } }`
      );
    else
      Logger.verbose(
        `New judge task: { taskId: ${task.taskId}, type: ${task.type}, priority: ${JudgeTaskPriority[task.priority]} }`
      );
    await this.redisForPush.zadd(
      REDIS_KEY_JUDGE_QUEUE,
      combinePriority(task.priorityId, task.priority),
      JSON.stringify(task)
    );
  }

  public async consumeTask(): Promise<JudgeTask<JudgeTaskExtraInfo>> {
    Logger.verbose("Consuming task queue");

    // ioredis's definition doesn't have bzpopmin method
    const redisResponse: [string, string] = await (this.redisForConsume as any).bzpopmin(
      REDIS_KEY_JUDGE_QUEUE,
      REDIS_CONSUME_TIMEOUT
    );
    if (!redisResponse) {
      Logger.verbose("Consuming task queue - timeout");
      return null;
    }

    const [combinedPriority, taskJson] = redisResponse;
    const task: JudgeTask<JudgeTaskExtraInfo> = JSON.parse(taskJson);

    Logger.verbose(
      `Consumed judge task { taskId: ${task.taskId}, type: ${task.type}, priority: ${
        JudgeTaskPriority[task.priority]
      } }`
    );
    return task;
  }

  public async onTaskProgress(taskMeta: JudgeTaskMeta, progress: JudgeTaskProgress): Promise<void> {
    await this.taskProgressReceivers.get(taskMeta.type).onTaskProgress(taskMeta.taskId, progress);
  }
}
