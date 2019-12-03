import * as fs from "fs";
import { validateSync } from "class-validator";
import { plainToClass } from "class-transformer";
import { AppConfig } from "./config.schema";

export class ConfigService {
  public readonly config: AppConfig;

  constructor() {
    const filePath: string = process.env["SYZOJ_NG_CONFIG_FILE"];
    if (!filePath) {
      throw new Error(
        "Please specify configuration file with environment variable SYZOJ_NG_CONFIG_FILE"
      );
    }

    const config: object = JSON.parse(fs.readFileSync(filePath).toString());
    this.config = this.validateInput(config);
  }

  private validateInput(inputConfig: object): AppConfig {
    const appConfig: AppConfig = plainToClass(AppConfig, inputConfig);
    const errors: object[] = validateSync(appConfig, {
      validationError: {
        target: false
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Config validation error: ${JSON.stringify(errors, null, 2)}`
      );
    }
    return appConfig;
  }
}
