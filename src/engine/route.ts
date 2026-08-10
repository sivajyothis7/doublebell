/**
 * The route board.
 *
 * Every Kerala private bus carries one: two place names and a service class,
 * hand-painted or slotted behind glass above the windscreen. It is the first
 * thing you read at a stop, so it is the first thing this page shows — in place
 * of the fabricated "listeners online" counter the format usually carries. A
 * number nobody is counting is a lie; a route board is just a route board.
 *
 * Pure, and rotated off an injected clock so the board changes on its own
 * without anything having to poll.
 */

export type Route = {
  /** Where the trip starts. */
  fromMl: string;
  from: string;
  /** Where it terminates. */
  toMl: string;
  to: string;
};

/**
 * Real pairs, the short-and-medium hauls private operators actually run — not
 * the long-distance corridors, which are state carriage. Deliberately spread
 * across all fourteen districts so the board reads as Kerala rather than as one
 * town.
 */
export const ROUTES: readonly Route[] = [
  { fromMl: "ആലുവ", from: "Aluva", toMl: "പെരുമ്പാവൂർ", to: "Perumbavoor" },
  { fromMl: "തൃശ്ശൂർ", from: "Thrissur", toMl: "ഗുരുവായൂർ", to: "Guruvayur" },
  { fromMl: "കോഴിക്കോട്", from: "Kozhikode", toMl: "വടകര", to: "Vadakara" },
  { fromMl: "കൊല്ലം", from: "Kollam", toMl: "കൊട്ടാരക്കര", to: "Kottarakkara" },
  { fromMl: "പാലാ", from: "Pala", toMl: "ഈരാറ്റുപേട്ട", to: "Erattupetta" },
  { fromMl: "തിരുവല്ല", from: "Thiruvalla", toMl: "ചങ്ങനാശ്ശേരി", to: "Changanassery" },
  { fromMl: "കോട്ടയം", from: "Kottayam", toMl: "കുമളി", to: "Kumily" },
  { fromMl: "പെരിന്തൽമണ്ണ", from: "Perinthalmanna", toMl: "മഞ്ചേരി", to: "Manjeri" },
  { fromMl: "കണ്ണൂർ", from: "Kannur", toMl: "തലശ്ശേരി", to: "Thalassery" },
  { fromMl: "ചാലക്കുടി", from: "Chalakudy", toMl: "അതിരപ്പിള്ളി", to: "Athirappilly" },
  { fromMl: "ആലപ്പുഴ", from: "Alappuzha", toMl: "ചേർത്തല", to: "Cherthala" },
  { fromMl: "എറണാകുളം", from: "Ernakulam", toMl: "ഫോർട്ട് കൊച്ചി", to: "Fort Kochi" },
  { fromMl: "തൊടുപുഴ", from: "Thodupuzha", toMl: "മൂവാറ്റുപുഴ", to: "Muvattupuzha" },
  { fromMl: "കാഞ്ഞങ്ങാട്", from: "Kanhangad", toMl: "കാസർകോട്", to: "Kasaragod" },
  { fromMl: "നിലമ്പൂർ", from: "Nilambur", toMl: "മഞ്ചേരി", to: "Manjeri" },
  { fromMl: "പയ്യന്നൂർ", from: "Payyanur", toMl: "കണ്ണൂർ", to: "Kannur" },
  { fromMl: "അടൂർ", from: "Adoor", toMl: "പത്തനംതിട്ട", to: "Pathanamthitta" },
  { fromMl: "വൈക്കം", from: "Vaikom", toMl: "കോട്ടയം", to: "Kottayam" },
  { fromMl: "പത്തനാപുരം", from: "Pathanapuram", toMl: "പുനലൂർ", to: "Punalur" },
  { fromMl: "ബത്തേരി", from: "Bathery", toMl: "കൽപ്പറ്റ", to: "Kalpetta" },
];

/**
 * The two classes a private stage carriage actually runs as. Anything faster is
 * a state service, and putting "Fast Passenger" on this board would be the same
 * error as putting a state livery on the artwork.
 */
export const SERVICE_CLASSES = ["ORDINARY", "LIMITED STOP"] as const;

export type ServiceClass = (typeof SERVICE_CLASSES)[number];

export type Board = Route & { serviceClass: ServiceClass };

/** How long one board stays up before the next trip is called. */
export const ROUTE_ROTATE_MS = 24_000;

/**
 * The board for a given instant. Derived from the clock rather than random, so
 * two people looking at the page at the same moment see the same bus — and so
 * the server-rendered markup and the first client render can agree.
 */
export function boardAt(now: Date, rotateMs = ROUTE_ROTATE_MS): Board {
  const tick = Math.floor(now.getTime() / rotateMs);
  const route = ROUTES[((tick % ROUTES.length) + ROUTES.length) % ROUTES.length] as Route;
  // Stepped on a different cycle from the route, so the same pair does not
  // always come round wearing the same class.
  const serviceClass = SERVICE_CLASSES[
    Math.floor(tick / ROUTES.length) % SERVICE_CLASSES.length
  ] as ServiceClass;
  return { ...route, serviceClass };
}
