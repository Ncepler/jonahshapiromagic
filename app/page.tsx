"use client";

// Jonah Shapiro, a close-up/stage magician & mentalist, in the THEATRICAL
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
import Image from "next/image";
import { useCanHover } from "@/lib/hooks";
import { MagicianCursor } from "./MagicianCursor";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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

const DISPLAY = "var(--font-playfair)"; // playbill serif, §16b
const SANS = "var(--font-tight)"; // clean quiet body sans

const NAME = "Jonah Shapiro";
const PHONE = "(516) 555-0199";
const EMAIL = "hello@jonahshapiro.com";
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
}: {
  top: string;
  side: "left" | "right";
  offset: string;
  suit: string;
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
        <DriftCard key={i} {...c} mx={mx} />
      ))}
    </div>
  );
}

// ── Dramatic phrase band — the trade marquee's theatrical equivalent
// (§16e.2). Same seamless measure-and-overfill technique as the rest of the
// site: muted phrase text, gold diamond separators — no red. ─────────────────
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
      aria-label="What Jonah performs: close-up, stage, mentalism, galas, weddings"
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
            className="text-[15vw] uppercase leading-[0.92] tracking-[0.02em] sm:text-[9vw] md:text-[6.5rem]"
            style={{ color: TEXT, fontFamily: DISPLAY }}
          >
            {NAME}
          </h1>
          <p
            className="mx-auto mt-8 max-w-md text-[22px] leading-[1.35] md:text-[28px]"
            style={{ color: TEXT, fontFamily: DISPLAY, fontStyle: "italic" }}
          >
            You won&apos;t
            <br />
            believe your eyes.
          </p>
          <a
            href="#magician-book"
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
          <span style={{ color: ACCENT, fontSize: 30, opacity: 0.6 }}>✦</span>
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
          <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: TEXT_MUTED, fontFamily: SANS }}>
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
const TIKTOK_URL = "https://www.tiktok.com/@shap_shufflz_magic";
const TIKTOK_HANDLE = "@shap_shufflz_magic";
const TIKTOK_VIDEO_URLS = [
  "https://www.tiktok.com/@shap_shufflz_magic/video/7645045371244154142",
  "https://www.tiktok.com/@shap_shufflz_magic/video/7644400672254790943",
  "https://www.tiktok.com/@shap_shufflz_magic/video/7660168781209079071",
  "https://www.tiktok.com/@shap_shufflz_magic/video/7654723486639770910",
  "https://www.tiktok.com/@shap_shufflz_magic/video/7665430856810499359",
];

function TrickOfTheDay() {
  return (
    <Section className="text-center">
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
          href={TIKTOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            const video = TIKTOK_VIDEO_URLS[Math.floor(Math.random() * TIKTOK_VIDEO_URLS.length)];
            window.open(video, "_blank", "noopener,noreferrer");
          }}
          aria-label="Watch a random trick from Jonah Shapiro's TikTok — @shap_shufflz_magic"
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
            {TIKTOK_HANDLE}
          </span>
        </a>
      </RiseFromDark>
    </Section>
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
      {/* testimonials get zero red — bg-elevated/border only, no curtain wash */}
      <RiseFromDark>
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          — Witnessed —
        </span>
        <h2 className="mt-4 text-[34px] uppercase leading-[1.05] md:text-[50px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          What the room says after.
        </h2>
      </RiseFromDark>
      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {REACTIONS.map((r, i) => (
          <RiseFromDark key={r.who} delay={Math.min(i * 0.08, 0.2)}>
            <div className="pt-6" style={{ borderTop: `1px solid ${BORDER}` }}>
              <span style={{ color: ACCENT, fontSize: 26, fontFamily: DISPLAY, opacity: 0.4 }}>&ldquo;</span>
              <p className="mt-1 text-[16px] leading-[1.6]" style={{ color: TEXT, fontFamily: DISPLAY, fontStyle: "italic" }}>
                {r.line}
              </p>
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: TEXT_MUTED }}>
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
          <div
            className="relative w-full overflow-hidden rounded-[6px]"
            style={{ aspectRatio: "4/5", border: `1px solid ${BORDER}` }}
          >
            <Image
              src="/JonahPortrait.jpg"
              alt="Jonah Shapiro, portrait"
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
            Jonah started with a deck of cards and an audience of one — himself,
            in a mirror, for longer than he&apos;d like to admit. These days it&apos;s
            close-up rooms, full stages, and the occasional wedding, but the
            method never changes: get close enough that the audience stops
            looking for the seam, then give them a moment they can&apos;t explain.
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

// ── Where it works — event types, no real venues (§16e.7). ──────────────────
const VENUES = ["Corporate events", "Galas & fundraisers", "Private parties", "Weddings", "Theaters & live shows"];
function WhereItWorks() {
  return (
    <Section className="text-center">
      <RiseFromDark>
        <span className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          — Where It Works —
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl text-[32px] uppercase leading-[1.1] md:text-[46px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          Any room with people paying attention.
        </h2>
      </RiseFromDark>
      <RiseFromDark delay={0.1}>
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-4">
          {VENUES.map((v, i) => (
            <span key={v} className="flex items-center gap-3">
              <span className="text-[15px] md:text-[18px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
                {v}
              </span>
              {i < VENUES.length - 1 && <span style={{ color: ACCENT }}>◆</span>}
            </span>
          ))}
        </div>
      </RiseFromDark>
    </Section>
  );
}

// ── Booking — the conversion point (§16e.8). Local component state. The second
// (and last) curtain-wash section — bookends the hero at the bottom of the
// page, subtler than the hero's. ─────────────────────────────────────────
const EVENT_TYPES = ["Corporate event", "Gala / fundraiser", "Private party", "Wedding", "Theater / live show", "Not sure yet"];
function Booking() {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const reduced = useReducedMotion();
  const field: CSSProperties = {
    background: BG_ELEVATED,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: 4,
  };
  const label = "mb-1.5 block text-[13px] font-semibold";
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
            Tell me the date and the room. I&apos;ll tell you what fits — close-up
            for cocktail hour, a stage set for the main event, or both.
          </p>
          <div className="mt-8 space-y-3 text-[15px]">
            {[["Call or text", PHONE], ["Email", EMAIL], ["Based", AREA]].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: TEXT_MUTED }}>{k}</span>
                <span style={{ color: TEXT }}>{v}</span>
              </div>
            ))}
          </div>
        </RiseFromDark>
        <RiseFromDark delay={0.1}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={label} style={{ color: TEXT_MUTED }}>Name *</span>
                <input className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="Your name" />
              </div>
              <div>
                <span className={label} style={{ color: TEXT_MUTED }}>Email *</span>
                <input className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="you@email.com" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={label} style={{ color: TEXT_MUTED }}>Event type</span>
                <select className="w-full px-3.5 py-3 text-[15px]" style={field} defaultValue="">
                  <option value="" disabled>Select…</option>
                  {EVENT_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <span className={label} style={{ color: TEXT_MUTED }}>Date</span>
                <input type="date" className="w-full px-3.5 py-3 text-[15px]" style={field} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={label} style={{ color: TEXT_MUTED }}>Location / venue</span>
                <input className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="Where's the show?" />
              </div>
              <div>
                <span className={label} style={{ color: TEXT_MUTED }}>Headcount</span>
                <input type="number" min={1} className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="~60" />
              </div>
            </div>
            <div>
              <span className={label} style={{ color: TEXT_MUTED }}>Anything else?</span>
              <textarea rows={4} className="w-full px-3.5 py-3 text-[15px]" style={field} placeholder="Cocktail hour, sit-down dinner, stage available — whatever you've got." />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setState("ok")}
                className="magician-curtain-btn px-6 py-3.5 text-[14px] font-semibold uppercase tracking-[0.08em]"
                style={{ background: BG_ELEVATED, color: TEXT, border: `1px solid ${ACCENT}` }}
              >
                Send it
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
            <AnimatePresence mode="wait">
              {state === "ok" && (
                <motion.p
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[15px]"
                  style={{ color: ACCENT }}
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
                  style={{ color: TEXT }}
                >
                  That didn&apos;t send. Call or text {PHONE}, or{" "}
                  <button type="button" onClick={() => setState("idle")} className="underline" style={{ color: ACCENT }}>
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
    <footer className="w-full" style={{ background: BG_ELEVATED, borderTop: `1px solid ${BORDER}` }}>
      <div className={`${wrap} py-14 text-center`}>
        <span className="text-[22px] uppercase tracking-[0.04em]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          {NAME}
        </span>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-[1.6]" style={{ color: TEXT_MUTED, fontFamily: DISPLAY, fontStyle: "italic" }}>
          Close enough to see it. Still won&apos;t believe it.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]" style={{ color: TEXT_MUTED }}>
          <span>{PHONE}</span>
          <span>{EMAIL}</span>
          <span>Instagram</span>
        </div>
        <p className="mt-8 text-[12px]" style={{ color: TEXT_MUTED }}>
          © 2026 {NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// ── Curtain Reveal — the very first thing the page shows: a full-bleed red
// curtain holding for a beat, then splitting open to reveal the site
// underneath, gone for good the moment it finishes. Pure CSS, no JS/state —
// same pattern as PhraseBand's marquee — so it can't flash open before
// first paint (SSR ships it already closed) and it opts out of motion on
// its own via prefers-reduced-motion, no hook required. Sits below the wand
// cursor's z-index (998/999) so the cursor stays visible on top of it, and
// above everything else on the page (z-900) so it fully covers the site on
// arrival.
//
// Fluid, not a sliding door: each half is one panel that travels the full
// distance off-screen (guarantees a clean, total clear), but it's built
// from CURTAIN_STRIP_COUNT vertical pleats layered inside it. The pleats
// carry alternating light/shadow shading (fake rounded fold cross-section)
// and each gets its own small skew/scale "flutter" animation on a slight
// stagger, rippling across the panel as it travels — that's what reads as
// cloth instead of one rigid rectangle. Timing: hold closed for
// CURTAIN_BASE_DELAY_MS, then ease open over CURTAIN_MOVE_MS with a
// symmetric in/out curve (slow-start, slow-finish — a hand drawing it open,
// not a door mechanism snapping through it). ────────────────────────────────
const CURTAIN_BASE_DELAY_MS = 1000; // the pause before anything moves
const CURTAIN_MOVE_MS = 1900; // slower, unhurried open
const CURTAIN_STRIP_COUNT = 7;
const CURTAIN_STRIP_STAGGER_MS = 35; // ripple spacing between adjacent pleats
const CURTAIN_TOTAL_MS = CURTAIN_BASE_DELAY_MS + CURTAIN_MOVE_MS;
const CURTAIN_EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // symmetric ease-in-out — fluid, not mechanical

// hand-picked brightness per pleat (not computed) — brightest at the outer/
// wall edge, darkest toward the center seam, alternating a little pleat to
// pleat so each strip reads as its own rounded fold catching/losing light
const CURTAIN_STRIP_SHADE_L = [1.1, 0.97, 1.06, 0.93, 1.02, 0.9, 0.85]; // wall → seam
const CURTAIN_STRIP_SHADE_R = [...CURTAIN_STRIP_SHADE_L].reverse(); // seam → wall

const CURTAIN_FLOOR_SHADOW: CSSProperties = {
  position: "absolute",
  inset: "auto 0 0 0",
  height: "20%",
  background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent)",
};
// six fixed spark positions along the seam — hardcoded, not randomized, so
// server and client markup always match
const CURTAIN_SPARKS: Array<{ top: string; size: number; dx: string; dy: string }> = [
  { top: "16%", size: 4, dx: "-48px", dy: "-12px" },
  { top: "28%", size: 3, dx: "40px", dy: "8px" },
  { top: "42%", size: 5, dx: "-62px", dy: "16px" },
  { top: "56%", size: 3, dx: "52px", dy: "-10px" },
  { top: "68%", size: 4, dx: "-36px", dy: "20px" },
  { top: "80%", size: 3, dx: "46px", dy: "12px" },
];

function curtainStripStyle(shade: number): CSSProperties {
  return {
    position: "relative",
    height: "100%",
    width: `${100 / CURTAIN_STRIP_COUNT}%`,
    background: `repeating-linear-gradient(90deg, ${CURTAIN} 0px, ${CURTAIN_DEEP} 11px, ${CURTAIN} 22px)`,
    boxShadow:
      "inset 7px 0 14px -8px rgba(0,0,0,0.65), inset -7px 0 14px -8px rgba(0,0,0,0.65), inset 0 0 50px rgba(0,0,0,0.4)",
    filter: `brightness(${shade})`,
  };
}

function CurtainPanel({ side }: { side: "left" | "right" }) {
  const shades = side === "left" ? CURTAIN_STRIP_SHADE_L : CURTAIN_STRIP_SHADE_R;
  return (
    <div
      className={`jonah-curtain-panel jonah-curtain-panel-${side === "left" ? "l" : "r"} absolute inset-y-0 flex`}
      style={{ [side]: 0, width: "51%" } as CSSProperties}
    >
      {shades.map((shade, i) => (
        <div key={i} className="jonah-curtain-flutter-el" style={{ animationDelay: `${CURTAIN_BASE_DELAY_MS + i * CURTAIN_STRIP_STAGGER_MS}ms` }}>
          <div style={curtainStripStyle(shade)} />
        </div>
      ))}
      <div
        className={`absolute inset-y-0 ${side === "left" ? "right-0" : "left-0"}`}
        style={{ width: 3, background: ACCENT, opacity: 0.55, boxShadow: `0 0 12px ${hexToRgba(ACCENT, 0.6)}` }}
      />
      <div style={CURTAIN_FLOOR_SHADOW} />
    </div>
  );
}

function CurtainReveal() {
  // percentages below are CURTAIN_BASE_DELAY_MS / CURTAIN_MOVE_MS expressed
  // as fractions of CURTAIN_TOTAL_MS, so the rail/flash/spark beats stay in
  // sync with the panels if the timing constants above ever change
  const pausePct = (CURTAIN_BASE_DELAY_MS / CURTAIN_TOTAL_MS) * 100;
  const pct = (fracOfMove: number) => pausePct + fracOfMove * (100 - pausePct);
  return (
    <div
      aria-hidden
      className="jonah-curtain jonah-curtain-gone pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 900 }}
    >
      <style>{`
        @keyframes jonah-curtain-l {
          0% { transform: translateX(0); }
          100% { transform: translateX(-101%); visibility: hidden; }
        }
        @keyframes jonah-curtain-r {
          0% { transform: translateX(0); }
          100% { transform: translateX(101%); visibility: hidden; }
        }
        @keyframes jonah-curtain-flutter {
          0% { transform: skewX(0deg) scaleX(1); }
          32% { transform: skewX(-4.5deg) scaleX(0.965); }
          62% { transform: skewX(3deg) scaleX(1.02); }
          100% { transform: skewX(0deg) scaleX(1); }
        }
        @keyframes jonah-curtain-rail {
          0%, ${pausePct}% { opacity: 1; }
          ${pct(0.4)}%, 100% { opacity: 0; }
        }
        @keyframes jonah-curtain-flash {
          0%, ${pct(0.05)}% { opacity: 0; }
          ${pct(0.22)}% { opacity: 1; }
          ${pct(0.55)}%, 100% { opacity: 0; }
        }
        @keyframes jonah-curtain-spark {
          0%, ${pct(0.06)}% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          ${pct(0.18)}% { opacity: 1; }
          ${pct(0.6)}%, 100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(1); }
        }
        @keyframes jonah-curtain-gone {
          0%, 97% { visibility: visible; }
          100% { visibility: hidden; }
        }
        .jonah-curtain-panel {
          top: 0;
          bottom: 0;
          animation-duration: ${CURTAIN_MOVE_MS}ms;
          animation-delay: ${CURTAIN_BASE_DELAY_MS}ms;
          animation-timing-function: ${CURTAIN_EASE};
          animation-fill-mode: forwards;
        }
        .jonah-curtain-panel-l { animation-name: jonah-curtain-l; }
        .jonah-curtain-panel-r { animation-name: jonah-curtain-r; }
        .jonah-curtain-flutter-el {
          height: 100%;
          animation-name: jonah-curtain-flutter;
          animation-duration: ${CURTAIN_MOVE_MS}ms;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }
        .jonah-curtain-rail-el { animation: jonah-curtain-rail ${CURTAIN_TOTAL_MS}ms linear forwards; }
        .jonah-curtain-flash-el { animation: jonah-curtain-flash ${CURTAIN_TOTAL_MS}ms linear forwards; }
        .jonah-curtain-spark-el { animation: jonah-curtain-spark ${CURTAIN_TOTAL_MS}ms linear forwards; }
        .jonah-curtain-gone { animation: jonah-curtain-gone ${CURTAIN_TOTAL_MS}ms linear forwards; }
        @media (prefers-reduced-motion: reduce) {
          .jonah-curtain { display: none; }
        }
      `}</style>

      {/* the rail/rod the curtain hangs from */}
      <div
        className="jonah-curtain-rail-el absolute inset-x-0 top-0 h-3"
        style={{ background: `linear-gradient(180deg, ${hexToRgba(ACCENT, 0.5)}, transparent)` }}
      />

      {/* a warm flash of "stage light" right as the curtain starts to part */}
      <div
        className="jonah-curtain-flash-el absolute inset-0"
        style={{ background: `radial-gradient(45% 60% at 50% 45%, ${hexToRgba("#f5e6c8", 0.22)}, transparent 70%)` }}
      />

      <CurtainPanel side="left" />
      <CurtainPanel side="right" />

      {/* a small burst of sparks off the seam as it splits open */}
      <div className="absolute inset-y-0 left-1/2 w-0">
        {CURTAIN_SPARKS.map((s, i) => (
          <span
            key={i}
            className="jonah-curtain-spark-el absolute rounded-full"
            style={
              {
                top: s.top,
                left: 0,
                width: s.size,
                height: s.size,
                background: ACCENT,
                boxShadow: `0 0 6px ${hexToRgba(ACCENT, 0.8)}`,
                "--sx": s.dx,
                "--sy": s.dy,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return <MagicianSite />;
}

function MagicianSite() {
  return (
    // wraps ALL of the magician's content, only this page — see
    // MagicianCursor.tsx for exactly how the wand cursor stays scoped here
    <MagicianCursor>
      <div className="antialiased" style={{ background: BG, color: TEXT_MUTED, fontFamily: SANS, position: "relative" }}>
        <CurtainReveal />
        {/* Shared hover state for the two curtain-styled CTAs ("Book the
            show" / "Send it") — background shifts to a faint gold wash on
            hover. !important is required here: it's overriding each
            button's own inline `style`, which a plain stylesheet rule can't
            outrank on specificity alone. */}
        <style>{`
          .magician-curtain-btn:hover {
            background-color: ${hexToRgba(ACCENT, 0.15)} !important;
            color: ${TEXT} !important;
          }
        `}</style>
        {/* the drifting-card layer spans the whole page, positioned by % of its
            total height — mounted once, absolute, behind section content */}
        <DriftingCards />
        <div className="relative">
          <Hero />
          <PhraseBand />
          <TheExperience />
          <TrickOfTheDay />
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
