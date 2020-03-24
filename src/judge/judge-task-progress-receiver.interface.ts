import { JudgeTaskProgress } from "./judge-task-progress.interface";

export interface JudgeTaskProgressReceiver<TaskProgress extends JudgeTaskProgress> {
  onTaskProgress(taskId: string, progress: TaskProgress): Promise<void>;
}
