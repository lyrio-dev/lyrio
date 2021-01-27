import { Injectable } from "@nestjs/common";

import IP2Region from "ip2region";

import { ConfigService } from "@/config/config.service";

@Injectable()
export class AuthIpLocationService {
  private readonly ip2region: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor(private configService: ConfigService) {
    this.ip2region = new IP2Region(this.configService.config.vendor.ip2region || {});
  }

  query(ip: string): string {
    // ip2region doesn't support IPv6
    if (ip.indexOf(":") !== -1) return null;

    const record: {
      country: string;
      region: string;
      province: string;
      city: string;
      isp: string;
    } = this.ip2region.search(ip);

    // Fix "0"
    for (const field in record) {
      if (record[field] === "0") record[field] = "";
    }

    // Hide China country name
    if (record.country === "中国") record.country = "";
    // Add a space after other country names
    else if (record.country) record.country += " ";

    // Fix "北京 北京市"
    if (record.province === record.city || `${record.province}市` === record.city) record.province = "";

    const cityResult = record.country + record.province + record.city;

    if (!cityResult) return null;

    // Fix "内网IP 内网IP"
    if (record.isp && cityResult !== record.isp) return `${cityResult} ${record.isp}`;
    return cityResult;
  }
}
