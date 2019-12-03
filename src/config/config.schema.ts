import {
  ValidateNested,
  IsIP,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
  IsBoolean
} from "class-validator";
import { Type } from "class-transformer";

class ServerConfig {
  @IsIP()
  readonly hostname: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  readonly port: number;
}

class DatabaseConfig {
  @IsIn(["mysql", "mariadb"])
  readonly type: "mysql" | "mariadb";

  @IsString()
  readonly host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  readonly port: number;

  @IsString()
  readonly username: string;

  @IsString()
  readonly password: string;

  @IsString()
  readonly database: string;
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

  @ValidateNested()
  @Type(() => CrossOriginConfig)
  readonly crossOrigin: CrossOriginConfig;
}

export class AppConfig {
  @ValidateNested()
  @Type(() => ServerConfig)
  readonly server: ServerConfig;

  @ValidateNested()
  @Type(() => DatabaseConfig)
  readonly database: DatabaseConfig;

  @ValidateNested()
  @Type(() => SecurityConfig)
  readonly security: SecurityConfig;
}
