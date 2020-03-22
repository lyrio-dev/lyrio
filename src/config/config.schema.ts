import { ApiProperty } from "@nestjs/swagger";
import { ValidateNested, IsIP, IsString, IsIn, IsBoolean, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { IsPortNumber } from "@/common/validators";

class ServerConfig {
  @IsIP()
  readonly hostname: string;

  @IsPortNumber()
  readonly port: number;
}

class DatabaseConfig {
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

class MinioConfig {
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

class ServicesConfig {
  @ValidateNested()
  @Type(() => DatabaseConfig)
  readonly database: DatabaseConfig;

  @ValidateNested()
  @Type(() => MinioConfig)
  readonly minio: MinioConfig;

  @IsString()
  readonly redis: string;
}

class CrossOriginConfig {
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
  @Type(() => CrossOriginConfig)
  readonly crossOrigin: CrossOriginConfig;
}

// This config items will be sent to client
export class PreferenceConfig {
  @IsBoolean()
  @ApiProperty()
  readonly allowUserChangeUsername: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowEveryoneCreateProblem: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowOwnerManageProblemPermission: boolean;

  @IsBoolean()
  @ApiProperty()
  readonly allowOwnerDeleteProblem: boolean;
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
}

class QueryLimitConfig {
  @IsInt()
  @Min(0)
  readonly problemSetProblemsTake: number;

  @IsInt()
  @Min(0)
  readonly submissionsTake: number;

  @IsInt()
  @Min(0)
  readonly submissionStatisticsTake: number;

  @IsInt()
  @Min(0)
  readonly searchUserTake: number;

  @IsInt()
  @Min(0)
  readonly searchGroupTake: number;

  @IsInt()
  @Min(0)
  readonly userListUsersTake: number;
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
}
