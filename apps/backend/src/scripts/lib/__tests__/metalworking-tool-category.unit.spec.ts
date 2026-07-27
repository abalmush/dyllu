import { isMetalworkingTool } from "../metalworking-tool-category";

describe("metalworking tool category", () => {
  it.each([
    "Aparat de sudură MIG MAG Dyllu",
    "Mașină de debitat metal Dyllu",
    "Polizor unghiular cu acumulator Dyllu",
    "Foarfece pentru tablă Dyllu",
    "Clește de nituit manual Dyllu",
  ])("includes %s", (title) => {
    expect(isMetalworkingTool(title)).toBe(true);
  });

  it.each([
    "Disc de tăiere pentru metal Dyllu",
    "Lamă ferăstrău pendular pentru metal Dyllu",
    "Suport pentru polizor unghiular Dyllu",
    "Mască de sudură automată Dyllu",
    "Sârmă de sudură cu flux Dyllu",
  ])("excludes %s", (title) => {
    expect(isMetalworkingTool(title)).toBe(false);
  });
});
