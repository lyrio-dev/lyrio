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
  IsArray
} from "class-validator";
import { Type } from "class-transformer";

import { IsPortNumber } from "@/common/validators";

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

export class PreferenceConfigSecurity {
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
  readonly allowNonAdminEditPublicProblem: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowOwnerManageProblemPermission: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowOwnerDeleteProblem: boolean;
}

// This config items will be sent to client
export class PreferenceConfig {
  @IsString()
  @ApiProperty()
  readonly siteName: string;

  @ValidateNested()
  @Type(() => PreferenceConfigSecurity)
  @ApiProperty()
  readonly security: PreferenceConfigSecurity;
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
  @Min(0)
  readonly problemSet: number;

  @IsInt()
  @Min(0)
  readonly submissions: number;

  @IsInt()
  @Min(0)
  readonly submissionStatistics: number;

  @IsInt()
  @Min(0)
  readonly searchUser: number;

  @IsInt()
  @Min(0)
  readonly searchGroup: number;

  @IsInt()
  @Min(0)
  readonly userList: number;

  @IsInt()
  @Min(1)
  readonly userAuditLogs: number;
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
  @Type(() => VendorConfig)
  readonly vendor: VendorConfig;
}
