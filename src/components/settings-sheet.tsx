"use client";

import { Bell, BellOff, Check, Clock, Moon, Settings, Smartphone, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PERIOD_STORAGE_KEY, type PeriodMode, resolveMode } from "@/engine";
import { bellEnabled, ringDoubleBell, setBellEnabled } from "@/lib/bell";
import { AWAKE_EVENT, PERIOD_EVENT } from "./events";
import { readAwake, writeAwake } from "./settings-store";

const OPTIONS: { mode: PeriodMode; label: string; hint: string; Icon: typeof Sun }[] = [
  { mode: "system", label: "Auto", hint: "Follows the clock in Kerala", Icon: Clock },
  { mode: "morning", label: "Morning", hint: "First trip, mist still on the paddy", Icon: Sun },
  { mode: "night", label: "Night", hint: "Last trip, tar still wet", Icon: Moon },
];

export function readMode(): PeriodMode {
  try {
    const stored = localStorage.getItem(PERIOD_STORAGE_KEY);
    return stored === "morning" || stored === "night" ? stored : "system";
  } catch {
    return "system";
  }
}

/**
 * Settings: the day/night switch, the bell, and the screen lock.
 *
 * The blocking script in <head> has already applied the stored mode before first
 * paint; this only keeps it in step afterwards. Writing `data-period` on <html> is
 * what actually swaps the plate — the CSS keys off it — so choosing is one
 * attribute write, not a re-render.
 */
export default function SettingsSheet({ className = "" }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [mode, setMode] = useState<PeriodMode>("system");
  const [bell, setBell] = useState(true);
  const [awake, setAwake] = useState(true);

  useEffect(() => {
    setMode(readMode());
    setBell(bellEnabled());
    setAwake(readAwake());
  }, []);

  const toggleAwake = () => {
    const next = !awake;
    setAwake(next);
    writeAwake(next);
    window.dispatchEvent(new CustomEvent(AWAKE_EVENT));
  };

  /** `system` has to be re-resolved as the clock crosses 05:00 and 18:00 IST. */
  useEffect(() => {
    if (mode !== "system") return;
    const id = window.setInterval(() => {
      document.documentElement.dataset.period = resolveMode("system", new Date());
    }, 60_000);
    return () => window.clearInterval(id);
  }, [mode]);

  const choose = (next: PeriodMode) => {
    setMode(next);
    try {
      if (next === "system") localStorage.removeItem(PERIOD_STORAGE_KEY);
      else localStorage.setItem(PERIOD_STORAGE_KEY, next);
    } catch {
      // Private mode: the choice just does not survive a reload.
    }
    const period = resolveMode(next, new Date());
    document.documentElement.dataset.period = period;
    window.dispatchEvent(new CustomEvent(PERIOD_EVENT, { detail: period }));
  };

  const toggleBell = () => {
    const next = !bell;
    setBell(next);
    setBellEnabled(next);
    // Turning it on should demonstrate what was turned on.
    if (next) ringDoubleBell();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Settings"
        className={`grid size-9 place-items-center rounded-full text-[color:var(--db-cream)]/80 transition-colors hover:text-[color:var(--db-amber)] focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2 ${className}`}
      >
        <Settings className="size-[1.15rem] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape is the dialog's own */}
      <dialog
        ref={dialogRef}
        className="sheet"
        aria-label="Settings"
        onClick={() => dialogRef.current?.close()}
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: stops backdrop clicks only */}
        <div className="sheet-panel" onClick={(event) => event.stopPropagation()}>
          <div className="sheet-grip" aria-hidden="true" />

          <h2 className="px-1 pb-1 font-semibold text-[1.05rem] text-[color:var(--db-cream)]">
            Settings
          </h2>
          <p className="px-1 pb-4 text-[0.78rem] text-[color:var(--db-muted)]">
            The page follows the light in Kerala. Pin it if you would rather it didn't.
          </p>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="sr-only">Time of day</legend>
            {OPTIONS.map(({ mode: option, label, hint, Icon }) => {
              const active = mode === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => choose(option)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2 ${
                    active
                      ? "bg-[color:oklch(0.96_0.017_90/0.14)]"
                      : "hover:bg-[color:oklch(0.96_0.017_90/0.07)]"
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${
                      active
                        ? "bg-[color:var(--db-amber)] text-[color:var(--db-night-deep)]"
                        : "bg-[color:oklch(0.96_0.017_90/0.1)] text-[color:var(--db-cream)]/75"
                    }`}
                  >
                    <Icon className="size-[1.05rem]" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[0.92rem] text-[color:var(--db-cream)] leading-tight">
                      {label}
                    </span>
                    <span className="text-[0.74rem] text-[color:var(--db-muted)] leading-tight">
                      {hint}
                    </span>
                  </span>
                  {active && <Check className="size-4 shrink-0 text-[color:var(--db-amber)]" />}
                </button>
              );
            })}
          </fieldset>

          <button
            type="button"
            onClick={toggleBell}
            aria-pressed={bell}
            className="mt-1.5 flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-[color:oklch(0.96_0.017_90/0.07)] focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2"
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full ${
                bell
                  ? "bg-[color:var(--db-amber)] text-[color:var(--db-night-deep)]"
                  : "bg-[color:oklch(0.96_0.017_90/0.1)] text-[color:var(--db-cream)]/75"
              }`}
            >
              {bell ? <Bell className="size-[1.05rem]" /> : <BellOff className="size-[1.05rem]" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[0.92rem] text-[color:var(--db-cream)] leading-tight">
                Double bell on play
              </span>
              <span className="text-[0.74rem] text-[color:var(--db-muted)] leading-tight">
                {bell ? "Two bells, then the bus goes" : "Off — play starts silently"}
              </span>
            </span>
            {bell && <Check className="size-4 shrink-0 text-[color:var(--db-amber)]" />}
          </button>

          <button
            type="button"
            onClick={toggleAwake}
            aria-pressed={awake}
            className="flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-[color:oklch(0.96_0.017_90/0.07)] focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2"
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full ${
                awake
                  ? "bg-[color:var(--db-amber)] text-[color:var(--db-night-deep)]"
                  : "bg-[color:oklch(0.96_0.017_90/0.1)] text-[color:var(--db-cream)]/75"
              }`}
            >
              <Smartphone className="size-[1.05rem]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[0.92rem] text-[color:var(--db-cream)] leading-tight">
                Keep the screen awake
              </span>
              <span className="text-[0.74rem] text-[color:var(--db-muted)] leading-tight">
                {awake
                  ? "While a song plays, so the phone does not lock and cut it off"
                  : "Off — the phone locks as usual, and the song stops with it"}
              </span>
            </span>
            {awake && <Check className="size-4 shrink-0 text-[color:var(--db-amber)]" />}
          </button>

          {/*
            Said in the app rather than only in a README, because it is the first thing
            anyone hits on a phone and the answer is not in this page's power.
          */}
          <p className="mt-3 rounded-2xl bg-[color:oklch(0.96_0.017_90/0.06)] px-3.5 py-3 text-[0.73rem] text-[color:var(--db-muted)] leading-relaxed">
            The songs play from YouTube, and every phone suspends that once the screen is
            off — background YouTube audio is a feature of their app, not something a web
            page can switch on. For playback with the phone actually locked, open this in{" "}
            <span className="text-[color:var(--db-cream)]/85">Brave</span> and turn on
            Background&nbsp;video&nbsp;playback, or use YouTube Premium. Everywhere else,
            the setting above is the fix: the phone stays awake so the song keeps going.
          </p>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="mt-4 w-full rounded-2xl bg-[color:oklch(0.96_0.017_90/0.1)] py-3 text-[0.88rem] text-[color:var(--db-cream)] transition-colors hover:bg-[color:oklch(0.96_0.017_90/0.16)] focus-visible:outline-2 focus-visible:outline-[color:var(--db-amber)] focus-visible:outline-offset-2"
          >
            Done
          </button>
        </div>
      </dialog>
    </>
  );
}
