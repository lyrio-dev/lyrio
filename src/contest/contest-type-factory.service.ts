import { Injectable } from "@nestjs/common";

import { ContestType } from "./contest.entity";

import { ContestTypeServiceInterface } from "./contest-type-service.interface";

import { ContestTypeBasicService } from "./types/basic/contest-type.service";
import { ContestTypeIcpcService } from "./types/icpc/contest-type.service";

@Injectable()
export class ContestTypeFactoryService {
  private readonly typeServices: Record<ContestType, ContestTypeServiceInterface<unknown, unknown>>;

  constructor(
    private readonly contestTypeBasicService: ContestTypeBasicService,
    private readonly contestTypeIcpcService: ContestTypeIcpcService
  ) {
    this.typeServices = {
      [ContestType.Basic]: this.contestTypeBasicService,
      [ContestType.ICPC]: this.contestTypeIcpcService
    };
  }

  type(contestType: ContestType): ContestTypeServiceInterface<unknown, unknown> {
    return this.typeServices[contestType];
  }
}
