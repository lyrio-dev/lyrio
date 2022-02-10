import { Injectable } from "@nestjs/common";

import { Redis } from "ioredis";

import { logger } from "@/logger";
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
    public priority: number,
    public extraInfo: ExtraInfo
  ) {}

  getMeta(): JudgeTaskMeta {
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

  private readonly taskServices: Map<JudgeTaskType, JudgeTaskService<JudgeTaskProgress, JudgeTaskExtraInfo>> =
    new Map();

  constructor(private readonly redisService: RedisService) {
    this.redisForPush = this.redisService.getClient();
    this.redisForConsume = this.redisService.getClient();
  }

  registerTaskType<TaskProgress>(
    taskType: JudgeTaskType,
    service: JudgeTaskService<TaskProgress, JudgeTaskExtraInfo>
  ): void {
    this.taskServices.set(taskType, service);
  }

  async pushTask(taskId: string, type: JudgeTaskType, priority: number, repush = false): Promise<void> {
    if (repush) logger.verbose(`Repush judge task: { taskId: ${taskId}, type: ${type}, priority: ${priority} }`);
    else logger.verbose(`New judge task: { taskId: ${taskId}, type: ${type}, priority: ${priority} }`);
    await this.redisForPush.zadd(
      REDIS_KEY_JUDGE_QUEUE,
      priority,
      JSON.stringify({
        taskId,
        type
      })
    );
  }

  async consumeTask(): Promise<JudgeTask<JudgeTaskExtraInfo>> {
    logger.verbose("Consuming task queue");

    // ioredis's definition doesn't have bzpopmin method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisResponse: [key: string, element: string, score: string] = await (this.redisForConsume as any).bzpopmin(
      REDIS_KEY_JUDGE_QUEUE,
      REDIS_CONSUME_TIMEOUT
    );
    if (!redisResponse) {
      logger.verbose("Consuming task queue - timeout or empty");
      return null;
    }

    const [, taskJson, priorityString] = redisResponse;
    const priority = Number(priorityString);
    const taskMeta: JudgeTaskMeta = JSON.parse(taskJson);
    const task = await this.taskServices.get(taskMeta.type).getTaskToBeSentToJudgeByTaskId(taskMeta.taskId, priority);
    if (!task) {
      logger.verbose(
        `Consumed judge task { taskId: ${taskMeta.taskId}, type: ${taskMeta.type} }, but taskId is invalid, maybe canceled?`
      );
      return null;
    }

    logger.verbose(
      `Consumed judge task { taskId: ${task.taskId}, type: ${task.type}, priority: ${priority} (${
        JudgeTaskPriorityType[task.priorityType]
      }) }`
    );
    return task;
  }

  /**
   * @return `false` means the task is canceled.
   */
  async onTaskProgress(taskMeta: JudgeTaskMeta, progress: JudgeTaskProgress): Promise<boolean> {
    return await this.taskServices.get(taskMeta.type).onTaskProgress(taskMeta.taskId, progress);
  }
}
