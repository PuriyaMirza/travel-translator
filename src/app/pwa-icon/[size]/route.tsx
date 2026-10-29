import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

const SIZES = ["192", "512", "512-maskable"] as const;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export const dynamicParams = false;

// Brand initial, cream on crimson (mirrors --brand / --bg-main). Satori only
// loads its bundled sans, so this is a legible glyph rather than the serif
// wordmark. Maskable icons get a larger safe-zone margin.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const px = size.startsWith("192") ? 192 : 512;
  const margin = size.endsWith("maskable") ? 0.2 : 0.1;

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
          fontSize: Math.round(px * (1 - 2 * margin)),
          fontWeight: 700,
        }}
      >
        {brand.name.charAt(0).toUpperCase()}
      </div>
    ),
    { width: px, height: px },
  );
}
