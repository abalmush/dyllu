import {
  mediaFolderFor,
  mediaObjectKey,
  presignedMediaObjectKey,
} from "../service";

describe("organized S3 media keys", () => {
  it("stores normal Medusa uploads under products", () => {
    expect(mediaFolderFor("DTBJ1305.webp")).toBe("products");
    expect(mediaObjectKey("DTBJ1305.webp", "01TEST")).toBe(
      "products/DTBJ1305-01TEST.webp"
    );
  });

  it("stores category uploads under categories", () => {
    expect(mediaFolderFor("categories/scule-electrice.webp")).toBe(
      "categories"
    );
    expect(
      mediaObjectKey("categories/scule-electrice.webp", "01TEST")
    ).toBe("categories/scule-electrice-01TEST.webp");
  });

  it("does not allow filenames to escape managed folders", () => {
    expect(mediaObjectKey("../../secret.png", "01TEST")).toBe(
      "products/secret-01TEST.png"
    );
    expect(
      presignedMediaObjectKey("categories/../scule-electrice.webp")
    ).toBe("categories/scule-electrice.webp");
  });
});
