/**
 * Semantic TypeScript port of Supabase CLI SplitAndTrim.
 * Source provenance:
 * - tag: v2.106.0
 * - commit: bd39bcf5e613be87943f8bb8fe4ce75c8dfd84de
 * - apps/cli-go/pkg/parser/token.go SHA: 244aea79f3b7065b4151f642c9111cf58b3cb23b792201dbcff80d83491e6f04
 * - apps/cli-go/pkg/parser/state.go SHA: d0dafd2d8661d19c3e058899943d32e785e12eaeed2c127a3eda92f874e1c942
 */

const BEGIN_ATOMIC = 'ATOMIC';
const END_ATOMIC = 'END';

export type SplitTransform = (token: string) => string;

interface State {
  next(r: number, data: Buffer): State | null;
}

function decodeRuneAt(buf: Buffer, offset: number): { rune: number; width: number } {
  const b0 = buf[offset];
  if (b0 === undefined) return { rune: 0, width: 0 };
  if (b0 < 0x80) return { rune: b0, width: 1 };
  if ((b0 & 0xe0) === 0xc0) {
    const b1 = buf[offset + 1] ?? 0;
    return { rune: ((b0 & 0x1f) << 6) | (b1 & 0x3f), width: 2 };
  }
  if ((b0 & 0xf0) === 0xe0) {
    const b1 = buf[offset + 1] ?? 0;
    const b2 = buf[offset + 2] ?? 0;
    return { rune: ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f), width: 3 };
  }
  const b1 = buf[offset + 1] ?? 0;
  const b2 = buf[offset + 2] ?? 0;
  const b3 = buf[offset + 3] ?? 0;
  return {
    rune: ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f),
    width: 4,
  };
}

function decodeLastRune(buf: Buffer): number {
  if (buf.length === 0) return 0;
  for (let i = buf.length - 1; i >= 0; i--) {
    const b = buf[i];
    if (b < 0x80 || (b & 0xc0) !== 0x80) {
      return decodeRuneAt(buf, i).rune;
    }
  }
  return decodeRuneAt(buf, 0).rune;
}

function isIdentifierRune(r: number): boolean {
  return (
    (r >= 0x41 && r <= 0x5a) ||
    (r >= 0x61 && r <= 0x7a) ||
    (r >= 0x30 && r <= 0x39) ||
    r === 0x5f ||
    r === 0x24
  );
}

function isSpaceRune(r: number): boolean {
  return (
    r === 0x20 ||
    r === 0x09 ||
    r === 0x0a ||
    r === 0x0d ||
    r === 0x0c ||
    r === 0x0b ||
    r === 0x85 ||
    r === 0xa0 ||
    (r >= 0x2000 && r <= 0x200a) ||
    r === 0x2028 ||
    r === 0x2029 ||
    r === 0x202f ||
    r === 0x205f ||
    r === 0x3000
  );
}

function trimRightSpace(buf: Buffer): Buffer {
  let end = buf.length;
  while (end > 0) {
    const r = decodeLastRune(buf.subarray(0, end));
    if (!isSpaceRune(r)) break;
    const { width } = decodeRuneAt(buf, end - 1);
    let start = end - 1;
    while (start > 0 && (buf[start] & 0xc0) === 0x80) start--;
    end = start;
  }
  return buf.subarray(0, end);
}

function equalFoldString(value: string, target: string): boolean {
  return value.toLowerCase() === target.toLowerCase();
}

function isBeginAtomic(data: Buffer): boolean {
  const atomicLen = Buffer.byteLength(BEGIN_ATOMIC, 'utf8');
  let offset = data.length - atomicLen;
  if (offset < 0 || !equalFoldString(data.subarray(offset).toString('utf8'), BEGIN_ATOMIC)) {
    return false;
  }
  if (offset > 0) {
    const r = decodeLastRune(data.subarray(0, offset));
    if (isIdentifierRune(r)) return false;
  }
  const prefix = trimRightSpace(data.subarray(0, offset));
  const beginLen = Buffer.byteLength('BEGIN', 'utf8');
  offset = prefix.length - beginLen;
  if (offset < 0 || !equalFoldString(prefix.subarray(offset).toString('utf8'), 'BEGIN')) {
    return false;
  }
  if (offset === 0) return true;
  const r = decodeLastRune(prefix.subarray(0, offset));
  return !isIdentifierRune(r);
}

function equalFoldBytes(window: Buffer, target: string): boolean {
  return window.toString('utf8').toLowerCase() === target.toLowerCase();
}

class ReadyState implements State {
  next(r: number, data: Buffer): State | null {
    switch (r) {
      case 0x24:
        return new TagState(data.length - Buffer.byteLength(String.fromCodePoint(r), 'utf8'));
      case 0x27:
      case 0x22:
        return new QuoteState(r);
      case 0x2d:
        return new CommentState();
      case 0x2f:
        return new BlockState(0);
      case 0x5c:
        return new EscapeState();
      case 0x3b:
        return null;
      case 0x28:
        return new AtomicState(this, Buffer.from(')', 'utf8'));
      case 0x63:
      case 0x43:
        if (isBeginAtomic(data)) {
          return new AtomicState(this, Buffer.from(END_ATOMIC, 'utf8'));
        }
        break;
      default:
        break;
    }
    return this;
  }
}

class CommentState implements State {
  next(r: number, data: Buffer): State | null {
    if (r === 0x2d) {
      return new DollarState(Buffer.from('\n', 'utf8'));
    }
    return new ReadyState().next(r, data);
  }
}

class BlockState implements State {
  depth: number;

  constructor(depth: number) {
    this.depth = depth;
  }

  next(r: number, data: Buffer): State | null {
    if (data.length >= 2) {
      const window = data.subarray(data.length - 2);
      if (window.equals(Buffer.from('/*', 'utf8'))) {
        return new BlockState(this.depth + 1);
      }
    }
    if (this.depth === 0) {
      return new ReadyState().next(r, data);
    }
    if (data.length >= 2) {
      const window = data.subarray(data.length - 2);
      if (window.equals(Buffer.from('*/', 'utf8'))) {
        const nextDepth = this.depth - 1;
        if (nextDepth === 0) return new ReadyState();
        return new BlockState(nextDepth);
      }
    }
    return this;
  }
}

class QuoteState implements State {
  delimiter: number;
  escape: boolean;

  constructor(delimiter: number, escape = false) {
    this.delimiter = delimiter;
    this.escape = escape;
  }

  next(r: number, data: Buffer): State | null {
    if (this.escape) {
      if (r === this.delimiter) {
        return new QuoteState(this.delimiter, false);
      }
      return new ReadyState().next(r, data);
    }
    if (r === this.delimiter) {
      return new QuoteState(this.delimiter, true);
    }
    return this;
  }
}

class DollarState implements State {
  delimiter: Buffer;

  constructor(delimiter: Buffer) {
    this.delimiter = delimiter;
  }

  next(_r: number, data: Buffer): State {
    if (data.length >= this.delimiter.length) {
      const window = data.subarray(data.length - this.delimiter.length);
      if (window.equals(this.delimiter)) {
        return new ReadyState();
      }
    }
    return this;
  }
}

class TagState implements State {
  offset: number;

  constructor(offset: number) {
    this.offset = offset;
  }

  next(r: number, data: Buffer): State | null {
    if (r === 0x24) {
      const tag = data.subarray(this.offset);
      return new DollarState(Buffer.from(tag));
    }
    if (
      (r >= 0x41 && r <= 0x5a) ||
      (r >= 0x61 && r <= 0x7a) ||
      (r >= 0x30 && r <= 0x39) ||
      r === 0x5f
    ) {
      return this;
    }
    return new ReadyState().next(r, data);
  }
}

class EscapeState implements State {
  next(): State {
    return new ReadyState();
  }
}

class AtomicState implements State {
  prev: State;
  delimiter: Buffer;

  constructor(prev: State, delimiter: Buffer) {
    this.prev = prev;
    this.delimiter = delimiter;
  }

  next(r: number, data: Buffer): State | null {
    const curr = this.prev.next(r, data);
    if (curr !== null) {
      this.prev = curr;
    }
    if (this.prev instanceof ReadyState) {
      if (data.length >= this.delimiter.length) {
        const window = data.subarray(data.length - this.delimiter.length);
        if (equalFoldBytes(window, this.delimiter.toString('utf8'))) {
          return new ReadyState();
        }
      }
    }
    return this;
  }
}

class Tokenizer {
  state: State = new ReadyState();
  last = 0;

  scanToken(data: Buffer, atEOF: boolean): { advance: number; token: Buffer | null } {
    for (;;) {
      if (this.last >= data.length) break;
      const { rune, width } = decodeRuneAt(data, this.last);
      if (width === 0) break;
      const end = this.last + width;
      const nextState = this.state.next(rune, data.subarray(0, end));
      if (nextState === null) {
        const token = data.subarray(0, end);
        this.last = 0;
        this.state = new ReadyState();
        return { advance: end, token };
      }
      this.state = nextState;
      this.last = end;
    }
    if (!atEOF || data.length === 0) {
      return { advance: 0, token: null };
    }
    return { advance: data.length, token: data };
  }
}

function trimRightSemicolons(token: string): string {
  let end = token.length;
  while (end > 0 && token.charCodeAt(end - 1) === 0x3b) end--;
  return token.slice(0, end);
}

function trimSpaceGo(token: string): string {
  let start = 0;
  let end = token.length;
  while (start < end) {
    const cp = token.codePointAt(start) ?? 0;
    if (!isSpaceRune(cp)) break;
    start += cp > 0xffff ? 2 : 1;
  }
  while (end > start) {
    const slice = token.slice(0, end);
    const cp = slice.codePointAt(slice.length - (slice.codePointAt(slice.length - 1)! > 0xffff ? 2 : 1)) ?? 0;
    const lastCharLen = cp > 0xffff ? 2 : 1;
    if (!isSpaceRune(cp)) break;
    end -= lastCharLen;
  }
  return token.slice(start, end);
}

export function split(sql: string, ...transforms: SplitTransform[]): string[] {
  const input = Buffer.from(sql, 'utf8');
  const tokenizer = new Tokenizer();
  const stats: string[] = [];
  let pos = 0;

  while (pos <= input.length) {
    const atEOF = pos >= input.length;
    const remaining = input.subarray(pos);
    const { advance, token } = tokenizer.scanToken(remaining, atEOF);
    if (advance === 0 && token === null) break;
    if (token !== null) {
      let text = token.toString('utf8');
      for (const apply of transforms) {
        text = apply(text);
      }
      if (text.length > 0) stats.push(text);
    }
    pos += advance;
    if (atEOF) break;
  }

  return stats;
}

export function splitAndTrim(sql: string): string[] {
  return split(sql, trimRightSemicolons, trimSpaceGo);
}
