import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/i18n/**/*.unit.spec.ts"],
  },
});
