"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

/**
 * Preference order for a voice. `es-419` is a valid BCP 47 tag but almost no
 * platform ships a voice tagged with it, so fall through Latin American
 * locales before accepting any Spanish voice at all. European Spanish is the
 * last resort — better than silence, but it lisps, which is exactly what the
 * pronunciation guides tell the reader not to do.
 */
const VOICE_PREFERENCE = ["es-419", "es-US", "es-MX", "es-CO", "es-AR", "es-"];

function pickVoice(voices: SpeechSynthesisVoice[]) {
  for (const tag of VOICE_PREFERENCE) {
    const match = voices.find((voice) => voice.lang.replace("_", "-").startsWith(tag));
    if (match) return match;
  }
  return null;
}

function hasSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/*
 * Voices are external browser state, not React state: they populate
 * asynchronously and `getVoices()` is empty on the first call in most
 * browsers. useSyncExternalStore is the right primitive — it also gives a
 * distinct server snapshot, so the speak button is absent in the prerendered
 * HTML and appears on hydration rather than mismatching.
 */
const NO_VOICES: SpeechSynthesisVoice[] = [];
let cachedVoices: SpeechSynthesisVoice[] = NO_VOICES;

function subscribeVoices(onChange: () => void) {
  if (!hasSynthesis()) return () => {};
  const synth = window.speechSynthesis;
  const handler = () => {
    cachedVoices = synth.getVoices();
    onChange();
  };
  synth.addEventListener("voiceschanged", handler);
  return () => {
    synth.removeEventListener("voiceschanged", handler);
    synth.cancel();
  };
}

function voicesSnapshot() {
  if (!hasSynthesis()) return NO_VOICES;
  // getVoices() returns a fresh array each call, which would loop forever if
  // handed straight back. Only swap the cached reference when it really grew.
  const current = window.speechSynthesis.getVoices();
  if (current.length !== cachedVoices.length) cachedVoices = current;
  return cachedVoices;
}

export function useSpeech() {
  const voices = useSyncExternalStore(subscribeVoices, voicesSnapshot, () => NO_VOICES);
  const voice = useMemo(() => pickVoice(voices), [voices]);

  // Gated on there being a voice to speak with, not merely on the API
  // existing. Plenty of devices expose speechSynthesis with an empty voice
  // list — headless Chromium is one — and speak() there fails silently. A
  // button that flashes and does nothing is worse than no button.
  const supported = voices.length > 0;
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const speak = useCallback(
    (id: string, text: string) => {
      if (!supported) return;
      const synth = window.speechSynthesis;

      // Tapping the card that is already speaking stops it.
      synth.cancel();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? "es-MX";
      // Slightly under natural pace: this is being repeated aloud by someone
      // who does not speak the language.
      utterance.rate = 0.9;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);

      setSpeakingId(id);
      synth.speak(utterance);
    },
    [supported, voice, speakingId],
  );

  return { speak, speakingId, supported };
}
