import { jsonResponse, optionsResponse } from "../_shared/http.ts";
import { getUserClient } from "../_shared/jobs.ts";

type MetarApiItem = {
  icaoId?: string;
  reportTime?: string;
  obsTime?: number;
  temp?: number;
  dewp?: number;
  wdir?: number | "VRB";
  wspd?: number;
  wgst?: number;
  visib?: string;
  cover?: string;
  clouds?: Array<{
    cover?: string;
    base?: number | null;
    type?: string | null;
  }>;
  fltCat?: string;
  rawOb?: string;
};

type TafApiItem = {
  icaoId?: string;
  issueTime?: string;
  validTimeFrom?: number;
  validTimeTo?: number;
  rawTAF?: string;
};

function isValidAirportId(value: string) {
  return /^[A-Z]{3,4}$/.test(value);
}

function toIsoFromUnixSeconds(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function formatWindSummary(
  direction: MetarApiItem["wdir"],
  speed: number | undefined,
  gust: number | undefined,
) {
  if (typeof speed !== "number" || !Number.isFinite(speed)) return null;
  const directionLabel =
    typeof direction === "number" && Number.isFinite(direction)
      ? `${direction.toString().padStart(3, "0")}deg`
      : "VRB";
  const gustLabel =
    typeof gust === "number" && Number.isFinite(gust) ? ` gust ${Math.round(gust)}kt` : "";
  return `${directionLabel} at ${Math.round(speed)}kt${gustLabel}`;
}

function formatCloudsSummary(
  cover: string | undefined,
  clouds: MetarApiItem["clouds"],
) {
  if (clouds && clouds.length > 0) {
    return clouds
      .map((layer) => {
        const layerCover = layer.cover || cover || "Clouds";
        const base =
          typeof layer.base === "number" && Number.isFinite(layer.base)
            ? ` ${layer.base}ft`
            : "";
        const type = layer.type ? ` ${layer.type}` : "";
        return `${layerCover}${base}${type}`.trim();
      })
      .join(", ");
  }

  return cover ?? null;
}

async function requireAuth(req: Request) {
  const client = getUserClient(req);
  if (!client) {
    throw new Error("Missing Authorization header.");
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user?.id) {
    throw new Error("Failed to resolve authenticated user.");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    await requireAuth(req);

    const body = (await req.json()) as { airportId?: string };
    const airportId = body.airportId?.trim().toUpperCase() || "";

    if (!isValidAirportId(airportId)) {
      return jsonResponse(400, { error: "Enter a valid 3 or 4 letter airport identifier." });
    }

    const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(airportId)}&format=json`;
    const tafUrl = `https://aviationweather.gov/api/data/taf?ids=${encodeURIComponent(airportId)}&format=json`;

    const [metarResponse, tafResponse] = await Promise.all([
      fetch(metarUrl, { headers: { accept: "application/json" } }),
      fetch(tafUrl, { headers: { accept: "application/json" } }),
    ]);

    if (!metarResponse.ok || !tafResponse.ok) {
      return jsonResponse(502, { error: "Aviation Weather Center request failed." });
    }

    const [metarText, tafText] = await Promise.all([
      metarResponse.text(),
      tafResponse.text(),
    ]);

    const metarRows: MetarApiItem[] = metarText.trim() ? JSON.parse(metarText) : [];
    const tafRows: TafApiItem[] = tafText.trim() ? JSON.parse(tafText) : [];

    const metar = metarRows[0] ?? null;
    const taf = tafRows[0] ?? null;

    if (!metar && !taf) {
      return jsonResponse(404, { error: `No METAR or TAF found for ${airportId}.` });
    }

    return jsonResponse(200, {
      airportId,
      source: "awc",
      fetchedAt: new Date().toISOString(),
      metar: metar
        ? {
            rawText: metar.rawOb ?? "",
            issuedAt: metar.reportTime ?? null,
            observedAt: toIsoFromUnixSeconds(metar.obsTime),
            flightCategory:
              metar.fltCat === "VFR" ||
              metar.fltCat === "MVFR" ||
              metar.fltCat === "IFR" ||
              metar.fltCat === "LIFR"
                ? metar.fltCat
                : "Unknown",
            temperatureC:
              typeof metar.temp === "number" && Number.isFinite(metar.temp)
                ? Math.round(metar.temp)
                : null,
            dewpointC:
              typeof metar.dewp === "number" && Number.isFinite(metar.dewp)
                ? Math.round(metar.dewp)
                : null,
            windSummary: formatWindSummary(metar.wdir, metar.wspd, metar.wgst),
            visibilitySummary: metar.visib ? `${metar.visib}sm visibility` : null,
            cloudsSummary: formatCloudsSummary(metar.cover, metar.clouds),
          }
        : null,
      taf: taf
        ? {
            rawText: taf.rawTAF ?? "",
            issuedAt: taf.issueTime ?? null,
            validFrom: toIsoFromUnixSeconds(taf.validTimeFrom),
            validTo: toIsoFromUnixSeconds(taf.validTimeTo),
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected wx-brief error.";
    const status = message === "Missing Authorization header." ? 401 : 500;
    return jsonResponse(status, { error: message });
  }
});
