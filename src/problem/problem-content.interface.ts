export enum ProblemContentSectionType {
  Text = "Text",
  Sample = "Sample"
}

export interface ProblemContentSection {
  sectionTitle: string;
  type: ProblemContentSectionType;

  // If it's a text section, the sampleId is empty
  sampleId?: number;

  // If it's a sample section, the text is the explanation
  text?: string;
}
