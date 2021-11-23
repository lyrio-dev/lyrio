import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigService } from "@/config/config.service";

export const databaseProviders = [
  TypeOrmModule.forRootAsync({
    useFactory: (configService: ConfigService) => ({
      type: configService.config.services.database.type,
      host: configService.config.services.database.host,
      port: configService.config.services.database.port,
      username: configService.config.services.database.username,
      password: configService.config.services.database.password,
      database: configService.config.services.database.database,
      entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
      logging: !!process.env.LYRIO_LOG_SQL,
      synchronize: true
    }),
    inject: [ConfigService]
  })
];
