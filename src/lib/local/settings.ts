"use client";

import { useEffect, useMemo, useState } from "react";
import { brand } from "@/lib/brand";
import { DEFAULT_TRAVELLER, type Traveller } from "@/lib/traveller";
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

export type SettingsPatch = Partial<Omit<UserSettings, "updatedAt">>;

export async function setLocalSettings(patch: SettingsPatch) {
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

/** All local settings, re-read whenever local data changes. Null until the first read. */
export function useLocalSettings(): UserSettings | null {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    const load = () => {
      getLocalSettings().then(setSettings, () => setSettings(defaultSettings()));
    };
    load();
    return onLocalChange(load);
  }, []);

  return settings;
}

/**
 * The traveller as the model calls need it (SPEC.md §14): speaker gender plus
 * the onboarding answers. Neutral with no answers until the first read.
 */
export function useTraveller(): Traveller {
  const settings = useLocalSettings();
  return useMemo(
    () =>
      settings
        ? {
            speakerGender: settings.speakerGender,
            destination: settings.destination,
            travelMonth: settings.travelMonth,
            spanishComfort: settings.spanishComfort,
          }
        : DEFAULT_TRAVELLER,
    [settings],
  );
}
