"use client";

import { useRef } from "react";
import PlayerCard from "./player-card";
import { useRadio } from "./use-radio";

/**
 * Client entry point for the deck. Prerendered into the static HTML like any other
 * component, so the card's artwork and type are in the markup even with JavaScript
 * off — the controls simply stay disabled.
 */
export default function Radio() {
  const deckRef = useRef<HTMLDivElement | null>(null);
  const radio = useRadio(deckRef);

  return <PlayerCard radio={radio} deckRef={deckRef} />;
}
