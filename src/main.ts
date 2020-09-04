import util from "util";

import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Logger, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

import getGitRepoInfo from "git-repo-info";
import moment from "moment";

import { AppModule } from "./app.module";
import { ConfigService } from "./config/config.service";

// eslint-disable-next-line no-extend-native
String.prototype.format = function format(...args) {
  return util.format.call(undefined, this, ...args);
};

async function bootstrap() {
  // Get package info
  const packageInfo = require("../package.json"); // eslint-disable-line @typescript-eslint/no-var-requires
  const gitRepoInfo = getGitRepoInfo();
  const appVersion = `v${packageInfo.version}`;
  const gitRepoVersion = gitRepoInfo.sha
    ? ` (Git revision ${gitRepoInfo.sha.substr(8)} on ${moment(gitRepoInfo.committerDate).format(
        "YYYY-MM-DD H:mm:ss"
      )})`
    : "";

  Logger.log(`Starting ${packageInfo.name} version ${appVersion}${gitRepoVersion}`, "Bootstrap");

  // Create nestjs app
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService: ConfigService = app.get(ConfigService);
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.set("trust proxy", configService.config.server.trustProxy);

  // Configure swagger
  Logger.log(`Setting up Swagger API document builder`, "Bootstrap");

  const options = new DocumentBuilder()
    .setTitle(packageInfo.name)
    .setDescription(packageInfo.description)
    .setVersion(appVersion)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("/docs", app, document);

  // Start nestjs app
  await app.listen(configService.config.server.port, configService.config.server.hostname);
  Logger.log(
    `${packageInfo.name} is listening on ${configService.config.server.hostname}:${configService.config.server.port}`,
    "Bootstrap"
  );
}

bootstrap().catch(err => {
  console.error(err); // eslint-disable-line no-console
  console.error("Error bootstrapping the application, exiting..."); // eslint-disable-line no-console
  process.exit(1);
});
