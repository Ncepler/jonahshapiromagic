"use client";

// ── Pick a card ─────────────────────────────────────────────────────────────
// A trick the visitor can actually do, on a page about a close-up magician who
// otherwise only tells you he's good at this.
//
// ── The method ──────────────────────────────────────────────────────────────
// It is the classic self-working vanish, and the whole thing rests on one line
// of code: the deck is shuffled once and then PARTITIONED. The first slice is
// the fan they pick from; the second slice is the spread they check afterwards.
// Two slices of one array can't overlap, so whatever they took is missing from
// the second spread — always, without this component ever needing to know, ask,
// or store which card it was.
//
// That last part is the point. Nothing here reads the chosen card to decide
// what to show next; `picked` is an index used for animation and nothing else.
// It matters because the audience is a skeptic sitting at a screen who can open
// devtools: there is no "it tracked my click" mechanism to find, because there
// isn't one. What sells it in person — you picked it, you looked at it, nobody
// else ever saw it — is exactly what survives here.
//
// The other half of the illusion is that nobody counts. The second spread is
// SMALLER than the first (5 against 7) and every card in it is new, so a
// skeptic re-scanning it sees plausible cards and no match. Making it the same
// size, or reusing even one card from round one, is what would invite counting.
//
// ── Reduced motion ──────────────────────────────────────────────────────────
// The trick has to keep working, so nothing is skipped — every phase still
// happens and the deal is identical. The animations collapse to instant and the
// automatic beats shorten to the minimum that still reads as a sequence rather
// than a jump cut.

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

// ── Palette ─────────────────────────────────────────────────────────────────
// Mirrors app/page.tsx's palette block, which stays the source of truth — this
// file is imported BY page.tsx, so it can't import back out of it. (Same reason
// CurtainReveal.tsx and CardRevealOverlay.tsx each keep a mirror.)
const BG = "#0a0505";
const BG_ELEVATED = "#140808";
const CURTAIN = "#3d0a0a";
const CURTAIN_DEEP = "#1f0505";
const TEXT = "#f0e6d2";
const TEXT_MUTED = "#8a7a6a";
const ACCENT = "#c9a961";
const BORDER = "#2a1515";

const DISPLAY = "var(--font-display)";
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── The deck ────────────────────────────────────────────────────────────────
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];

const FAN_COUNT = 7; // round one — the cards they pick from
const SPREAD_COUNT = 5; // round two — deliberately fewer; see the header

type Card = { rank: string; suit: string };
/** Round one and round two. Disjoint by construction — see makeDeal. */
type Deal = { fan: Card[]; spread: Card[] };

/**
 * One shuffle, then two slices off the front.
 *
 * The disjointness is the trick, and it is a property of `slice` rather than
 * something checked afterwards: `fan` and `spread` are non-overlapping windows
 * into the same shuffled array, so no card can be in both. Drawing two random
 * hands independently and filtering the second against the first would produce
 * the same result on a good day and a duplicate on a bad one.
 */
function makeDeal(): Deal {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  // Fisher–Yates.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    fan: deck.slice(0, FAN_COUNT),
    spread: deck.slice(FAN_COUNT, FAN_COUNT + SPREAD_COUNT),
  };
}

// ── Phases ──────────────────────────────────────────────────────────────────
// idle    the fan, face down, waiting to be picked from
// peek    their card is out of the fan and face up, for them only
// back    it flips down and slides home
// shuffle the fan gathers into a stack and gets riffled
// think   the beat where Jonah "concentrates"
// reveal  the second spread, face up, without their card in it
type Phase = "idle" | "peek" | "back" | "shuffle" | "think" | "reveal";

/** ms each automatic phase holds before the next one starts. */
const HOLD: Record<"back" | "shuffle" | "think", number> = {
  back: 460,
  shuffle: 780,
  think: 900,
};
const HOLD_REDUCED: typeof HOLD = { back: 120, shuffle: 200, think: 350 };

// ── Geometry ────────────────────────────────────────────────────────────────
// Everything is derived from one measured number — the stage's width — so the
// fan fits a 320px phone and a 1160px desktop without a breakpoint.
const CARD_MIN = 50;
const CARD_MAX = 92;
const CARD_RATIO = 1.4; // height / width
const FAN_STEP = 0.62; // of a card width, between neighbours in the fan
const FAN_ANGLE = 7; // deg between neighbours
const SPREAD_STEP = 0.86; // of a card width — looser, because these get read
const STAGE_PAD = 24; // px of breathing room at the stage's edges
// The fan sits this far down its stage, in card heights. The gap above it is
// where the picked card goes when it lifts out — without it, the card rises
// straight through the paragraph above the stage.
const FAN_TOP = 0.5;
// …and how far it lifts, which is FAN_TOP less a hair so it stays inside.
const PEEK_LIFT = 0.46;

// The narrowest exposed strip of an overlapped card that still makes a
// comfortable target. Cards in a spread overlap by definition, so the strip —
// not the card — is what a finger actually has to hit.
const TAP_MIN = 44;

function cardWidth(stage: number): number {
  // The fan is the wider of the two layouts: FAN_COUNT cards at FAN_STEP apart
  // plus one full card of overhang, and the outer cards are rotated, which
  // costs a little more room again.
  const needed = 1 + (FAN_COUNT - 1) * FAN_STEP + 0.5;
  return Math.max(CARD_MIN, Math.min(CARD_MAX, (stage - STAGE_PAD * 2) / needed));
}

/**
 * How far apart two neighbours sit, in px.
 *
 * FAN_STEP is the look — cards overlapping the way a spread does. But at phone
 * widths that look leaves a 35px strip of each card exposed, which is a poor
 * target, AND leaves horizontal room unused, because the card size bottoms out
 * at CARD_MIN before the fan runs out of width. So the step opens up toward
 * TAP_MIN when there's room for it, and never past what actually fits.
 */
function stepFor(stage: number, w: number, count: number, ratio: number): number {
  const room = stage - STAGE_PAD * 2 - w;
  if (count <= 1) return 0;
  return Math.min(room / (count - 1), Math.max(w * ratio, TAP_MIN));
}

/** Measures the stage, so the layout is computed from real pixels rather than
 *  guessed from a breakpoint. */
function useStageWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

// ── Card faces ──────────────────────────────────────────────────────────────

/** Jonah's back: the oxblood lattice with a gold rule and a ✦, matching the
 *  cards that fly across the screen in CardRevealOverlay.tsx. */
function CardBack({ w }: { w: number }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        borderRadius: Math.max(4, w * 0.07),
        background: `repeating-linear-gradient(45deg, ${CURTAIN_DEEP} 0 ${w * 0.07}px, ${CURTAIN} ${w * 0.07}px ${w * 0.14}px)`,
        border: `${Math.max(1, w * 0.012)}px solid ${BG}`,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <span
        className="absolute"
        style={{
          inset: w * 0.07,
          borderRadius: Math.max(2, w * 0.04),
          border: `1px solid rgba(201,169,97,0.42)`,
        }}
      />
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: ACCENT, fontSize: w * 0.3, opacity: 0.65 }}
      >
        ✦
      </span>
    </div>
  );
}

/** All four suits in the same parchment tone. The heart doesn't get to be the
 *  red one — that's the page's rule everywhere else cards are drawn (see the
 *  drifting-card layer in page.tsx), and red on this site is a place, not an
 *  ink. */
function CardFace({ card, w }: { card: Card; w: number }) {
  const corner: CSSProperties = {
    position: "absolute",
    fontSize: Math.max(9, w * 0.15),
    lineHeight: 1,
    color: TEXT,
    fontFamily: DISPLAY,
  };
  return (
    <div
      className="absolute inset-0"
      style={{
        borderRadius: Math.max(4, w * 0.07),
        background: `linear-gradient(165deg, ${BG_ELEVATED}, ${BG})`,
        border: `1px solid ${BORDER}`,
        transform: "rotateY(180deg)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <span style={{ ...corner, top: w * 0.09, left: w * 0.09, textAlign: "center" }}>
        {card.rank}
        <br />
        {card.suit}
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: TEXT, fontSize: w * 0.42, opacity: 0.92 }}
      >
        {card.suit}
      </span>
      {/* A real card prints this index upside down. This one doesn't, and
          can't: with every suit in the same parchment ink, an upside-down ♥ is
          indistinguishable from a ♠ — it's the red that keeps them apart on a
          real card. (An upside-down "10" also reads as "01".) Upright costs a
          little authenticity and buys back an unambiguous card. */}
      <span style={{ ...corner, bottom: w * 0.09, right: w * 0.09, textAlign: "center" }}>
        {card.rank}
        <br />
        {card.suit}
      </span>
    </div>
  );
}

/** A card that can be flipped. `faceUp` drives the flip; both sides are always
 *  rendered, and backface-visibility hides whichever is turned away. */
function FlipCard({
  card,
  w,
  faceUp,
  instant,
}: {
  card: Card | null;
  w: number;
  faceUp: boolean;
  instant: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0"
      style={{ transformStyle: "preserve-3d" }}
      animate={{ rotateY: faceUp ? 180 : 0 }}
      transition={instant ? { duration: 0 } : { duration: 0.42, ease: EASE }}
    >
      <CardBack w={w} />
      {/* Before the client has dealt, there is no face to show — but the fan is
          all backs at that point anyway, so nothing is missing. */}
      {card && <CardFace card={card} w={w} />}
    </motion.div>
  );
}

// ── The section ─────────────────────────────────────────────────────────────
export function PickACard() {
  const reduced = useReducedMotion();
  const { ref: stageRef, width: stageW } = useStageWidth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [picked, setPicked] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  // Dealt on the client. The server renders the same seven face-down cards —
  // a back carries no identity, so there is nothing to mismatch on hydration.
  useEffect(() => {
    setDeal(makeDeal());
  }, []);

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const w = cardWidth(stageW || 640);
  const h = w * CARD_RATIO;
  const hold = reduced ? HOLD_REDUCED : HOLD;
  const springy = reduced ? { duration: 0 } : { duration: 0.5, ease: EASE };

  const pick = (i: number) => {
    if (phase !== "idle") return;
    setPicked(i);
    setPhase("peek");
  };

  // The one path through the automatic half of the routine. Every phase still
  // runs under reduced motion; only the holds get shorter.
  const putItBack = useCallback(() => {
    setPhase("back");
    clearTimers();
    timers.current.push(
      window.setTimeout(() => setPhase("shuffle"), hold.back),
      window.setTimeout(() => setPhase("think"), hold.back + hold.shuffle),
      window.setTimeout(() => setPhase("reveal"), hold.back + hold.shuffle + hold.think),
    );
  }, [hold.back, hold.shuffle, hold.think]);

  const again = () => {
    clearTimers();
    setPicked(null);
    setPhase("idle");
    // A fresh partition, so a second run isn't the same seven cards.
    setDeal(makeDeal());
  };

  const fanning = phase === "idle" || phase === "peek" || phase === "back";
  const showSpread = phase === "reveal";

  // Where a fan card sits: stepped across, rotated a little more at each step,
  // and dipping at the ends so the row reads as an arc rather than a staircase.
  const fanStep = stepFor(stageW || 640, w, FAN_COUNT, FAN_STEP);
  const spreadStep = stepFor(stageW || 640, w, SPREAD_COUNT, SPREAD_STEP);

  const fanAt = (i: number) => {
    const c = (FAN_COUNT - 1) / 2;
    const off = i - c;
    return { x: off * fanStep, y: (off / c) ** 2 * h * 0.09, rotate: off * FAN_ANGLE };
  };

  const spreadAt = (i: number) => {
    const c = (SPREAD_COUNT - 1) / 2;
    const off = i - c;
    return { x: off * spreadStep, y: (off / c) ** 2 * h * 0.05, rotate: off * 3 };
  };

  const prompt = {
    idle: { line: "Pick a card.", sub: "Any one of them. I'm not watching." },
    peek: { line: "Remember it.", sub: "Don't say it out loud. Don't type it anywhere." },
    back: { line: "Good. Putting it back.", sub: " " },
    shuffle: { line: "Shuffling.", sub: " " },
    think: { line: "Give me a second…", sub: " " },
    reveal: {
      line: "Your card isn't here.",
      sub: "Go on, check every one of them.",
    },
  }[phase];

  return (
    <section id="magician-trick-live" className="relative w-full py-[88px] md:py-[150px]">
      <div className="mx-auto w-full max-w-[1160px] px-6 md:px-16">
        <div className="text-center">
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            — Your Turn —
          </span>
          <h2
            className="mx-auto mt-4 max-w-2xl text-[34px] uppercase leading-[1.05] md:text-[50px]"
            style={{ color: TEXT, fontFamily: DISPLAY }}
          >
            Try one of my tricks.
          </h2>
          <p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-[1.7]" style={{ color: TEXT_MUTED }}>
            Yeah, I know — it&apos;s a screen. Pick one anyway. You do the
            picking, you do the looking, and I never find out which one it was.
          </p>
        </div>

        {/* Fixed height so the section doesn't resize under the visitor as the
            routine moves between a fan, a stack and a spread. */}
        <div
          ref={stageRef}
          className="relative mx-auto mt-14 w-full"
          style={{ height: h * (FAN_TOP + 1.18), perspective: 1400 }}
        >
          {/* ── Round one: the fan ─────────────────────────────────────── */}
          {deal?.fan.map((card, i) => {
            const at = fanAt(i);
            const isPicked = picked === i;
            // Lifted clear of the fan and straightened while they look at it.
            const target =
              fanning && isPicked && phase === "peek"
                ? { x: 0, y: -h * PEEK_LIFT, rotate: 0, scale: 1.08, opacity: 1 }
                : phase === "shuffle" || phase === "think"
                  ? // Gathered into a squared-up stack, with a small offset per
                    // card so it reads as a deck rather than one card.
                    { x: (i - 3) * 1.5, y: (i - 3) * 1.2, rotate: 0, scale: 1, opacity: 1 }
                  : showSpread
                    ? { x: 0, y: 0, rotate: 0, scale: 0.9, opacity: 0 }
                    : { ...at, scale: 1, opacity: 1 };

            return (
              <motion.button
                key={`fan-${i}`}
                type="button"
                disabled={phase !== "idle"}
                onClick={() => pick(i)}
                aria-label={phase === "idle" ? `Pick card ${i + 1} of ${FAN_COUNT}` : undefined}
                aria-hidden={phase !== "idle" ? true : undefined}
                tabIndex={phase === "idle" ? 0 : -1}
                className="absolute left-1/2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{
                  width: w,
                  height: h,
                  top: h * FAN_TOP,
                  marginLeft: -w / 2,
                  transformStyle: "preserve-3d",
                  outlineColor: ACCENT,
                  cursor: phase === "idle" ? "pointer" : "default",
                  // The picked card has to sit on top of its neighbours while it
                  // is out; otherwise it lifts behind the ones dealt after it.
                  zIndex: isPicked ? 20 : 10 + i,
                  pointerEvents: phase === "idle" ? "auto" : "none",
                }}
                animate={target}
                transition={springy}
                // A card under the cursor rises a little, the way it would if
                // you pushed it out of a real spread. Touch never sees this.
                whileHover={phase === "idle" && !reduced ? { y: at.y - h * 0.12 } : undefined}
              >
                <FlipCard
                  card={card}
                  w={w}
                  faceUp={isPicked && phase === "peek"}
                  instant={Boolean(reduced)}
                />
              </motion.button>
            );
          })}

          {/* ── Round two: a different five, face up ───────────────────── */}
          {deal?.spread.map((card, i) => {
            const at = spreadAt(i);
            return (
              <motion.div
                key={`spread-${i}`}
                aria-hidden={!showSpread}
                className="absolute left-1/2"
                style={{
                  width: w,
                  height: h,
                  top: h * FAN_TOP,
                  marginLeft: -w / 2,
                  transformStyle: "preserve-3d",
                  zIndex: 5 + i,
                  pointerEvents: "none",
                }}
                initial={false}
                animate={
                  showSpread
                    ? { ...at, scale: 1, opacity: 1 }
                    : { x: 0, y: h * 0.1, rotate: 0, scale: 0.92, opacity: 0 }
                }
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.5, ease: EASE, delay: showSpread ? i * 0.07 : 0 }
                }
              >
                {/* Always face up: this spread exists to be read. */}
                <div className="absolute inset-0" style={{ transform: "rotateY(180deg)", transformStyle: "preserve-3d" }}>
                  <CardFace card={card} w={w} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Patter + the one control ───────────────────────────────────── */}
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          {/* aria-live so the routine is followable without watching the cards
              move — every beat announces itself. */}
          <p
            aria-live="polite"
            className="text-[22px] leading-[1.2] md:text-[26px]"
            style={{ color: TEXT, fontFamily: DISPLAY }}
          >
            {prompt.line}
          </p>
          <p className="max-w-[420px] text-[14px] leading-[1.6]" style={{ color: TEXT_MUTED }}>
            {prompt.sub}
          </p>

          {phase === "peek" && (
            <button
              type="button"
              onClick={putItBack}
              className="magician-curtain-btn mt-2 px-6 py-3.5 text-[14px] font-semibold uppercase tracking-[0.08em]"
              style={{ background: BG_ELEVATED, color: TEXT, border: `1px solid ${ACCENT}` }}
            >
              Got it — put it back
            </button>
          )}
          {showSpread && (
            <button
              type="button"
              onClick={again}
              className="magician-curtain-btn mt-2 px-6 py-3.5 text-[14px] font-semibold uppercase tracking-[0.08em]"
              style={{ background: BG_ELEVATED, color: TEXT, border: `1px solid ${ACCENT}` }}
            >
              Again
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
