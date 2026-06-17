import { ImageResponse } from "next/og";
import { HOME_PAGE_TITLE, PRODUCT_DEFINITION } from "@/lib/seo/site";

export const alt = "Argos sales coaching platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000",
          color: "#f1bf7b",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
          Argos
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ maxWidth: 900, color: "#e9e4dd", fontSize: 78, fontWeight: 900, lineHeight: 0.95 }}>
            {HOME_PAGE_TITLE}
          </div>
          <div style={{ maxWidth: 880, marginTop: 32, color: "#d6cab9", fontSize: 30, fontWeight: 700, lineHeight: 1.3 }}>
            {PRODUCT_DEFINITION}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
