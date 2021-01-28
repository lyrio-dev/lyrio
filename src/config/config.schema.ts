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

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly clusters: number;
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
  @IsUrl({ require_tld: false })
  readonly endpoint: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  readonly endpointForUser: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  readonly endpointForJudge: string;

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

class SecurityConfigRecaptcha {
  @IsString()
  @IsOptional()
  readonly secretKey: string;

  @IsBoolean()
  readonly useRecaptchaNet: boolean;

  @IsString()
  @IsOptional()
  readonly proxyUrl: string;
}

class SecurityConfigRateLimit {
  @IsInt()
  readonly maxRequests: number;

  @IsInt()
  readonly durationSeconds: number;
}

class SecurityConfig {
  @IsString()
  readonly sessionSecret: string;

  @IsString()
  readonly maintainceKey: string;

  @ValidateNested()
  @Type(() => SecurityConfigRecaptcha)
  readonly recaptcha: SecurityConfigRecaptcha;

  @ValidateNested()
  @Type(() => SecurityConfigCrossOrigin)
  readonly crossOrigin: SecurityConfigCrossOrigin;

  @ValidateNested()
  @Type(() => SecurityConfigRateLimit)
  @IsOptional()
  readonly rateLimit: SecurityConfigRateLimit;
}

// These config items will be sent to client
class PreferenceConfigSecurity {
  @IsBoolean()
  @ApiProperty()
  readonly recaptchaEnabled: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty()
  readonly recaptchaKey: string;

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
  @ApiProperty()
  readonly homepageUserList: number;

  @IsInt()
  @Min(1)
  @ApiProperty()
  readonly homepageProblemList: number;

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
  @IsString()
  @ApiProperty()
  readonly appLogo: string;

  @If(value => typeof value === "object" && Object.values(value).every(s => typeof s === "string"))
  @ApiProperty()
  readonly appLogoForTheme: Record<string, string>;

  @IsString()
  @IsOptional()
  @ApiProperty()
  readonly googleAnalyticsId: string;

  @IsString()
  @ApiProperty()
  readonly gravatarCdn: string;

  @IsBoolean()
  @ApiProperty()
  readonly redirectLegacyUrls: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty()
  readonly legacyContestsEntryUrl: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly homepageUserListOnMainView: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly sortUserByRating: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly renderMarkdownInUserBio: boolean;

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

  @IsBoolean()
  dynamicTaskPriority: boolean;
}

// These config items will be sent to client
export class PreferenceConfig {
  @IsString()
  @ApiProperty()
  readonly siteName: string;

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
  @Min(0)
  readonly problemSamplesToRun: number;

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

class EventReportConfig {
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

class VendorIp2RegionConfig {
  @IsString()
  readonly ipv4db: string;

  @IsString()
  readonly ipv6db: string;
}

class VendorConfig {
  @ValidateNested()
  @Type(() => VendorIp2RegionConfig)
  @IsOptional()
  readonly ip2region: VendorIp2RegionConfig;
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
  @Type(() => EventReportConfig)
  readonly eventReport: EventReportConfig;

  @ValidateNested()
  @Type(() => JudgeConfig)
  readonly judge: JudgeConfig;

  @ValidateNested()
  @Type(() => VendorConfig)
  readonly vendor: VendorConfig;
}
