"use client";

// Jonah Shapiro — performing as Shap Shufflz — a New York City close-up
// magician & mentalist working across the tri-state area, in the THEATRICAL
// EXCEPTION system (SKILL §16). This is the one page that deliberately
// throws out the local-service DNA everywhere else in components/examples/*:
// no editorial restraint, no hairline-and-eyebrow spine, no "zero decorative
// shapes," no subtle motion. Spectacle IS the design — floating cards,
// embers, a shuffle-video hero, a pick-a-card interaction. Self-contained on
// purpose (does NOT import from ./system, which is the local-service spine)
// — this file is its own small design system.
//
// The only rules that still apply here: honesty (§12/§16f — no fabricated
// credits/celebrities/awards/"sold out") and labeled placeholders (§10).
// Spec: .claude/skills/local-service-design-system/SKILL.md §16

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useCanHover } from "@/lib/hooks";
import { site } from "@/site-config";
import { CardRevealOverlay, triggerCardReveal } from "./CardRevealOverlay";
// The opening curtain — the velvet that covers the page on arrival and pulls
// itself open. Its own file, next to the card reveal, for the same reason:
// it is a self-contained piece of animation machinery, not page layout.
import { CurtainReveal } from "./CurtainReveal";
// The three later transitions, same rule: one file each, all of them mounted
// once at the bottom of MagicianSite and fired from wherever they belong.
// transition-kit.ts holds what they share (palette mirror, easing, the
// mount/trigger registry, the z-index ladder).
import { SmokeTransition } from "./SmokeTransition";
import { SpotlightSweepOverlay, triggerSpotlightSweep } from "./SpotlightSweep";
import { TornPaperOverlay, triggerTornPaper } from "./TornPaperReveal";
import { MagicianCursor } from "./MagicianCursor";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Every "book" CTA behaves identically ────────────────────────────────────
// Three links on the page point at the booking form (the hero's "Book the
// show", the sticky bar's "Book", and the decks section's "Ask about it when
// you book"). All three run the same card reveal: cards fill the screen from
// the middle of the viewport, the page jumps to the form behind them, and they
// only fall away once the page is already sitting on the form. The href stays
// a real anchor underneath, for no-JS and for middle/modified clicks.
function bookRevealClick(e: MouseEvent<HTMLAnchorElement>) {
  // A modified click is the browser's to handle (open in a new tab, etc.) —
  // leave the plain anchor alone for those.
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  triggerCardReveal({
    mode: "book",
    // Dead centre of the screen no matter how far down the page the visitor
    // is — every one of these buttons is somewhere different, the reveal
    // isn't.
    origin: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    onCovered: () => {
      // Instant, never smooth. The cards have the screen completely covered
      // at this point, so an animated scroll would be 1–2s of motion nobody
      // can see — and worse, on the long trips (the hero button is ~7000px
      // from the form) it was still gliding when the cards began to fall,
      // which reads as the page sliding around behind them. Jumping while
      // hidden means the form is simply there when they clear.
      // Explicit "instant" is required: the page sets scroll-behavior: smooth
      // in globals.css, and "auto" would inherit it.
      document.getElementById("magician-book")?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    },
  });
}

// ── Palette — a dim theater, not a red website (§16a). Picture a stage in a
// dark house: heavy oxblood curtains, warm light spilling from just behind
// them, and everything else near-black. The audience reads a parchment
// program and catches the occasional glint of gold trim. Red is a PLACE
// (the curtain wash in the hero + booking sections, see CURTAIN below), not
// a color painted onto text, buttons, or borders — if a single word or
// button reads as "the red one," it's wrong. Gold (ACCENT) is the only
// accent color, used sparingly: ✦/◆ ornaments, section eyebrows, CTA
// borders, link-hover underlines. Nothing else gets it either.
const BG = "#0a0505"; // base background — near-black, faint warm undertone
const BG_ELEVATED = "#140808"; // cards, sections, form fields — one step up
const CURTAIN = "#3d0a0a"; // the oxblood curtain itself — atmosphere only,
// never text/buttons/borders; used as a large soft wash, nowhere else
const CURTAIN_DEEP = "#1f0505"; // curtain's shadow, for the gradient stop
// where the curtain wash fades back into the background
const TEXT = "#f0e6d2"; // warm parchment — all body text and headlines
const TEXT_MUTED = "#8a7a6a"; // dimmed warm gray — labels, meta, captions
const ACCENT = "#c9a961"; // muted antique gold — the ONLY accent color
const BORDER = "#2a1515"; // subtle warm-dark outline — whisper, not shout

// Small hex → rgba helper so gradient/canvas code can borrow the exact
// palette colors above at partial opacity instead of hand-duplicating their
// RGB triplets as magic numbers scattered through the file.
function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// The atmospheric "curtain light" wash — a big, soft glow, never a hard
// edge. Used on exactly two sections (hero + booking) to bookend the page;
// everywhere else stays plain. See hero/booking sections below.
function curtainWash(opts: { bottom?: boolean; corners?: boolean } = {}) {
  const { bottom = true, corners = false } = opts;
  const layers: string[] = [];
  if (bottom) {
    layers.push(
      `radial-gradient(ellipse at 50% 100%, ${hexToRgba(CURTAIN, 0.6)} 0%, ${hexToRgba(CURTAIN, 0.2)} 40%, ${hexToRgba(CURTAIN_DEEP, 0.12)} 55%, transparent 70%)`,
    );
  }
  if (corners) {
    layers.push(
      `radial-gradient(ellipse at 0% 0%, ${hexToRgba(CURTAIN, 0.4)}, transparent 50%)`,
      `radial-gradient(ellipse at 100% 0%, ${hexToRgba(CURTAIN, 0.4)}, transparent 50%)`,
    );
  }
  return layers.join(", ");
}

// The three faces, wired up in app/layout.tsx. HERO is the marquee name and
// nothing else on the page; DISPLAY carries every other heading; BODY is
// everything that isn't a heading. Nothing here sets a font outside these.
const HERO = "var(--font-hero)"; // Cinzel Decorative — the big name only
const DISPLAY = "var(--font-display)"; // Cinzel — headings, section titles
const BODY = "var(--font-body)"; // EB Garamond — body, labels, UI

// Two names, one performer: the marquee is his own name, with the stage name
// riding alongside it so the TikTok handle connects to the person.
const STAGE_NAME = "Shap Shufflz";
const NAME = "Jonah Shapiro";
// Phone, email, and the Instagram handle/URL all live in site-config.ts —
// phone is still a placeholder; email and Instagram are real. The point of
// the config is that swapping any of them is a one-file edit. Import `site`
// and read from it.
const AREA = "Based in New York City — available across the tri-state area";

const wrap = "mx-auto w-full max-w-[1160px] px-6 md:px-16";

// ── Section shell: consistent vertical rhythm on the velvet field. ───────────
function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`relative w-full py-[88px] md:py-[150px] ${className}`}>
      <div className={wrap}>{children}</div>
    </section>
  );
}

// ── Reveal from the dark: content rises up out of black (§16d.6). ────────────
function RiseFromDark({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

// Kept deliberately independent of the palette above — this ambient particle
// layer is a "particle system" per the redesign brief and stays untouched,
// same two warm-red tones it's always used, regardless of what the rest of
// the page's palette does.
const EMBER_PARTICLE_A = "#A31F2E";
const EMBER_PARTICLE_B = "#C9432B";

// ── Embers — a capped, low-density canvas particle layer (§16d.3). Off on
// reduced-motion, lighter on mobile, entirely content-free decoration (the
// one place on the whole page that's allowed, per the §16 exception).
function Embers({ density = 26 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const count = Math.max(6, Math.round(density * (isMobile ? 0.5 : 1)));

    type P = {
      x: number;
      y: number;
      r: number;
      speed: number;
      drift: number;
      life: number;
      maxLife: number;
      crimson: boolean;
    };
    const spawn = (): P => ({
      x: Math.random() * w,
      y: h + Math.random() * 40,
      r: 1 + Math.random() * 2.1,
      speed: 10 + Math.random() * 20,
      drift: (Math.random() - 0.5) * 12,
      life: Math.random() * 2, // stagger initial phase so they don't all pop at once
      maxLife: 5 + Math.random() * 5,
      crimson: Math.random() < 0.62,
    });
    const particles: P[] = Array.from({ length: count }, spawn);

    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.life += dt;
        p.y -= p.speed * dt;
        p.x += Math.sin(p.life * 1.3) * p.drift * dt;
        if (p.life >= p.maxLife || p.y < -20) {
          Object.assign(p, spawn(), { life: 0, y: h + Math.random() * 30 });
          continue;
        }
        const t01 = p.life / p.maxLife;
        const alpha = t01 < 0.15 ? t01 / 0.15 : 1 - (t01 - 0.15) / 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.crimson
          ? hexToRgba(EMBER_PARTICLE_A, Math.max(0, alpha) * 0.75)
          : hexToRgba(EMBER_PARTICLE_B, Math.max(0, alpha) * 0.6);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced, density]);

  if (reduced) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

// ── Drifting cards — a handful of playing cards parallax across sections on
// scroll, slight 3D tilt (§16d.2). Content-free decoration, the documented
// exception to the no-shapes rule. All four suits render in the same
// parchment tone — the heart doesn't get to stand out from the spade and
// diamond, they're a set, not a place for the accent color. Killed entirely
// on reduced motion; half the set is desktop-only, the rest stay for mobile
// (scroll-driven only, no cursor drift there).
function CardGlyph({ suit }: { suit: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        borderRadius: 6,
        background: `linear-gradient(160deg, ${BG_ELEVATED}, ${BG})`,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 10px 26px rgba(0,0,0,.55)",
      }}
    >
      <span aria-hidden style={{ color: TEXT, fontSize: 20, opacity: 0.9 }}>
        {suit}
      </span>
    </div>
  );
}

function DriftCard({
  top,
  side,
  offset,
  suit,
  tilt,
  depth,
  mx,
  desktopOnly,
  steady,
}: {
  top: string;
  side: "left" | "right";
  offset: string;
  suit: string;
  tilt: number;
  depth: number;
  mx: MotionValue<number>;
  desktopOnly: boolean;
  steady: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-depth, depth]);
  const rotate = useTransform(
    [scrollYProgress, mx],
    (latest) => {
      const [s, m] = latest as [number, number];
      return tilt + (s - 0.5) * 14 + m * 5;
    },
  );
  const posStyle = side === "left" ? { left: offset } : { right: offset };
  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={`absolute h-16 w-11 ${desktopOnly ? "hidden md:block" : "block"}`}
      // On touch the scroll-linked rotation is the only thing on the page that
      // moves sideways, and a phone viewport is narrow enough that a card
      // swinging ~13° at the edge reads as the whole page wobbling. The card
      // keeps its fixed tilt and its vertical drift; only the swing is off.
      style={{ top, ...posStyle, y, rotate: steady ? tilt : rotate, opacity: 0.68 }}
    >
      <CardGlyph suit={suit} />
    </motion.div>
  );
}

const DRIFT_CARDS: Array<{
  top: string;
  side: "left" | "right";
  offset: string;
  suit: string;
  tilt: number;
  depth: number;
  desktopOnly: boolean;
}> = [
  { top: "6%", side: "left", offset: "4%", suit: "♠", tilt: -16, depth: 34, desktopOnly: false },
  { top: "16%", side: "right", offset: "6%", suit: "♦", tilt: 12, depth: 44, desktopOnly: true },
  { top: "34%", side: "left", offset: "2%", suit: "♣", tilt: 9, depth: 30, desktopOnly: true },
  { top: "52%", side: "right", offset: "4%", suit: "♥", tilt: -11, depth: 40, desktopOnly: false },
  { top: "70%", side: "left", offset: "7%", suit: "♠", tilt: 18, depth: 36, desktopOnly: true },
  { top: "86%", side: "right", offset: "3%", suit: "♦", tilt: -14, depth: 32, desktopOnly: false },
];

function DriftingCards() {
  const reduced = useReducedMotion();
  const canHover = useCanHover();
  const mx = useMotionValue(0);

  useEffect(() => {
    if (reduced || !canHover) return;
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, canHover, mx]);

  if (reduced) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {DRIFT_CARDS.map((c, i) => (
        <DriftCard key={i} {...c} mx={mx} steady={!canHover} />
      ))}
    </div>
  );
}

// ── Dramatic phrase band — the trade marquee's theatrical equivalent
// (§16e.2). Same seamless measure-and-overfill technique as the rest of the
// site: muted phrase text, gold diamond separators — no red. ─────────────────
const PHRASES = ["Close-up", "Sleight of hand", "Mentalism", "Parties", "Weddings"];
function PhraseBand() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLSpanElement>(null);
  const [rowW, setRowW] = useState(0);
  const [copies, setCopies] = useState(2);

  useEffect(() => {
    const measure = () => {
      const w = rowRef.current?.offsetWidth ?? 0;
      const cw = containerRef.current?.offsetWidth ?? 0;
      if (w > 0) {
        setRowW(w);
        setCopies(Math.max(2, Math.ceil(cw / w) + 1));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    if (rowRef.current) ro.observe(rowRef.current);
    return () => ro.disconnect();
  }, []);

  const dur = rowW ? rowW / 45 : 30;
  const Row = ({ inner }: { inner?: React.Ref<HTMLSpanElement> }) => (
    <span ref={inner} className="inline-flex items-center">
      {PHRASES.map((p) => (
        <span key={p} className="inline-flex items-center">
          <span
            className="px-7 text-[22px] uppercase tracking-[0.04em] md:px-10 md:text-[30px]"
            style={{ color: TEXT_MUTED, fontFamily: DISPLAY }}
          >
            {p}
          </span>
          <span aria-hidden style={{ color: ACCENT }}>
            ◆
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div
      ref={containerRef}
      role="marquee"
      aria-label="What Jonah performs: close-up, sleight of hand, mentalism, parties, weddings"
      className="relative w-full overflow-hidden whitespace-nowrap py-8"
      style={{ background: BG_ELEVATED, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}
    >
      <style>{`
        @keyframes ev-mq { to { transform: translateX(calc(-1 * var(--mq-w))); } }
        .ev-mq { display: inline-flex; animation: ev-mq var(--mq-dur) linear infinite; }
        @media (prefers-reduced-motion: reduce) { .ev-mq { animation: none; } }
      `}</style>
      <div className="ev-mq" style={{ "--mq-w": `${rowW}px`, "--mq-dur": `${dur}s` } as CSSProperties}>
        {Array.from({ length: copies }, (_, i) => (
          <Row key={i} inner={i === 0 ? rowRef : undefined} />
        ))}
      </div>
    </div>
  );
}

// ── Sticky top bar — wordmark + a persistent "Book" CTA, the one piece of
// chrome on the page. Deliberately absent over the hero (the hero has its
// own "Book the show" button and shouldn't compete with a bar), then fades
// in the moment the hero scrolls out and back out if you scroll home. An
// IntersectionObserver on the hero drives it rather than a scroll listener
// so it costs nothing per frame. z-100: above all page content, below both
// the curtain reveal (900) and the wand cursor (998/999). ───────────────────
function StickyBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("magician-hero");
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <header
      role="banner"
      className="fixed inset-x-0 top-0 h-[60px]"
      style={{
        zIndex: 100,
        background: hexToRgba(BG, 0.85),
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${BORDER}`,
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-hidden={!visible}
    >
      <div className={`${wrap} flex h-full items-center justify-between`}>
        <span
          className="flex items-baseline gap-2 text-[0.8rem] font-medium tracking-[0.12em] md:text-[0.9rem]"
          style={{ color: TEXT }}
        >
          {NAME}
          <span className="hidden text-[0.7rem] tracking-[0.1em] sm:inline" style={{ color: TEXT_MUTED }}>
            / {STAGE_NAME}
          </span>
        </span>
        <a
          href="#magician-book"
          tabIndex={visible ? undefined : -1}
          onClick={bookRevealClick}
          // min-h keeps the tap target at 44px on a phone; the bar is 60px
          // tall, so there's room for it without touching the layout
          className="magician-curtain-btn inline-flex min-h-[44px] items-center text-[0.85rem] font-semibold uppercase tracking-[0.1em]"
          style={{
            background: BG_ELEVATED,
            color: TEXT,
            border: `1px solid ${ACCENT}`,
            padding: "10px 24px",
          }}
        >
          Book
        </a>
      </div>
    </header>
  );
}

// ── Hero — the shuffle (§16d.1). Full-bleed dark, curtain-wash glow (from
// below + both top corners, like drapes framing the stage) + drifting
// embers. This is one of exactly two sections that gets the red curtain
// wash — see curtainWash() up top. No real footage exists yet, so the
// "video" is a theatrical CSS placeholder (glow + vignette + label) — drop a
// real clip in `HERO_VIDEO_SRC` later and it slots straight in. ────────────
const HERO_VIDEO_SRC = ""; // set to a real clip path when Noah has one
function Hero() {
  return (
    <section
      id="magician-hero"
      className="relative flex w-full items-end overflow-hidden"
      style={{ minHeight: "100svh", background: BG }}
    >
      {/* the curtain wash — soft red light spilling up from below the stage,
          framed by two faint corner drapes; everything else stays dark */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: curtainWash({ bottom: true, corners: true }) }}
      />
      {HERO_VIDEO_SRC ? (
        <video
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-60"
          src={HERO_VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        />
      ) : null}
      <Embers density={30} />
      {/* vignette on top of everything so the text sits in the dark */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(80% 70% at 50% 40%, transparent 40%, ${hexToRgba(BG, 0.65)} 100%)` }}
      />

      <div className={`${wrap} relative flex w-full flex-col items-center pb-24 pt-40 text-center`}>
        <RiseFromDark>
          <h1
            // The one place HERO is used. Cinzel Decorative's flourishes need
            // this size to be read as flourishes, and the tracking is tighter
            // than the rest of the page's caps because the face already carries
            // its own spacing in the serifs.
            className="text-[13vw] uppercase leading-[1.02] tracking-[0.005em] sm:text-[8vw] md:text-[5.6rem]"
            style={{ color: TEXT, fontFamily: HERO }}
          >
            {NAME}
          </h1>
          <p
            className="mt-5 text-[0.8rem] uppercase tracking-[0.28em]"
            style={{ color: TEXT_MUTED }}
          >
            {STAGE_NAME}
          </p>
          <p
            // Body face, italic — Cinzel has no true italic, and a synthesized
            // oblique on inscriptional caps looks like a rendering bug. EB
            // Garamond italic is a real cut and reads as a spoken line, which
            // is what this is.
            className="mx-auto mt-8 max-w-md text-[26px] leading-[1.3] md:text-[34px]"
            style={{ color: TEXT, fontFamily: BODY, fontStyle: "italic" }}
          >
            You won&apos;t
            <br />
            believe your eyes.
          </p>
          <p
            className="mt-8 text-[0.75rem] uppercase tracking-[0.15em]"
            style={{ color: TEXT_MUTED }}
          >
            New York City · Tri-State Area
          </p>
          <a
            href="#magician-book"
            onClick={bookRevealClick}
            className="magician-curtain-btn mt-10 inline-block px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.14em] transition-transform duration-200 hover:scale-[1.03]"
            style={{ background: BG_ELEVATED, color: TEXT, border: `1px solid ${ACCENT}` }}
          >
            Book the show
          </a>
        </RiseFromDark>
        <div
          className="mt-16 text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: TEXT_MUTED }}
        >
          Scroll
        </div>
      </div>
    </section>
  );
}

// ── Where I've Worked — a proof strip, not a full section: half the usual
// vertical rhythm, plain BG. Laid out as a small grid rather than a
// ◆-separated line, because the scrolling PhraseBand directly below is
// already a row of text split by gold ◆ — back to back the two read as the
// same element repeated and neither one lands. Grid spacing does the
// separating here; no ornaments.
//
// TODO: swap these for real venue or client names once they exist —
// "The Glasshouse, Manhattan" is proof, "Manhattan Private Parties" is a
// category, and specific names convert far better than generic ones.
const PERFORMED_AT = [
  "Manhattan Private Parties",
  "NYC Corporate & Holiday Parties",
  "Brooklyn Engagement Parties",
  "Birthday & Milestone Celebrations",
  "Weddings & Receptions",
];
function RecentlyPerformedAt() {
  return (
    <section className="relative w-full py-[44px] md:py-[75px]" style={{ background: BG }}>
      <div className={`${wrap} text-center`}>
        <RiseFromDark>
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            — Where I&apos;ve Worked —
          </span>
          <ul className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-3">
            {PERFORMED_AT.map((v) => (
              <li
                key={v}
                className="text-[0.9rem] leading-[1.45] tracking-[0.05em]"
                style={{ color: TEXT }}
              >
                {v}
              </li>
            ))}
          </ul>
        </RiseFromDark>
      </div>
    </section>
  );
}

// ── The Experience — "pick a card" (§16d.4 / §16e.3). Fan of face-down cards;
// hover/tap lifts + flips one to reveal a show type. Reduced-motion shows all
// five already revealed, statically, in a plain readable row. ───────────────
const SHOWS = [
  { label: "Strolling close-up", desc: "Cards and coins, inches from your eyes, group to group." },
  { label: "Cocktail hours", desc: "The hour before dinner, turned into the part people remember." },
  { label: "Mentalism", desc: "Predictions and mind-reading that shouldn't be possible." },
  { label: "Corporate & holiday parties", desc: "A room full of strangers, talking about one thing after." },
  { label: "Private parties & weddings", desc: "The moment everyone still brings up months later." },
];

function ShowCard({ show, index }: { show: (typeof SHOWS)[number]; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const tilt = [-9, -4, 0, 4, 9][index % 5];
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      aria-label={flipped ? show.label : `Reveal show type ${index + 1}`}
      className="group relative h-[230px] w-[152px] shrink-0 cursor-pointer md:h-[250px] md:w-[168px]"
      style={{ perspective: 1200, transform: `rotate(${tilt}deg)` }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0, y: flipped ? -10 : 0 }}
        whileHover={{ y: -10 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        {/* back of card — face down, a plain elevated lattice, gold sparkle */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[8px]"
          style={{
            backfaceVisibility: "hidden",
            background: `repeating-linear-gradient(45deg, ${BG} 0 10px, ${BG_ELEVATED} 10px 20px)`,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 16px 40px rgba(0,0,0,.55)",
          }}
        >
          <span aria-hidden style={{ color: ACCENT, fontSize: 30, opacity: 0.6 }}>✦</span>
        </div>
        {/* front — the revealed show type */}
        <div
          className="absolute inset-0 flex flex-col justify-center rounded-[8px] p-5 text-left"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: `linear-gradient(165deg, ${BG_ELEVATED}, ${BG})`,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 16px 40px rgba(0,0,0,.55)",
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_MUTED }}>
            0{index + 1}
          </span>
          <h3 className="mt-2 text-[19px] leading-[1.15]" style={{ color: TEXT, fontFamily: DISPLAY }}>
            {show.label}
          </h3>
          <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: TEXT_MUTED, fontFamily: BODY }}>
            {show.desc}
          </p>
        </div>
      </motion.div>
    </button>
  );
}

function StaticShowList() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {SHOWS.map((s, i) => (
        <div
          key={s.label}
          className="rounded-[8px] p-5"
          style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}` }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_MUTED }}>
            0{i + 1}
          </span>
          <h3 className="mt-2 text-[19px] leading-[1.15]" style={{ color: TEXT, fontFamily: DISPLAY }}>
            {s.label}
          </h3>
          <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: TEXT_MUTED }}>
            {s.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

function TheExperience() {
  const reduced = useReducedMotion();
  return (
    <Section id="magician-experience">
      <Embers density={16} />
      <RiseFromDark className="relative">
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          — The Experience —
        </span>
        <h2
          className="mt-4 text-[38px] uppercase leading-[1.02] tracking-[0.01em] md:text-[56px]"
          style={{ color: TEXT, fontFamily: DISPLAY }}
        >
          Pick a card.
          <br />
          <span style={{ color: TEXT_MUTED }}>See what you get.</span>
        </h2>
      </RiseFromDark>
      <RiseFromDark delay={0.12} className="relative mt-14">
        {reduced ? (
          <StaticShowList />
        ) : (
          <div className="flex flex-wrap justify-center gap-5 md:gap-6">
            {SHOWS.map((s, i) => (
              <ShowCard key={s.label} show={s} index={i} />
            ))}
          </div>
        )}
        <p className="mt-10 text-center text-[13px]" style={{ color: TEXT_MUTED }}>
          Tap a card to reveal it.
        </p>
      </RiseFromDark>
    </Section>
  );
}

// ── Trick of the Day — a playbill-style gateway to Jonah's TikTok. Plain
// base-bg section, no curtain wash here — that stays reserved for the hero
// and booking sections; the red glow lives contained inside the card only.
// Clicking doesn't just go to the profile — it opens one random video from
// the rotation below, a fresh "trick" each time. href stays the profile
// page as a plain fallback for no-JS/middle-click; onClick intercepts the
// normal click to send JS-enabled visitors to a random video instead.
// (Profile URL + handle come from site-config.ts; these deep links are
// specific videos and stay here.)
const TIKTOK_VIDEO_URLS = [
  "https://www.tiktok.com/@shap_shufflz_magic/video/7645045371244154142",
  "https://www.tiktok.com/@shap_shufflz_magic/video/7644400672254790943",
  "https://www.tiktok.com/@shap_shufflz_magic/video/7660168781209079071",
  "https://www.tiktok.com/@shap_shufflz_magic/video/7654723486639770910",
  "https://www.tiktok.com/@shap_shufflz_magic/video/7665430856810499359",
];

function TrickOfTheDay() {
  return (
    <Section className="text-center" id="magician-trick">
      <RiseFromDark>
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          — Tonight&apos;s Showing —
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl text-[34px] uppercase leading-[1.05] md:text-[50px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          Trick of the day.
        </h2>
        <p className="mt-3 text-[15px]" style={{ color: TEXT_MUTED }}>
          A new one, every day. Nobody&apos;s caught the method yet.
        </p>
      </RiseFromDark>
      <RiseFromDark delay={0.12} className="mt-12">
        <style>{`
          .trick-card {
            transition: border-color 200ms ease-out, transform 250ms ease-out, box-shadow 250ms ease-out;
          }
          .trick-card:hover {
            border-color: ${ACCENT} !important;
            transform: translateY(-4px);
            box-shadow: 0 20px 40px ${hexToRgba(CURTAIN, 0.3)};
          }
          .trick-card:hover .trick-card-glow { opacity: 0.5; }
          .trick-card:hover .trick-card-glyph { transform: rotate(90deg); }
          .trick-card:hover .trick-card-arrow { transform: translateX(4px); }
        `}</style>
        <a
          href={site.tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            const video = TIKTOK_VIDEO_URLS[Math.floor(Math.random() * TIKTOK_VIDEO_URLS.length)];
            // Cards fly out of the middle of the card itself. The overlay is
            // fixed, so the button's viewport rect IS the origin — no scroll
            // offset to add.
            const rect = e.currentTarget.getBoundingClientRect();
            const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            // The house lights drop and a spotlight swings in and hits this
            // card; the hit is what throws the cards. Neither the card reveal
            // below nor the TikTok handoff under it changed — the spotlight is
            // a gate in front of both, and under reduced motion it fires its
            // callback immediately, so this is the same click it always was.
            triggerSpotlightSweep({
              target: origin,
              onLanded: () =>
                triggerCardReveal({
                  mode: "trick",
                  origin,
                  onComplete: () => {
                    // Desktop keeps the new tab it has always opened. Phones
                    // don't: a popup only survives if window.open runs inside
                    // the tap itself, and this one runs several seconds later,
                    // once the cards have cleared — so mobile browsers silently
                    // swallow it and nothing happens. Asking for the tab
                    // WITHOUT "noopener" is what makes the difference
                    // detectable: the spec makes window.open return null
                    // whenever noopener is set, success or not, so there'd be
                    // nothing to test. With a real handle back, a null means
                    // the popup was genuinely blocked and the trick can open
                    // right here in the tab instead — which on a phone hands
                    // off to the TikTok app the same way tapping any TikTok
                    // link does.
                    const tab = window.open(video, "_blank");
                    if (tab) tab.opener = null; // same protection noopener gives
                    else window.location.href = video;
                  },
                }),
            });
          }}
          aria-label={`Watch a random trick from ${STAGE_NAME} on TikTok — ${site.tiktokHandle}`}
          className="trick-card relative mx-auto flex w-full max-w-[380px] flex-col items-center justify-center gap-4 overflow-hidden px-6 py-10"
          style={{ background: BG_ELEVATED, border: `1px solid ${hexToRgba(ACCENT, 0.3)}`, borderRadius: 4, aspectRatio: "9 / 16" }}
        >
          <div
            aria-hidden
            className="trick-card-glow pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${hexToRgba(CURTAIN, 1)} 0%, transparent 70%)`,
              opacity: 0.3,
              transition: "opacity 250ms ease-out",
            }}
          />
          <span
            aria-hidden
            className="trick-card-glyph relative inline-block"
            style={{ color: ACCENT, fontSize: 28, opacity: 0.7, transition: "transform 300ms ease-out" }}
          >
            ✦
          </span>
          <span className="relative text-[2rem] leading-[1.15]" style={{ color: TEXT, fontFamily: DISPLAY }}>
            Reveal today&apos;s trick
          </span>
          <span
            className="trick-card-arrow relative inline-block text-[14px]"
            style={{ color: TEXT_MUTED, transition: "transform 250ms ease-out" }}
          >
            → step behind the curtain
          </span>
          <span
            className="relative mt-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: TEXT_MUTED }}
          >
            {site.tiktokHandle}
          </span>
        </a>
      </RiseFromDark>
    </Section>
  );
}

// ── What It Costs — real starting numbers, stated plainly (§12: no fake
// urgency, no "call for pricing" games). Cards get zero red and no dramatic
// hover — just a border brightening, since this section's job is legibility,
// not spectacle. ────────────────────────────────────────────────────────────
const PACKAGES = [
  {
    name: "Close-Up Set",
    price: "From $150",
    desc: "About 30 to 45 minutes. I walk the room with a deck of cards, doing tricks table to table.",
  },
  {
    name: "Full Close-Up",
    price: "From $300",
    desc: "A 60 to 90 minute window. Enough time to cover the whole room, group by group.",
  },
  {
    name: "Custom Booking",
    price: "Let's talk",
    desc: "Bigger events, longer sets, a corporate theme, or something built around your room.",
  },
];
function WhatItCosts() {
  return (
    <Section className="text-center" id="magician-pricing">
      <style>{`
        .pkg-card { transition: border-color 200ms ease-out; }
        .pkg-card:hover { border-color: ${ACCENT} !important; }
      `}</style>
      <RiseFromDark>
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          — What It Costs —
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl text-[34px] uppercase leading-[1.05] md:text-[50px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          Straight numbers. No mystery here.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.6]" style={{ color: TEXT_MUTED }}>
          Bookings start at $150. Where it lands depends on how long you want me
          there, how big the room is, and how far the venue is from me. Tell me
          what you&apos;re planning and I&apos;ll send you a real number.
        </p>
      </RiseFromDark>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {PACKAGES.map((p, i) => (
          <RiseFromDark key={p.name} delay={Math.min(i * 0.08, 0.2)}>
            <div
              className="pkg-card flex h-full flex-col items-center p-8"
              style={{
                background: BG_ELEVATED,
                border: `1px solid ${hexToRgba(ACCENT, 0.3)}`,
                borderRadius: 4,
              }}
            >
              <span aria-hidden style={{ color: ACCENT, fontSize: 20, opacity: 0.7 }}>
                ✦
              </span>
              <h3 className="mt-4 text-[20px] leading-[1.2]" style={{ color: TEXT, fontFamily: DISPLAY }}>
                {p.name}
              </h3>
              <p className="mt-3 text-[1.5rem] tracking-[0.04em]" style={{ color: TEXT, fontFamily: DISPLAY }}>
                {p.price}
              </p>
              <p className="mt-4 text-[14px] leading-[1.6]" style={{ color: TEXT_MUTED }}>
                {p.desc}
              </p>
            </div>
          </RiseFromDark>
        ))}
      </div>
      <RiseFromDark delay={0.24}>
        <p className="mt-10 text-[14px]" style={{ color: TEXT_MUTED }}>
          Weddings, corporate events, and travel outside the tri-state area are quoted separately.
        </p>
      </RiseFromDark>
    </Section>
  );
}

// ── The Takeaway — branded decks as a booking add-on, not a store. There's no
// cart, designer, or quantity picker on purpose: the ask is "mention it when
// you book," and Jonah arranges the print himself. No vendor is named as a
// partner or sponsor. No real deck photos exist yet, so the left column is a
// labeled stylized mock (§10), not a fake product shot.
// The Shuffled Ink link is not an affiliate or partner link — just a pointer
// to a printer that does this well, kept deliberately secondary (a text aside
// under the booking button) so it can't pull a visitor off-page mid-funnel.
const DECK_PRINTER_URL = "https://shuffledink.com";
const DECK_POINTS = [
  "Casino-quality stock. Real snap, real weight.",
  "Custom back design — logo, monogram, or event artwork.",
  "Full decks, tuck box included. Minimum order 15.",
];
function TheTakeaway() {
  return (
    <Section id="magician-decks">
      <style>{`
        @keyframes deck-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .deck-mock { animation: deck-float 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .deck-mock { animation: none; } }
        .deck-ask:hover { color: ${ACCENT}; }
      `}</style>
      <RiseFromDark className="text-center">
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          — The Takeaway —
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl text-[34px] uppercase leading-[1.05] md:text-[50px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          Branded decks. The souvenir nobody throws out.
        </h2>
        <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-[1.7]" style={{ color: TEXT_MUTED }}>
          Add a custom deck to your booking — your logo, event date, or wedding
          monogram on the back of every card. Guests take them home. They
          don&apos;t get tossed like a pen or a keychain. Every deck is
          casino-quality, printed to order. Mention it when you book and
          I&apos;ll handle it.
        </p>
      </RiseFromDark>
      <div className="mt-14 grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <RiseFromDark className="flex justify-center">
          <div
            className="deck-mock flex flex-col items-center justify-between py-8"
            style={{
              width: 240,
              height: 336,
              borderRadius: 10,
              background: BG_ELEVATED,
              border: `1px solid ${hexToRgba(ACCENT, 0.4)}`,
              boxShadow: `inset 0 0 40px ${hexToRgba(ACCENT, 0.07)}`,
            }}
          >
            <span aria-hidden style={{ color: hexToRgba(ACCENT, 0.3), fontSize: 80, lineHeight: 1 }}>
              ✦
            </span>
            <div className="text-center" style={{ color: TEXT, fontFamily: DISPLAY }}>
              <span className="block text-[1.5rem] font-medium tracking-[0.3em]">YOUR</span>
              <span className="block text-[1.5rem] font-medium tracking-[0.3em]">LOGO</span>
            </div>
            <span className="text-[11px] tracking-[0.3em]" style={{ color: TEXT_MUTED }}>
              HERE
            </span>
          </div>
        </RiseFromDark>
        <RiseFromDark delay={0.1}>
          <ul className="space-y-5">
            {DECK_POINTS.map((point) => (
              <li key={point} className="flex gap-4 text-[16px] leading-[1.6]" style={{ color: TEXT }}>
                <span aria-hidden className="shrink-0" style={{ color: ACCENT }}>
                  ✦
                </span>
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-md text-[14px] leading-[1.7]" style={{ color: TEXT_MUTED }}>
            Corporate events use them as branded gifts. Weddings use them as
            favors. Guests actually keep them. Pricing depends on quantity and
            finish — usually $3 to $6 per deck at typical event sizes.
          </p>
          {/* Booking is the primary action here. The printer link used to sit
              beside it at equal weight, which asked a visitor to choose
              between two things and sent half of them off-site in the middle
              of the funnel. It's an aside below the button now. */}
          <div className="mt-8">
            <a
              href="#magician-book"
              onClick={bookRevealClick}
              className="magician-curtain-btn inline-block px-6 py-3.5 text-[14px] font-semibold uppercase tracking-[0.08em]"
              style={{ background: BG_ELEVATED, color: TEXT, border: `1px solid ${ACCENT}` }}
            >
              Ask about it when you book
            </a>
            <div className="mt-3">
              <a
                href={DECK_PRINTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="deck-ask inline-flex min-h-[44px] items-center text-[0.8rem]"
                style={{ color: TEXT_MUTED, transition: "color 200ms ease-out" }}
              >
                Or design one yourself ↗
              </a>
            </div>
          </div>
        </RiseFromDark>
      </div>
    </Section>
  );
}

// ── FAQ — the objections that actually block a booking, answered before the
// form. One open at a time; each question is a real <button> so it's
// keyboard-operable, and the answer is height-animated via a grid-rows
// trick (no fixed max-height guesswork, animates to true content height). ───
const FAQS = [
  {
    q: "How much does it cost?",
    a: "Bookings start at $150. The final price comes down to how long you want me there, how big the room is, and how far the venue is from me. Tell me what you're planning and I'll send you a real number.",
  },
  {
    q: "What does close-up magic actually look like at an event?",
    // No stage-show comparison here — stage shows aren't one of the three
    // packages, and contrasting against one implies a service that isn't sold.
    a: "I walk the room with a deck of cards and stop at each group, doing tricks right in your hands. Nobody's watching from across the room — it's happening two feet in front of you, in your own hands half the time. Everyone gets their own moment instead of one show everybody sits through.",
  },
  {
    q: "How far in advance should I book?",
    a: "As soon as you know the date, honestly. I book first-come, and weekends fill up fast. That said, if your event's tomorrow, still ask. Sometimes it works out.",
  },
  {
    q: "What areas do you cover?",
    a: "The tri-state area, so New York, New Jersey, and Connecticut. If you're farther out, just ask and I'll see what I can do.",
  },
  {
    q: "Can you tailor it to our company or occasion?",
    a: "Yeah, definitely. Tell me what you want the show to land on, whether that's a brand, a person, or a moment, and I'll build toward it.",
  },
  {
    q: "What do you need from the venue?",
    a: "A window of time, an audience, and a room with decent energy. 60 to 90 minutes for a full set, less for a short one. I bring everything else. Cards, props, all of it. Don't buy or set up anything for me.",
  },
];
function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Section id="magician-faq">
      <RiseFromDark>
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          — Questions People Ask —
        </span>
        <h2 className="mt-4 text-[34px] uppercase leading-[1.05] md:text-[50px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          Answered before you ask.
        </h2>
      </RiseFromDark>
      <RiseFromDark delay={0.12} className="mx-auto mt-12 max-w-3xl">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} style={{ borderBottom: `1px solid ${BORDER}` }}>
              <button
                type="button"
                id={`faq-question-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${i}`}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="text-[17px] leading-[1.35] md:text-[19px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className="shrink-0 text-[18px]"
                  style={{
                    color: ACCENT,
                    transform: isOpen ? "rotate(135deg)" : "rotate(0deg)",
                    transition: "transform 250ms ease-out",
                  }}
                >
                  +
                </span>
              </button>
              <div
                id={`faq-answer-${i}`}
                role="region"
                aria-labelledby={`faq-question-${i}`}
                style={{
                  display: "grid",
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows 250ms ease-out",
                }}
              >
                {/* A collapsed panel is only visually collapsed — the text
                    stays in the DOM so the height can animate to it. Hiding
                    it from the a11y tree too keeps aria-expanded honest,
                    instead of a screen reader reading all six answers
                    straight through whatever the buttons claim. */}
                <div aria-hidden={!isOpen} style={{ overflow: "hidden" }}>
                  <p className="pb-6 pr-8 text-[15px] leading-[1.75]" style={{ color: TEXT_MUTED }}>
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </RiseFromDark>
    </Section>
  );
}

// ── About — a mysterious bio (§16e.6). No invented awards/credits. ──────────
function About() {
  return (
    <Section className="" id="magician-about">
      <div className="grid items-center gap-12 md:grid-cols-[0.85fr_1fr] md:gap-16">
        <RiseFromDark>
          <div
            className="relative w-full overflow-hidden rounded-[6px]"
            style={{ aspectRatio: "4/5", border: `1px solid ${BORDER}` }}
          >
            <Image
              src="/JonahPortrait.jpg"
              alt="Jonah Shapiro in a black suit and black shirt, lit from one side against a dark red stage curtain"
              fill
              sizes="(min-width: 768px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
        </RiseFromDark>
        <RiseFromDark delay={0.1}>
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            — About —
          </span>
          <h2 className="mt-4 text-[32px] uppercase leading-[1.08] md:text-[44px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
            Not a trick.
            <br />
            <span style={{ color: TEXT_MUTED }}>A decision, made in front of you.</span>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-[1.7]" style={{ color: TEXT }}>
            My name&apos;s Jonah Shapiro. On the booking, on TikTok, and in your
            group chat afterward, I&apos;m Shap Shufflz — same person, better
            name for what happens once the deck comes out.
          </p>
          <p className="mt-4 max-w-md text-[16px] leading-[1.7]" style={{ color: TEXT }}>
            I started with a deck of cards and an audience of one — me, in a
            mirror, for longer than I&apos;d like to admit. These days it&apos;s
            parties across the tri-state area, corporate rooms, and the
            occasional wedding, but the method never changes. Get close enough
            that you stop looking for the seam, then give you a moment you
            can&apos;t explain.
          </p>
          <p className="mt-4 max-w-md text-[16px] leading-[1.7]" style={{ color: TEXT }}>
            No smoke machines. No cartoon top hat. Just cards, a little
            psychology, and a lot of practice most people never see.
          </p>
        </RiseFromDark>
      </div>
    </Section>
  );
}

// ── Booking — the conversion point (§16e.8). Local component state, posting
// to app/api/book/route.ts. The second (and last) curtain-wash section —
// bookends the hero at the bottom of the page, subtler than the hero's. ────
const EVENT_TYPES = ["Corporate event", "Holiday party", "Private party", "Wedding", "Birthday / milestone", "Not sure yet"];

// Validation runs here rather than through the browser's own `required` /
// `type=email` checks: those surface as a native tooltip bubble, which is
// system-chrome blue-and-white in the middle of a dark theater and reads as
// a browser error rather than part of the page. The form carries `noValidate`
// so the native UI never fires, and the same rules run again in the route.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type FieldErrors = { name?: string; email?: string };
function validateBooking(data: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  if (!name) errors.name = "I need a name to put on the booking.";
  if (!email) errors.email = "I need an email to reply to.";
  else if (!EMAIL_RE.test(email)) errors.email = "That doesn't look like an email address.";
  return errors;
}

// What the copy-for-email button reconstructs from the form once a submit
// fails — kept as its own type so onSubmit and the error state agree on shape.
type BookingAttempt = {
  name: string;
  email: string;
  event_type: string;
  date: string;
  venue: string;
  headcount: string;
  notes: string;
};

// input[type=date] gives "YYYY-MM-DD". Building the Date from its parts
// (rather than `new Date(iso)`, which parses as UTC midnight) keeps the
// printed day from slipping backward in timezones behind UTC.
function formatBookingDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// A short, actually-sendable email a visitor can paste in if the booking
// request itself failed to go through — reads like a person wrote it (greeting,
// why they're emailing, the details, a sign-off), not a form dump.
function bookingAttemptToEmailText(a: BookingAttempt): string {
  const name = a.name || "[your name]";
  const email = a.email || "[your email]";
  const eventType = (a.event_type || "event").toLowerCase();
  const when = a.date ? ` on ${formatBookingDate(a.date)}` : "";
  const where = a.venue ? ` at ${a.venue}` : "";
  const guests = a.headcount ? `, for around ${a.headcount} guests` : "";

  return [
    "Hi Jonah,",
    "",
    "I tried to book through the site but the form didn't seem to go through, so emailing directly instead.",
    "",
    `I'm looking to book a ${eventType}${when}${where}${guests}.${a.notes ? ` ${a.notes}` : ""}`,
    "",
    `You can reach me at ${email} — let me know if that date's still open!`,
    "",
    "Thanks,",
    name,
  ].join("\n");
}

function Booking() {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [lastAttempt, setLastAttempt] = useState<BookingAttempt | null>(null);
  const [copied, setCopied] = useState(false);
  // Optional add-on interest from the Takeaway section above. Controlled so
  // the box can be painted in the site's palette; the real <input> stays in
  // the DOM (visually hidden) so it keeps keyboard focus and screen readers.
  const [wantsDecks, setWantsDecks] = useState(false);
  // On success the whole form is replaced, so the block that replaces it
  // inherits the height the form had — otherwise the page collapses by
  // several hundred pixels underneath whoever just submitted it.
  const [formHeight, setFormHeight] = useState<number | null>(null);
  const formWrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const sending = state === "sending";
  const field: CSSProperties = {
    background: BG_ELEVATED,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: 4,
  };
  const label = "mb-1.5 block text-[14px] font-semibold";
  // Clearing a field's message as soon as it's edited means the visitor
  // never reads a complaint about text they've already fixed.
  const clearError = (key: keyof FieldErrors) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  const errorNote = (key: keyof FieldErrors) =>
    errors[key] ? (
      <p id={`book-${key}-error`} className="mt-1.5 text-[14px] leading-[1.45]" style={{ color: TEXT_MUTED }}>
        {errors[key]}
      </p>
    ) : null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const found = validateBooking(data);
    setErrors(found);
    if (found.name || found.email) {
      const firstBad = form.elements.namedItem(found.name ? "name" : "email");
      if (firstBad instanceof HTMLElement) firstBad.focus();
      return;
    }

    const attempt: BookingAttempt = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      event_type: String(data.get("event_type") ?? ""),
      date: String(data.get("date") ?? ""),
      venue: String(data.get("venue") ?? ""),
      headcount: String(data.get("headcount") ?? ""),
      notes: String(data.get("notes") ?? ""),
    };
    // Kept around so the error state can offer a "copy info for email"
    // fallback without asking the visitor to retype what they just wrote.
    setLastAttempt(attempt);
    setCopied(false);

    setFormHeight(formWrapRef.current?.getBoundingClientRect().height ?? null);
    setState("sending");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...attempt, branded_decks: wantsDecks }),
      });
      // On failure the form stays exactly as it was, fields and all — nobody
      // should have to retype an event brief because a request timed out.
      if (!res.ok) {
        setState("err");
        return;
      }
      // Success doesn't swap the form out, it TEARS it up: the transition
      // clones what is on screen right now, rips the clone in half and throws
      // the pieces off, and the confirmation underneath is what's left. The
      // swap itself still happens in onTorn — with the clones already covering
      // the form in the same painted frame, so nothing flickers. Under reduced
      // motion onTorn fires immediately and this is the plain swap it was.
      triggerTornPaper({
        node: formWrapRef.current,
        onTorn: () => setState("ok"),
      });
    } catch {
      setState("err");
    }
  };

  const copyEmailInfo = async () => {
    if (!lastAttempt) return;
    try {
      await navigator.clipboard.writeText(bookingAttemptToEmailText(lastAttempt));
      setCopied(true);
    } catch {
      // Clipboard access can be denied by the browser; the button just stays
      // as-is so the visitor can select and copy the text themselves.
    }
  };

  return (
    <Section id="magician-book" className="" >
      {/* subtle curtain wash, bookending the hero's — bottom-only, no corners */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: curtainWash({ bottom: true, corners: false }) }}
      />
      <div className="relative grid gap-12 md:grid-cols-2 md:gap-16">
        <RiseFromDark>
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            — Booking —
          </span>
          <h2 className="mt-4 text-[34px] uppercase leading-[1.05] md:text-[50px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
            Book the show.
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-[1.6]" style={{ color: TEXT }}>
            Tell me the date and the room. I&apos;ll tell you what fits — a short
            set through cocktails, or 60 to 90 minutes across the whole room.
          </p>
          <div className="mt-8 space-y-3 text-[15px]">
            {[["Call or text", site.phone], ["Email", site.email], ["Based", AREA]].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: TEXT_MUTED }}>{k}</span>
                <span style={{ color: TEXT }}>{v}</span>
              </div>
            ))}
          </div>
        </RiseFromDark>
        <RiseFromDark delay={0.1}>
          <div ref={formWrapRef}>
            {state === "ok" ? (
              <motion.div
                role="status"
                // It comes up underneath the two halves of the form while they
                // are still flying off (see TornPaperReveal.tsx) — hence the
                // scale rather than the small rise it used when it was a plain
                // swap, and the beat of delay so it arrives with the tear
                // rather than ahead of it.
                initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: reduced ? 0 : 0.18, ease: EASE }}
                className="flex flex-col items-center justify-center px-6 text-center"
                // holds the space the form was occupying a moment ago
                style={{ minHeight: formHeight ?? undefined }}
              >
                <span aria-hidden style={{ color: ACCENT, fontSize: 30 }}>
                  ✦
                </span>
                <p className="mt-5 max-w-xs text-[17px] leading-[1.6]" style={{ color: TEXT }}>
                  Got it. I&apos;ll be in touch within 24 hours.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="book-name" className={label} style={{ color: TEXT_MUTED }}>Name *</label>
                    <input
                      id="book-name"
                      name="name"
                      autoComplete="name"
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={errors.name ? "book-name-error" : undefined}
                      onChange={() => clearError("name")}
                      className="w-full px-3.5 py-3 text-[15px]"
                      style={field}
                      placeholder="Your name"
                    />
                    {errorNote("name")}
                  </div>
                  <div>
                    <label htmlFor="book-email" className={label} style={{ color: TEXT_MUTED }}>Email *</label>
                    <input
                      id="book-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? "book-email-error" : undefined}
                      onChange={() => clearError("email")}
                      className="w-full px-3.5 py-3 text-[15px]"
                      style={field}
                      placeholder="you@email.com"
                    />
                    {errorNote("email")}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="book-event-type" className={label} style={{ color: TEXT_MUTED }}>Event type</label>
                    <select id="book-event-type" name="event_type" className="w-full px-3.5 py-3 text-[15px]" style={field} defaultValue="">
                      <option value="" disabled>Select…</option>
                      {EVENT_TYPES.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="book-date" className={label} style={{ color: TEXT_MUTED }}>Date</label>
                    <input id="book-date" name="date" type="date" className="w-full px-3.5 py-3 text-[15px]" style={field} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="book-venue" className={label} style={{ color: TEXT_MUTED }}>Location / venue</label>
                    <input id="book-venue" name="venue" className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="Where's the show?" />
                  </div>
                  <div>
                    <label htmlFor="book-headcount" className={label} style={{ color: TEXT_MUTED }}>Headcount</label>
                    <input id="book-headcount" name="headcount" type="number" min={1} className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="~60" />
                  </div>
                </div>
                <div>
                  <label htmlFor="book-notes" className={label} style={{ color: TEXT_MUTED }}>Anything else?</label>
                  <textarea id="book-notes" name="notes" rows={4} className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="Cocktail hour, sit-down dinner, how many guests — whatever you've got." />
                </div>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="branded_decks"
                    checked={wantsDecks}
                    onChange={(e) => setWantsDecks(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                    style={{
                      background: wantsDecks ? ACCENT : BG_ELEVATED,
                      border: `1px solid ${wantsDecks ? ACCENT : BORDER}`,
                      borderRadius: 3,
                      color: TEXT,
                      fontSize: 12,
                      lineHeight: 1,
                      outlineColor: ACCENT,
                      transition: "background-color 180ms ease-out, border-color 180ms ease-out",
                    }}
                  >
                    {wantsDecks ? "✓" : ""}
                  </span>
                  <span className="text-[15px]" style={{ color: TEXT }}>
                    I&apos;m interested in branded decks for this event
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    disabled={sending}
                    className="magician-curtain-btn px-6 py-3.5 text-[14px] font-semibold uppercase tracking-[0.08em]"
                    style={{
                      background: BG_ELEVATED,
                      color: TEXT,
                      border: `1px solid ${ACCENT}`,
                      opacity: sending ? 0.65 : 1,
                    }}
                  >
                    {/* Both labels sit in the same grid cell, so the button is
                        always as wide as the longer of the two and can't
                        resize the moment it's pressed. */}
                    <span className="grid justify-items-center">
                      {["Send it", "Sending…"].map((text) => {
                        const active = sending === (text === "Sending…");
                        return (
                          <span
                            key={text}
                            aria-hidden={!active}
                            className={`col-start-1 row-start-1 ${active ? "" : "invisible"}`}
                          >
                            {text}
                          </span>
                        );
                      })}
                    </span>
                  </button>
                  {process.env.NODE_ENV !== "production" && (
                    <button
                      type="button"
                      onClick={() => setState("err")}
                      className="text-[13px]"
                      style={{ color: TEXT_MUTED }}
                    >
                      (preview error state)
                    </button>
                  )}
                </div>
                {state === "err" && (
                  <motion.div
                    role="alert"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-[14px] leading-[1.6]" style={{ color: TEXT_MUTED }}>
                      Something went wrong. Try again, or just email me at{" "}
                      <a href={`mailto:${site.email}`} className="underline underline-offset-2" style={{ color: TEXT_MUTED }}>
                        {site.email}
                      </a>
                      .
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={copyEmailInfo}
                        className="px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.06em]"
                        style={{ background: BG_ELEVATED, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 4 }}
                      >
                        {copied ? "Copied ✓" : "Copy information for email"}
                      </button>
                      <span className="text-[13px] leading-[1.5]" style={{ color: TEXT_MUTED }}>
                        Pastes a ready-to-send summary of what you entered.
                      </span>
                    </div>
                  </motion.div>
                )}
                <p className="text-center text-[14px] leading-[1.6]" style={{ color: TEXT_MUTED }}>
                  I read every message. You&apos;ll hear back within 24 hours — if your
                  date&apos;s open, I&apos;ll send a real quote; if not, I&apos;ll tell you straight.
                </p>
              </form>
            )}
          </div>
        </RiseFromDark>
      </div>
    </Section>
  );
}

// ── Instagram — a link block, not a section: minimal padding, no eyebrow,
// no headline. Sits between the booking form and the footer. Handle + URL
// come from site-config.ts. ───────────────────────────────────────────────
function InstagramBlock() {
  return (
    <section className="relative w-full py-[40px] md:py-[56px]" style={{ background: BG }}>
      <style>{`
        .ig-block:hover .ig-handle { color: #e6cf95; }
      `}</style>
      <div className={`${wrap} text-center`}>
        <a
          href={site.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ig-block inline-block"
        >
          <span className="block text-[16px]" style={{ color: TEXT }}>
            More magic on Instagram →
          </span>
          <span
            className="ig-handle mt-2 block text-[1.25rem] tracking-[0.1em]"
            style={{ color: ACCENT, transition: "color 200ms ease-out" }}
          >
            {site.instagramHandle}
          </span>
        </a>
      </div>
    </section>
  );
}

// ── Footer — dark, minimal, one dramatic line (§16e.9). ──────────────────────
function MagicianFooter() {
  return (
    <footer role="contentinfo" className="w-full" style={{ background: BG_ELEVATED, borderTop: `1px solid ${BORDER}` }}>
      <div className={`${wrap} py-14 text-center`}>
        <span className="text-[22px] uppercase tracking-[0.04em]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          {NAME}
        </span>
        <p className="mt-1 text-[11px] uppercase tracking-[0.24em]" style={{ color: TEXT_MUTED }}>
          {STAGE_NAME}
        </p>
        {/* Italic, so body face — same reason as the hero tagline above. */}
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-[1.6]" style={{ color: TEXT_MUTED, fontFamily: BODY, fontStyle: "italic" }}>
          Close enough to see it. Still won&apos;t believe it.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 text-[14px]" style={{ color: TEXT_MUTED }}>
          <span className="inline-flex min-h-[44px] items-center">{site.phone}</span>
          <span className="inline-flex min-h-[44px] items-center">{site.email}</span>
          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center"
            style={{ color: TEXT_MUTED }}
          >
            Instagram
          </a>
        </div>
        <p className="mt-6 text-[14px]" style={{ color: TEXT_MUTED }}>
          © 2026 {NAME}. All rights reserved.
        </p>
        {/* Plain text, not a link — vilas.studio doesn't resolve. No opacity
            on it either: TEXT_MUTED clears AA on its own (4.75:1 here), but
            dimming it to 75% dropped this line to 3.16:1. */}
        <p className="mt-2 text-[14px]" style={{ color: TEXT_MUTED }}>
          Site by vilas.studio
        </p>
      </div>
    </footer>
  );
}

export default function Page() {
  return <MagicianSite />;
}

// ── Which sections raise smoke ──────────────────────────────────────────────
// In page order, and deliberately not every <section> on the page: the hero is
// excluded (it is the arrival, not a change), and so are the three link/list
// bands — "Where I've worked", the phrase band and the Instagram block — which
// are punctuation between sections rather than sections in their own right, and
// would fire smoke twice within a screen of scrolling.
//
// The rest of the rules live in SmokeTransition.tsx: once per section per page
// load, never on the one the visitor lands on, never under the opening curtain,
// and never over a transition the visitor actually asked for.
const SMOKE_SECTIONS = [
  "magician-experience",
  "magician-trick",
  "magician-pricing",
  "magician-decks",
  "magician-faq",
  "magician-about",
  "magician-book",
];

function MagicianSite() {
  return (
    // wraps ALL of the magician's content, only this page — see
    // MagicianCursor.tsx for exactly how the wand cursor stays scoped here
    <MagicianCursor>
      <div className="magician-focus-scope antialiased" style={{ background: BG, color: TEXT_MUTED, fontFamily: BODY, position: "relative" }}>
        <CurtainReveal />
        {/* Shared hover state for the two curtain-styled CTAs ("Book the
            show" / "Send it") — background shifts to a faint gold wash on
            hover. !important is required here: it's overriding each
            button's own inline `style`, which a plain stylesheet rule can't
            outrank on specificity alone. */}
        <style>{`
          /* One focus indicator for the whole page. Everything here is
             painted with inline styles and custom borders, so without a
             single explicit rule the keyboard ring is whatever the browser
             happens to draw on a near-black background — usually a thin
             dark outline that disappears. Gold at 2px with 2px of offset
             clears every surface on the page. Nothing anywhere removes an
             outline; if a new element needs its own ring, extend this rule
             rather than suppressing it locally. */
          .magician-focus-scope :is(a, button, input, select, textarea, summary, [tabindex]):focus-visible,
          /* A date field is several tab stops, not one: the browser builds
             month/day/year as separate segments inside the input's shadow
             tree, and on the last of them the host stops matching
             :focus-visible while focus is still inside the field — the ring
             blinks out mid-field. :focus-within holds it for all three. */
          .magician-focus-scope input[type="date"]:focus-within {
            outline: 2px solid ${ACCENT};
            outline-offset: 2px;
          }
          .magician-curtain-btn:not(:disabled):hover {
            background-color: ${hexToRgba(ACCENT, 0.15)} !important;
            color: ${TEXT} !important;
          }
          /* Phones render this palette darker than a desktop panel does —
             small screens are dimmer to begin with and most of them auto-dim
             further. Rather than fork the palette (which would drift the two
             versions apart), one very soft warm veil lifts everything on the
             page by the same few percent: near-black backgrounds visibly come
             up, parchment text and gold barely move, so every contrast
             relationship inside the palette is preserved. Sits above the
             content and the sticky bar so the lift is uniform, below the
             curtain reveal, and never takes a tap. The body background stays
             #0a0505 on purpose — the veil is fixed to the viewport, so it
             tints the overscroll area to the exact same value and no band
             appears at the edges. */
          .magician-mobile-lift { display: none; }
          @media (max-width: 767px) {
            .magician-mobile-lift {
              display: block;
              position: fixed;
              inset: 0;
              z-index: 150;
              pointer-events: none;
              background: rgba(255, 243, 224, 0.045);
            }
          }
        `}</style>
        <div aria-hidden className="magician-mobile-lift" />
        {/* the drifting-card layer spans the whole page, positioned by % of its
            total height — mounted once, absolute, behind section content */}
        <DriftingCards />
        <StickyBar />
        <main className="relative">
          <Hero />
          <RecentlyPerformedAt />
          <PhraseBand />
          <TheExperience />
          <TrickOfTheDay />
          <WhatItCosts />
          <TheTakeaway />
          <Faq />
          <About />
          <Booking />
          <InstagramBlock />
        </main>
        <MagicianFooter />
        {/* The four transition overlays. Each is mounted exactly once, renders
            nothing until something fires it, and unmounts itself when it's
            done; the stacking order between them is the LAYER ladder in
            transition-kit.ts. The card reveal is the top of that ladder (9999
            vs. the curtain's 900 and the wand cursor's 998/999) — while it's
            up, it IS the page. */}
        <SmokeTransition sections={SMOKE_SECTIONS} />
        <TornPaperOverlay />
        <SpotlightSweepOverlay />
        <CardRevealOverlay />
      </div>
    </MagicianCursor>
  );
}
