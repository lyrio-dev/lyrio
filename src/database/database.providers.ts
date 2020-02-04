import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { ConfigService } from "@/config/config.service";

let patched = false;

function patchTypeOrm() {
  const TypeORMMysqlDriver = require("typeorm/driver/mysql/MysqlDriver");
  const OriginalNormalizeType = TypeORMMysqlDriver.MysqlDriver.prototype.normalizeType;
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
      if (configService.config.services.database.type === "mariadb" && !patched) {
        patchTypeOrm();
        patched = true;
      }

      return {
        type: configService.config.services.database.type,
        host: configService.config.services.database.host,
        port: configService.config.services.database.port,
        username: configService.config.services.database.username,
        password: configService.config.services.database.password,
        database: configService.config.services.database.database,
        entities: [__dirname + "/../**/*.entity{.ts,.js}"],
        logging: !!process.env["SYZOJ_NG_LOG_SQL"],
        synchronize: true
      };
    },
    inject: [ConfigService]
  })
];
