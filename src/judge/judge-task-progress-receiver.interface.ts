import { JudgeTaskProgress } from "./judge-task-progress.interface";

export interface JudgeTaskProgressReceiver<TaskProgress extends JudgeTaskProgress> {
  onTaskProgress(id: number, progress: TaskProgress): Promise<void>;
}
