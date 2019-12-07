export interface ProblemSampleDataMember {
  runWhenJudging: boolean;
  inputData: string;
  outputData: string;
}

export interface ProblemSampleData extends Array<ProblemSampleDataMember> {}
