/* eslint-disable */
export interface OldDatabaseUserEntity {
  id: number;
  username: string;
  email: string;
  password: string;
  information: string;
  is_admin: boolean;
  public_email: boolean;
  prefer_formatted_code: boolean;
  rating: number;
  register_time: number;
}

export interface OldDatabaseUserPrivilegeEntity {
  user_id: number;
  privilege: "manage_problem" | "manage_problem_tag" | "manage_user";
}

export interface OldDatabaseProblemEntity {
  id: number;
  title: string;
  user_id: number;

  description: string;
  input_format: string;
  output_format: string;
  example: string;
  limit_and_hint: string;

  type: "traditional" | "submit-answer" | "interaction";
  time_limit: number;
  memory_limit: number;
  file_io: boolean;
  file_io_input_name: string;
  file_io_output_name: string;

  additional_file_id: number;
  is_public: boolean;

  publicize_time: string;
}

export interface OldDatabaseProblemTagEntity {
  id: number;
  name: string;
  color: string;
}

export interface OldDatabaseProblemTagMapEntity {
  problem_id: number;
  tag_id: number;
}

export interface OldDatabaseJudgeStateEntity {
  id: number;
  code?: string;
  language?: string;
  status?:
    | "Accepted"
    | "Compile Error"
    | "File Error"
    | "Invalid Interaction"
    | "Judgement Failed"
    | "Memory Limit Exceeded"
    | "No Testdata"
    | "Output Limit Exceeded"
    | "Partially Correct"
    | "Runtime Error"
    | "System Error"
    | "Time Limit Exceeded"
    | "Unknown"
    | "Wrong Answer"
    | "Waiting";
  score: number;
  total_time: number;
  code_length: number;
  max_memory: number;
  compilation?: string;
  result?: string;
  user_id: number;
  problem_id: number;
  submit_time: number;
  /**
   * `1` is contest
   */
  type: 0 | 1;
  /**
   * Contest ID
   */
  type_info?: number;
  is_public: boolean;
}

export interface OldDatabaseArticleEntity {
  id: number;
  title: string;
  content: string;
  user_id: number;
  problem_id: number;
  public_time: number; // publish time
  update_time: number;
  sort_time: number;
  is_notice: boolean;
}

export interface OldDatabaseArticleCommentEntity {
  id: number;
  content: string;
  article_id: number;
  user_id: number;
  public_time: number; // publish time
}
