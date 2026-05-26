export type ManifestFileEntry = {
  sha256: string;
};

export type CalendarManifest = {
  bundleId: string;
  rangeStart: string;
  rangeEnd: string;
  files: Record<string, ManifestFileEntry>;
};

export type LunarCivilDayRow = {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
  lunarMonthKey: string;
  lunarDayKey: string;
  dayStemIndex: number;
  dayStemChar: string;
  solarYearKey: number;
};

export type LunarCivilDaysDoc = {
  correctionVersion: string;
  days: Record<string, LunarCivilDayRow>;
};

export type SolarTermYearRow = Record<string, string>;

export type SolarTermsDoc = {
  correctionVersion: string;
  years: Record<string, SolarTermYearRow>;
};

export type TzCountryDoc = {
  correctionVersion: string;
  countries: Record<string, string>;
};

export type M55CalendarBundle = {
  manifest: CalendarManifest;
  lunar: LunarCivilDaysDoc;
  solar: SolarTermsDoc;
  tz: TzCountryDoc;
};

