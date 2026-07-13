import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "DYLLU — Scule și echipamente profesionale";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const productData = await readFile(
    join(process.cwd(), "public/products/DTCLP5121/DTCLP5121.png"),
    "base64"
  );
  const productSrc = `data:image/png;base64,${productData}`;

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#0b0d0c",
        color: "#ffffff",
        padding: "58px 62px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(198,255,55,.18), transparent 30%), radial-gradient(circle at 82% 82%, rgba(198,255,55,.12), transparent 34%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 18,
          height: "100%",
          display: "flex",
          background: "#c6ff37",
        }}
      />

      <div
        style={{
          display: "flex",
          width: "55%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "8px 32px 8px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              width: 68,
              height: 68,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "#c6ff37",
              color: "#101210",
              fontSize: 42,
              fontWeight: 900,
            }}
          >
            D
          </div>
          <div style={{ display: "flex", fontSize: 48, fontWeight: 900 }}>
            DYLLU
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              width: "auto",
              border: "1px solid rgba(198,255,55,.55)",
              borderRadius: 999,
              padding: "9px 16px",
              color: "#c6ff37",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 1.5,
            }}
          >
            SCULE PROFESIONALE · MOLDOVA
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 610,
              fontSize: 58,
              fontWeight: 850,
              lineHeight: 1.03,
              letterSpacing: -2.2,
            }}
          >
            Scule care țin pasul cu munca ta.
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 570,
              color: "#b8bdb9",
              fontSize: 24,
              lineHeight: 1.35,
            }}
          >
            Scule electrice, unelte de mână și echipamente profesionale. Livrare
            în toată Moldova.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            color: "#c6ff37",
            fontSize: 22,
            fontWeight: 750,
          }}
        >
          dyllu.md
        </div>
      </div>

      <div
        style={{
          display: "flex",
          width: "45%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 470,
            height: 500,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 34,
            background: "#f4f6f2",
            boxShadow: "0 24px 80px rgba(0,0,0,.42)",
          }}
        >
          <img
            src={productSrc}
            alt=""
            width={460}
            height={460}
            style={{ objectFit: "contain" }}
          />
        </div>
      </div>
    </div>,
    size
  );
}
