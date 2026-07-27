import { isWoodworkingTool } from "../woodworking-tool-category";

describe("woodworking tool category", () => {
  it.each([
    "Ferăstrău circular electric Dyllu",
    "Ferăstrău pendular fără acumulator Dyllu",
    "Mașină de frezat pentru lemn Dyllu",
    "Mașină de șlefuit orbitală Dyllu",
    "Rindea Dyllu",
  ])("includes %s", (title) => {
    expect(isWoodworkingTool(title)).toBe(true);
  });

  it.each([
    "Mașină de debitat metal Dyllu",
    "Polizor unghiular Dyllu",
    "Lamă ferăstrău pendular pentru lemn Dyllu",
    "Disc circular pentru lemn Dyllu",
  ])("excludes %s", (title) => {
    expect(isWoodworkingTool(title)).toBe(false);
  });
});
