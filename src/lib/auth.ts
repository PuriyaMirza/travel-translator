"use client";

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { clearLocalCache, getFirebaseAuth } from "./firebase";
import { releaseVault, retryVault } from "./vault";

/**
 * Account actions (SPEC.md §3: Firebase Auth, email/password). Errors come
 * back as plain sentences for the account form — SPEC.md §6 error copy: name
 * the problem and the fix, no apology.
 */

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Accounts aren't set up on this deployment yet.");
  return auth;
}

export async function signUp(email: string, password: string) {
  try {
    // users/{uid} is written by the auth store as the session starts
    // (userDoc.ts), for sign-up and sign-in alike.
    await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  } catch (error) {
    throw new Error(describeAuthError(error));
  }
}

export async function signIn(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  } catch (error) {
    throw new Error(describeAuthError(error));
  }
}

export async function sendReset(email: string) {
  try {
    await sendPasswordResetEmail(requireAuth(), email.trim());
  } catch (error) {
    throw new Error(describeAuthError(error));
  }
}

/**
 * Sign out, then delete the on-device Firestore cache so the next person on
 * this phone can't read the vault offline. The listener is released first so
 * it isn't left pointing at a terminated instance.
 */
export async function signOutUser() {
  releaseVault();
  try {
    await signOut(requireAuth());
  } catch (error) {
    retryVault();
    throw new Error(describeAuthError(error));
  }
  await clearLocalCache();
}

function describeAuthError(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : "Something went wrong. Try again.";
  }
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match. Check them, or reset your password.";
    case "auth/email-already-in-use":
      return "There's already an account with that email. Sign in instead.";
    case "auth/invalid-email":
      return "That doesn't look like an email address. Check it and try again.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "Choose a longer password — at least 6 characters.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes, then try again.";
    case "auth/network-request-failed":
      return "You're offline. Signing in needs a connection — saved phrases on this device still work.";
    default:
      return "Couldn't complete that. Check your connection and try again.";
  }
}
