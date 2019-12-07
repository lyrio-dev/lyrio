import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { ConfigService } from "@/config/config.service";

let patched = false;

function patchTypeOrm() {
  const TypeORMMysqlDriver = require("typeorm/driver/mysql/MysqlDriver");
  const OriginalNormalizeType =
    TypeORMMysqlDriver.MysqlDriver.prototype.normalizeType;
  TypeORMMysqlDriver.MysqlDriver.prototype.normalizeType = function(column) {
    if (column.type === "json") {
      return "longtext";
    }
    return OriginalNormalizeType(column);
  };
}

export const databaseProviders = [
  TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => {
      if (configService.config.database.type === "mariadb" && !patched) {
        patchTypeOrm();
        patched = true;
      }

      return {
        type: configService.config.database.type,
        host: configService.config.database.host,
        port: configService.config.database.port,
        username: configService.config.database.username,
        password: configService.config.database.password,
        database: configService.config.database.database,
        entities: [__dirname + "/../**/*.entity{.ts,.js}"],
        synchronize: true
      };
    },
    inject: [ConfigService]
  })
];
