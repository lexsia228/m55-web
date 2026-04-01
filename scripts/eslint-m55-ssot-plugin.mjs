import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectViolationsForLine } from "./ssot-public-vocabulary-rules.mjs";

function relFromCwd(filename) {
  let abs = filename;
  if (typeof abs === "string" && abs.startsWith("file:")) {
    abs = fileURLToPath(abs);
  }
  return path.relative(process.cwd(), abs).split(path.sep).join("/");
}

export default {
  rules: {
    "public-surface-vocabulary": {
      meta: {
        type: "problem",
        docs: { description: "M55 public SSOT vocabulary (shared with run-sonnet-audit.js)" },
      },
      create(context) {
        return {
          Program() {
            const rel = relFromCwd(context.filename);
            const sc = context.sourceCode ?? context.getSourceCode?.();
            const src = sc.getText();
            const lines = src.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
              const vs = collectViolationsForLine(lines[i], rel, i + 1);
              for (const v of vs) {
                context.report({
                  loc: { start: { line: i + 1, column: 0 }, end: { line: i + 1, column: 0 } },
                  message: `[SSOT ${v.severity}] ${v.current}: ${v.expected} — ${v.fix}`,
                });
              }
            }
          },
        };
      },
    },
  },
};