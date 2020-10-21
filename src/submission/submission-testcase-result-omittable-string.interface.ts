export type SubmissionResultOmittableString =
  | string
  | {
      data: string;
      omittedLength: number;
    };
