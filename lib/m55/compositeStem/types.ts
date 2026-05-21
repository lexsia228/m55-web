import type { TenStemDisplay } from '../tenStemCatalog';

export type M55CompositeContextScope = 'essence' | 'dtr';

export type M55CompositeCanonicalInput = {
  birthDate: string;
  birthTime?: string | null;
  birthTimeUnknown: boolean;
  country?: string | null;
  birthplace?: string | null;
  timezone?: string | null;
  locale: string;
  nickname: string;
  contextScope: M55CompositeContextScope;
  calendarSystem?: 'gregorian_civil';
};

export type M55CompositeCalculationMode = 'full' | 'unknown_time_noon' | 'tz_fallback_utc';

export type M55CompositeTzSource = 'explicit' | 'country_primary' | 'fallback_utc';

export type NormalizedBirthContext = {
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  country: string;
  birthplace: string | null;
  timezone: string;
  locale: string;
  nickname: string;
  contextScope: M55CompositeContextScope;
  localDateTime: string;
  effectiveLocalDate: string;
  calculationMode: M55CompositeCalculationMode;
  tzSource: M55CompositeTzSource;
};

export type BoundaryMetadata = {
  solarTermKey: string;
  solarTermBoundaryInstant: string;
  solarYearKey: number;
  lunarYearKey: number;
  lunarMonthKey: string;
  lunarDayKey: string;
  dayBoundaryRule: string;
  tzSource: M55CompositeTzSource;
  timezone: string;
  correctionVersion: string;
  lunarTableSource: string;
  solarTableSource: string;
};

export type CompositeStemPaidDisplay = Pick<TenStemDisplay, 'publicTitle' | 'symbol' | 'stemChar'>;

export type CompositeStemResult = {
  engineVersion: typeof import('./constants').ENGINE_VERSION_V2;
  inputVersion: typeof import('./constants').INPUT_VERSION_V1;
  correctionVersion: typeof import('./constants').CORRECTION_VERSION;
  calculationMode: M55CompositeCalculationMode;
  stemLaneIndex: number;
  stemChar: string;
  paid: CompositeStemPaidDisplay;
  normalizedBirthContext: NormalizedBirthContext;
  boundaryMetadata: BoundaryMetadata;
  staticFingerprint: string;
  displayFingerprint: string;
};

export type M55CompositeErrorCode =
  | 'M55_COMPOSITE_INVALID_BIRTHDATE'
  | 'M55_COMPOSITE_INVALID_BIRTHTIME'
  | 'M55_COMPOSITE_INVALID_INPUT'
  | 'M55_COMPOSITE_INCOMPLETE_PROFILE'
  | 'M55_COMPOSITE_DATE_OUT_OF_RANGE'
  | 'M55_COMPOSITE_CALENDAR_TABLE_MISSING'
  | 'M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL';

export class M55CompositeStemError extends Error {
  readonly code: M55CompositeErrorCode;

  constructor(code: M55CompositeErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'M55CompositeStemError';
    this.code = code;
  }
}
