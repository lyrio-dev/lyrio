import { JudgeTaskProgress } from "./judge-task-progress.interface";
import { JudgeTaskExtraInfo, JudgeTask } from "./judge-queue.service";

export interface JudgeTaskService<TaskProgress extends JudgeTaskProgress, ExtraInfo extends JudgeTaskExtraInfo> {
  onTaskProgress(taskId: string, progress: TaskProgress): Promise<boolean>;
  getTaskById(taskId: string): Promise<JudgeTask<ExtraInfo>>;
}
