import { brand } from "./brand";
import type { Phrase } from "./types";

/**
 * Preset phrases for the static phrasebook (SPEC.md §10, M1).
 *
 * Neutral Latin American Spanish throughout. House rules for this file:
 *
 * - No `vosotros`, anywhere, ever. Formal `usted` with strangers, which is
 *   what a traveller is almost always doing.
 * - Pronunciation uses Latin American sounds: seseo (c/z = "s", never "th"),
 *   `ll` and `y` as a soft "y". Stressed syllable in CAPS.
 * - `culturalNote` is filled only where a traveller would genuinely get it
 *   wrong. Most phrases do not have one, and that is correct — do not pad it.
 * - Minimal slang. Regional words are flagged in the note rather than used.
 */
const preset = (phrases: Omit<Phrase, "locale">[]): Phrase[] =>
  phrases.map((phrase) => ({ ...phrase, locale: brand.defaultLocale }));

export const PRESET_PHRASES: Phrase[] = preset([
  // --- greetings ----------------------------------------------------------
  {
    id: "greetings-hello",
    category: "greetings",
    sourceText: "Hello",
    literal: "Hola",
    natural: "Hola",
    pronunciation: "OH-lah",
  },
  {
    id: "greetings-good-morning",
    category: "greetings",
    sourceText: "Good morning",
    literal: "Buenos días",
    natural: "Buenos días",
    pronunciation: "BWEH-nohs DEE-ahs",
    culturalNote:
      "Used until about midday, then buenas tardes. Greeting someone before you ask them anything is expected, not optional — skipping it reads as brusque.",
  },
  {
    id: "greetings-thank-you",
    category: "greetings",
    sourceText: "Thank you very much",
    literal: "Muchas gracias",
    natural: "Muchas gracias",
    pronunciation: "MOO-chahs GRAH-see-ahs",
    culturalNote:
      "GRAH-see-ahs, never grah-THEE-ahs. The Castilian lisp is not used anywhere in Latin America.",
  },
  {
    id: "greetings-excuse-me",
    category: "greetings",
    sourceText: "Excuse me",
    literal: "Disculpe",
    natural: "Disculpe",
    pronunciation: "dees-KOOL-peh",
    culturalNote:
      "For getting a stranger's attention. Permiso is for squeezing past someone, and perdón is for apologising after you have already bumped into them.",
  },
  {
    id: "greetings-do-you-speak-english",
    category: "greetings",
    sourceText: "Do you speak English?",
    literal: "¿Habla usted inglés?",
    natural: "¿Habla inglés?",
    pronunciation: "AH-blah een-GLEHS",
  },
  {
    id: "greetings-little-spanish",
    category: "greetings",
    sourceText: "I don't speak much Spanish",
    literal: "No hablo mucho español",
    natural: "Hablo poquito español",
    pronunciation: "AH-bloh poh-KEE-toh ehs-pah-NYOL",
    culturalNote:
      "Saying this early nearly always makes the other person slow down. Poquito is warmer than the flat no hablo and tends to get a friendlier response.",
  },
  {
    id: "greetings-nice-to-meet-you",
    category: "greetings",
    sourceText: "Nice to meet you",
    literal: "Es un placer conocerlo",
    natural: "Mucho gusto",
    pronunciation: "MOO-choh GOOS-toh",
  },

  // --- dining -------------------------------------------------------------
  {
    id: "dining-menu",
    category: "dining",
    sourceText: "Could I see the menu?",
    literal: "¿Podría ver el menú?",
    natural: "¿Me da el menú, por favor?",
    pronunciation: "meh dah ehl meh-NOO, por fah-VOR",
    culturalNote:
      "La carta is the more common word in many countries; both are understood everywhere.",
  },
  {
    id: "dining-table-for-two",
    category: "dining",
    sourceText: "A table for two, please",
    literal: "Una mesa para dos, por favor",
    natural: "Una mesa para dos, por favor",
    pronunciation: "OO-nah MEH-sah PAH-rah dohs, por fah-VOR",
  },
  {
    id: "dining-vegetarian",
    category: "dining",
    sourceText: "I'm vegetarian",
    literal: "Soy vegetariano",
    natural: "Soy vegetariano",
    pronunciation: "soy veh-heh-tah-ree-AH-noh",
    culturalNote:
      "Say vegetariana if you are a woman. Worth adding no como pollo ni pescado — chicken and fish are often not counted as meat.",
  },
  {
    id: "dining-does-this-have-meat",
    category: "dining",
    sourceText: "Does this have meat in it?",
    literal: "¿Esto contiene carne?",
    natural: "¿Esto lleva carne?",
    pronunciation: "EHS-toh YEH-vah KAR-neh",
    culturalNote:
      "Lleva starts with a soft y sound, not a hard L. Beans and rice are very often cooked with pork fat, so this is worth asking even about a side dish.",
  },
  {
    id: "dining-allergy",
    category: "dining",
    sourceText: "I have an allergy to...",
    literal: "Tengo una alergia a...",
    natural: "Soy alérgico a...",
    pronunciation: "soy ah-LEHR-hee-koh ah",
    culturalNote:
      "Alérgica if you are a woman. The g in alérgico is a throaty h sound.",
  },
  {
    id: "dining-check",
    category: "dining",
    sourceText: "The check, please",
    literal: "La cuenta, por favor",
    natural: "La cuenta, por favor",
    pronunciation: "lah KWEHN-tah, por fah-VOR",
    culturalNote:
      "It will not be brought until you ask. Sitting on a finished table is normal and nobody is trying to rush you out.",
  },
  {
    id: "dining-tip-included",
    category: "dining",
    sourceText: "Is the tip included?",
    literal: "¿La propina está incluida?",
    natural: "¿La propina está incluida?",
    pronunciation: "lah proh-PEE-nah ehs-TAH een-kloo-EE-dah",
    culturalNote:
      "Often added automatically as propina or servicio. Check before tipping again — expectations vary a lot from country to country.",
  },

  // --- transit ------------------------------------------------------------
  {
    id: "transit-where-bus",
    category: "transit",
    sourceText: "Where do I catch the bus?",
    literal: "¿Dónde tomo el autobús?",
    natural: "¿Dónde tomo el autobús?",
    pronunciation: "DOHN-deh TOH-moh ehl ow-toh-BOOS",
    culturalNote:
      "The local word changes by country — camión, colectivo, micro, guagua. Autobús is understood everywhere, so it is the safe one to travel with.",
  },
  {
    id: "transit-fare",
    category: "transit",
    sourceText: "How much is the fare?",
    literal: "¿Cuánto cuesta el pasaje?",
    natural: "¿Cuánto es el pasaje?",
    pronunciation: "KWAN-toh ehs ehl pah-SAH-heh",
  },
  {
    id: "transit-this-address",
    category: "transit",
    sourceText: "Please take me to this address",
    literal: "Por favor, lléveme a esta dirección",
    natural: "Lléveme a esta dirección, por favor",
    pronunciation: "YEH-veh-meh ah EHS-tah dee-rehk-see-OHN, por fah-VOR",
    culturalNote:
      "Showing the address on your phone while you say it removes most of the risk of being misheard.",
  },
  {
    id: "transit-airport",
    category: "transit",
    sourceText: "Does this go to the airport?",
    literal: "¿Este va al aeropuerto?",
    natural: "¿Este va al aeropuerto?",
    pronunciation: "EHS-teh vah ahl ah-eh-roh-PWEHR-toh",
  },
  {
    id: "transit-train-station",
    category: "transit",
    sourceText: "Where is the train station?",
    literal: "¿Dónde está la estación de tren?",
    natural: "¿Dónde queda la estación de tren?",
    pronunciation: "DOHN-deh KEH-dah lah ehs-tah-see-OHN deh trehn",
    culturalNote:
      "Queda is the more natural verb for where a fixed place is. Estación is ehs-tah-see-OHN — the c is an s.",
  },
  {
    id: "transit-meter",
    category: "transit",
    sourceText: "Could you use the meter?",
    literal: "¿Podría usar el taxímetro?",
    natural: "¿Me pone el taxímetro, por favor?",
    pronunciation: "meh POH-neh ehl tahk-SEE-meh-troh, por fah-VOR",
    culturalNote:
      "Settle the meter or agree a flat price before the car moves. Asking once you are already riding leaves you with no room to negotiate.",
  },
  {
    id: "transit-stop-here",
    category: "transit",
    sourceText: "Stop here, please",
    literal: "Pare aquí, por favor",
    natural: "Aquí está bien, gracias",
    pronunciation: "ah-KEE ehs-TAH bee-EHN, GRAH-see-ahs",
  },

  // --- shopping -----------------------------------------------------------
  {
    id: "shopping-how-much",
    category: "shopping",
    sourceText: "How much does this cost?",
    literal: "¿Cuánto cuesta esto?",
    natural: "¿Cuánto cuesta?",
    pronunciation: "KWAN-toh KWEHS-tah",
  },
  {
    id: "shopping-cards",
    category: "shopping",
    sourceText: "Do you take cards?",
    literal: "¿Aceptan tarjetas de crédito?",
    natural: "¿Aceptan tarjeta?",
    pronunciation: "ah-SEHP-tahn tar-HEH-tah",
    culturalNote:
      "The j in tarjeta is a throaty h. Plenty of markets and small shops are cash only, so ask before you pick things up.",
  },
  {
    id: "shopping-just-looking",
    category: "shopping",
    sourceText: "I'm just looking, thanks",
    literal: "Solo estoy mirando, gracias",
    natural: "Solo estoy viendo, gracias",
    pronunciation: "SOH-loh ehs-TOY vee-EHN-doh, GRAH-see-ahs",
  },
  {
    id: "shopping-another-size",
    category: "shopping",
    sourceText: "Do you have this in another size?",
    literal: "¿Tiene esto en otra talla?",
    natural: "¿Lo tiene en otra talla?",
    pronunciation: "loh tee-EH-neh ehn OH-trah TAH-yah",
    culturalNote:
      "Talla is TAH-yah, with a soft y. Use número instead when you mean shoes.",
  },
  {
    id: "shopping-better-price",
    category: "shopping",
    sourceText: "Could you give me a better price?",
    literal: "¿Podría darme un mejor precio?",
    natural: "¿Me hace un mejor precio?",
    pronunciation: "meh AH-seh oon meh-HOR PREH-see-oh",
    culturalNote:
      "Fine in a market or with a street vendor. In a shop with printed price tags it will just be awkward.",
  },
  {
    id: "shopping-ill-take-it",
    category: "shopping",
    sourceText: "I'll take it",
    literal: "Lo voy a comprar",
    natural: "Me lo llevo",
    pronunciation: "meh loh YEH-voh",
  },
  {
    id: "shopping-change",
    category: "shopping",
    sourceText: "Do you have change?",
    literal: "¿Tiene cambio?",
    natural: "¿Tiene cambio?",
    pronunciation: "tee-EH-neh KAHM-bee-oh",
    culturalNote:
      "Small vendors frequently cannot break a large note. Breaking big bills at a supermarket early in the day saves a lot of friction later.",
  },

  // --- lodging ------------------------------------------------------------
  {
    id: "lodging-reservation",
    category: "lodging",
    sourceText: "I have a reservation",
    literal: "Tengo una reservación",
    natural: "Tengo una reservación",
    pronunciation: "TEHN-goh OO-nah reh-sehr-vah-see-OHN",
    culturalNote: "Reserva is used just as widely; both are understood.",
  },
  {
    id: "lodging-checkout-time",
    category: "lodging",
    sourceText: "What time is check-out?",
    literal: "¿A qué hora es la salida?",
    natural: "¿A qué hora es la salida?",
    pronunciation: "ah keh OH-rah ehs lah sah-LEE-dah",
    culturalNote: "The h in hora is completely silent.",
  },
  {
    id: "lodging-breakfast-included",
    category: "lodging",
    sourceText: "Is breakfast included?",
    literal: "¿El desayuno está incluido?",
    natural: "¿Incluye el desayuno?",
    pronunciation: "een-KLOO-yeh ehl deh-sah-YOO-noh",
  },
  {
    id: "lodging-ac-broken",
    category: "lodging",
    sourceText: "The air conditioning isn't working",
    literal: "El aire acondicionado no funciona",
    natural: "No funciona el aire",
    pronunciation: "noh foonk-see-OH-nah ehl AH-ee-reh",
    culturalNote:
      "El aire on its own is understood as the air conditioning. The same sentence works for anything else in the room — just swap in la ducha for the shower or la luz for the light.",
  },
  {
    id: "lodging-another-towel",
    category: "lodging",
    sourceText: "Could I have another towel?",
    literal: "¿Podría darme otra toalla?",
    natural: "¿Me puede traer otra toalla?",
    pronunciation: "meh PWEH-deh trah-EHR OH-trah toh-AH-yah",
  },
  {
    id: "lodging-wifi-password",
    category: "lodging",
    sourceText: "What's the Wi-Fi password?",
    literal: "¿Cuál es la contraseña del wifi?",
    natural: "¿Cuál es la clave del wifi?",
    pronunciation: "kwahl ehs lah KLAH-veh dehl WEE-fee",
    culturalNote:
      "Clave is what most people say day to day. Wifi is pronounced WEE-fee, not WY-fy.",
  },
  {
    id: "lodging-leave-bags",
    category: "lodging",
    sourceText: "Can I leave my bags here?",
    literal: "¿Puedo dejar mis maletas aquí?",
    natural: "¿Puedo dejar mis maletas aquí?",
    pronunciation: "PWEH-doh deh-HAR mees mah-LEH-tahs ah-KEE",
    culturalNote:
      "Useful on the last morning — most places will hold luggage after check-out without charging.",
  },

  // --- emergency ----------------------------------------------------------
  {
    id: "emergency-need-help",
    category: "emergency",
    sourceText: "I need help",
    literal: "Necesito ayuda",
    natural: "Necesito ayuda",
    pronunciation: "neh-seh-SEE-toh ah-YOO-dah",
  },
  {
    id: "emergency-call-ambulance",
    category: "emergency",
    sourceText: "Call an ambulance",
    literal: "Llame una ambulancia",
    natural: "¡Llame una ambulancia!",
    pronunciation: "YAH-meh OO-nah ahm-boo-LAHN-see-ah",
    culturalNote:
      "Llame opens with a soft y. The emergency number is not 911 everywhere — look up the local one when you arrive.",
  },
  {
    id: "emergency-need-doctor",
    category: "emergency",
    sourceText: "I need a doctor",
    literal: "Necesito un médico",
    natural: "Necesito un médico",
    pronunciation: "neh-seh-SEE-toh oon MEH-dee-koh",
  },
  {
    id: "emergency-nearest-hospital",
    category: "emergency",
    sourceText: "Where is the nearest hospital?",
    literal: "¿Dónde está el hospital más cercano?",
    natural: "¿Dónde queda el hospital más cercano?",
    pronunciation: "DOHN-deh KEH-dah ehl ohs-pee-TAHL mahs sehr-KAH-noh",
    culturalNote:
      "Hospital starts with the vowel — the h is silent. Cercano is sehr-KAH-noh, never thehr-KAH-noh.",
  },
  {
    id: "emergency-lost-passport",
    category: "emergency",
    sourceText: "I lost my passport",
    literal: "Perdí mi pasaporte",
    natural: "Perdí mi pasaporte",
    pronunciation: "pehr-DEE mee pah-sah-POR-teh",
  },
  {
    id: "emergency-wallet-stolen",
    category: "emergency",
    sourceText: "My wallet was stolen",
    literal: "Me robaron la cartera",
    natural: "Me robaron la cartera",
    pronunciation: "meh roh-BAH-rohn lah kar-TEH-rah",
    culturalNote:
      "Billetera is equally common. You will need a police report — denuncia — before any insurer will pay out.",
  },
  {
    id: "emergency-allergic-penicillin",
    category: "emergency",
    sourceText: "I'm allergic to penicillin",
    literal: "Soy alérgico a la penicilina",
    natural: "Soy alérgico a la penicilina",
    pronunciation: "soy ah-LEHR-hee-koh ah lah peh-nee-see-LEE-nah",
    culturalNote:
      "Alérgica if you are a woman. Both c sounds in penicilina are plain s sounds.",
  },
]);

export function phrasesForCategory(category: string): Phrase[] {
  return PRESET_PHRASES.filter((phrase) => phrase.category === category);
}
