module.exports = {
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
          },
        },
      },
    ],
  },
  testEnvironment: "node",
  testMatch: ["**/src/**/__tests__/**/*.unit.spec.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.medusa/"],
};
