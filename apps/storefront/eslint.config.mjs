import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// We adopted Medusa's Next.js starter wholesale; its code was written against
// eslint 8 + Next 15's rules. We downgrade the rules it trips up on to warnings
// so CI and pre-commit stay green while we incrementally refactor. Tighten
// these back to errors as each module is cleaned up.
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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node-style CJS config/build scripts — allowed to use require().
    "tailwind.config.js",
    "postcss.config.js",
    "check-env-variables.js",
    "next-sitemap.js",
  ]),
]);

export default eslintConfig;
