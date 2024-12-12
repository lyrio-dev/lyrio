import url from "url";

import { NestMiddleware, Injectable } from "@nestjs/common";

import { Request, Response } from "express"; // eslint-disable-line import/no-extraneous-dependencies
import responseTime from "response-time";

import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsSerivce: MetricsService) {}

  private readonly metricRequestLatency = this.metricsSerivce.histogram(
    "syzoj_ng_request_latency_seconds",
    this.metricsSerivce.histogram.BUCKETS_TIME_5S_10,
    ["api"]
  );

  private readonly responseTimeMiddleware = responseTime((req, res, time) => {
    if (!req.url || !(res.statusCode >= 200 && res.statusCode < 400)) return;
    this.metricRequestLatency.observe({ api: url.parse(req.url).pathname }, time / 1000);
  });

  async use(req: Request, res: Response, next: () => void) {
    this.responseTimeMiddleware(req, res, next);
  }
}
