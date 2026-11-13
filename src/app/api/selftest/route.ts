import { NextRequest, NextResponse } from "next/server";
import { translate } from "@/lib/translate";
import type { Traveller } from "@/lib/traveller";

/**
 * TEMPORARY, preview-only. Runs one input through the live translate prompt
 * for four travellers so the M8 prompt changes can be read before they merge.
 * Removed before the PR merges (same approach as the M3–M6 QA route).
 */
export const maxDuration = 120;

const TRAVELLERS: { label: string; traveller: Traveller }[] = [
  { label: "no destination, basic", traveller: { speakerGender: "neutral", spanishComfort: "basic" } },
  { label: "Mexico, none", traveller: { speakerGender: "neutral", destination: "MX", spanishComfort: "none" } },
  { label: "Argentina, none", traveller: { speakerGender: "neutral", destination: "AR", spanishComfort: "none" } },
  { label: "Colombia, conversational", traveller: { speakerGender: "neutral", destination: "CO", spanishComfort: "conversational" } },
];

const INPUTS = [
  "Where is the bus stop?",
  "Can I have a straw?",
  "I'm allergic to peanuts.",
  "Do you have a jacket in a bigger size?",
];

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") return new NextResponse(null, { status: 404 });
  const input = INPUTS[Number(request.nextUrl.searchParams.get("i") ?? 0)];
  if (!input) return new NextResponse(null, { status: 404 });

  const results = await Promise.all(
    TRAVELLERS.map(async ({ label, traveller }) => {
      try {
        const p = await translate(input, traveller);
        return { label, natural: p.natural, literal: p.literal, pronunciation: p.pronunciation, note: p.culturalNote ?? "" };
      } catch (error) {
        return { label, error: String(error) };
      }
    }),
  );
  return NextResponse.json({ input, results });
}
