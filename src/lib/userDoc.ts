import type { User } from "firebase/auth";
import {
  Timestamp,
  doc,
  getDocFromCache,
  runTransaction,
  type DocumentSnapshot,
} from "firebase/firestore";
import { brand } from "./brand";
import { getDb } from "./firebase";
import type { SpeakerGender } from "./types";

const DEFAULT_SPEAKER_GENDER: SpeakerGender = "neutral";

function millis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

/**
 * Keep `users/{uid}` (SPEC.md §7) present and current. Called by the auth
 * store whenever a signed-in session starts — sign-up, sign-in, or a page
 * load with a restored session — so it is the only writer of this doc.
 *
 * `createdAt` and `lastLoginAt` come from Firebase Auth's own account
 * metadata, not from when this write happens to land. That makes the doc
 * self-healing: a write lost to a page unload (which the emulator showed is
 * easy to hit right after signing in) is simply redone on the next load with
 * the same values.
 *
 * `speakerGender` starts at `neutral` (SPEC.md §12). M5 adds the setting and
 * the rule that a device-stored choice replaces this default on sign-in.
 */
export async function ensureUserDoc(user: User): Promise<void> {
  const db = getDb();
  if (!db) return;
  const ref = doc(db, "users", user.uid);
  const signedInAt = Date.parse(user.metadata.lastSignInTime ?? "") || Date.now();
  const createdAt = Date.parse(user.metadata.creationTime ?? "") || Date.now();

  // Checked by a field, not by existence alone, so a doc whose creation
  // never fully landed still gets filled in.
  const isCurrent = (snapshot: DocumentSnapshot) =>
    snapshot.exists() &&
    Boolean(snapshot.get("uid")) &&
    millis(snapshot.get("lastLoginAt")) >= signedInAt;

  // Most page loads end here, from the offline cache, with no server read.
  try {
    if (isCurrent(await getDocFromCache(ref))) return;
  } catch {
    // Not cached yet — fall through to the server.
  }

  // A transaction because its reads always go to the server, never the
  // local view. Offline it fails, and the next load retries.
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (isCurrent(existing)) return;
    if (existing.exists() && existing.get("uid")) {
      transaction.update(ref, { lastLoginAt: Timestamp.fromMillis(signedInAt) });
      return;
    }
    transaction.set(
      ref,
      {
        uid: user.uid,
        email: user.email ?? "",
        createdAt: Timestamp.fromMillis(createdAt),
        lastLoginAt: Timestamp.fromMillis(signedInAt),
        // Locale is a parameter, never hardcoded (SPEC.md §2 rule 2).
        preferredLocale: brand.defaultLocale,
        speakerGender: DEFAULT_SPEAKER_GENDER,
      },
      { merge: true },
    );
  });
}
