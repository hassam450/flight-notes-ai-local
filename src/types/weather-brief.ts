export type WeatherFlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR" | "Unknown";

export type WeatherBriefReport = {
  rawText: string;
  issuedAt: string | null;
  observedAt: string | null;
  flightCategory: WeatherFlightCategory;
  temperatureC: number | null;
  dewpointC: number | null;
  windSummary: string | null;
  visibilitySummary: string | null;
  cloudsSummary: string | null;
};

export type WeatherBriefTaf = {
  rawText: string;
  issuedAt: string | null;
  validFrom: string | null;
  validTo: string | null;
};

export type WeatherBriefResponse = {
  airportId: string;
  source: "awc";
  fetchedAt: string;
  metar: WeatherBriefReport | null;
  taf: WeatherBriefTaf | null;
};
