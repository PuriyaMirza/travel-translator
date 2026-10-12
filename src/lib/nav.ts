import { VISIBLE_CATEGORIES } from "./categories";

/** Top-level routes, in drawer order. NavDrawer renders these. */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/translate", label: "Translate" },
  { href: "/vault", label: "Vault" },
] as const;

/**
 * Every page the service worker should cache after one online visit, so the
 * whole app opens with zero signal (SPEC.md §9). Built from code, not from
 * the worker, so new routes only need adding here.
 */
export function warmUrls(): string[] {
  return [
    ...NAV_LINKS.map((link) => link.href),
    ...VISIBLE_CATEGORIES.map((category) => `/phrasebook/${category}`),
  ];
}
