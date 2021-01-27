/* eslint-disable */
import path from "path";
import fs from "fs";
import { Readable } from "stream";

import { Logger } from "@nestjs/common";

import { EntityManager } from "typeorm";
import yaml from "js-yaml";
import { v5 as uuid } from "uuid";
import unzipper from "unzipper";
import tempy from "tempy";

import { Locale } from "@/common/locale.type";
import { isValidFilename } from "@/common/validators";
import { ProblemEntity, ProblemType } from "@/problem/problem.entity";
import { ProblemSampleDataMember } from "@/problem/problem-sample-data.interface";
import { ProblemSampleEntity } from "@/problem/problem-sample.entity";
import { ProblemJudgeInfoEntity } from "@/problem/problem-judge-info.entity";
import { ProblemJudgeInfo } from "@/problem/problem-judge-info.interface";
import { ProblemTagEntity } from "@/problem/problem-tag.entity";
import { ProblemContentSection, ProblemContentSectionType } from "@/problem/problem-content.interface";
import { LocalizedContentService } from "@/localized-content/localized-content.service";
import { LocalizedContentType } from "@/localized-content/localized-content.entity";
import { ProblemTagMapEntity } from "@/problem/problem-tag-map.entity";
import { ProblemTypeFactoryService } from "@/problem-type/problem-type-factory.service";
import { ProblemTypeServiceInterface } from "@/problem-type/problem-type-service.interface";
import { SubmissionContent } from "@/submission/submission-content.interface";
import { SubmissionTestcaseResult } from "@/submission/submission-progress.interface";
import { ProblemJudgeInfoTraditional } from "@/problem-type/types/traditional/problem-judge-info.interface";
import { ProblemJudgeInfoInteraction } from "@/problem-type/types/interaction/problem-judge-info.interface";
import { ProblemJudgeInfoSubmitAnswer } from "@/problem-type/types/submit-answer/problem-judge-info.interface";
import { ProblemFileEntity, ProblemFileType } from "@/problem/problem-file.entity";
import { ConfigService } from "@/config/config.service";
import { FileEntity } from "@/file/file.entity";
import { FileService } from "@/file/file.service";

import { CodeLanguage } from "@/code-language/code-language.type";
import CompileAndRunOptionsCpp from "@/code-language/compile-and-run-options/cpp";
import CompileAndRunOptionsC from "@/code-language/compile-and-run-options/c";
import CompileAndRunOptionsJava from "@/code-language/compile-and-run-options/java";
import CompileAndRunOptionsKotlin from "@/code-language/compile-and-run-options/kotlin";
import CompileAndRunOptionsPascal from "@/code-language/compile-and-run-options/pascal";
import CompileAndRunOptionsPython from "@/code-language/compile-and-run-options/python";
import CompileAndRunOptionsRust from "@/code-language/compile-and-run-options/rust";
import CompileAndRunOptionsGo from "@/code-language/compile-and-run-options/go";
import CompileAndRunOptionsHaskell from "@/code-language/compile-and-run-options/haskell";
import CompileAndRunOptionsCSharp from "@/code-language/compile-and-run-options/csharp";
import CompileAndRunOptionsFSharp from "@/code-language/compile-and-run-options/fsharp";

import { MigrationInterface } from "./migration.interface";
import {
  OldDatabaseProblemEntity,
  OldDatabaseProblemTagEntity,
  OldDatabaseProblemTagMapEntity
} from "./old-database.interface";

const sectionNames: Partial<Record<keyof OldDatabaseProblemEntity, string>> = {
  description: "题目描述",
  input_format: "输入格式",
  output_format: "输出格式",
  example: "样例",
  limit_and_hint: "数据范围与提示"
};

function displayProblem(oldProblem: OldDatabaseProblemEntity) {
  return `#${oldProblem.id}. ${oldProblem.title}`;
}

const regexSampleData = /^`+[^\n]*$\n([\s\S]*?)\n^`+[^\n]*$/m;
const markdownHeader = /^#+ /;
function parseSamples(sample: string): [sample: ProblemSampleDataMember, text: string][] {
  const lines = (sample || "").split("\n");
  const sections: [string, string][] = [];
  let currentSection = -1;
  for (const line of lines) {
    if (line.match(markdownHeader)) {
      sections[++currentSection] = [line, ""];
      continue;
    }

    if (currentSection !== -1) sections[currentSection][1] += `${line.trim()}\n`;
  }

  const samples: [sample: ProblemSampleDataMember, text: string][] = [];
  const ensureSampleIndex = (i: number) => {
    if (!samples[i]) samples[i] = [{ inputData: "", outputData: "" }, ""];
  };
  const extractSampleData = (str: string) => {
    const regex = new RegExp(regexSampleData);
    const result = regex.exec(str);
    if (result && result[1]) return [result[1], str.replace(regex, "")];
    return null;
  };

  let iIn = -1;
  let iOut = -1;
  for (const [title, content] of sections) {
    if (title.indexOf("入") !== -1 || title.toLowerCase().indexOf("input") !== -1) {
      ensureSampleIndex(++iIn);
      const result = extractSampleData(content);
      if (!result) return null;
      samples[iIn][0].inputData = result[0];
      samples[iIn][1] += `\n\n${result[1].trim()}`;
    } else if (title.indexOf("出") !== -1 || title.toLowerCase().indexOf("output") !== -1) {
      ensureSampleIndex(++iOut);
      const result = extractSampleData(content);
      if (!result) return null;
      samples[iOut][0].outputData = result[0];
      samples[iOut][1] += `\n\n${result[1].trim()}`;
    } else {
      const i = iIn >= 0 ? iIn : 0;
      ensureSampleIndex(i);
      samples[i][1] += `\n\n${content}`;
    }
  }

  if (iIn === iOut) return samples;

  return null;
}

export function parseProblemType(type: OldDatabaseProblemEntity["type"]) {
  switch (type) {
    case "interaction":
      return ProblemType.Interaction;
    case "submit-answer":
      return ProblemType.SubmitAnswer;
    case "traditional":
    default:
      return ProblemType.Traditional;
  }
}

export function getLanguageAndOptions(
  oldLanguageName: string,
  errorObjectDescription: string,
  onUnknownReturnDefault = true,
  ensureCppAtLeast11 = false
): { language: CodeLanguage; compileAndRunOptions: unknown } {
  oldLanguageName = oldLanguageName || "";

  switch (oldLanguageName) {
    case "cpp":
      return {
        language: CodeLanguage.Cpp,
        compileAndRunOptions: <CompileAndRunOptionsCpp>{
          compiler: "g++",
          std: ensureCppAtLeast11 ? "c++11" : "c++03",
          O: "2",
          m: "x32"
        }
      };
    case "cpp11":
      return {
        language: CodeLanguage.Cpp,
        compileAndRunOptions: <CompileAndRunOptionsCpp>{
          compiler: "g++",
          std: "c++11",
          O: "2",
          m: "x32"
        }
      };
    case "cpp17":
      return {
        language: CodeLanguage.Cpp,
        compileAndRunOptions: <CompileAndRunOptionsCpp>{
          compiler: "g++",
          std: "c++17",
          O: "2",
          m: "x32"
        }
      };
    case "cpp-noilinux":
      return {
        language: CodeLanguage.Cpp,
        compileAndRunOptions: <CompileAndRunOptionsCpp>{
          compiler: "g++",
          std: "c++03",
          O: "2",
          m: "32"
        }
      };
    case "cpp11-noilinux":
      return {
        language: CodeLanguage.Cpp,
        compileAndRunOptions: <CompileAndRunOptionsCpp>{
          compiler: "g++",
          std: "c++11",
          O: "2",
          m: "32"
        }
      };
    case "cpp11-clang":
      return {
        language: CodeLanguage.Cpp,
        compileAndRunOptions: <CompileAndRunOptionsCpp>{
          compiler: "clang++",
          std: "c++11",
          O: "2",
          m: "x32"
        }
      };
    case "cpp17-clang":
      return {
        language: CodeLanguage.Cpp,
        compileAndRunOptions: <CompileAndRunOptionsCpp>{
          compiler: "clang++",
          std: "c++17",
          O: "2",
          m: "x32"
        }
      };
    case "c":
      return {
        language: CodeLanguage.C,
        compileAndRunOptions: <CompileAndRunOptionsC>{
          compiler: "clang",
          std: "c99",
          O: "2",
          m: "x32"
        }
      };
    case "c-noilinux":
      return {
        language: CodeLanguage.C,
        compileAndRunOptions: <CompileAndRunOptionsC>{
          compiler: "clang",
          std: "c99",
          O: "2",
          m: "32"
        }
      };
    case "csharp":
      return {
        language: CodeLanguage.CSharp,
        compileAndRunOptions: <CompileAndRunOptionsCSharp>{
          version: "7.3"
        }
      };
    case "java":
      return {
        language: CodeLanguage.Java,
        compileAndRunOptions: <CompileAndRunOptionsJava>{}
      };
    case "pascal":
      return {
        language: CodeLanguage.Pascal,
        compileAndRunOptions: <CompileAndRunOptionsPascal>{
          optimize: "2"
        }
      };
    case "python2":
      return {
        language: CodeLanguage.Python,
        compileAndRunOptions: <CompileAndRunOptionsPython>{
          version: "2.7"
        }
      };
    case "python3":
      return {
        language: CodeLanguage.Python,
        compileAndRunOptions: <CompileAndRunOptionsPython>{
          version: "3.6"
        }
      };
    case "haskell":
      return {
        language: CodeLanguage.Haskell,
        compileAndRunOptions: <CompileAndRunOptionsHaskell>{
          version: "2010"
        }
      };
    case "nodejs":
    case "ruby":
    case "lua":
    case "luajit":
    case "vala":
    case "ocaml":
    case "vbnet":
  }

  if (!onUnknownReturnDefault) return null;

  Logger.warn(`Unsupported language "${oldLanguageName}" while processing ${errorObjectDescription}. Default to C++.`);
  return {
    language: CodeLanguage.Cpp,
    compileAndRunOptions: <CompileAndRunOptionsCpp>{
      compiler: "g++",
      std: "c++20",
      O: "2",
      m: "64"
    }
  };
}

function detectDefaultChecker(migratedTestDataFiles: ProblemFileEntity[]) {
  for (const file of migratedTestDataFiles) {
    if (file.filename.startsWith("spj_")) {
      const { name } = path.parse(file.filename);
      const [, language] = name.split("_");
      return { language, fileName: file.filename };
    }
  }
  return null;
}

async function parseJudgeInfo(
  oldProblem: OldDatabaseProblemEntity,
  typeService: ProblemTypeServiceInterface<ProblemJudgeInfo, SubmissionContent, SubmissionTestcaseResult>,
  oldDataDirectory: string,
  migratedTestDataFiles: ProblemFileEntity[]
): Promise<ProblemJudgeInfo> {
  const getScoringType = (type: "sum" | "mul" | "min") => {
    switch (type) {
      case "mul":
        return "GroupMul";
      case "min":
        return "GroupMin";
      case "sum":
      default:
        return "Sum";
    }
  };

  const judgeInfo = typeService.getDefaultJudgeInfo() as
    | ProblemJudgeInfoTraditional
    | ProblemJudgeInfoInteraction
    | ProblemJudgeInfoSubmitAnswer;

  let oldConfig: {
    subtasks: {
      score: number;
      type: "sum" | "mul" | "min";
      cases: (string | number)[];
    }[];
    inputFile?: string;
    outputFile?: string;
    userOutput?: string;
    specialJudge?: {
      language: string;
      fileName: string;
    };
    interactor?: {
      language: string;
      fileName: string;
    };
    extraSourceFiles?: {
      language: string;
      files: {
        name: string;
        dest: string;
      }[];
    }[];
  };

  try {
    oldConfig = yaml.load(await fs.promises.readFile(path.join(oldDataDirectory, "data.yml"), "utf-8")) as any;
  } catch (e) {}

  if (oldProblem.type === "traditional") {
    const judgeInfoTraditional = judgeInfo as ProblemJudgeInfoTraditional;
    if (oldProblem.file_io)
      judgeInfoTraditional.fileIo = {
        inputFilename: oldProblem.file_io_input_name,
        outputFilename: oldProblem.file_io_output_name
      };
    judgeInfoTraditional.timeLimit = oldProblem.time_limit;
    judgeInfoTraditional.memoryLimit = oldProblem.memory_limit;
    judgeInfoTraditional.runSamples = true;
  } else if (oldProblem.type === "interaction") {
    const judgeInfoInteraction = judgeInfo as ProblemJudgeInfoInteraction;
    judgeInfoInteraction.timeLimit = oldProblem.time_limit;
    judgeInfoInteraction.memoryLimit = oldProblem.memory_limit;
    judgeInfoInteraction.runSamples = true;
  } else if (oldProblem.type === "submit-answer") {
    const judgeInfoSubmitAnswer = judgeInfo as ProblemJudgeInfoSubmitAnswer;
    // nothing to do here
  }

  try {
    const specialJudge = oldConfig?.specialJudge || detectDefaultChecker(migratedTestDataFiles);

    if (oldProblem.type === "traditional" || oldProblem.type === "submit-answer") {
      if (specialJudge) {
        const useTestlib =
          specialJudge.language.startsWith("cpp") &&
          (await fs.promises.readFile(path.join(oldDataDirectory, specialJudge.fileName), "utf-8")).indexOf(
            "testlib.h"
          ) !== -1;

        (judgeInfo as ProblemJudgeInfoSubmitAnswer).checker = {
          type: "custom",
          interface: useTestlib ? "testlib" : "legacy",
          filename: specialJudge.fileName,
          ...getLanguageAndOptions(specialJudge.language, `problem ${displayProblem(oldProblem)}`, true, useTestlib),
          ...(oldProblem.type === "submit-answer"
            ? {
                timeLimit: 1000,
                memoryLimit: 512
              }
            : {})
        };
      } else {
        (judgeInfo as ProblemJudgeInfoSubmitAnswer).checker = {
          type: "lines",
          caseSensitive: true
        };
      }
    }

    if (oldConfig) {
      judgeInfo.subtasks = oldConfig.subtasks.map(subtask => ({
        scoringType: getScoringType(subtask.type),
        points: subtask.score,
        testcases: subtask.cases.map(caseId => {
          type Testcase = typeof judgeInfo["subtasks"][0]["testcases"][0];
          const testcase: Partial<Testcase> = {};
          if (typeof oldConfig.inputFile === "string")
            (testcase as { inputFile: string }).inputFile = oldConfig.inputFile.replace("#", String(caseId));
          if (typeof oldConfig.outputFile === "string")
            (testcase as { outputFile: string }).outputFile = oldConfig.outputFile.replace("#", String(caseId));
          if (typeof oldConfig.userOutput === "string")
            (testcase as { userOutputFilename: string }).userOutputFilename = oldConfig.userOutput.replace(
              "#",
              String(caseId)
            );
          return testcase as any;
        })
      }));

      if (oldProblem.type === "interaction") {
        if (!oldConfig.interactor) throw new Error("Interactor not configured in data.yml");
        (judgeInfo as ProblemJudgeInfoInteraction).interactor = {
          interface: "stdio",
          filename: oldConfig.interactor.fileName,
          ...getLanguageAndOptions(oldConfig.interactor.language, `problem ${displayProblem(oldProblem)}`, true, true)
        };
      }

      if (
        (oldProblem.type === "traditional" || oldProblem.type === "interaction") &&
        Array.isArray(oldConfig.extraSourceFiles)
      ) {
        (judgeInfo as ProblemJudgeInfoTraditional).extraSourceFiles = {};
        const { extraSourceFiles } = judgeInfo as ProblemJudgeInfoTraditional;
        for (const entry of oldConfig.extraSourceFiles) {
          const { language } = getLanguageAndOptions(entry.language, `problem ${displayProblem(oldProblem)}`) || {};
          if (!language || language in extraSourceFiles) continue;
          extraSourceFiles[language] = Object.fromEntries(
            entry.files
              .filter(({ dest }) => {
                if (!isValidFilename(dest)) {
                  Logger.warn(
                    `Ignoring invalid filename of extra source file ${JSON.stringify(dest)} in problem ${displayProblem(
                      oldProblem
                    )}`
                  );
                  return false;
                }

                return true;
              })
              .map(({ name, dest }) => [dest, name])
          );
        }
      }
    }
    typeService.validateAndFilterJudgeInfo(judgeInfo, migratedTestDataFiles, true);
  } catch (e) {
    Logger.error(`Failed to parse config of problem ${displayProblem(oldProblem)}, ${e}`);
  }

  return judgeInfo;
}

function uuidFromProblemAndFilename(problemId: number, type: ProblemFileType, filename: string) {
  const NAMESPACE = "c03eb380-e0a7-43f1-b276-9250f23663ee";
  return uuid(`${problemId}:${type}:${filename}`, NAMESPACE);
}

const ignoredFiles = ["data_rule.txt", "data.yml"];

export const migrationProblem: MigrationInterface = {
  async migrate(entityManager, config, oldDatabase, queryTablePaged, app) {
    const localizedContentService = app.get(LocalizedContentService);
    const problemTypeFactoryService = app.get(ProblemTypeFactoryService);
    const configService = app.get(ConfigService);
    const fileService = app.get(FileService);

    await queryTablePaged<OldDatabaseProblemTagEntity>("problem_tag", "id", async oldProblemTag => {
      const problemTag = new ProblemTagEntity();
      problemTag.id = oldProblemTag.id;
      problemTag.color = oldProblemTag.color;
      problemTag.locales = [Locale.zh_CN];
      await entityManager.save(problemTag);

      await localizedContentService.createOrUpdate(
        problemTag.id,
        LocalizedContentType.ProblemTagName,
        Locale.zh_CN,
        oldProblemTag.name
      );
    });

    await queryTablePaged<OldDatabaseProblemEntity>(
      "problem",
      "id",
      async oldProblem => {
        const problem = new ProblemEntity();
        problem.id = oldProblem.id;
        problem.displayId = oldProblem.id;
        problem.type = parseProblemType(oldProblem.type);
        problem.isPublic = !!oldProblem.is_public;
        problem.publicTime = oldProblem.publicize_time ? new Date(oldProblem.publicize_time) : null;
        problem.ownerId = oldProblem.user_id;
        problem.locales = [Locale.zh_CN];
        problem.submissionCount = 0;
        problem.acceptedSubmissionCount = 0;
        await entityManager.save(problem);

        const samples = parseSamples(oldProblem.example);

        const problemSample = new ProblemSampleEntity();
        problemSample.problemId = problem.id;
        problemSample.data = samples ? samples.map(([sample]) => sample) : [];
        await entityManager.save(problemSample);

        async function migrateFile(
          filename: string,
          size: number,
          streamOrFile: Readable | string,
          type: ProblemFileType,
          transactionalEntityManager: EntityManager
        ) {
          if (!isValidFilename(filename)) {
            Logger.warn(
              `Ignoring invalid problem file ${JSON.stringify(filename)} of problem ${displayProblem(oldProblem)}`
            );
            return null;
          }

          const fileUuid = uuidFromProblemAndFilename(oldProblem.id, type, filename);

          // Find existing record in new database first to continue a failed migration
          const fileEntity = (await entityManager.findOne(FileEntity, { uuid: fileUuid })) || new FileEntity();
          if (!fileEntity.uuid) {
            fileEntity.size = size;
            fileEntity.uploadTime = new Date();
            fileEntity.uuid = fileUuid;
            await transactionalEntityManager.save(fileEntity);

            if (!(await fileService.fileExistsInMinio(fileEntity.uuid)))
              await fileService.uploadFile(fileEntity.uuid, streamOrFile);
          }

          const problemFile = new ProblemFileEntity();
          problemFile.problemId = problem.id;
          problemFile.filename = filename;
          problemFile.type = type;
          problemFile.uuid = fileEntity.uuid;
          await transactionalEntityManager.save(problemFile);

          return problemFile;
        }

        const oldDataDirectory = path.join(config.uploads, "testdata", String(oldProblem.id));
        const migratedTestDataFiles = (
          await (async () => {
            try {
              let dataFiles: string[];
              try {
                dataFiles = (await fs.promises.readdir(oldDataDirectory)).filter(file => !ignoredFiles.includes(file));
              } catch (e) {
                if (e.code === "ENOENT") {
                  return [];
                }
                throw e;
              }

              return await entityManager.transaction(
                "READ COMMITTED",
                async transactionalEntityManager =>
                  await Promise.all(
                    dataFiles.map(async file => {
                      const fullPath = path.join(oldDataDirectory, file);
                      const stat = await fs.promises.stat(fullPath);
                      if (!stat.isFile()) {
                        Logger.warn(`Ignoring non-file file ${fullPath} of problem ${displayProblem(oldProblem)}`);
                        return;
                      }
                      const { size } = stat;
                      const stream = fs.createReadStream(fullPath);
                      const promise = new Promise<ProblemFileEntity>((resolve, reject) => {
                        stream.on("error", reject);
                        migrateFile(file, size, stream, ProblemFileType.TestData, transactionalEntityManager)
                          .then(resolve)
                          .catch(reject);
                      });
                      const result = await promise;
                      return result;
                    })
                  )
              );
            } catch (e) {
              Logger.error(`Failed to migrate testdata files for problem ${displayProblem(oldProblem)}, ${e}`);
              return [];
            }
          })()
        ).filter(x => x);

        if (oldProblem.additional_file_id) {
          let md5: string;
          try {
            md5 = (
              await oldDatabase.query(`SELECT \`md5\` FROM \`file\` WHERE \`id\` = ${oldProblem.additional_file_id}`)
            )[0].md5;
          } catch (e) {
            Logger.error(
              `Failed to migrate additional files for problem ${displayProblem(
                oldProblem
              )}: Can't find additional file in file table`
            );
          }

          if (md5) {
            const tempDirectory = tempy.directory({ prefix: `problem_additional_file_${oldProblem.id}_` });
            try {
              const additionalFile = path.join(config.uploads, "additional_file", md5);

              await entityManager.transaction("READ COMMITTED", async transactionalEntityManager => {
                await (await unzipper.Open.file(additionalFile)).extract({ path: tempDirectory });
                const files = await fs.promises.readdir(tempDirectory);
                await Promise.all(
                  files.map(async file => {
                    const fullPath = path.join(tempDirectory, file);
                    const stat = await fs.promises.lstat(fullPath);
                    if (stat.isFile()) {
                      await migrateFile(
                        file,
                        stat.size,
                        fullPath,
                        ProblemFileType.AdditionalFile,
                        transactionalEntityManager
                      );
                    }
                  })
                );
              });
            } catch (e) {
              Logger.error(`Failed to migrate additional files for problem ${displayProblem(oldProblem)}, ${e}`);
            } finally {
              await fs.promises.rmdir(tempDirectory, { recursive: true });
            }
          }
        }

        const problemJudgeInfo = new ProblemJudgeInfoEntity();
        problemJudgeInfo.problemId = problem.id;
        problemJudgeInfo.judgeInfo = await parseJudgeInfo(
          oldProblem,
          problemTypeFactoryService.type(problem.type),
          oldDataDirectory,
          migratedTestDataFiles
        );
        await entityManager.save(problemJudgeInfo);

        const contentSections: ProblemContentSection[] = Object.keys(sectionNames)
          .map((section: keyof OldDatabaseProblemEntity) => {
            const content: string = (oldProblem[section] as string) || "";
            if (!content.trim()) return null;

            if (section === "example") {
              if (samples) {
                const results: ProblemContentSection[] = [];
                let i = 0;
                for (const [, text] of samples) {
                  results.push({
                    sectionTitle: samples.length === 1 ? "样例" : `样例 ${i + 1}`,
                    type: ProblemContentSectionType.Sample,
                    sampleId: i,
                    text: text.trim()
                  });

                  i++;
                }
                return results;
              }

              Logger.warn(`Failed to parse sample for problem ${displayProblem(oldProblem)}`);
            }

            return <ProblemContentSection>{
              sectionTitle: sectionNames[section],
              type: ProblemContentSectionType.Text,
              text: content
            };
          })
          .flat()
          .filter(x => x);
        if (contentSections.length === 0)
          contentSections.push({
            sectionTitle: "",
            type: ProblemContentSectionType.Text,
            text: ""
          });

        await localizedContentService.createOrUpdate(
          problem.id,
          LocalizedContentType.ProblemTitle,
          Locale.zh_CN,
          oldProblem.title
        );

        await localizedContentService.createOrUpdate(
          problem.id,
          LocalizedContentType.ProblemContent,
          Locale.zh_CN,
          JSON.stringify(contentSections)
        );
      },
      1
    );

    await queryTablePaged<OldDatabaseProblemTagMapEntity>("problem_tag_map", "problem_id", async oldMap => {
      const map = new ProblemTagMapEntity();
      map.problemId = oldMap.problem_id;
      map.problemTagId = oldMap.tag_id;

      try {
        await entityManager.save(map);
      } catch (e) {
        if (
          (await entityManager.count(ProblemEntity, { id: map.problemId })) !== 0 &&
          (await entityManager.count(ProblemTagEntity, { id: map.problemTagId })) !== 0
        )
          Logger.error(`Failed to save ProblemTagMap: ${JSON.stringify(map)}, ${e.message}`);
      }
    });
  }
};
