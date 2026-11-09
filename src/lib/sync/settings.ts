"use client";

import { getLocalSettings, setLocalSettings } from "@/lib/local/settings";
import type { SpanishComfort, SpeakerGender, UserSettings } from "@/lib/types";

/*
 * Settings sync: speaker gender (SPEC.md §7: "written to user_settings on
 * sign-in if the server row still has the default") and the onboarding
 * answers (destination, travel month, Spanish level). Best effort
 * throughout: the local value is always the one the UI uses, so a failure
 * here never blocks anything.
 */

/** The settings that live in `user_settings`. Null means "not answered". */
export interface SyncedSettings {
  speakerGender: SpeakerGender;
  destination: string | null;
  travelMonth: string | null;
  spanishComfort: SpanishComfort | null;
}

const ANSWER_KEYS = ["destination", "travelMonth", "spanishComfort"] as const;

export function syncedFromLocal(local: UserSettings): SyncedSettings {
  return {
    speakerGender: local.speakerGender,
    destination: local.destination ?? null,
    travelMonth: local.travelMonth ?? null,
    spanishComfort: local.spanishComfort ?? null,
  };
}

/** The fields of `next` that differ from `known`. */
export function changedFields(known: SyncedSettings, next: SyncedSettings): Partial<SyncedSettings> {
  const patch: Partial<SyncedSettings> = {};
  if (next.speakerGender !== known.speakerGender) patch.speakerGender = next.speakerGender;
  for (const key of ANSWER_KEYS) {
    if (next[key] !== known[key]) Object.assign(patch, { [key]: next[key] });
  }
  return patch;
}

/** PUT the fields given; false when it didn't land (offline, signed out, server error). */
export async function pushSettings(patch: Partial<SyncedSettings>): Promise<boolean> {
  if (Object.keys(patch).length === 0) return true;
  try {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * On sign-in, merge field by field:
 * - Speaker gender: if the server row is missing or still `neutral`, this
 *   device's choice wins; otherwise the server's does (unchanged from M5).
 * - Each onboarding answer: if the server has none, this device's answer
 *   wins; if the server has one, it wins.
 * Uploads what the device won, writes locally what the server won, and
 * returns the values the server now holds — or null if the server couldn't
 * be read at all.
 */
export async function reconcileSettings(): Promise<SyncedSettings | null> {
  try {
    const response = await fetch("/api/settings");
    if (!response.ok) return null;
    const { settings: server } = (await response.json()) as { settings: SyncedSettings | null };
    const local = syncedFromLocal(await getLocalSettings());

    const merged: SyncedSettings = {
      speakerGender:
        !server || server.speakerGender === "neutral" ? local.speakerGender : server.speakerGender,
      destination: server?.destination ?? local.destination,
      travelMonth: server?.travelMonth ?? local.travelMonth,
      spanishComfort: server?.spanishComfort ?? local.spanishComfort,
    };

    const serverView: SyncedSettings = server
      ? {
          speakerGender: server.speakerGender,
          destination: server.destination ?? null,
          travelMonth: server.travelMonth ?? null,
          spanishComfort: server.spanishComfort ?? null,
        }
      : { speakerGender: "neutral", destination: null, travelMonth: null, spanishComfort: null };

    const upload = changedFields(serverView, merged);
    const download = changedFields(local, merged);

    if (Object.keys(download).length > 0) {
      await setLocalSettings({
        speakerGender: merged.speakerGender,
        destination: merged.destination ?? undefined,
        travelMonth: merged.travelMonth ?? undefined,
        spanishComfort: merged.spanishComfort ?? undefined,
      });
    }
    // If the upload fails, report what the server actually holds, so the
    // next local change diffs against it and re-sends the missing fields.
    return (await pushSettings(upload)) ? merged : serverView;
  } catch {
    return null;
  }
}
