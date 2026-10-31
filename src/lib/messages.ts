/** User-facing connectivity messages shared by the translate flow and banner. */
export const OFFLINE_MESSAGE =
  "You're offline. Translation needs a connection — the phrasebook still works without one.";
export const NETWORK_MESSAGE =
  "Couldn't reach the server. Check your connection and try again.";
export const OFFLINE_BANNER = "You're offline. The phrasebook and your vault still work.";
export const OFFLINE_EDIT_MESSAGE =
  "You're offline. Changing the English means translating it again, which needs a connection. You can still rename or delete this card.";
export const OFFLINE_CREATE_MESSAGE =
  "You're offline. Translating a new card needs a connection. Address cards don't, and the cards you already have still open.";
export const OFFLINE_TRIP_MESSAGE =
  "You're offline. Building a trip pack needs a connection — the phrasebook and your vault still work.";

/**
 * Menu scan (SPEC.md §14). Shared by `/api/menu-scan` (server error bodies)
 * and `MenuScanner` (client-side states), so the copy lives in one place.
 */
export const MENU_SIGN_IN_MESSAGE = "Sign in to scan a menu.";
export const MENU_NOT_A_MENU_MESSAGE =
  "That doesn't look like a menu. Try a closer photo of the item list.";
export const MENU_TOO_LARGE_MESSAGE =
  "That photo is too large to send. Try taking it again a little further back.";
export const MENU_NOT_AN_IMAGE_MESSAGE = "That file isn't a photo. Choose a JPEG or PNG image.";
export const MENU_DECODE_MESSAGE =
  "This photo format couldn't be read. Try the Take photo button.";
export const MENU_RATE_LIMITED_MESSAGE =
  "You've scanned 10 menus in the last hour. Try again later.";
export const MENU_UPSTREAM_MESSAGE = "Couldn't read the menu right now. Try again in a moment.";
export const MENU_UNKNOWN_MESSAGE = "Something went wrong. Try again.";
export const OFFLINE_MENU_MESSAGE =
  "You're offline. Reading a menu needs a connection — the phrasebook and your vault still work.";
