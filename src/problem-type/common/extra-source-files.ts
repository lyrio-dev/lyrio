/* eslint-disable no-throw-literal */

import { CodeLanguage } from "@/code-language/code-language.type";
import { isValidFilename } from "@/common/validators";
import { ProblemFileEntity } from "@/problem/problem-file.entity";

interface JudgeInfoWithExtraSourceFiles {
  extraSourceFiles?: Partial<Record<CodeLanguage, Record<string, string>>>;
}

export function validateExtraSourceFiles(
  judgeInfo: JudgeInfoWithExtraSourceFiles,
  testData: ProblemFileEntity[]
): void {
  if (judgeInfo.extraSourceFiles) {
    if (typeof judgeInfo.extraSourceFiles !== "object") throw ["INVALID_EXTRA_SOURCE_FILES"];

    Object.entries(judgeInfo.extraSourceFiles).forEach(([codeLanguage, files]) => {
      if (!Object.values(CodeLanguage).includes(codeLanguage as CodeLanguage))
        throw ["INVALID_EXTRA_SOURCE_FILES_LANGUAGE"];
      if (typeof files !== "object") throw ["INVALID_EXTRA_SOURCE_FILES"];

      Object.entries(files).forEach(([dst, src], i) => {
        if (typeof dst !== "string" || !isValidFilename(dst))
          throw ["INVALID_EXTRA_SOURCE_FILES_DST", codeLanguage, i + 1, dst];
        if (!testData.some(file => file.filename === src))
          throw ["NO_SUCH_EXTRA_SOURCE_FILES_SRC", codeLanguage, i + 1, src];
      });
    });
  }
}
