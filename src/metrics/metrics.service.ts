import cluster from "cluster";
import http from "http";

import { Injectable, Logger } from "@nestjs/common";

import PromClient from "prom-client";

import { ConfigService } from "@/config/config.service";

@Injectable()
export class MetricsService {
  private readonly registry = new PromClient.Registry();

  private readonly processName = cluster.isPrimary ? "Master" : `Worker #${cluster.worker.id}`;

  private readonly logger = new Logger(`${MetricsService.name}/${this.processName}`);

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.config.metrics;
    if (!config) {
      this.logger.warn("Metrics not configured");
      return;
    }

    PromClient.collectDefaultMetrics({ register: this.registry });

    const processName = cluster.isPrimary ? "Master" : `Worker #${cluster.worker.id}`;
    const port = config.basePort + (cluster.isPrimary ? 0 : cluster.worker.id);
    http
      .createServer(async (req, res) => {
        try {
          if (config.allowedIps?.length > 0 && !config.allowedIps.includes(req.socket.remoteAddress!)) {
            res.writeHead(403).end();
            return;
          }
          res.writeHead(200, {
            "Content-Type": this.registry.contentType
          });
          res.write(await this.registry.metrics());
          res.end();
        } catch (e) {
          this.logger.error(`Failed to serve metrics request: ${e instanceof Error ? e.stack : String(e)}`);
          try {
            res.writeHead(500).end();
          } catch {
            res.end();
          }
        }
      })
      .listen(port, config.hostname, () => {
        this.logger.log(`Metrics server is listening on ${config.hostname}:${port} (${processName})`);
      });
  }

  counter = <T extends string>(name: string, labelNames: readonly T[] = []) =>
    new PromClient.Counter({
      name,
      help: name,
      labelNames,
      registers: [this.registry]
    });

  gauge = <T extends string>(name: string, labelNames: readonly T[] = []) =>
    new PromClient.Gauge({
      name,
      help: name,
      labelNames,
      registers: [this.registry]
    });

  histogram = Object.assign(
    <T extends string>(name: string, buckets: number[], labelNames: readonly T[] = []) =>
      new PromClient.Histogram({
        name,
        help: name,
        buckets,
        labelNames,
        registers: [this.registry]
      }),
    {
      linearBuckets: PromClient.linearBuckets,
      exponentialBuckets: PromClient.exponentialBuckets,
      BUCKETS_TIME_10M_30: PromClient.exponentialBuckets(0.05, 1.368, 30),
      BUCKETS_TIME_5S_10: PromClient.exponentialBuckets(0.03, 1.79, 10)
    }
  );
}
