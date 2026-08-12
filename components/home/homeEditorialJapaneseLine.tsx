import type { ReactNode } from 'react';

/**
 * Meaning units that must not break across lines on narrow mobile viewports.
 * Some entries carry a trailing particle or 。 because without it the tail
 * lands alone on the next line as 「と、」 or 「解く。」.
 */
export const HOME_EDITORIAL_NOWRAP_UNITS = [
  '負担が重なり始める流れ',
  '力が出やすい条件と、',
  '力が出やすい条件',
  '出やすい反応と、',
  '表れやすいこと',
  'ところから。',
  '読み解く。',
  '二人の関係',
  '話しやすい時',
  'すれ違う時',
  '試すこと',
] as const;

const SORTED_NOWRAP_UNITS = [...HOME_EDITORIAL_NOWRAP_UNITS].sort(
  (a, b) => b.length - a.length,
);

export function renderProtectedJapaneseLine(
  line: string,
  nowrapClassName: string,
  lineKey: string,
): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;
  let partKey = 0;

  while (cursor < line.length) {
    const matchedUnit = SORTED_NOWRAP_UNITS.find((unit) => line.startsWith(unit, cursor));
    if (matchedUnit) {
      parts.push(
        <span key={`${lineKey}-${partKey++}`} className={nowrapClassName}>
          {matchedUnit}
        </span>,
      );
      cursor += matchedUnit.length;
      continue;
    }

    let nextBreak = line.length;
    for (const unit of SORTED_NOWRAP_UNITS) {
      const unitIndex = line.indexOf(unit, cursor + 1);
      if (unitIndex !== -1) nextBreak = Math.min(nextBreak, unitIndex);
    }

    parts.push(<span key={`${lineKey}-${partKey++}`}>{line.slice(cursor, nextBreak)}</span>);
    cursor = nextBreak;
  }

  return parts;
}

type HeadlineProps = {
  id?: string;
  className?: string;
  textJa: string;
  nowrapClassName: string;
  lineClassName?: string;
};

export function HomeEditorialHeadline({
  id,
  className,
  textJa,
  nowrapClassName,
  lineClassName,
}: HeadlineProps) {
  const lines = textJa.split('\n');

  return (
    <h2 id={id} className={className}>
      {lines.map((line, index) => (
        <span key={index} className={lineClassName}>
          {index > 0 ? <br aria-hidden="true" /> : null}
          {renderProtectedJapaneseLine(line, nowrapClassName, String(index))}
        </span>
      ))}
    </h2>
  );
}
