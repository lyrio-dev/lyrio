import { CodeLanguage } from "@/code-language/code-language.type";
import { ProblemFileEntity } from "@/problem/problem-file.entity";

interface CheckerTypeIntegers {
  type: "integers";
}

interface CheckerTypeFloats {
  type: "floats";
  precision: number;
}

interface CheckerTypeLines {
  type: "lines";
  caseSensitive: boolean;
}

interface CheckerTypeBinary {
  type: "binary";
}

interface CheckerTypeCustom {
  type: "custom";
  interface: string;
  language: CodeLanguage;
  languageOptions: unknown;
  filename: string;
}

// integers: check the equivalent of each integer in user's output and answer
// floats:   check each float in user's output and answer
//           allow output with relative or absolute error not exceeding [floats.precision].
// lines:    check the equivalent of text in each line (separated by "\n"), maybe case-insensitive
//           any space characters (space, \t, \r) in the end of a line will be ignored
//           any empty lines in the end of file will be ignored
// binary:   check if the user's output and answer files are equal in binary
// custom:   use a custom program to check the user's output
export type Checker =
  | CheckerTypeIntegers
  | CheckerTypeFloats
  | CheckerTypeLines
  | CheckerTypeBinary
  | CheckerTypeCustom;

interface JudgeInfoWithChecker {
  checker: Checker;
}

export function validateChecker(
  judgeInfo: JudgeInfoWithChecker,
  testData: ProblemFileEntity[],
  onValidateLanguageOptions: (codeLanguage: CodeLanguage, langaugeOptions: unknown) => boolean
) {
  if (!judgeInfo.checker || !["integers", "floats", "lines", "binary", "custom"].includes(judgeInfo.checker.type)) {
    throw ["INVALID_CHECKER_TYPE"];
  }
  switch (judgeInfo.checker.type) {
    case "floats":
      if (!(Number.isSafeInteger(judgeInfo.checker.precision) && judgeInfo.checker.precision > 0))
        throw ["INVALID_CHECKER_OPTIONS"];
      break;
    case "lines":
      if (typeof judgeInfo.checker.caseSensitive !== "boolean") throw ["INVALID_CHECKER_OPTIONS"];
      break;
    case "custom":
      const checker = judgeInfo.checker;
      if (!["testlib", "legacy", "lemon", "hustoj", "qduoj", "domjudge"].includes(checker.interface))
        throw ["INVALID_CHECKER_INTERFACE"];
      if (!Object.values(CodeLanguage).includes(checker.language)) throw ["INVALID_CHECKER_LANGUAGE"];
      if (!testData.some(file => file.filename === checker.filename)) throw ["NO_SUCH_CHECKER_FILE", checker.filename];
      if (!onValidateLanguageOptions(checker.language, checker.languageOptions))
        throw ["INVALID_CHECKER_LANGUAGE_OPTIONS"];
      break;
  }
}
