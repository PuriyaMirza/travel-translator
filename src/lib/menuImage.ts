/**
 * Client-side image preparation for menu scan (SPEC.md section 14,
 * "Capture and image preparation").
 *
 * Browser only at call time, but safe to import anywhere: no browser global
 * is touched until `prepareMenuImage` runs, and there are no Node APIs.
 *
 * No user-facing copy lives here. The UI maps `MenuImageError.reason` to
 * `MENU_DECODE_MESSAGE` / `MENU_TOO_LARGE_MESSAGE` from `messages.ts`.
 */

/** Why preparation failed. Distinct so the UI can say something plain. */
export type MenuImageErrorReason = "decode" | "too-large";

export class MenuImageError extends Error {
  readonly reason: MenuImageErrorReason;

  constructor(reason: MenuImageErrorReason) {
    super(reason);
    this.name = "MenuImageError";
    this.reason = reason;
  }
}

/** Longest allowed edge, in pixels (high-resolution vision tier). */
const MAX_LONG_EDGE = 2576;

/** Each 28x28 pixel patch costs one vision token. */
const PATCH = 28;

/** Token budget: ceil(w / 28) * ceil(h / 28) must not exceed this. */
const MAX_TOKENS = 4784;

/**
 * Vercel rejects request bodies over 4.5 MB with a 413 before the route runs,
 * so the client keeps the JPEG at or under 4 MB. This is the real guard.
 */
const MAX_BYTES = 4 * 1024 * 1024;

/** Quality ladder: first attempt, then retries while the blob is over 4 MB. */
const QUALITIES = [0.85, 0.75, 0.65] as const;

const tokensFor = (w: number, h: number): number =>
  Math.ceil(w / PATCH) * Math.ceil(h / PATCH);

/**
 * Largest size that keeps the aspect ratio, never exceeds the source, and
 * satisfies BOTH constraints:
 *
 *   1. long edge <= 2576 px
 *   2. ceil(w / 28) * ceil(h / 28) <= 4784
 *
 * Arithmetic. The token count is roughly (w * h) / 28^2, so the pixel budget
 * is about 4784 * 784 = 3,750,656 px. For a scale s (0 < s <= 1):
 *
 *   edge limit:   s <= 2576 / longEdge
 *   budget limit: s <= sqrt(3,750,656 / (w * h))
 *
 * Start from the smaller of the two (and 1, so we never upscale). The ceil()
 * in the token count can push the real count a little over the budget, and
 * rounding the dimensions changes it again, so the estimate is only a
 * starting point. From it we step the LONG edge down one pixel at a time,
 * derive the short edge by rounding, and stop at the first size that passes
 * the exact check. That is the largest passing size, and it takes a handful
 * of steps at most.
 *
 * Worked examples (computed with this algorithm):
 *
 *   4:3   4032x3024 (iPhone photo)  -> 2212x1659
 *         edge limit 0.639, budget limit 0.555. Budget wins.
 *         ceil(2212/28)=79, ceil(1659/28)=60 -> 79 * 60 = 4740 tokens.
 *         (2213 would give 80 * 60 = 4800, over budget.)
 *   3:4   3024x4032 (portrait)      -> 1659x2212, 60 * 79 = 4740 tokens.
 *   9:16  2268x4032 (tall phone)    -> 1449x2576
 *         Edge limit 0.639 wins and the budget is met exactly:
 *         ceil(1449/28)=52, ceil(2576/28)=92 -> 52 * 92 = 4784 tokens.
 *         (The landscape 16:9, 4032x2268, gives 2576x1449, same count.)
 *   1:1   3000x3000                 -> 1932x1932
 *         edge limit 0.859, budget limit 0.644. Budget wins.
 *         ceil(1932/28)=69 twice -> 69 * 69 = 4761 tokens.
 *         (1933 would give 70 * 70 = 4900, over budget.)
 *
 * Already small enough: 1600x1200 stays 1600x1200 (58 * 43 = 2494 tokens).
 */
export function fitMenuImage(
  width: number,
  height: number,
): { width: number; height: number } {
  if (Math.max(width, height) <= MAX_LONG_EDGE && tokensFor(width, height) <= MAX_TOKENS) {
    return { width, height };
  }

  const landscape = width >= height;
  const long = landscape ? width : height;

  const scale = Math.min(
    1,
    MAX_LONG_EDGE / long,
    Math.sqrt((MAX_TOKENS * PATCH * PATCH) / (width * height)),
  );

  // Start one pixel above the estimate (floor can land below the true
  // maximum) and walk down to the first exact fit.
  for (let L = Math.min(long, Math.floor(long * scale) + 1); L >= 1; L--) {
    const k = L / long;
    const w = landscape ? L : Math.max(1, Math.round(width * k));
    const h = landscape ? Math.max(1, Math.round(height * k)) : L;
    if (Math.max(w, h) <= MAX_LONG_EDGE && tokensFor(w, h) <= MAX_TOKENS) {
      return { width: w, height: h };
    }
  }

  // Unreachable for any real image; 1x1 always fits.
  return { width: 1, height: 1 };
}

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Release the decoded pixels (ImageBitmap) or the object URL (<img>). */
  release: () => void;
};

/** Preferred path: EXIF rotation is applied by the decoder itself. */
async function decodeWithBitmap(file: File): Promise<Decoded> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("createImageBitmap unavailable");
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => bitmap.close(),
  };
}

/**
 * Fallback: decode through an <img>. Current browsers apply EXIF orientation
 * to <img> by default. The object URL is revoked as soon as decoding settles
 * (the decoded pixels stay available to drawImage), and again on release.
 */
async function decodeWithImg(file: File): Promise<Decoded> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) {
      throw new Error("empty image");
    }
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => {},
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decode(file: File): Promise<Decoded> {
  try {
    return await decodeWithBitmap(file);
  } catch {
    try {
      return await decodeWithImg(file);
    } catch {
      throw new MenuImageError("decode");
    }
  }
}

type Surface = {
  draw: (source: CanvasImageSource, width: number, height: number) => boolean;
  encode: (quality: number) => Promise<Blob | null>;
};

/** OffscreenCanvas + convertToBlob when available, else a detached <canvas>. */
function createSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    return {
      draw: (source, w, h) => {
        if (!ctx) return false;
        // JPEG has no alpha; paint white so transparent PNGs don't go black.
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(source, 0, 0, w, h);
        return true;
      },
      encode: (quality) => canvas.convertToBlob({ type: "image/jpeg", quality }),
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  return {
    draw: (source, w, h) => {
      if (!ctx) return false;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);
      return true;
    },
    encode: (quality) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      }),
  };
}

/**
 * Decode, downscale (never upscale) and re-encode a menu photo as JPEG.
 *
 * Re-encoding through a canvas drops all metadata: EXIF, including GPS
 * location, camera model and timestamps, never leaves the device. The
 * orientation is already baked into the pixels at decode time.
 *
 * Throws `MenuImageError("decode")` when the file can't be read as an image
 * (or a canvas can't be made or encoded), and `MenuImageError("too-large")`
 * when even quality 0.65 is over 4 MB.
 */
export async function prepareMenuImage(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  const decoded = await decode(file);
  try {
    if (!decoded.width || !decoded.height) {
      throw new MenuImageError("decode");
    }

    const { width, height } = fitMenuImage(decoded.width, decoded.height);

    let surface: Surface;
    try {
      surface = createSurface(width, height);
      if (!surface.draw(decoded.source, width, height)) {
        throw new MenuImageError("decode");
      }
    } catch (error) {
      if (error instanceof MenuImageError) throw error;
      throw new MenuImageError("decode");
    }

    for (const quality of QUALITIES) {
      let blob: Blob | null;
      try {
        blob = await surface.encode(quality);
      } catch {
        throw new MenuImageError("decode");
      }
      // A null blob means the browser could not encode this canvas at all.
      if (!blob) throw new MenuImageError("decode");
      if (blob.size <= MAX_BYTES) return { blob, width, height };
    }

    throw new MenuImageError("too-large");
  } finally {
    decoded.release();
  }
}
