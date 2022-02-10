/* eslint-disable */
import path from "path";
import fs from "fs";

import { Logger } from "@nestjs/common";

import { v5 as uuid } from "uuid";
import { JSDOM } from "jsdom";

import { SubmissionEntity } from "@/submission/submission.entity";
import { ProblemType } from "@/problem/problem.entity";
import { SubmissionStatus } from "@/submission/submission-status.enum";
import { SubmissionDetailEntity } from "@/submission/submission-detail.entity";
import { ConfigService } from "@/config/config.service";
import { FileEntity } from "@/file/file.entity";
import { SubmissionProgressType } from "@/submission/submission-progress.interface";
import {
  SubmissionTestcaseResultTraditional,
  SubmissionTestcaseStatusTraditional
} from "@/problem-type/types/traditional/submission-testcase-result.interface";
import {
  SubmissionTestcaseResultInteraction,
  SubmissionTestcaseStatusInteraction
} from "@/problem-type/types/interaction/submission-testcase-result.interface";
import {
  SubmissionTestcaseResultSubmitAnswer,
  SubmissionTestcaseStatusSubmitAnswer
} from "@/problem-type/types/submit-answer/submission-testcase-result.interface";
import { SubmissionContentTraditional } from "@/problem-type/types/traditional/submission-content.interface";
import { SubmissionResultOmittableString } from "@/submission/submission-testcase-result-omittable-string.interface";

import { getLanguageAndOptions, parseProblemType } from "./problem";
import { OldDatabaseJudgeStateEntity } from "./old-database.interface";
import { MigrationInterface } from "./migration.interface";
import { FileService } from "@/file/file.service";

enum OldSubmissionTestcaseResultType {
  Accepted = 1,
  WrongAnswer = 2,
  PartiallyCorrect = 3,
  MemoryLimitExceeded = 4,
  TimeLimitExceeded = 5,
  OutputLimitExceeded = 6,
  FileError = 7, // The output file does not exist
  RuntimeError = 8,
  JudgementFailed = 9, // Special Judge or Interactor fails
  InvalidInteraction = 10
}

interface OldSubmissionTestcaseFileContent {
  content: string;
  name: string;
}

interface OldSubmissionResult {
  systemMessage?: string; // System Error
  compile: {
    /**
     * 2: success, 3: fail
     */
    status: number;
    message?: string;
  };
  judge?: {
    subtasks?: {
      score?: number;
      cases: {
        status: number; // 2 OK, 4 skipped
        result?: {
          type: OldSubmissionTestcaseResultType;
          time: number;
          memory: number;
          input?: OldSubmissionTestcaseFileContent;
          output?: OldSubmissionTestcaseFileContent; // Output in test data
          scoringRate: number; // e.g. 0.5
          userOutput?: string;
          userError?: string;
          spjMessage?: string;
          systemMessage?: string;
        };
      }[];
    }[];
  };
}

function convertSubmissionStatus(oldStatus: OldDatabaseJudgeStateEntity["status"]): SubmissionStatus {
  switch (oldStatus) {
    case "Accepted":
      return SubmissionStatus.Accepted;
    case "Compile Error":
      return SubmissionStatus.CompilationError;
    case "File Error":
      return SubmissionStatus.FileError;
    case "Judgement Failed":
      return SubmissionStatus.JudgementFailed;
    case "Memory Limit Exceeded":
      return SubmissionStatus.MemoryLimitExceeded;
    case "No Testdata":
      return SubmissionStatus.ConfigurationError;
    case "Output Limit Exceeded":
      return SubmissionStatus.OutputLimitExceeded;
    case "Partially Correct":
      return SubmissionStatus.PartiallyCorrect;
    case "Runtime Error":
      return SubmissionStatus.RuntimeError;
    case "System Error":
      return SubmissionStatus.SystemError;
    case "Time Limit Exceeded":
      return SubmissionStatus.TimeLimitExceeded;
    case "Unknown":
      return SubmissionStatus.SystemError;
    case "Waiting":
      return SubmissionStatus.Pending;
    case "Wrong Answer":
    case "Invalid Interaction":
      return SubmissionStatus.WrongAnswer;
    default:
      Logger.error(`Unknown submission status "${oldStatus}"`);
      return SubmissionStatus.SystemError;
  }
}

function convertTestcaseStatus(
  oldStatus: OldSubmissionTestcaseResultType
): SubmissionTestcaseStatusTraditional | SubmissionTestcaseStatusInteraction | SubmissionTestcaseStatusSubmitAnswer {
  switch (oldStatus) {
    case OldSubmissionTestcaseResultType.Accepted:
      return SubmissionTestcaseStatusTraditional.Accepted;
    case OldSubmissionTestcaseResultType.FileError:
      return SubmissionTestcaseStatusTraditional.FileError;
    case OldSubmissionTestcaseResultType.JudgementFailed:
      return SubmissionTestcaseStatusTraditional.JudgementFailed;
    case OldSubmissionTestcaseResultType.MemoryLimitExceeded:
      return SubmissionTestcaseStatusTraditional.MemoryLimitExceeded;
    case OldSubmissionTestcaseResultType.OutputLimitExceeded:
      return SubmissionTestcaseStatusTraditional.OutputLimitExceeded;
    case OldSubmissionTestcaseResultType.PartiallyCorrect:
      return SubmissionTestcaseStatusTraditional.PartiallyCorrect;
    case OldSubmissionTestcaseResultType.RuntimeError:
      return SubmissionTestcaseStatusTraditional.RuntimeError;
    case OldSubmissionTestcaseResultType.TimeLimitExceeded:
      return SubmissionTestcaseStatusTraditional.TimeLimitExceeded;
    case OldSubmissionTestcaseResultType.InvalidInteraction:
    case OldSubmissionTestcaseResultType.WrongAnswer:
      return SubmissionTestcaseStatusTraditional.WrongAnswer;
    default:
      return SubmissionTestcaseStatusTraditional.SystemError;
  }
}

function uuidFromSubmission(submissionId: number) {
  const NAMESPACE = "c03eb380-e0a7-43f1-b276-9250f23663ee";
  return uuid(`${submissionId}`, NAMESPACE);
}

const omittedRegex = /\n<(\d+) bytes? omitted>$/;
function parseOmittedString(data: string): SubmissionResultOmittableString {
  data = data || "";
  const result = data.match(omittedRegex);
  if (!result) return data;
  return {
    data: data.replace(omittedRegex, ""),
    omittedLength: Number(result[1])
  };
}

function getOmittedStringLength(data: SubmissionResultOmittableString) {
  return typeof data === "string" ? data.length : data.data.length + data.omittedLength;
}

const ansiColorStrings = {
  "#000": 0,
  "#A00": 1,
  "#0A0": 2,
  "#A50": 3,
  "#00A": 4,
  "#A0A": 5,
  "#0AA": 6,
  "#AAA": 7
};
function htmlToAnsi(html: string) {
  const { window } = new JSDOM(html);
  const { body } = window.document;
  let result = "";

  function printAnsi(code: number) {
    result += `\x1B[${String(code)}m`;
  }

  let currentBold = false;
  let currentColor = -1;
  function dfs(node: ChildNode, bold = false, color = -1) {
    if (node.nodeType === node.TEXT_NODE) {
      // Change style
      if (currentBold !== bold || currentColor !== color) {
        // Cancel bold or color
        if ((currentBold !== bold && !bold) || (currentColor !== color && color === -1)) {
          // Reset ALL
          printAnsi(0);
          currentBold = false;
          currentColor = -1;
        }

        // Bold
        if (bold !== currentBold) {
          printAnsi(1);
          currentBold = bold;
        }

        // Color
        if (color !== currentColor) {
          printAnsi(30 + color);
          currentColor = color;
        }
      }

      result += node.nodeValue;
    }

    let nextBold = bold;
    let nextColor = color;
    if (node.nodeType === node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === "B") {
        nextBold = true;
      } else if (element.tagName === "SPAN") {
        const style = element.getAttribute("style");
        const colorStringPrefix = "color:";
        if (style.startsWith(colorStringPrefix)) {
          const colorString = style.substr(colorStringPrefix.length);
          if (colorString in ansiColorStrings) nextColor = ansiColorStrings[colorString];
        }
      }
    }

    if (node.childNodes.length) {
      for (const childNode of node.childNodes) {
        dfs(childNode, nextBold, nextColor);
      }
    }
  }

  dfs(body);
  return result;
}

export const migrationSubmission: MigrationInterface = {
  async migrate(entityManager, config, oldDatabase, queryTablePaged, app) {
    const configService = app.get(ConfigService);
    const fileService = app.get(FileService);

    const problemInfoMap: Record<
      number,
      {
        type: ProblemType;
        timeLimit: number;
        memoryLimit: number;
      }
    > = {};
    for (const problem of await oldDatabase.query("SELECT `id`, `type`, `time_limit`, `memory_limit` FROM `problem`"))
      problemInfoMap[problem.id] = {
        type: parseProblemType(problem.type),
        timeLimit: problem.time_limit,
        memoryLimit: problem.memory_limit
      };

    await queryTablePaged<OldDatabaseJudgeStateEntity>(
      "judge_state",
      "id",
      async oldSubmission => {
        const problemInfo = problemInfoMap[oldSubmission.problem_id];
        if (!problemInfo) {
          Logger.error(
            `Problem #${oldSubmission.problem_id} referenced by submission #${oldSubmission.id} doesn't exist`
          );
          return;
        }

        const isSubmitAnswer = problemInfo.type === ProblemType.SubmitAnswer;

        const languageAndOptions =
          !isSubmitAnswer && getLanguageAndOptions(oldSubmission.language, `submission ${oldSubmission.id}`, false);

        if (!isSubmitAnswer && !languageAndOptions) {
          Logger.error(`Unsupported language "${oldSubmission.language}", ignoring submission #${oldSubmission.id}`);
          return;
        }

        const submission = new SubmissionEntity();
        submission.id = oldSubmission.id;
        submission.taskId = null;
        submission.isPublic = !!oldSubmission.is_public;
        submission.codeLanguage = languageAndOptions?.language;
        submission.answerSize = isSubmitAnswer
          ? oldSubmission.code_length
          : Buffer.byteLength(oldSubmission.code, "utf-8");
        submission.score = Math.max(0, Math.min(oldSubmission.score, 100));
        submission.status = convertSubmissionStatus(oldSubmission.status);
        submission.submitTime = new Date(oldSubmission.submit_time * 1000);
        submission.problemId = oldSubmission.problem_id;
        submission.submitterId = oldSubmission.user_id;

        const submissionDetail = new SubmissionDetailEntity();
        submissionDetail.submissionId = submission.id;
        if (isSubmitAnswer) {
          submissionDetail.content = {};
          try {
            const answerFilePath = path.join(config.uploads, "answer", oldSubmission.code);
            const stat = await fs.promises.stat(answerFilePath);

            const fileUuid = uuidFromSubmission(oldSubmission.id);

            // Find existing record in new database first to continue a failed migration
            const fileEntity = (await entityManager.findOne(FileEntity, { uuid: fileUuid })) || new FileEntity();
            if (!fileEntity.uuid) {
              fileEntity.size = stat.size;
              fileEntity.uploadTime = new Date();
              fileEntity.uuid = uuidFromSubmission(oldSubmission.id);

              if (!(await fileService.fileExistsInMinio(fileEntity.uuid)))
                await fileService.uploadFile(fileEntity.uuid, answerFilePath);

              await entityManager.save(fileEntity);
            }

            submissionDetail.fileUuid = fileEntity.uuid;
            submission.answerSize = stat.size;
          } catch (e) {
            Logger.warn(`Failed to migrate submit answer submission #${oldSubmission.id}'s answer file, ${e}`);
            submissionDetail.fileUuid = null;
          }
        } else {
          submissionDetail.content = <SubmissionContentTraditional>{
            language: languageAndOptions.language,
            code: oldSubmission.code,
            compileAndRunOptions: languageAndOptions.compileAndRunOptions,
            skipSamples: true
          };
        }

        submissionDetail.result =
          submission.status === SubmissionStatus.Pending ? null : { progressType: SubmissionProgressType.Finished };
        const { result } = submissionDetail;
        if (result) {
          try {
            const oldResult: OldSubmissionResult = JSON.parse(oldSubmission.result);
            if (oldResult.systemMessage) result.systemMessage = parseOmittedString(oldResult.systemMessage);

            result.score = submission.score;
            result.status = submission.status;

            if (oldResult.compile) {
              let oldCompileMessage = oldResult.compile.message || "";

              // Replace confusing error message
              const matchResult =
                /Your source code compiled to (\d+) bytes which is too big, too thick, too long for us\.\./.exec(
                  oldCompileMessage
                );
              if (matchResult) {
                oldCompileMessage = `The source code compiled to ${matchResult[1]} bytes, exceeding the size limit.`;
              }

              const notConvertedRegex = /^A [a-zA-Z]+ encountered while compiling your code./;
              const notConverted = notConvertedRegex.test(oldCompileMessage);
              result.compile = {
                compileTaskHash: null,
                success: oldResult.compile.status === 2,
                message: parseOmittedString(notConverted ? oldCompileMessage : htmlToAnsi(oldCompileMessage))
              };
            }

            result.subtasks = [];
            result.testcaseResult = {};
            let i = 0;
            for (const oldSubtask of oldResult.judge?.subtasks || []) {
              result.subtasks.push({
                score: oldSubtask.score || 0,
                fullScore: Math.max(1, oldSubtask.score || 0),
                testcases: []
              });

              for (const oldCase of oldSubtask.cases) {
                const pseudoHash = `migrated_case_${++i}`;
                const oldCaseResult = oldCase.result;

                if (oldCase.status === 4) {
                  result.subtasks[result.subtasks.length - 1].testcases.push({});
                  continue;
                }

                result.subtasks[result.subtasks.length - 1].testcases.push({
                  testcaseHash: pseudoHash
                });

                if (problemInfo.type === ProblemType.Traditional) {
                  result.testcaseResult[pseudoHash] = <SubmissionTestcaseResultTraditional>{
                    testcaseInfo: {
                      timeLimit: problemInfo.timeLimit,
                      memoryLimit: problemInfo.memoryLimit,
                      inputFile: oldCaseResult.input?.name,
                      outputFile: oldCaseResult.output?.name
                    },
                    status: convertTestcaseStatus(oldCaseResult.type),
                    score: Math.round(oldCaseResult.scoringRate * 100),
                    time: oldCaseResult.time,
                    memory: oldCaseResult.memory,
                    input: parseOmittedString(oldCaseResult.input?.content || ""),
                    output: parseOmittedString(oldCaseResult.output?.content || ""),
                    userOutput: parseOmittedString(oldCaseResult.userOutput || ""),
                    userError: parseOmittedString(oldCaseResult.userError || ""),
                    checkerMessage: parseOmittedString(oldCaseResult.spjMessage),
                    systemMessage: parseOmittedString(oldCaseResult.systemMessage)
                  };
                } else if (problemInfo.type === ProblemType.Interaction) {
                  result.testcaseResult[pseudoHash] = <SubmissionTestcaseResultInteraction>{
                    testcaseInfo: {
                      timeLimit: problemInfo.timeLimit,
                      memoryLimit: problemInfo.memoryLimit,
                      inputFile: oldCaseResult.input?.name
                    },
                    status: convertTestcaseStatus(oldCaseResult.type),
                    score: Math.round(oldCaseResult.scoringRate * 100),
                    time: oldCaseResult.time,
                    memory: oldCaseResult.memory,
                    input: parseOmittedString(oldCaseResult.input?.content || ""),
                    userError: parseOmittedString(oldCaseResult.userError || ""),
                    interactorMessage: parseOmittedString(oldCaseResult.spjMessage),
                    systemMessage: parseOmittedString(oldCaseResult.systemMessage)
                  };
                } else if (problemInfo.type === ProblemType.SubmitAnswer) {
                  result.testcaseResult[pseudoHash] = <SubmissionTestcaseResultSubmitAnswer>{
                    testcaseInfo: {
                      inputFile: oldCaseResult.input?.name,
                      outputFile: oldCaseResult.output?.name
                    },
                    status: convertTestcaseStatus(oldCaseResult.type),
                    score: Math.round(oldCaseResult.scoringRate * 100),
                    input: parseOmittedString(oldCaseResult.input?.content || ""),
                    output: parseOmittedString(oldCaseResult.output?.content || ""),
                    userOutput: parseOmittedString(oldCaseResult.userOutput || ""),
                    userOutputLength: getOmittedStringLength(parseOmittedString(oldCaseResult.userOutput || "")),
                    checkerMessage: parseOmittedString(oldCaseResult.spjMessage),
                    systemMessage: parseOmittedString(oldCaseResult.systemMessage)
                  };
                }
              }
            }
          } catch (e) {
            Logger.warn(`Failed to migrate result for submission #${oldSubmission.id}, ${e}`);
            submissionDetail.result = null;
          }
        }

        if (
          !isSubmitAnswer &&
          ![
            SubmissionStatus.CompilationError,
            SubmissionStatus.ConfigurationError,
            SubmissionStatus.Pending,
            SubmissionStatus.SystemError
          ].includes(submission.status)
        ) {
          submission.timeUsed = oldSubmission.total_time;
          submission.memoryUsed = oldSubmission.max_memory;
        }

        await entityManager.save(submission);

        submissionDetail.submissionId = submission.id;
        await entityManager.save(submissionDetail);
      },
      10000
    );

    Logger.log("Calculating submission count of users and problems");

    await Promise.all([
      entityManager.query(
        "UPDATE `user` SET `submissionCount` = (SELECT COUNT(*) FROM `submission` WHERE `submitterId` = `user`.`id`), `acceptedProblemCount` = (SELECT COUNT(DISTINCT `problemId`) FROM `submission` WHERE `submitterId` = `user`.`id` AND `status` = 'Accepted')"
      ),
      entityManager.query(
        "UPDATE `problem` SET `submissionCount` = (SELECT COUNT(*) FROM `submission` WHERE `problemId` = `problem`.`id`), `acceptedSubmissionCount` = (SELECT COUNT(*) FROM `submission` WHERE `problemId` = `problem`.`id` AND `status` = 'Accepted')"
      )
    ]);
  }
};
