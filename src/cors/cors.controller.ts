import { Controller, Get, Header } from "@nestjs/common";
import { ApiResponse, ApiUseTags } from "@nestjs/swagger";
import * as fs from "fs-extra";
import * as serialize from "serialize-javascript";

import { ConfigService } from "@/config/config.service";

const getXdomainProxyHtml = whiteList =>
  `<!doctype html>
<head>
  <title>xdomain proxy page</title>
  <script src="xdomain.min.js"></script>
  <script>
    xdomain.masters(${serialize(
      (Object as any).fromEntries(whiteList.map(origin => [origin, "*"]))
    )});
  </script>
</head>`;

@ApiUseTags("CORS")
@Controller("cors")
export class CorsController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @Header("Content-Type", "text/html")
  @ApiResponse({
    status: 200,
    type: String,
    description:
      "Return the proxy page for xdomain, which is used for CORS requests"
  })
  public async cors(): Promise<string> {
    if (!this.configService.config.security.crossOrigin.enabled) {
      return "Requested cors proxy page, but cross origin is NOT enabled";
    }

    return getXdomainProxyHtml(
      this.configService.config.security.crossOrigin.whiteList
    );
  }

  @Get("xdomain.min.js")
  @Header("Content-Type", "application/javascript")
  @Header("Cache-Control", "public, max-age=31536000")
  @ApiResponse({
    status: 200,
    type: String,
    description: "Return the xdomain script, which is used for CORS requests"
  })
  public async xdomain(): Promise<string> {
    if (!this.configService.config.security.crossOrigin.enabled) {
      return "console.error('Requested cors/xdomain.min.js, but cross origin is NOT enabled');";
    }

    return (
      await fs.readFile(require.resolve("xdomain/dist/xdomain.min"))
    ).toString("utf-8");
  }
}
