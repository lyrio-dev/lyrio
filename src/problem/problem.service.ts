import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository } from "typeorm";

import { ProblemEntity } from "./problem.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";
import { ProblemJudgeInfoService } from "./problem-judge-info.service";

@Injectable()
export class ProblemService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ProblemEntity)
    private readonly problemRepository: Repository<ProblemEntity>,
    @InjectRepository(ProblemJudgeInfoEntity)
    private readonly problemJudgeInfoRepository: Repository<
      ProblemJudgeInfoEntity
    >,
    private readonly problemJudgeInfoService: ProblemJudgeInfoService
  ) {}
}
