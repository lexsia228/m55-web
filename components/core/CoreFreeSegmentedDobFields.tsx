'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import {
  parseFlexibleDobInput,
  partsFromIsoDate,
  validateSegmentedDob,
  type SegmentedDobParts,
} from '../../lib/m55/freeResult/segmentedDobInputV1';
import styles from './CoreExperience.module.css';

type Props = {
  initialIsoDate?: string;
  onValidSubmit: (birthDateIso: string) => void;
  submitLabelJa?: string;
  submitTestId?: string;
};

export default function CoreFreeSegmentedDobFields({
  initialIsoDate = '',
  onValidSubmit,
  submitLabelJa = '無料結果づくりを始める',
  submitTestId,
}: Props) {
  const initial = partsFromIsoDate(initialIsoDate) ?? { year: '', month: '', day: '' };
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [errorJa, setErrorJa] = useState<string | null>(null);

  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    yearRef.current?.focus();
  }, []);

  function applyParts(parts: SegmentedDobParts) {
    setYear(parts.year);
    setMonth(parts.month);
    setDay(parts.day);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text');
    const parts = parseFlexibleDobInput(text);
    if (!parts) return;
    event.preventDefault();
    applyParts(parts);
    setErrorJa(null);
    dayRef.current?.focus();
  }

  function handleYearChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setYear(digits);
    setErrorJa(null);
    if (digits.length === 4) monthRef.current?.focus();
  }

  function handleMonthChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 2);
    setMonth(digits);
    setErrorJa(null);
    if (digits.length === 2) dayRef.current?.focus();
  }

  function handleDayChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 2);
    setDay(digits);
    setErrorJa(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateSegmentedDob({ year, month, day });
    if (!result.ok) {
      setErrorJa(result.errorJa);
      return;
    }
    setErrorJa(null);
    applyParts(result.parts);
    onValidSubmit(result.birthDate);
  }

  return (
    <form
      className={styles.freeSegmentedDobForm}
      onSubmit={handleSubmit}
      data-testid="m55-free-segmented-dob"
      noValidate
    >
      <div className={styles.freeSegmentedDobRow} onPaste={handlePaste}>
        <label className={styles.freeSegmentedDobField}>
          <span className={styles.visuallyHidden}>年</span>
          <input
            ref={yearRef}
            className={styles.freeSegmentedDobInputYear}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="bday-year"
            maxLength={4}
            placeholder="YYYY"
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            aria-label="年"
          />
          <span className={styles.freeSegmentedDobUnit} aria-hidden>
            年
          </span>
        </label>
        <label className={styles.freeSegmentedDobField}>
          <span className={styles.visuallyHidden}>月</span>
          <input
            ref={monthRef}
            className={styles.freeSegmentedDobInputMonth}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="bday-month"
            maxLength={2}
            placeholder="MM"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            aria-label="月"
          />
          <span className={styles.freeSegmentedDobUnit} aria-hidden>
            月
          </span>
        </label>
        <label className={styles.freeSegmentedDobField}>
          <span className={styles.visuallyHidden}>日</span>
          <input
            ref={dayRef}
            className={styles.freeSegmentedDobInputDay}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="bday-day"
            maxLength={2}
            placeholder="DD"
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            aria-label="日"
          />
          <span className={styles.freeSegmentedDobUnit} aria-hidden>
            日
          </span>
        </label>
      </div>

      {errorJa ? (
        <p className={styles.freeSegmentedDobError} role="alert">
          {errorJa}
        </p>
      ) : null}

      <button type="submit" className={styles.freeIntroPrimaryBtn} data-testid={submitTestId}>
        {submitLabelJa}
      </button>
    </form>
  );
}
