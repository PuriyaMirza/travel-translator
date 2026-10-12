"use client";

import { getLocalSettings, setLocalSettings } from "@/lib/local/settings";
import type { SpeakerGender } from "@/lib/types";

/*
 * Speaker gender sync (SPEC.md §7: "written to user_settings on sign-in if the
 * server row still has the default"). Best effort throughout: the local value
 * is always the one the UI uses, so a failure here never blocks anything.
 */

/** PUT the value; false when it didn't land (offline, signed out, server error). */
export async function pushSpeakerGender(speakerGender: SpeakerGender): Promise<boolean> {
  try {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speakerGender }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * On sign-in: if the server row is missing or still the default and this
 * device chose something else, upload it; otherwise adopt the server's value.
 * Returns the value now in effect locally, or null if the server couldn't be read.
 */
export async function reconcileSettings(): Promise<SpeakerGender | null> {
  try {
    const response = await fetch("/api/settings");
    if (!response.ok) return null;
    const { settings } = (await response.json()) as { settings: { speakerGender: SpeakerGender } | null };
    const local = await getLocalSettings();

    const serverIsDefault = !settings || settings.speakerGender === "neutral";
    if (serverIsDefault) {
      if (local.speakerGender !== "neutral") await pushSpeakerGender(local.speakerGender);
      return local.speakerGender;
    }
    if (settings.speakerGender !== local.speakerGender) {
      await setLocalSettings({ speakerGender: settings.speakerGender });
    }
    return settings.speakerGender;
  } catch {
    return null;
  }
}
