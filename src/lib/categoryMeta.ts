import {
  BedDouble,
  BusFront,
  MessageCircle,
  ShoppingBag,
  Siren,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "./categories";

interface CategoryMeta {
  icon: LucideIcon;
  /**
   * The banner wash. These stand in for the photography SPEC.md §5 calls for —
   * each is a pairing of two Stamp blues colours, so the pages stay in-family
   * until real images exist.
   */
  wash: string;
  /** The light, airy intro paragraph — the editorial signature (SPEC.md §5). */
  lead: string;
}

export const CATEGORY_META: Record<Exclude<Category, "general">, CategoryMeta> = {
  greetings: {
    icon: MessageCircle,
    wash: "linear-gradient(120deg, var(--accent-sea) 0%, var(--bg-main) 100%)",
    lead: "The first ten seconds decide how the rest of the conversation goes. Lead with one of these and almost everyone will slow down for you.",
  },
  dining: {
    icon: Utensils,
    wash: "linear-gradient(120deg, var(--accent-sea) 0%, var(--brand) 160%)",
    lead: "Ordering is the part travellers rehearse and still fumble. These are the sentences that get you a table, a menu, and the bill — in that order.",
  },
  transit: {
    icon: BusFront,
    wash: "linear-gradient(120deg, var(--brand) 0%, var(--accent-sea) 120%)",
    lead: "Buses, taxis, and the moment you realise you are on the wrong one. The word for bus changes from country to country; these sentences work regardless.",
  },
  shopping: {
    icon: ShoppingBag,
    wash: "linear-gradient(120deg, var(--accent-sea) 0%, var(--bg-dark) 170%)",
    lead: "Asking the price is the easy part. Knowing when it is fair to ask for a better one is what actually takes learning.",
  },
  lodging: {
    icon: BedDouble,
    wash: "linear-gradient(120deg, var(--bg-main) 0%, var(--brand) 170%)",
    lead: "Checking in, getting a towel, and explaining that the air conditioning has given up. Short, polite, and enough to fix most of what goes wrong in a room.",
  },
  emergency: {
    icon: Siren,
    wash: "linear-gradient(120deg, var(--bg-dark) 0%, var(--brand) 140%)",
    lead: "The phrases you hope stay unused. Worth reading once now, while you are calm and unhurried, rather than searching for them later.",
  },
};

export function categoryMeta(category: Category) {
  return CATEGORY_META[category as Exclude<Category, "general">];
}
