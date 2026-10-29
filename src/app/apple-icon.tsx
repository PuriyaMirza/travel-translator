import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Opaque (iOS fills transparency with black). Colours mirror --brand and
// --bg-main.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A1856",
          color: "#F2F1EA",
          fontSize: 130,
          fontWeight: 700,
        }}
      >
        {brand.name.charAt(0).toUpperCase()}
      </div>
    ),
    size,
  );
}
