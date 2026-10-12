import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SHOW_CARD_KIND_LABELS } from "@/lib/labels";
import { SHOW_CARD_KIND_META } from "@/lib/showCardMeta";
import { SHOW_CARD_KINDS } from "@/lib/types";

/** The five kinds as tiles; tapping one starts a card of that kind (SPEC.md §12). */
export function ShowCardKindTiles() {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {SHOW_CARD_KINDS.map((kind) => {
        const { icon: Icon, blurb } = SHOW_CARD_KIND_META[kind];
        return (
          <li key={kind}>
            <Link
              href={`/cards/new?kind=${kind}`}
              className="rounded-card group flex h-full flex-col justify-between gap-5 border border-hairline bg-card p-4 text-left shadow-soft transition duration-100 hover:-translate-y-0.5 hover:border-blush active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span aria-hidden className="rounded-image flex size-11 items-center justify-center bg-sand">
                <Icon className="size-5 text-ink/70" />
              </span>
              <span>
                <span className="text-body-bold flex items-center gap-1 text-ink">
                  {SHOW_CARD_KIND_LABELS.en[kind]}
                  <ChevronRight className="size-4 text-muted transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </span>
                <span className="text-small block text-muted">{blurb}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
