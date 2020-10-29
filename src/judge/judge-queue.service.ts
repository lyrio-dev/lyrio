import { Injectable, Logger } from "@nestjs/common";

import { Redis } from "ioredis";

import { RedisService } from "@/redis/redis.service";

import { JudgeTaskService } from "./judge-task-service.interface";
import { JudgeTaskProgress } from "./judge-task-progress.interface";

// Smaller means higher priority
// With the same priority value, the smaller ID means higher priority
export enum JudgeTaskPriorityType {
  High = 1,
  Medium = 2,
  Low = 3,
  Lowest = 4
}

export function priorityToKey(priority: number) {
  return priority.toFixed(20);
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JudgeTaskExtraInfo {}

// Extra info is also send to judge client while ONLY meta is used to identity the task
export class JudgeTask<ExtraInfo extends JudgeTaskExtraInfo> implements JudgeTaskMeta {
  constructor(
    public taskId: string, // Passed by the task creator, to indentify the task
    public type: JudgeTaskType,
    public priorityType: JudgeTaskPriorityType,
    public priorityKey: string,
    public extraInfo: ExtraInfo
  ) {}

  public getMeta(): JudgeTaskMeta {
    return {
      taskId: this.taskId,
      type: this.type
    };
  }
}

const REDIS_KEY_JUDGE_QUEUE = "judge-queue";
const REDIS_CONSUME_TIMEOUT = 10;

@Injectable()
export class JudgeQueueService {
  private readonly redisForPush: Redis;

  private readonly redisForConsume: Redis;

  private readonly taskServices: Map<
    JudgeTaskType,
    JudgeTaskService<JudgeTaskProgress, JudgeTaskExtraInfo>
  > = new Map();

  constructor(private readonly redisService: RedisService) {
    this.redisForPush = this.redisService.getClient();
    this.redisForConsume = this.redisService.getClient();
  }

  public registerTaskType<TaskProgress>(
    taskType: JudgeTaskType,
    service: JudgeTaskService<TaskProgress, JudgeTaskExtraInfo>
  ): void {
    this.taskServices.set(taskType, service);
  }

  public async pushTask(taskId: string, type: JudgeTaskType, priorityKey: string, repush = false): Promise<void> {
    if (repush) Logger.verbose(`Repush judge task: { taskId: ${taskId}, type: ${type}, priorityKey: ${priorityKey} }`);
    else Logger.verbose(`New judge task: { taskId: ${taskId}, type: ${type}, priorityKey: ${priorityKey} }`);
    await this.redisForPush.zadd(
      REDIS_KEY_JUDGE_QUEUE,
      priorityKey,
      JSON.stringify({
        taskId,
        type
      })
    );
  }

  public async consumeTask(): Promise<JudgeTask<JudgeTaskExtraInfo>> {
    Logger.verbose("Consuming task queue");

    // ioredis's definition doesn't have bzpopmin method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisResponse: [string, string] = await (this.redisForConsume as any).bzpopmin(
      REDIS_KEY_JUDGE_QUEUE,
      REDIS_CONSUME_TIMEOUT
    );
    if (!redisResponse) {
      Logger.verbose("Consuming task queue - timeout");
      return null;
    }

    const [priorityKey, taskJson] = redisResponse;
    const taskMeta: JudgeTaskMeta = JSON.parse(taskJson);
    const task = await this.taskServices
      .get(taskMeta.type)
      .getTaskToBeSentToJudgeByTaskId(taskMeta.taskId, priorityKey);
    if (!task) {
      Logger.verbose(
        `Consumed judge task { taskId: ${taskMeta.taskId}, type: ${taskMeta.type} }, but taskId is invalid, maybe canceled?`
      );
      return null;
    }

    Logger.verbose(
      `Consumed judge task { taskId: ${task.taskId}, type: ${task.type}, priorityKey: ${priorityKey} (${
        JudgeTaskPriorityType[task.priorityType]
      }) }`
    );
    return task;
  }

  /**
   * @return `false` means the task is canceled.
   */
  public async onTaskProgress(taskMeta: JudgeTaskMeta, progress: JudgeTaskProgress): Promise<boolean> {
    return await this.taskServices.get(taskMeta.type).onTaskProgress(taskMeta.taskId, progress);
  }
}
