export enum ProblemContentSectionType {
  TEXT = "TEXT",
  SAMPLE = "SAMPLE"
}

export interface ProblemContentSection {
  sectionTitle: string;
  type: ProblemContentSectionType;

  // If it's a text section, the sampleId is empty
  sampleId?: number;

  // If it's a sample section, the text is the explanation
  text?: string;
}
