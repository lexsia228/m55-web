import tsparser from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import m55Ssot from "./scripts/eslint-m55-ssot-plugin.mjs";

const ssotFiles = [
  "app/home/**/*.{ts,tsx,js,jsx}",
  "app/how-m55-works/**/*.{ts,tsx,js,jsx}",
  "app/ten-views/**/*.{ts,tsx,js,jsx}",
  "app/support/**/*.{ts,tsx,js,jsx}",
  "app/legal/**/*.{ts,tsx,js,jsx}",
  "app/purchase/**/*.{ts,tsx,js,jsx}",
  "app/dtr/page.tsx",
  "app/dtr/lp/**/*.{ts,tsx,js,jsx}",
  "app/pricing/**/*.{ts,tsx,js,jsx}",
  "components/home/**/*.{ts,tsx,js,jsx}",
  "components/pages/**/*.{ts,tsx,js,jsx}",
  "components/shell/**/*.{ts,tsx,js,jsx}",
];

export default [
  { ignores: ["**/.next/**", "**/node_modules/**", "public/**"] },
  {
    files: ssotFiles,
    languageOptions: {
      parser: tsparser.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "m55-ssot": m55Ssot, "react-hooks": reactHooks },
    rules: {
      "m55-ssot/public-surface-vocabulary": "error",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];