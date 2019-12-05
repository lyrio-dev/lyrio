import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { ConfigService } from "@/config/config.service";

export const databaseProviders = [
  TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      type: configService.config.database.type,
      host: configService.config.database.host,
      port: configService.config.database.port,
      username: configService.config.database.username,
      password: configService.config.database.password,
      database: configService.config.database.database,
      entities: [__dirname + "/../**/*.entity{.ts,.js}"],
      synchronize: true
    }),
    inject: [ConfigService]
  })
];
