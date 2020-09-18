import { ProblemFileEntity } from "@/problem/problem-file.entity";

interface Subtask {
  scoringType: "Sum" | "GroupMin" | "GroupMul";
  testcases: {
    inputFile: string;
    outputFile: string;
  }[];
}

export function autoMatchInputToOutput(testData: ProblemFileEntity[], outputOptional?: boolean): Subtask[] {
  return [
    {
      scoringType: "Sum",
      testcases: testData
        .filter(file => file.filename.toLowerCase().endsWith(".in"))
        .map<[ProblemFileEntity, ProblemFileEntity, number[]]>(input => [
          input,
          testData.find(file =>
            [".out", ".ans"]
              .map(ext => input.filename.slice(0, -3).toLowerCase() + ext)
              .includes(file.filename.toLowerCase())
          ),
          (input.filename.match(/\d+/g) || []).map(Number)
        ])
        .filter(([, outputFile]) => (outputOptional ? true : outputFile))
        .sort(([inputA, , numbersA], [inputB, , numbersB]) => {
          const firstNonEqualIndex = [...Array(Math.max(numbersA.length, numbersB.length)).keys()].findIndex(
            i => numbersA[i] !== numbersB[i]
          );
          // eslint-disable-next-line no-nested-ternary
          return firstNonEqualIndex === -1
            ? inputA.filename < inputB.filename
              ? -1
              : 1
            : numbersA[firstNonEqualIndex] - numbersB[firstNonEqualIndex];
        })
        .map(([input, output]) => ({
          inputFile: input.filename,
          outputFile: output?.filename
        }))
    }
  ];
}

export function autoMatchOutputToInput(testData: ProblemFileEntity[], inputOptional?: boolean): Subtask[] {
  return [
    {
      scoringType: "Sum",
      testcases: testData
        .filter(file => ((str: string) => str.endsWith(".out") || str.endsWith(".ans"))(file.filename.toLowerCase()))
        .map<[ProblemFileEntity, ProblemFileEntity, number[]]>(input => [
          input,
          testData.find(file => `${input.filename.slice(0, -4).toLowerCase()}.in` === file.filename.toLowerCase()),
          (input.filename.match(/\d+/g) || []).map(Number)
        ])
        .filter(([, inputFile]) => (inputOptional ? true : inputFile))
        .sort(([outputA, , numbersA], [outputB, , numbersB]) => {
          const firstNonEqualIndex = [...Array(Math.max(numbersA.length, numbersB.length)).keys()].findIndex(
            i => numbersA[i] !== numbersB[i]
          );
          // eslint-disable-next-line no-nested-ternary
          return firstNonEqualIndex === -1
            ? outputA.filename < outputB.filename
              ? -1
              : 1
            : numbersA[firstNonEqualIndex] - numbersB[firstNonEqualIndex];
        })
        .map(([output, input]) => ({
          inputFile: input?.filename,
          outputFile: output.filename
        }))
    }
  ];
}
