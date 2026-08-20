import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about the type scale.
 *
 * The scale lives in Tailwind's font-size namespace (`text-lead`, `text-h2`,
 * `text-eyebrow` — see globals.css), which overlaps the text-colour namespace.
 * Left unconfigured, tailwind-merge reads `text-eyebrow` as a colour, decides
 * `text-brand` supersedes it, and silently drops the size, tracking and weight.
 * That is not hypothetical: it shipped, and stripped `text-eyebrow` off every
 * eyebrow label on the deployed build.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "h1",
            "h2",
            "lead",
            "body",
            "body-bold",
            "small",
            "eyebrow",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
