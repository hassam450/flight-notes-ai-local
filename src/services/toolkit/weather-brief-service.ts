import { supabase } from "@/lib/supabase";
import type { WeatherBriefResponse } from "@/types/weather-brief";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

function ensureConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY configuration.",
    );
  }
}

async function getValidAccessToken(forceRefresh = false) {
  const nowSec = Math.floor(Date.now() / 1000);
  const refreshBufferSec = 60;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (
    !forceRefresh &&
    session?.access_token &&
    session.expires_at &&
    session.expires_at > nowSec + refreshBufferSec
  ) {
    return session.access_token;
  }

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) {
    throw new Error("No valid auth session found for weather request.");
  }

  return data.session.access_token;
}

function isJwtErrorMessage(message: string) {
  const value = message.toLowerCase();
  return value.includes("invalid jwt") || value.includes("jwt expired");
}

type MetarApiItem = {
  reportTime?: string;
  obsTime?: number;
  temp?: number;
  dewp?: number;
  wdir?: number | "VRB";
  wspd?: number;
  wgst?: number;
  visib?: string;
  cover?: string;
  clouds?: {
    cover?: string;
    base?: number | null;
    type?: string | null;
  }[];
  fltCat?: string;
  rawOb?: string;
};

type TafApiItem = {
  issueTime?: string;
  validTimeFrom?: number;
  validTimeTo?: number;
  rawTAF?: string;
};

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

function normalizeWeatherResponse(
  airportId: string,
  metar: MetarApiItem | null,
  taf: TafApiItem | null,
): WeatherBriefResponse {
  return {
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
  };
}

async function fetchDirectFromAwc(airportId: string) {
  const [metarResponse, tafResponse] = await Promise.all([
    fetch(
      `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(airportId)}&format=json`,
    ),
    fetch(
      `https://aviationweather.gov/api/data/taf?ids=${encodeURIComponent(airportId)}&format=json`,
    ),
  ]);

  if (!metarResponse.ok || !tafResponse.ok) {
    throw new Error("Aviation Weather Center request failed.");
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
    throw new Error(`No METAR or TAF found for ${airportId}.`);
  }

  return normalizeWeatherResponse(airportId, metar, taf);
}

async function invokeWeatherBrief(airportId: string) {
  ensureConfig();
  const endpoint = `${SUPABASE_URL}/functions/v1/wx-brief`;

  const invokeOnce = async (accessToken: string) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-user-jwt": accessToken,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ airportId }),
    });

    if (!response.ok) {
      let message = `Weather lookup failed (${response.status})`;
      try {
        const payload = (await response.json()) as {
          error?: string;
          message?: string;
        };
        if (payload.error?.trim()) {
          message = payload.error.trim();
        } else if (payload.message?.trim()) {
          message = payload.message.trim();
        }
      } catch {
        // no-op
      }
      const error = new Error(message) as Error & { statusCode?: number };
      error.statusCode = response.status;
      throw error;
    }

    return (await response.json()) as WeatherBriefResponse;
  };

  const firstToken = await getValidAccessToken();
  let firstMessage = "Weather lookup failed.";
  try {
    return await invokeOnce(firstToken);
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined;

    firstMessage = error instanceof Error ? error.message : firstMessage;
    const shouldRetry = statusCode === 401 || isJwtErrorMessage(firstMessage);
    if (!shouldRetry) {
      throw new Error(firstMessage);
    }
  }

  const retryToken = await getValidAccessToken(true);
  return invokeOnce(retryToken);
}

export async function fetchWeatherBrief(airportId: string) {
  const normalizedAirportId = airportId.trim().toUpperCase();
  if (!/^[A-Z]{3,4}$/.test(normalizedAirportId)) {
    throw new Error("Enter a valid 3 or 4 letter airport identifier.");
  }

  try {
    return await invokeWeatherBrief(normalizedAirportId);
  } catch {
    // Edge function failed — fall back to direct AWC fetch
    return fetchDirectFromAwc(normalizedAirportId);
  }
}
