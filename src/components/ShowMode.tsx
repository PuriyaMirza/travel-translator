"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { X } from "lucide-react";
import { useShowCard } from "@/lib/local/showCards";
import { SHOW_SHELL_PATH } from "@/lib/nav";
import { useWakeLock } from "@/lib/useWakeLock";
import { ShowSurface, ShowText, showCloseClass } from "./ShowSurface";

const SHELL_ID = SHOW_SHELL_PATH.split("/")[2];

function subscribeToUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

const currentPath = () => window.location.pathname;

/**
 * Show mode (SPEC.md §12): the card's Spanish, full screen, for someone else
 * to read. The surface itself is `ShowSurface`; this loads the card for it.
 *
 * Rendered entirely on the device. The id comes from the URL on the client,
 * because the service worker may answer `/cards/<id>` with the pre-rendered
 * shell page (SPEC.md §9); the server never knows which card this is.
 */
export function ShowMode() {
  const routeId = useParams<{ id: string }>().id;
  // On the shell page the route param is the placeholder, not a card, so the
  // id is read from the address bar instead (empty during SSR).
  const pathname = useSyncExternalStore(subscribeToUrl, currentPath, () => "");
  const urlSegment = pathname.split("/").filter(Boolean)[1];
  const id = routeId === SHELL_ID ? (urlSegment && decodeURIComponent(urlSegment)) || undefined : routeId;

  const { state } = useShowCard(id);
  useWakeLock();

  return (
    <main className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-charcoal text-inverse">
      <ShowSurface
        close={
          <Link href="/cards" aria-label="Close" className={showCloseClass}>
            <X className="size-5" />
          </Link>
        }
      >
        {state.status === "ready" ? (
          <ShowText
            text={state.card.literal}
            lang={state.card.locale}
            voice="es"
            sourceText={state.card.sourceText}
            speakId={state.card.id}
            speakLabel={state.card.title}
          />
        ) : state.status === "loading" ? null : (
          <div>
            <p className="text-h2 text-inverse">
              {state.status === "error"
                ? "This device's saved cards couldn't be opened."
                : "This card isn't on this device."}
            </p>
            <Link href="/cards" className="text-body-bold mt-4 inline-block text-inverse underline underline-offset-4">
              Back to your cards
            </Link>
          </div>
        )}
      </ShowSurface>
    </main>
  );
}
