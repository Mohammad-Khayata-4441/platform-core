import type { MetadataRoute } from "next";
import { buildAbsoluteUrl, stripProto } from "../host";

export interface BuildRobotsInput {
  host: string;
  sitemapPath?: string;
  disallow?: string[];
}

export function buildRobots({
  host,
  sitemapPath = "/sitemap.xml",
  disallow = [],
}: BuildRobotsInput): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: buildAbsoluteUrl(host, sitemapPath),
    // Host directive per robots.txt spec must be hostname only (no scheme). Strip protocol to avoid
    // emitting `Host: https://...` which is invalid and can confuse parsers (GSC shows "Sitemap could not be read"
    // when robots.txt is malformed on some validators). Google ignores Host but Yandex requires it.
    host: stripProto(host),
  };
}
