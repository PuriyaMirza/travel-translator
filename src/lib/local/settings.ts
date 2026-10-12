"use client";

import { useEffect, useState } from "react";
import { brand } from "@/lib/brand";
import type { SpeakerGender, UserSettings } from "@/lib/types";
import { localDb, notifyLocalChange, onLocalChange } from "./db";

/** What a device has before the user chooses anything. */
function defaultSettings(): UserSettings {
  return {
    preferredLocale: brand.defaultLocale,
    speakerGender: "neutral",
    updatedAt: new Date(0).toISOString(),
  };
}

/** Settings from IndexedDB (SPEC.md §7, logged out or not), or the defaults. */
export async function getLocalSettings(): Promise<UserSettings> {
  const db = await localDb();
  return (await db.get("settings", "settings")) ?? defaultSettings();
}

export async function setLocalSettings(patch: Partial<Pick<UserSettings, "speakerGender" | "preferredLocale">>) {
  const db = await localDb();
  const current = (await db.get("settings", "settings")) ?? defaultSettings();
  await db.put("settings", { ...current, ...patch, updatedAt: new Date().toISOString() }, "settings");
  notifyLocalChange();
}

/** The current speaker-gender setting, re-read whenever local data changes. */
export function useSpeakerGender() {
  const [speakerGender, setSpeakerGender] = useState<SpeakerGender>("neutral");

  useEffect(() => {
    const load = () => {
      getLocalSettings().then(
        (settings) => setSpeakerGender(settings.speakerGender),
        () => {},
      );
    };
    load();
    return onLocalChange(load);
  }, []);

  return {
    speakerGender,
    setSpeakerGender: (next: SpeakerGender) => setLocalSettings({ speakerGender: next }),
  };
}
