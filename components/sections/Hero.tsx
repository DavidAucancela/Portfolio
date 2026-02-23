'use client';

import { motion, useInView } from 'framer-motion';
import { ArrowDown, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getPersonalInfo } from '@/lib/api';
import Button from '../ui/Button';
import Container from '../ui/Container';

const ROLES = [
  'Ingeniero de Software',
  'Desarrollador Full Stack',
  'Desarrollador Web',
  'Entusiasta de IA',
];

const STATS = [
  { label: 'Proyectos', value: 6, suffix: '' },
  { label: 'Tecnologías', value: 35, suffix: '+' },
  { label: 'Años de experiencia', value: 2, suffix: '' },
];

/* ── Typewriter hook ── */
function useTypewriter(words: string[], speed = 75, pause = 2200) {
  const [text, setText] = useState('');
  const state = useRef({ wordIdx: 0, charIdx: 0, deleting: false });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const { wordIdx, charIdx, deleting } = state.current;
      const word = words[wordIdx];

      if (!deleting) {
        const next = charIdx + 1;
        setText(word.slice(0, next));
        state.current.charIdx = next;
        if (next === word.length) {
          state.current.deleting = true;
          timer = setTimeout(tick, pause);
        } else {
          timer = setTimeout(tick, speed);
        }
      } else {
        const next = charIdx - 1;
        setText(word.slice(0, next));
        state.current.charIdx = next;
        if (next === 0) {
          state.current.deleting = false;
          state.current.wordIdx = (wordIdx + 1) % words.length;
        }
        timer = setTimeout(tick, speed / 2);
      }
    }

    timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return text;
}

/* ── Animated counter ── */
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const steps = 50;
    const duration = 1400;
    let current = 0;
    const interval = setInterval(() => {
      current += value / steps;
      if (current >= value) {
        setCount(value);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ── Hero ── */
export default function Hero() {
  const personalInfo = getPersonalInfo();
  const role = useTypewriter(ROLES);
  const sectionRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);
  const [blobPos, setBlobPos] = useState({ x: 0.3, y: 0.4 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      const el = sectionRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setBlobPos({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.addEventListener('mousemove', handleMouseMove);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[92vh] flex items-center justify-center overflow-hidden py-20"
      aria-label="Presentación"
    >
      {/* Static gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-violet-950/20" />

      {/* Mouse-reactive blob 1 — azul */}
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl pointer-events-none bg-primary/10 dark:bg-primary/8"
        style={{
          left: '-4rem',
          top: '15%',
          transform: `translate(${blobPos.x * 80}px, ${blobPos.y * 60}px)`,
          transition: 'transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        aria-hidden="true"
      />

      {/* Mouse-reactive blob 2 — violeta */}
      <div
        className="absolute w-[26rem] h-[26rem] rounded-full blur-3xl pointer-events-none bg-violet-400/10 dark:bg-violet-500/6"
        style={{
          right: '-6rem',
          bottom: '10%',
          transform: `translate(${-blobPos.x * 60}px, ${-blobPos.y * 40}px)`,
          transition: 'transform 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        aria-hidden="true"
      />

      {/* Mouse-reactive blob 3 — pequeño acento */}
      <div
        className="absolute w-48 h-48 rounded-full blur-2xl pointer-events-none bg-sky-400/8 dark:bg-sky-400/5"
        style={{
          left: '55%',
          top: '20%',
          transform: `translate(${blobPos.x * 40 - 20}px, ${blobPos.y * 40 - 20}px)`,
          transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        aria-hidden="true"
      />

      <Container className="relative">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            {/* Location badge */}
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {personalInfo.location}
            </div>

            {/* Name */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-gray-50 mb-4 tracking-tight text-balance">
              Hola, soy{' '}
              <span className="text-primary relative">
                {personalInfo.name.split(' ')[0]}
                <span
                  className="absolute -bottom-1 left-0 right-0 h-[3px] bg-primary/30 rounded-full"
                  aria-hidden="true"
                />
              </span>
            </h1>

            {/* Typewriter role */}
            <div
              className="font-display text-xl md:text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4 h-9 flex items-center justify-center"
              aria-live="polite"
              aria-label={`Rol: ${role}`}
            >
              <span>{role}</span>
              <span
                className="inline-block w-[2px] h-6 bg-primary ml-1 rounded-full animate-pulse align-middle"
                aria-hidden="true"
              />
            </div>

            <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed text-balance">
              {personalInfo.bio}
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/projects">
              <Button size="lg" variant="primary" className="group gap-2">
                <Sparkles
                  className="h-5 w-5 transition-transform group-hover:scale-110"
                  aria-hidden="true"
                />
                Ver Proyectos
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contactar
              </Button>
            </Link>
          </motion.div>

          {/* Stats counters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-14 flex justify-center items-center gap-0 divide-x divide-gray-200 dark:divide-gray-800"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="px-8 text-center">
                <div className="font-display text-3xl md:text-4xl font-bold text-primary tabular-nums">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="mt-14"
          >
            <a
              href="#projects"
              aria-label="Explorar proyectos"
              className="inline-flex flex-col items-center text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary transition-colors group"
            >
              <span className="text-xs font-medium mb-2 tracking-wider uppercase">
                Explorar
              </span>
              <ArrowDown
                className="h-5 w-5 animate-bounce"
                aria-hidden="true"
              />
            </a>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
