import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Mojibake signatures + replacement char + C1 controls
const BAD = /[\uFFFD\u0080-\u009F]|縺|繧|繝|縲|邵ｺ|隴鯉ｽ|驕擾ｽ/g;

function listFiles() {
  // List tracked files under public/legacy (robust: includes nested dirs)
  const out = execSync('git ls-files "public/legacy"', { encoding: "utf8" }).trim();
  if (!out) return [];
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((p) => {
      const x = p.toLowerCase();
      return x.endsWith(".html") || x.endsWith(".htm");
    });
}

function decodeUtf8Strict(bytes) {
  const td = new TextDecoder("utf-8", { fatal: true });
  return td.decode(bytes);
}

function hasBom(bytes) {
  return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

const files = listFiles();
let badCount = 0;

for (const f of files) {
  const bytes = readFileSync(f);

  if (hasBom(bytes)) {
    console.error(`BOM DETECTED: ${f}`);
    badCount++;
    continue;
  }

  let text = "";
  try {
    text = decodeUtf8Strict(bytes);
  } catch {
    console.error(`INVALID UTF-8: ${f}`);
    badCount++;
    continue;
  }

  const m = text.match(BAD);
  if (m && m.length) {
    console.error(`MOJIBAKE SIGNATURE: ${f} hits=${m.length}`);
    badCount++;
  }
}

if (badCount) {
  console.error(`\nFAILED: encoding_guard found ${badCount} bad file(s).`);
  process.exit(1);
} else {
  console.log("OK: encoding_guard passed.");
}