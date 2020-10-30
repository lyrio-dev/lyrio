import { JudgeTaskProgress } from "./judge-task-progress.interface";
import { JudgeTaskExtraInfo, JudgeTask } from "./judge-queue.service";

export interface JudgeTaskService<TaskProgress extends JudgeTaskProgress, ExtraInfo extends JudgeTaskExtraInfo> {
  onTaskProgress(taskId: string, progress: TaskProgress): Promise<boolean>;

  /**
   * @param priority We need to store the `priority` in judge task as we may repush the task back to queue
   */
  getTaskToBeSentToJudgeByTaskId(taskId: string, priority: number): Promise<JudgeTask<ExtraInfo>>;
}
