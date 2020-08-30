export interface ProblemSampleDataMember {
  inputData: string;
  outputData: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProblemSampleData extends Array<ProblemSampleDataMember> {}
