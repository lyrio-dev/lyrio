export interface ProblemSampleDataMember {
  inputData: string;
  outputData: string;
}

export interface ProblemSampleData extends Array<ProblemSampleDataMember> {}
