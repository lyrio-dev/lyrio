import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import { Redis } from "ioredis";

import { JudgeClientEntity } from "./judge-client.entity";
import { JudgeClientInfoDto } from "./dto/judge-client-info.dto";
import { RedisService } from "@/redis/redis.service";
import { JudgeClientSystemInfo } from "./judge-client-system-info.interface";

const JUDGE_CLIENT_KEY_BYTE_LENGTH = 30;

function generateKey(): string {
  return crypto.randomBytes(JUDGE_CLIENT_KEY_BYTE_LENGTH).toString("base64");
}

const REDIS_KEY_JUDGE_CLIENT_SESSION_ID = "judge-client-session-id:%d";
const REDIS_KEY_JUDGE_CLIENT_SYSTEM_INFO = "judge-client-system-info:%s";

@Injectable()
export class JudgeClientService {
  private readonly redis: Redis;

  constructor(
    @InjectRepository(JudgeClientEntity)
    private readonly judgeClientRepository: Repository<JudgeClientEntity>,
    private readonly redisService: RedisService
  ) {
    this.redis = this.redisService.getClient();
  }

  public async findJudgeClientById(id: number): Promise<JudgeClientEntity> {
    return await this.judgeClientRepository.findOne({ id: id });
  }

  public async findJudgeClientByKey(key: string): Promise<JudgeClientEntity> {
    return await this.judgeClientRepository.findOne({ key: key });
  }

  public async listJudgeClients(): Promise<JudgeClientEntity[]> {
    return await this.judgeClientRepository.find();
  }

  public async getJudgeClientInfo(judgeClient: JudgeClientEntity, showSensitive = false): Promise<JudgeClientInfoDto> {
    return {
      id: judgeClient.id,
      name: judgeClient.name,
      key: !showSensitive ? null : judgeClient.key,
      allowedHosts: !showSensitive ? null : judgeClient.allowedHosts,
      online: await this.isJudgeClientOnline(judgeClient),
      systemInfo: await this.getJudgeClientSystemInfo(judgeClient)
    };
  }

  public async addJudgeClient(name: string, allowedHosts: string[]): Promise<JudgeClientEntity> {
    const judgeClient = new JudgeClientEntity();
    judgeClient.name = name;
    judgeClient.key = generateKey();
    judgeClient.allowedHosts = allowedHosts;
    await this.judgeClientRepository.save(judgeClient);

    return judgeClient;
  }

  public async resetJudgeClientKey(judgeClient: JudgeClientEntity): Promise<void> {
    judgeClient.key = generateKey();
    await this.judgeClientRepository.save(judgeClient);
    await this.disconnectJudgeClient(judgeClient);
  }

  public async deleteJudgeClient(judgeClient: JudgeClientEntity): Promise<void> {
    await this.judgeClientRepository.delete({
      id: judgeClient.id
    });
    await this.disconnectJudgeClient(judgeClient);
  }

  public async setJudgeClientOnlineSessionId(judgeClient: JudgeClientEntity, sessionId: string): Promise<void> {
    await this.redis.set(REDIS_KEY_JUDGE_CLIENT_SESSION_ID.format(judgeClient.id), sessionId);
  }

  public async disconnectJudgeClient(judgeClient: JudgeClientEntity): Promise<void> {
    await this.redis.del(REDIS_KEY_JUDGE_CLIENT_SESSION_ID.format(judgeClient.id));
  }

  public async checkJudgeClientSession(judgeClient: JudgeClientEntity, sessionId: string): Promise<boolean> {
    return sessionId == (await this.redis.get(REDIS_KEY_JUDGE_CLIENT_SESSION_ID.format(judgeClient.id)));
  }

  public async updateJudgeClientSystemInfo(
    judgeClient: JudgeClientEntity,
    systemInfo: JudgeClientSystemInfo
  ): Promise<void> {
    await this.redis.set(REDIS_KEY_JUDGE_CLIENT_SYSTEM_INFO.format(judgeClient.id), JSON.stringify(systemInfo));
  }

  public async getJudgeClientSystemInfo(judgeClient: JudgeClientEntity): Promise<JudgeClientSystemInfo> {
    const str = await this.redis.get(REDIS_KEY_JUDGE_CLIENT_SYSTEM_INFO.format(judgeClient.id));
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  public async isJudgeClientOnline(judgeClient: JudgeClientEntity): Promise<boolean> {
    return !!(await this.redis.get(REDIS_KEY_JUDGE_CLIENT_SESSION_ID.format(judgeClient.id)));
  }
}
