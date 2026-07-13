import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const starterLegacyWarnings = {
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-empty-object-type": "warn",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/refs": "warn",
    "prefer-const": "warn",
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  starterLegacyWarnings,
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    ".open-next/**",
    ".wrangler/**",
    ".wrangler-dist/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    "tailwind.config.js",
    "postcss.config.js",
    "check-env-variables.js",
    "next-sitemap.js",
  ]),
]);

export default eslintConfig;
