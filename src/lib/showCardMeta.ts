import { Leaf, MapPin, PenLine, ShieldAlert, Stethoscope, type LucideIcon } from "lucide-react";
import type { ShowCardKind } from "./types";

interface ShowCardKindMeta {
  icon: LucideIcon;
  /** One line on the empty-state tile (SPEC.md §12). */
  blurb: string;
}

export const SHOW_CARD_KIND_META: Record<ShowCardKind, ShowCardKindMeta> = {
  allergy: { icon: ShieldAlert, blurb: "Tell a kitchen what can make you sick." },
  diet: { icon: Leaf, blurb: "What you don't eat, and why it matters." },
  medical: { icon: Stethoscope, blurb: "A condition or medication, in plain words." },
  address: { icon: MapPin, blurb: "Where you're staying, ready to hand to a driver." },
  custom: { icon: PenLine, blurb: "Anything else you need someone to read." },
};
