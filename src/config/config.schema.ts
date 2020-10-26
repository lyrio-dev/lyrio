import { ApiProperty } from "@nestjs/swagger";

import {
  ValidateNested,
  IsIP,
  IsString,
  IsIn,
  IsBoolean,
  IsInt,
  Min,
  IsEmail,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsUrl
} from "class-validator";
import { Type } from "class-transformer";

import { If, isEmoji, IsEmoji, IsPortNumber } from "@/common/validators";

import { ConfigRelation, ConfigRelationType } from "./config-relation.decorator";

class ServerConfig {
  @IsIP()
  readonly hostname: string;

  @IsPortNumber()
  readonly port: number;

  @IsArray()
  @IsString({ each: true })
  readonly trustProxy: string;
}

class ServicesConfigDatabase {
  @IsIn(["mysql", "mariadb"])
  readonly type: "mysql" | "mariadb";

  @IsString()
  readonly host: string;

  @IsPortNumber()
  readonly port: number;

  @IsString()
  readonly username: string;

  @IsString()
  readonly password: string;

  @IsString()
  readonly database: string;
}

class ServicesConfigMinio {
  @IsString()
  readonly endPoint: string;

  @IsPortNumber()
  readonly port: number;

  @IsBoolean()
  readonly useSSL: boolean;

  @IsString()
  readonly accessKey: string;

  @IsString()
  readonly secretKey: string;

  @IsString()
  readonly bucket: string;
}

class ServicesConfigMail {
  @IsEmail()
  @IsOptional()
  readonly address: string;

  readonly transport: unknown;
}

class ServicesConfig {
  @ValidateNested()
  @Type(() => ServicesConfigDatabase)
  readonly database: ServicesConfigDatabase;

  @ValidateNested()
  @Type(() => ServicesConfigMinio)
  readonly minio: ServicesConfigMinio;

  @IsString()
  readonly redis: string;

  @ValidateNested()
  @Type(() => ServicesConfigMail)
  readonly mail: ServicesConfigMail;
}

class SecurityConfigCrossOrigin {
  @IsBoolean()
  readonly enabled: boolean;

  @IsString({
    each: true
  })
  readonly whiteList: string[];
}

class SecurityConfig {
  @IsString()
  readonly sessionSecret: string;

  @IsString()
  readonly maintainceKey: string;

  @ValidateNested()
  @Type(() => SecurityConfigCrossOrigin)
  readonly crossOrigin: SecurityConfigCrossOrigin;
}

// These config items will be sent to client
class PreferenceConfigFrontend {
  @IsBoolean()
  @ApiProperty()
  readonly redirectLegacyUrls: boolean;
}

// These config items will be sent to client
class PreferenceConfigSecurity {
  @IsBoolean()
  @ApiProperty()
  readonly requireEmailVerification: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowUserChangeUsername: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowEveryoneCreateProblem: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowNonPrivilegedUserEditPublicProblem: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowOwnerManageProblemPermission: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowOwnerDeleteProblem: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly discussionDefaultPublic: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly discussionReplyDefaultPublic: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowEveryoneCreateDiscussion: boolean;
}

// These config items will be sent to client
class PreferenceConfigPagination {
  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.problemSet", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly problemSet: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.problemSet", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly searchProblemsPreview: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.submissions", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly submissions: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.submissionStatistics", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly submissionStatistics: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.userList", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly userList: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.userAuditLogs", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly userAuditLogs: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.discussions", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly discussions: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.discussions", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly searchDiscussionsPreview: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.discussionReplies", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly discussionReplies: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("preference.pagination.discussionReplies", ConfigRelationType.LessThan)
  @ApiProperty()
  readonly discussionRepliesHead: number;

  @IsInt()
  @Min(1)
  @ConfigRelation("queryLimit.discussionReplies", ConfigRelationType.LessThanOrEqual)
  @ApiProperty()
  readonly discussionRepliesMore: number;
}

// These config items will be sent to client
class PreferenceConfigMisc {
  @IsEmoji({ each: true })
  @IsString({ each: true })
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsArray()
  @ApiProperty()
  readonly discussionReactionEmojis: string[];

  @IsBoolean()
  @ApiProperty()
  readonly discussionReactionAllowCustomEmojis: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly renderMarkdownInUserBio: boolean;
}

class PreferenceConfigServerSideOnly {
  @If((blacklist: string | unknown[]) =>
    (function validate(value: string | unknown[]) {
      if (typeof value === "string") return (value.startsWith("/") && value.endsWith("/")) || isEmoji(value);
      else if (Array.isArray(value)) return value.every(validate);
      else return false;
    })(blacklist)
  )
  discussionReactionCustomEmojisBlacklist: string | unknown[];
}

// These config items will be sent to client
export class PreferenceConfig {
  @IsString()
  @ApiProperty()
  readonly siteName: string;

  @ValidateNested()
  @Type(() => PreferenceConfigFrontend)
  @ApiProperty()
  readonly frontend: PreferenceConfigFrontend;

  @ValidateNested()
  @Type(() => PreferenceConfigSecurity)
  @ApiProperty()
  readonly security: PreferenceConfigSecurity;

  @ValidateNested()
  @Type(() => PreferenceConfigPagination)
  @ApiProperty()
  readonly pagination: PreferenceConfigPagination;

  @ValidateNested()
  @Type(() => PreferenceConfigMisc)
  @ApiProperty()
  readonly misc: PreferenceConfigMisc;

  @ValidateNested()
  @Type(() => PreferenceConfigServerSideOnly)
  serverSideOnly: PreferenceConfigServerSideOnly;
}

class ResourceLimitConfig {
  @IsInt()
  @Min(0)
  readonly problemTestdataFiles: number;

  @IsInt()
  @Min(0)
  readonly problemTestdataSize: number;

  @IsInt()
  @Min(0)
  readonly problemAdditionalFileFiles: number;

  @IsInt()
  @Min(0)
  readonly problemAdditionalFileSize: number;

  @IsInt()
  @Min(1)
  readonly problemTestcases: number;

  @IsInt()
  @Min(1)
  readonly problemTimeLimit: number;

  @IsInt()
  @Min(1)
  readonly problemMemoryLimit: number;

  @IsInt()
  @Min(0)
  readonly submissionFileSize: number;
}

class QueryLimitConfig {
  @IsInt()
  @Min(1)
  readonly problemSet: number;

  @IsInt()
  @Min(1)
  readonly submissions: number;

  @IsInt()
  @Min(1)
  readonly submissionStatistics: number;

  @IsInt()
  @Min(1)
  readonly searchUser: number;

  @IsInt()
  @Min(1)
  readonly searchGroup: number;

  @IsInt()
  @Min(1)
  readonly userList: number;

  @IsInt()
  @Min(1)
  readonly userAuditLogs: number;

  @IsInt()
  @Min(1)
  @ApiProperty()
  readonly discussions: number;

  @IsInt()
  @Min(1)
  @ApiProperty()
  readonly discussionReplies: number;
}

class JudgeLimitConfig {
  @IsInt()
  @Min(1)
  compilerMessage: number;

  @IsInt()
  @Min(1)
  outputSize: number;

  @IsInt()
  @Min(1)
  dataDisplay: number;

  @IsInt()
  @Min(1)
  dataDisplayForSubmitAnswer: number;

  @IsInt()
  @Min(1)
  stderrDisplay: number;
}

class JudgeConfig {
  @ValidateNested()
  @Type(() => JudgeLimitConfig)
  readonly limit: JudgeLimitConfig;
}

class ErrorReportingConfig {
  @IsString()
  @IsOptional()
  readonly telegramBotToken?: string;

  @IsUrl()
  @IsOptional()
  readonly telegramApiRoot?: string;

  @If(value => typeof value === "string" || typeof value === "number")
  @IsOptional()
  readonly sentTo?: string | number;

  @IsString()
  @IsOptional()
  readonly proxyUrl?: string;
}

class VendorConfig {
  @IsString()
  @IsOptional()
  readonly ip2region: string;
}

export class AppConfig {
  @ValidateNested()
  @Type(() => ServerConfig)
  readonly server: ServerConfig;

  @ValidateNested()
  @Type(() => ServicesConfig)
  readonly services: ServicesConfig;

  @ValidateNested()
  @Type(() => SecurityConfig)
  readonly security: SecurityConfig;

  @ValidateNested()
  @Type(() => PreferenceConfig)
  readonly preference: PreferenceConfig;

  @ValidateNested()
  @Type(() => ResourceLimitConfig)
  readonly resourceLimit: ResourceLimitConfig;

  @ValidateNested()
  @Type(() => QueryLimitConfig)
  readonly queryLimit: QueryLimitConfig;

  @ValidateNested()
  @Type(() => ErrorReportingConfig)
  readonly errorReporting: ErrorReportingConfig;

  @ValidateNested()
  @Type(() => JudgeConfig)
  readonly judge: JudgeConfig;

  @ValidateNested()
  @Type(() => VendorConfig)
  readonly vendor: VendorConfig;
}
