import { VISIBLE_CATEGORIES } from "./categories";

/** Top-level routes, in drawer order. NavDrawer renders these. */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/translate", label: "Translate" },
  { href: "/vault", label: "Vault" },
  { href: "/trip", label: "Trip" },
  { href: "/cards", label: "Cards" },
] as const;

/**
 * Show mode is `/cards/<id>` (SPEC.md §12). `new` and `edit` are their own
 * static routes, so they are not show mode.
 */
export function isShowModePath(pathname: string): boolean {
  return /^\/cards\/(?!new$|edit$)[^/]+$/.test(pathname);
}

/**
 * The one pre-rendered show-mode page. The worker serves it for any
 * `/cards/<id>` it hasn't cached, and the page reads the real id from the URL.
 */
export const SHOW_SHELL_PATH = "/cards/_shell";

/**
 * Every page the service worker should cache after one online visit, so the
 * whole app opens with zero signal (SPEC.md §9). Built from code, not from
 * the worker, so new routes only need adding here.
 */
export function warmUrls(): string[] {
  return [
    ...NAV_LINKS.map((link) => link.href),
    "/cards/new",
    "/cards/edit",
    SHOW_SHELL_PATH,
    ...VISIBLE_CATEGORIES.map((category) => `/phrasebook/${category}`),
  ];
}
