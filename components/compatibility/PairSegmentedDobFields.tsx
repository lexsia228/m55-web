'use client';

import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import {
  parseFlexibleDobInput,
  partsFromIsoDate,
  validateSegmentedDob,
  type SegmentedDobParts,
} from '../../lib/m55/freeResult/segmentedDobInputV1';
import styles from './CompatibilityGuestExperience.module.css';

type Props = {
  isoDate: string;
  onIsoDateChange: (iso: string) => void;
  ariaLabelPrefix: string;
  maxIso: string;
  id?: string;
  enableBirthdayAutocomplete?: boolean;
};

export default function PairSegmentedDobFields({
  isoDate,
  onIsoDateChange,
  ariaLabelPrefix,
  maxIso,
  id,
  enableBirthdayAutocomplete = false,
}: Props) {
  const initial = partsFromIsoDate(isoDate) ?? { year: '', month: '', day: '' };
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [errorJa, setErrorJa] = useState<string | null>(null);

  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const lastEmittedIsoRef = useRef(isoDate);
  const lastSyncedExternalRef = useRef(isoDate);
  const partsRef = useRef<SegmentedDobParts>(initial);

  useEffect(() => {
    if (isoDate === lastEmittedIsoRef.current) {
      return;
    }
    if (!isoDate) {
      if (lastSyncedExternalRef.current) {
        setYear('');
        setMonth('');
        setDay('');
        partsRef.current = { year: '', month: '', day: '' };
        lastSyncedExternalRef.current = '';
        lastEmittedIsoRef.current = '';
        setErrorJa(null);
      }
      return;
    }
    const parts = partsFromIsoDate(isoDate);
    if (!parts) return;
    setYear(parts.year);
    setMonth(parts.month);
    setDay(parts.day);
    partsRef.current = parts;
    lastEmittedIsoRef.current = isoDate;
    lastSyncedExternalRef.current = isoDate;
    setErrorJa(null);
  }, [isoDate]);

  function applyParts(parts: SegmentedDobParts) {
    setYear(parts.year);
    setMonth(parts.month);
    setDay(parts.day);
    partsRef.current = parts;
  }

  function emitIsoDate(nextIso: string) {
    lastEmittedIsoRef.current = nextIso;
    onIsoDateChange(nextIso);
  }

  function syncPartsToParent(parts: SegmentedDobParts, normalizeVisual = false) {
    const yearRaw = parts.year.trim();
    const monthRaw = parts.month.trim();
    const dayRaw = parts.day.trim();

    if (!yearRaw || !monthRaw || !dayRaw) {
      emitIsoDate('');
      setErrorJa(null);
      return;
    }

    const result = validateSegmentedDob(parts);
    if (!result.ok) {
      emitIsoDate('');
      if (yearRaw.length === 4 && monthRaw.length >= 1 && dayRaw.length >= 1) {
        setErrorJa(result.errorJa);
      } else {
        setErrorJa(null);
      }
      return;
    }

    if (result.birthDate > maxIso) {
      emitIsoDate('');
      if (yearRaw.length === 4 && monthRaw.length >= 1 && dayRaw.length >= 1) {
        setErrorJa('今日以前の日付を入力してください。');
      } else {
        setErrorJa(null);
      }
      return;
    }

    setErrorJa(null);
    if (normalizeVisual) {
      applyParts(result.parts);
    }
    emitIsoDate(result.birthDate);
    lastSyncedExternalRef.current = result.birthDate;
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text');
    const parts = parseFlexibleDobInput(text);
    if (!parts) return;
    event.preventDefault();
    applyParts(parts);
    syncPartsToParent(parts, true);
    dayRef.current?.focus();
  }

  function normalizeBlurredField(field: 'month' | 'day') {
    const current = partsRef.current;
    const result = validateSegmentedDob(current);
    if (!result.ok || result.birthDate > maxIso) {
      syncPartsToParent(current);
      return;
    }
    const padded = result.parts[field];
    if (current[field] !== padded) {
      const next = { ...current, [field]: padded };
      if (field === 'month') setMonth(padded);
      else setDay(padded);
      partsRef.current = next;
      syncPartsToParent(next);
      return;
    }
    syncPartsToParent(current);
  }

  function handleYearChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setYear(digits);
    setErrorJa(null);
    const next = { ...partsRef.current, year: digits };
    partsRef.current = next;
    if (digits.length === 4) monthRef.current?.focus();
    syncPartsToParent(next);
  }

  function handleMonthChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 2);
    setMonth(digits);
    setErrorJa(null);
    const next = { ...partsRef.current, month: digits };
    partsRef.current = next;
    if (digits.length === 2) dayRef.current?.focus();
    syncPartsToParent(next);
  }

  function handleDayChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 2);
    setDay(digits);
    setErrorJa(null);
    const next = { ...partsRef.current, day: digits };
    partsRef.current = next;
    syncPartsToParent(next);
  }

  const yearAutoComplete = enableBirthdayAutocomplete ? 'bday-year' : 'off';
  const monthAutoComplete = enableBirthdayAutocomplete ? 'bday-month' : 'off';
  const dayAutoComplete = enableBirthdayAutocomplete ? 'bday-day' : 'off';

  return (
    <div id={id} data-testid="m55-pair-segmented-dob">
      <div
        className={styles.segmentedDobRow}
        onPaste={handlePaste}
        data-testid="m55-pair-segmented-dob-row"
      >
        <label className={styles.segmentedDobField}>
        <span className={styles.visuallyHidden}>年</span>
        <input
          ref={yearRef}
          className={styles.segmentedDobInputYear}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={yearAutoComplete}
          maxLength={4}
          placeholder="YYYY"
          value={year}
          onChange={(event) => handleYearChange(event.target.value)}
          onBlur={() => syncPartsToParent(partsRef.current)}
          aria-label={`${ariaLabelPrefix} 年`}
        />
        <span className={styles.segmentedDobUnit} aria-hidden>
          年
        </span>
      </label>
      <label className={styles.segmentedDobField}>
        <span className={styles.visuallyHidden}>月</span>
        <input
          ref={monthRef}
          className={styles.segmentedDobInputMonth}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={monthAutoComplete}
          maxLength={2}
          placeholder="MM"
          value={month}
          onChange={(event) => handleMonthChange(event.target.value)}
          onBlur={() => normalizeBlurredField('month')}
          aria-label={`${ariaLabelPrefix} 月`}
        />
        <span className={styles.segmentedDobUnit} aria-hidden>
          月
        </span>
      </label>
      <label className={styles.segmentedDobField}>
        <span className={styles.visuallyHidden}>日</span>
        <input
          ref={dayRef}
          className={styles.segmentedDobInputDay}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={dayAutoComplete}
          maxLength={2}
          placeholder="DD"
          value={day}
          onChange={(event) => handleDayChange(event.target.value)}
          onBlur={() => normalizeBlurredField('day')}
          aria-label={`${ariaLabelPrefix} 日`}
        />
        <span className={styles.segmentedDobUnit} aria-hidden>
          日
        </span>
      </label>
      </div>
      {errorJa ? (
        <p className={styles.segmentedDobError} role="alert">
          {errorJa}
        </p>
      ) : null}
    </div>
  );
}
