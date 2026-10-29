"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { X } from "lucide-react";
import { useShowCard } from "@/lib/local/showCards";
import { SHOW_SHELL_PATH } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/lib/useSpeech";
import { useWakeLock } from "@/lib/useWakeLock";
import { SpeakButton } from "./SpeakButton";

const SHELL_ID = SHOW_SHELL_PATH.split("/")[2];

function subscribeToUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

const currentPath = () => window.location.pathname;

/**
 * Show mode (SPEC.md §12): the card's Spanish, full screen, for someone else
 * to read. A dark reading surface — no crimson anywhere.
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
  const { speak, speakingId, supported } = useSpeech();
  useWakeLock();

  return (
    <main className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-charcoal text-inverse">
      <div className="px-4 pt-[env(safe-area-inset-top)]">
        <Link
          href="/cards"
          aria-label="Close"
          className="mt-3 flex size-11 items-center justify-center rounded-full border border-inverse/30 text-inverse transition hover:border-inverse motion-reduce:transition-none"
        >
          <X className="size-5" />
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-10">
        {state.status === "ready" ? (
          <>
            <p
              lang={state.card.locale}
              className={cn(
                "text-display font-bold whitespace-pre-line text-inverse md:text-5xl",
                "[overflow-wrap:anywhere]",
              )}
            >
              {state.card.literal}
            </p>
            <p className="text-small mt-6 whitespace-pre-line text-muted">{state.card.sourceText}</p>
            <div className="mt-8">
              <SpeakButton
                tone="dark"
                onSpeak={() => speak(state.card.id, state.card.literal, "es")}
                isSpeaking={speakingId === state.card.id}
                supported={supported}
                label={state.card.title}
              />
            </div>
          </>
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
      </div>
    </main>
  );
}
