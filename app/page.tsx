"use client";

// Style demo — Jonah Shapiro, a close-up/stage magician & mentalist, in the
// THEATRICAL EXCEPTION system (SKILL §16). This is the one demo that
// deliberately throws out the local-service DNA everywhere else in
// components/demos/*: no editorial restraint, no hairline-and-eyebrow spine,
// no "zero decorative shapes," no subtle motion. Spectacle IS the design —
// floating cards, embers, a shuffle-video hero, a pick-a-card interaction.
// Self-contained on purpose (does NOT import from ./system, which is the
// local-service spine) — this file is its own small design system.
//
// The only rules that still apply here: honesty (§12/§16f — no fabricated
// credits/celebrities/awards/"sold out"), labeled placeholders (§10), and the
// "demo build" label. "Jonah Shapiro" is a sample brand for the demo, not a
// real performer. Spec: .claude/skills/local-service-design-system/SKILL.md §16

import {
  AnimatePresence,
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
  type ReactNode,
} from "react";
import { useCanHover } from "@/lib/hooks";
import { MagicianCursor } from "./MagicianCursor";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Palette — a huge red stage curtain against total darkness: near-black
// falling into a deep velvet crimson, with a warmer ember accent (§16a).
const BG = "#0D0808";
const SURFACE = "#1B0E0E";
const FG = "#F4EFE6";
const BODY = "#C7B4B0";
const MUTED = "#8C7370";
const LINE = "#2E1414";
const CRIMSON = "#A31F2E";
const EMBER = "#C9432B";
const DEEP_RED = "#3A0B10"; // rare — one deep curtain-shadow glow only

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

const DISPLAY = "var(--font-playfair)"; // playbill serif, §16b
const SANS = "var(--font-tight)"; // clean quiet body sans

const NAME = "Jonah Shapiro";
const PHONE = "(516) 555-0199";
const EMAIL = "hello@jonahshapiro.demo";
const AREA = "Based on Long Island, NY — available across the tri-state area";

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

// ── Labeled placeholder — no real footage/photos exist yet (§10/§16f). ───────
function Placeholder({
  label,
  ratio = "16/9",
  className = "",
  glow = false,
}: {
  label: string;
  ratio?: string;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-[6px] ${className}`}
      style={{ aspectRatio: ratio, background: SURFACE, border: `1px solid ${LINE}` }}
    >
      {glow && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 60% at 50% 35%, ${hexToRgba(CRIMSON, 0.14)}, transparent 70%)`,
          }}
        />
      )}
      <div className="absolute inset-3 flex items-end justify-start">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: MUTED }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// ── Embers — a capped, low-density canvas particle layer (§16d.3). Off on
// reduced-motion, lighter on mobile, entirely content-free decoration (the
// one place in the whole demo system that's allowed, per the §16 exception).
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
          ? hexToRgba(CRIMSON, Math.max(0, alpha) * 0.75)
          : hexToRgba(EMBER, Math.max(0, alpha) * 0.6);
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
// scroll, slight 3D tilt, crimson glints (§16d.2). Content-free decoration, the
// documented exception to the no-shapes rule. Killed entirely on reduced
// motion; half the set is desktop-only, the rest stay for mobile (scroll-
// driven only, no cursor drift there).
function CardGlyph({ suit, crimson }: { suit: string; crimson: boolean }) {
  const tone = crimson ? CRIMSON : EMBER;
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        borderRadius: 6,
        background: "linear-gradient(160deg, #241010, #130808)",
        border: `1px solid ${tone}55`,
        boxShadow: "0 10px 26px rgba(0,0,0,.55)",
      }}
    >
      <span aria-hidden style={{ color: tone, fontSize: 20, opacity: 0.9 }}>
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
  crimson,
  tilt,
  depth,
  mx,
  desktopOnly,
}: {
  top: string;
  side: "left" | "right";
  offset: string;
  suit: string;
  crimson: boolean;
  tilt: number;
  depth: number;
  mx: MotionValue<number>;
  desktopOnly: boolean;
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
      style={{ top, ...posStyle, y, rotate, opacity: 0.68 }}
    >
      <CardGlyph suit={suit} crimson={crimson} />
    </motion.div>
  );
}

const DRIFT_CARDS: Array<{
  top: string;
  side: "left" | "right";
  offset: string;
  suit: string;
  crimson: boolean;
  tilt: number;
  depth: number;
  desktopOnly: boolean;
}> = [
  { top: "6%", side: "left", offset: "4%", suit: "♠", crimson: true, tilt: -16, depth: 34, desktopOnly: false },
  { top: "16%", side: "right", offset: "6%", suit: "♦", crimson: false, tilt: 12, depth: 44, desktopOnly: true },
  { top: "34%", side: "left", offset: "2%", suit: "♣", crimson: true, tilt: 9, depth: 30, desktopOnly: true },
  { top: "52%", side: "right", offset: "4%", suit: "♥", crimson: false, tilt: -11, depth: 40, desktopOnly: false },
  { top: "70%", side: "left", offset: "7%", suit: "♠", crimson: true, tilt: 18, depth: 36, desktopOnly: true },
  { top: "86%", side: "right", offset: "3%", suit: "♦", crimson: true, tilt: -14, depth: 32, desktopOnly: false },
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
        <DriftCard key={i} {...c} mx={mx} />
      ))}
    </div>
  );
}

// ── Dramatic phrase band — the trade marquee's theatrical equivalent
// (§16e.2). Same seamless measure-and-overfill technique as the rest of the
// site, restyled: crimson/ember on velvet, diamond separators. ─────────────────
const PHRASES = ["Close-up", "Stage", "Mentalism", "Galas", "Weddings"];
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
            style={{ color: FG, fontFamily: DISPLAY }}
          >
            {p}
          </span>
          <span aria-hidden style={{ color: CRIMSON }}>
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
      aria-label="What Jonah performs: close-up, stage, mentalism, galas, weddings"
      className="relative w-full overflow-hidden whitespace-nowrap py-8"
      style={{ background: SURFACE, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}
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

// ── Hero — the shuffle (§16d.1). Full-bleed dark, vignetted, a crimson spotlight
// glow + drifting embers. No real footage exists yet, so the "video" is a
// theatrical CSS placeholder (glow + vignette + label) — drop a real clip in
// `HERO_VIDEO_SRC` later and it slots straight in. ───────────────────────────
const HERO_VIDEO_SRC = ""; // set to a real clip path when Noah has one
function Hero() {
  return (
    <section
      className="relative flex w-full items-end overflow-hidden"
      style={{ minHeight: "100svh", background: BG }}
    >
      {/* velvet field + spotlight glow + vignette — the "dark house" */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(60% 55% at 50% 28%, ${hexToRgba(CRIMSON, 0.2)}, transparent 62%), radial-gradient(90% 70% at 50% 100%, rgba(0,0,0,.7), transparent 60%), linear-gradient(180deg, ${BG} 0%, ${SURFACE} 55%, ${BG} 100%)`,
        }}
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
          <span
            className="mb-8 inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: MUTED, border: `1px solid ${LINE}` }}
          >
            Demo build — sample act
          </span>
          <h1
            className="text-[15vw] uppercase leading-[0.92] tracking-[0.02em] sm:text-[9vw] md:text-[6.5rem]"
            style={{ color: FG, fontFamily: DISPLAY }}
          >
            {NAME}
          </h1>
          <p
            className="mx-auto mt-8 max-w-md text-[22px] leading-[1.35] md:text-[28px]"
            style={{ color: BODY, fontFamily: DISPLAY, fontStyle: "italic" }}
          >
            You won&apos;t
            <br />
            believe your eyes.
          </p>
          <a
            href="#magician-book"
            className="mt-10 inline-block px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.14em] transition-transform duration-200 hover:scale-[1.03]"
            style={{ background: CRIMSON, color: BG }}
          >
            Book the show
          </a>
        </RiseFromDark>
        <div
          className="mt-16 text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: MUTED }}
        >
          Scroll
        </div>
        {!HERO_VIDEO_SRC && (
          <span className="sr-only">Placeholder: hero card shuffle / flourish loop, 16:9, dark</span>
        )}
      </div>
    </section>
  );
}

// ── The Experience — "pick a card" (§16d.4 / §16e.3). Fan of face-down cards;
// hover/tap lifts + flips one to reveal a show type. Reduced-motion shows all
// five already revealed, statically, in a plain readable row. ───────────────
const SHOWS = [
  { label: "Close-up & strolling", desc: "Cards and coins, inches from your eyes, table to table." },
  { label: "Stage illusions", desc: "Built for a room, not a table — the big-stage set." },
  { label: "Mentalism", desc: "Predictions and mind-reading that shouldn't be possible." },
  { label: "Corporate & galas", desc: "A room full of strangers, talking about one thing after." },
  { label: "Private & weddings", desc: "The moment everyone still brings up months later." },
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
        {/* back of card — face down, crimson diamond lattice */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[8px]"
          style={{
            backfaceVisibility: "hidden",
            background: `repeating-linear-gradient(45deg, #241010 0 10px, ${SURFACE} 10px 20px)`,
            border: `1px solid ${CRIMSON}66`,
            boxShadow: "0 16px 40px rgba(0,0,0,.55)",
          }}
        >
          <span style={{ color: CRIMSON, fontSize: 30, opacity: 0.85 }}>✦</span>
        </div>
        {/* front — the revealed show type */}
        <div
          className="absolute inset-0 flex flex-col justify-center rounded-[8px] p-5 text-left"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(165deg, #241010, #130808)",
            border: `1px solid ${CRIMSON}`,
            boxShadow: "0 16px 40px rgba(0,0,0,.55)",
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: CRIMSON }}>
            0{index + 1}
          </span>
          <h3 className="mt-2 text-[19px] leading-[1.15]" style={{ color: FG, fontFamily: DISPLAY }}>
            {show.label}
          </h3>
          <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: BODY, fontFamily: SANS }}>
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
          style={{ background: SURFACE, border: `1px solid ${LINE}` }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: CRIMSON }}>
            0{i + 1}
          </span>
          <h3 className="mt-2 text-[19px] leading-[1.15]" style={{ color: FG, fontFamily: DISPLAY }}>
            {s.label}
          </h3>
          <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: BODY }}>
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
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: CRIMSON }}>
          — The Experience —
        </span>
        <h2
          className="mt-4 text-[38px] uppercase leading-[1.02] tracking-[0.01em] md:text-[56px]"
          style={{ color: FG, fontFamily: DISPLAY }}
        >
          Pick a card.
          <br />
          <span style={{ color: BODY }}>See what you get.</span>
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
        <p className="mt-10 text-center text-[13px]" style={{ color: MUTED }}>
          Tap a card to reveal it.
        </p>
      </RiseFromDark>
    </Section>
  );
}

// ── The Reel — the proof moment (§16e.4). Full-bleed, one dramatic play
// button, no real footage yet. ────────────────────────────────────────────
function Reel() {
  const reduced = useReducedMotion();
  return (
    <section className="relative w-full" style={{ background: SURFACE, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(50% 60% at 50% 45%, ${hexToRgba(CRIMSON, 0.1)}, transparent 70%)` }}
      />
      <div className={`${wrap} relative py-[96px] text-center md:py-[150px]`}>
        <RiseFromDark>
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: CRIMSON }}>
            — The Reel —
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl text-[34px] uppercase leading-[1.05] md:text-[50px]" style={{ color: FG, fontFamily: DISPLAY }}>
            Watch it happen.
          </h2>
        </RiseFromDark>
        <RiseFromDark delay={0.12} className="relative mx-auto mt-12 max-w-3xl">
          <Placeholder label="REEL — live performance (16:9)" glow />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
            transition={reduced ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ border: `1.5px solid ${CRIMSON}`, background: hexToRgba(BG, 0.55) }}
            >
              <span
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "12px solid transparent",
                  borderBottom: "12px solid transparent",
                  borderLeft: `18px solid ${CRIMSON}`,
                  marginLeft: 4,
                }}
              />
            </div>
          </motion.div>
        </RiseFromDark>
      </div>
    </section>
  );
}

// ── Witnessed — reactions, honestly unattributed (§16e.5/§12). ──────────────
const REACTIONS = [
  { line: "“I still don’t know how he did the card thing. I’ve looked it up. Nothing explains it.”", who: "Corporate holiday party guest" },
  { line: "“Our whole table stopped talking. That never happens at a wedding.”", who: "Wedding guest" },
  { line: "“He read my mind. Actually read it. I’m still weirded out.”", who: "Gala attendee" },
];
function Witnessed() {
  return (
    <Section>
      {/* the one rare deep-curtain-shadow touch in the whole demo (§16a) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(45% 50% at 50% 0%, ${DEEP_RED}1a, transparent 70%)` }}
      />
      <RiseFromDark>
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: CRIMSON }}>
          — Witnessed —
        </span>
        <h2 className="mt-4 text-[34px] uppercase leading-[1.05] md:text-[50px]" style={{ color: FG, fontFamily: DISPLAY }}>
          What the room says after.
        </h2>
        <p className="mt-3 text-[13px]" style={{ color: MUTED }}>
          Illustrative reactions for this demo — not real client quotes.
        </p>
      </RiseFromDark>
      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {REACTIONS.map((r, i) => (
          <RiseFromDark key={r.who} delay={Math.min(i * 0.08, 0.2)}>
            <div className="pt-6" style={{ borderTop: `1px solid ${LINE}` }}>
              <span style={{ color: CRIMSON, fontSize: 26, fontFamily: DISPLAY }}>&ldquo;</span>
              <p className="mt-1 text-[16px] leading-[1.6]" style={{ color: FG, fontFamily: DISPLAY, fontStyle: "italic" }}>
                {r.line}
              </p>
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
                — {r.who}
              </p>
            </div>
          </RiseFromDark>
        ))}
      </div>
    </Section>
  );
}

// ── About — a mysterious bio (§16e.6). No invented awards/credits. ──────────
function About() {
  return (
    <Section className="" id="magician-about">
      <div className="grid items-center gap-12 md:grid-cols-[0.85fr_1fr] md:gap-16">
        <RiseFromDark>
          <Placeholder label="PORTRAIT — the magician, low key (4:5)" ratio="4/5" glow />
        </RiseFromDark>
        <RiseFromDark delay={0.1}>
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: CRIMSON }}>
            — About —
          </span>
          <h2 className="mt-4 text-[32px] uppercase leading-[1.08] md:text-[44px]" style={{ color: FG, fontFamily: DISPLAY }}>
            Not a trick.
            <br />
            <span style={{ color: BODY }}>A decision, made in front of you.</span>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-[1.7]" style={{ color: BODY }}>
            Jonah started with a deck of cards and an audience of one — himself,
            in a mirror, for longer than he&apos;d like to admit. These days it&apos;s
            close-up rooms, full stages, and the occasional wedding, but the
            method never changes: get close enough that the audience stops
            looking for the seam, then give them a moment they can&apos;t explain.
          </p>
          <p className="mt-4 max-w-md text-[16px] leading-[1.7]" style={{ color: BODY }}>
            No smoke machines. No cartoon top hat. Just cards, a little
            psychology, and a lot of practice most people never see.
          </p>
        </RiseFromDark>
      </div>
    </Section>
  );
}

// ── Where it works — event types, no real venues (§16e.7). ──────────────────
const VENUES = ["Corporate events", "Galas & fundraisers", "Private parties", "Weddings", "Theaters & live shows"];
function WhereItWorks() {
  return (
    <Section className="text-center">
      <RiseFromDark>
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: CRIMSON }}>
          — Where It Works —
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl text-[32px] uppercase leading-[1.1] md:text-[46px]" style={{ color: FG, fontFamily: DISPLAY }}>
          Any room with people paying attention.
        </h2>
      </RiseFromDark>
      <RiseFromDark delay={0.1}>
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-4">
          {VENUES.map((v, i) => (
            <span key={v} className="flex items-center gap-3">
              <span className="text-[15px] md:text-[18px]" style={{ color: FG, fontFamily: DISPLAY }}>
                {v}
              </span>
              {i < VENUES.length - 1 && <span style={{ color: CRIMSON }}>◆</span>}
            </span>
          ))}
        </div>
      </RiseFromDark>
    </Section>
  );
}

// ── Booking — the conversion point (§16e.8). Local demo state, crimson button. ─
const EVENT_TYPES = ["Corporate event", "Gala / fundraiser", "Private party", "Wedding", "Theater / live show", "Not sure yet"];
function Booking() {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const reduced = useReducedMotion();
  const field: CSSProperties = {
    background: BG,
    border: `1px solid ${LINE}`,
    color: FG,
    borderRadius: 4,
  };
  const label = "mb-1.5 block text-[13px] font-semibold";
  return (
    <Section id="magician-book" className="" >
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <RiseFromDark>
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: CRIMSON }}>
            — Booking —
          </span>
          <h2 className="mt-4 text-[34px] uppercase leading-[1.05] md:text-[50px]" style={{ color: FG, fontFamily: DISPLAY }}>
            Book the show.
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-[1.6]" style={{ color: BODY }}>
            Tell me the date and the room. I&apos;ll tell you what fits — close-up
            for cocktail hour, a stage set for the main event, or both.
          </p>
          <div className="mt-8 space-y-3 text-[15px]">
            {[["Call or text", PHONE], ["Email", EMAIL], ["Based", AREA]].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: MUTED }}>{k}</span>
                <span style={{ color: FG }}>{v}</span>
              </div>
            ))}
          </div>
        </RiseFromDark>
        <RiseFromDark delay={0.1}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={label} style={{ color: MUTED }}>Name *</span>
                <input className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="Your name" />
              </div>
              <div>
                <span className={label} style={{ color: MUTED }}>Email *</span>
                <input className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="you@email.com" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={label} style={{ color: MUTED }}>Event type</span>
                <select className="w-full px-3.5 py-3 text-[15px]" style={field} defaultValue="">
                  <option value="" disabled>Select…</option>
                  {EVENT_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <span className={label} style={{ color: MUTED }}>Date</span>
                <input type="date" className="w-full px-3.5 py-3 text-[15px]" style={field} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={label} style={{ color: MUTED }}>Location / venue</span>
                <input className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="Where's the show?" />
              </div>
              <div>
                <span className={label} style={{ color: MUTED }}>Headcount</span>
                <input type="number" min={1} className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="~60" />
              </div>
            </div>
            <div>
              <span className={label} style={{ color: MUTED }}>Anything else?</span>
              <textarea rows={4} className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="Cocktail hour, sit-down dinner, stage available — whatever you've got." />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setState("ok")}
                className="px-6 py-3.5 text-[14px] font-semibold uppercase tracking-[0.08em]"
                style={{ background: CRIMSON, color: BG }}
              >
                Send it
              </button>
              {process.env.NODE_ENV !== "production" && (
                <button
                  type="button"
                  onClick={() => setState("err")}
                  className="text-[13px]"
                  style={{ color: MUTED }}
                >
                  (demo: preview error state)
                </button>
              )}
            </div>
            <AnimatePresence mode="wait">
              {state === "ok" && (
                <motion.p
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[15px]"
                  style={{ color: CRIMSON }}
                >
                  Got it — I&apos;ll get back to you within a day.
                </motion.p>
              )}
              {state === "err" && (
                <motion.p
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[15px]"
                  style={{ color: FG }}
                >
                  That didn&apos;t send. Call or text {PHONE}, or{" "}
                  <button type="button" onClick={() => setState("idle")} className="underline" style={{ color: CRIMSON }}>
                    try again
                  </button>.
                </motion.p>
              )}
            </AnimatePresence>
          </form>
        </RiseFromDark>
      </div>
    </Section>
  );
}

// ── Footer — dark, minimal, one dramatic line (§16e.9). ──────────────────────
function MagicianFooter() {
  return (
    <footer className="w-full" style={{ background: SURFACE, borderTop: `1px solid ${LINE}` }}>
      <div className={`${wrap} py-14 text-center`}>
        <span className="text-[22px] uppercase tracking-[0.04em]" style={{ color: FG, fontFamily: DISPLAY }}>
          {NAME}
        </span>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-[1.6]" style={{ color: MUTED, fontFamily: DISPLAY, fontStyle: "italic" }}>
          Close enough to see it. Still won&apos;t believe it.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]" style={{ color: BODY }}>
          <span>{PHONE}</span>
          <span>{EMAIL}</span>
          <span style={{ color: MUTED }}>Instagram</span>
        </div>
        <p className="mt-8 text-[12px]" style={{ color: MUTED }}>
          © 2026 {NAME} — demo build / sample site, not a real performer.
        </p>
      </div>
    </footer>
  );
}

export default function Page() {
  return <MagicianDemo />;
}

function MagicianDemo() {
  return (
    // wraps ALL of the magician's content, only this demo — see
    // MagicianCursor.tsx for exactly how the wand cursor stays scoped here
    <MagicianCursor>
      <div className="antialiased" style={{ background: BG, color: BODY, fontFamily: SANS, position: "relative" }}>
        {/* the drifting-card layer spans the whole demo, positioned by % of its
            total height — mounted once, absolute, behind section content */}
        <DriftingCards />
        <div className="relative">
          <Hero />
          <PhraseBand />
          <TheExperience />
          <Reel />
          <Witnessed />
          <About />
          <WhereItWorks />
          <Booking />
          <MagicianFooter />
        </div>
      </div>
    </MagicianCursor>
  );
}
