import fs from "fs-extra";

import { Controller, Get, Header } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import serialize from "serialize-javascript";
import { minify as minifyJs } from "terser";
import cheerio from "cheerio";

import { ConfigService } from "@/config/config.service";

// xdomain
const getXdomainProxyHtml = (whiteList: string[]) =>
  `<script src=xdomain.min.js></script><script>xdomain.masters(${serialize(
    Object.fromEntries(whiteList.map(origin => [origin, "*"]))
  )});</script>`;
const xdomainScript = minifyJs(fs.readFileSync(require.resolve("xdomain/dist/xdomain.min"), "utf-8")).then(
  ({ code }) => code
);

// streamSaver
const streamSaverMitmHtml = (async () => {
  const $ = cheerio.load(fs.readFileSync(require.resolve("streamsaver/mitm.html"), "utf-8"));
  const script = $("script").html();
  const minifiedScript = (await minifyJs(script)).code;
  return `<script>${minifiedScript}</script>`;
})();
const streamSaverSwScript = minifyJs(fs.readFileSync(require.resolve("streamsaver/sw.js"), "utf-8")).then(
  ({ code }) => code
);

@ApiTags("CORS")
@Controller("cors")
export class CorsController {
  constructor(private readonly configService: ConfigService) {}

  @Get("xdomain.html")
  @Header("Cache-Control", "public, max-age=31536000")
  @Header("Content-Type", "text/html")
  @ApiOperation({
    summary: "Get the proxy page for xdomain (used for CORS requests)."
  })
  async cors(): Promise<string> {
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
  async xdomain(): Promise<string> {
    if (!this.configService.config.security.crossOrigin.enabled) {
      return "console.error('Requested cors/xdomain.min.js, but cross origin is NOT enabled');";
    }

    return await xdomainScript;
  }

  @Get("streamsaver/mitm.html")
  @Header("Content-Type", "text/html")
  @Header("Cache-Control", "public, max-age=31536000")
  @ApiOperation({
    summary: "Get the proxy page for streamsaver (used for download-as-archive)."
  })
  async streamsaverMitm(): Promise<string> {
    return await streamSaverMitmHtml;
  }

  @Get("streamsaver/sw.js")
  @Header("Content-Type", "application/javascript")
  @Header("Cache-Control", "public, max-age=31536000")
  @ApiOperation({
    summary: "Get the service worker script for streamsaver (used for download-as-archive)."
  })
  async streamsaverSw(): Promise<string> {
    return await streamSaverSwScript;
  }
}
