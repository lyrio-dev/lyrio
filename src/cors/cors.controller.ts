import fs from "fs-extra";

import { Controller, Get, Header } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import serialize from "serialize-javascript";

import { ConfigService } from "@/config/config.service";

const getXdomainProxyHtml = (whiteList: string[]) =>
  `<!doctype html>
<head>
  <title>xdomain proxy page</title>
  <script src="xdomain.min.js"></script>
  <script>
    xdomain.masters(${serialize(Object.fromEntries(whiteList.map(origin => [origin, "*"])))});
  </script>
</head>`;

@ApiTags("CORS")
@Controller("cors")
export class CorsController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @Header("Content-Type", "text/html")
  @ApiOperation({
    summary: "Get the proxy page for xdomain (used for CORS requests)."
  })
  public async cors(): Promise<string> {
    if (!this.configService.config.security.crossOrigin.enabled) {
      return "Requested cors proxy page, but cross origin is NOT enabled";
    }

    return getXdomainProxyHtml(this.configService.config.security.crossOrigin.whiteList);
  }

  @Get("xdomain.min.js")
  @Header("Content-Type", "application/javascript")
  @Header("Cache-Control", "public, max-age=31536000")
  @ApiOperation({
    summary: "Get the xdomain script (used for CORS requests)."
  })
  public async xdomain(): Promise<string> {
    if (!this.configService.config.security.crossOrigin.enabled) {
      return "console.error('Requested cors/xdomain.min.js, but cross origin is NOT enabled');";
    }

    return (await fs.readFile(require.resolve("xdomain/dist/xdomain.min"))).toString("utf-8");
  }
}
