"use client";

import Link from "next/link";
import { ChevronRight, Plane } from "lucide-react";
import { destinationName } from "@/lib/destinations";
import { useLocalSettings } from "@/lib/local/settings";
import { travelMonthLabel } from "@/lib/onboarding";

/**
 * The trip from onboarding, on Home, linking to the trip-pack builder.
 * Renders nothing until a destination has been chosen.
 */
export function TripRow({ locale }: { locale: string }) {
  const settings = useLocalSettings();
  const name = settings?.destination ? destinationName(locale, settings.destination) : undefined;
  if (!name) return null;

  const month = settings?.travelMonth ? travelMonthLabel(settings.travelMonth) : undefined;

  return (
    <Link
      href="/trip"
      className="flex items-center gap-3 rounded-tile border border-ink bg-card px-4 py-3 text-ink transition hover:bg-sand/60 motion-reduce:transition-none"
    >
      <Plane aria-hidden className="size-[18px] shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="text-body-bold block">{month ? `${name} · ${month}` : name}</span>
        <span className="text-small block text-muted">Build a trip pack for this trip</span>
      </span>
      <ChevronRight aria-hidden className="size-[18px] shrink-0" />
    </Link>
  );
}
