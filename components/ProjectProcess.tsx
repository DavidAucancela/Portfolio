'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  AlertCircle,
  ClipboardList,
  Code2,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import type { ProjectProcess, ProcessStep } from '@/types';

/* ── Phase configuration ── */
type PhaseId = ProcessStep['id'];

interface PhaseConfig {
  label: string;
  Icon: React.ElementType;
  step: number;
  dotBg: string;
  dotShadow: string;
  cardBorderL: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  checkColor: string;
  labelColor: string;
  stepNumColor: string;
}

const PHASE_CONFIG: Record<PhaseId, PhaseConfig> = {
  problema: {
    label: 'Problema Identificado',
    Icon: AlertCircle,
    step: 1,
    dotBg: 'bg-rose-500',
    dotShadow: 'shadow-rose-500/40',
    cardBorderL: 'border-l-rose-500',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeText: 'text-rose-600 dark:text-rose-400',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
    checkColor: 'text-rose-500',
    labelColor: 'text-rose-600 dark:text-rose-400',
    stepNumColor: 'text-rose-400/60 dark:text-rose-500/40',
  },
  analisis: {
    label: 'Análisis y Diseño',
    Icon: ClipboardList,
    step: 2,
    dotBg: 'bg-amber-500',
    dotShadow: 'shadow-amber-500/40',
    cardBorderL: 'border-l-amber-500',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-600 dark:text-amber-400',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    checkColor: 'text-amber-500',
    labelColor: 'text-amber-600 dark:text-amber-400',
    stepNumColor: 'text-amber-400/60 dark:text-amber-500/40',
  },
  desarrollo: {
    label: 'Desarrollo',
    Icon: Code2,
    step: 3,
    dotBg: 'bg-blue-500',
    dotShadow: 'shadow-blue-500/40',
    cardBorderL: 'border-l-blue-500',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-600 dark:text-blue-400',
    badgeBorder: 'border-blue-200 dark:border-blue-800',
    checkColor: 'text-blue-500',
    labelColor: 'text-blue-600 dark:text-blue-400',
    stepNumColor: 'text-blue-400/60 dark:text-blue-500/40',
  },
  despliegue: {
    label: 'Despliegue',
    Icon: Rocket,
    step: 4,
    dotBg: 'bg-emerald-500',
    dotShadow: 'shadow-emerald-500/40',
    cardBorderL: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    checkColor: 'text-emerald-500',
    labelColor: 'text-emerald-600 dark:text-emerald-400',
    stepNumColor: 'text-emerald-400/60 dark:text-emerald-500/40',
  },
  seguridad: {
    label: 'Seguridad Aplicada',
    Icon: ShieldCheck,
    step: 5,
    dotBg: 'bg-violet-500',
    dotShadow: 'shadow-violet-500/40',
    cardBorderL: 'border-l-violet-500',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/40',
    badgeText: 'text-violet-600 dark:text-violet-400',
    badgeBorder: 'border-violet-200 dark:border-violet-800',
    checkColor: 'text-violet-500',
    labelColor: 'text-violet-600 dark:text-violet-400',
    stepNumColor: 'text-violet-400/60 dark:text-violet-500/40',
  },
};

/* ── Phase step component ── */
function PhaseCard({ paso, isLast, index }: { paso: ProcessStep; isLast: boolean; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const cfg = PHASE_CONFIG[paso.id];
  const { Icon } = cfg;

  return (
    <div ref={ref} className="relative flex gap-5 md:gap-7">
      {/* Timeline column */}
      <div className="relative flex flex-col items-center flex-shrink-0">
        {/* Step dot */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: index * 0.08 }}
          className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full ${cfg.dotBg} shadow-lg ${cfg.dotShadow}`}
        >
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </motion.div>
        {/* Connector line */}
        {!isLast && (
          <div className="absolute top-11 bottom-0 w-px bg-gradient-to-b from-gray-300 dark:from-gray-700 via-gray-200 dark:via-gray-800 to-transparent" />
        )}
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: index * 0.08 + 0.1, ease: 'easeOut' }}
        className={`flex-1 mb-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-l-[3px] ${cfg.cardBorderL} backdrop-blur-sm`}
      >
        {/* Card header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
            >
              FASE {String(cfg.step).padStart(2, '0')}
            </span>
            <h3 className={`font-display font-bold text-base ${cfg.labelColor}`}>
              {cfg.label}
            </h3>
          </div>
          {/* Large step number watermark */}
          <span
            className={`font-display text-4xl font-black tabular-nums leading-none select-none ${cfg.stepNumColor}`}
            aria-hidden="true"
          >
            {String(cfg.step).padStart(2, '0')}
          </span>
        </div>

        {/* Card body */}
        <div className="px-6 py-5">
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
            {paso.resumen}
          </p>
          <ul className="space-y-2.5">
            {paso.puntos.map((punto, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.35, delay: index * 0.08 + 0.2 + i * 0.05 }}
                className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
              >
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.checkColor}`}
                  aria-hidden="true"
                />
                <span>{punto}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Main component ── */
export default function ProjectProcess({ process }: { process: ProjectProcess }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, amount: 0.3 });
  const resultRef = useRef<HTMLDivElement>(null);
  const resultInView = useInView(resultRef, { once: true, margin: '-40px' });

  return (
    <section className="mt-16" aria-labelledby="process-heading">
      {/* Section header */}
      <div ref={headerRef} className="mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="text-xs font-bold tracking-widest uppercase text-primary">
                Case Study
              </span>
            </div>
            <h2
              id="process-heading"
              className="font-display text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-50"
            >
              Proceso de Ingeniería de Software
            </h2>
          </div>
          <span className="text-sm text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
            5 fases · Documentación técnica
          </span>
        </motion.div>

        {/* Overview */}
        {process.overview && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-600 dark:text-gray-400 leading-relaxed border-l-4 border-primary/30 pl-4 py-1"
          >
            {process.overview}
          </motion.p>
        )}

        {/* Phase progress indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-6 flex items-center gap-1.5 flex-wrap"
          aria-hidden="true"
        >
          {process.pasos.map((paso, i) => {
            const cfg = PHASE_CONFIG[paso.id];
            return (
              <div key={paso.id} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${cfg.dotBg}`} />
                <span className={`text-xs font-medium ${cfg.labelColor}`}>{cfg.label}</span>
                {i < process.pasos.length - 1 && (
                  <span className="text-gray-300 dark:text-gray-700 mx-0.5">→</span>
                )}
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Timeline */}
      <div>
        {process.pasos.map((paso, index) => (
          <PhaseCard
            key={paso.id}
            paso={paso}
            isLast={index === process.pasos.length - 1}
            index={index}
          />
        ))}
      </div>

      {/* Resultado */}
      {process.resultado && (
        <div ref={resultRef}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={resultInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55 }}
            className="relative overflow-hidden rounded-2xl border border-primary/20 dark:border-primary/30 bg-gradient-to-br from-primary/5 via-blue-50/50 to-violet-50/50 dark:from-primary/10 dark:via-gray-900 dark:to-violet-950/20 p-6 md:p-8 mb-8"
          >
            {/* Decorative corner accent */}
            <div
              className="absolute top-0 right-0 w-32 h-32 bg-primary/5 dark:bg-primary/8 rounded-bl-full"
              aria-hidden="true"
            />
            <div className="relative flex items-start gap-4">
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold tracking-widest uppercase text-primary">
                    Resultado Final
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {process.resultado}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Métricas */}
      {process.metricas && process.metricas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={resultInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          aria-label="Métricas del proyecto"
        >
          {process.metricas.map((m, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="font-display text-xl md:text-2xl font-bold text-primary mb-1 leading-tight">
                {m.value}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight">
                {m.label}
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
