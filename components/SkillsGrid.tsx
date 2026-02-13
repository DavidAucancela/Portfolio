'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Monitor, Database, Settings, Cloud, Brain } from 'lucide-react';
import { getTechInfo, getTechIconUrl } from '@/lib/techConfig';
import Card from './ui/Card';

// ── Tipos ──────────────────────────────────────
interface SkillItem {
  name: string;
  category: string;
  level: number;
}

// ── Configuración de categorías ────────────────
const categoryConfig: Record<string, { label: string; icon: typeof Server }> = {
  backend:  { label: 'Backend',             icon: Server },
  frontend: { label: 'Frontend',            icon: Monitor },
  database: { label: 'Base de Datos',       icon: Database },
  devops:   { label: 'DevOps',             icon: Settings },
  cloud:    { label: 'Cloud',              icon: Cloud },
  ai:       { label: 'IA & Herramientas',  icon: Brain },
};

const categoryOrder = ['backend', 'frontend', 'database', 'devops', 'cloud', 'ai'];

// ── Encabezado: icono grande centrado ↔ texto al hover ──
function CategoryHeader({ cat }: { cat: string }) {
  const [hovered, setHovered] = useState(false);
  const config = categoryConfig[cat];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <div
      className="flex items-center justify-center mb-5 pb-4 border-b border-gray-100 cursor-pointer h-16"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence mode="wait">
        {!hovered ? (
          <motion.div
            key="icon"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 15 }}
            transition={{ duration: 0.1 }}
            //transition={{ type: 'spring', stiffness: 350, damping: 18 }}
            className="p-3 rounded-2xl bg-primary/10"
          >
            <Icon className="h-8 w-8 text-primary" />
          </motion.div>
        ) : (
          <motion.h3
            key="label"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-bold text-primary tracking-tight"
          >
            {config.label}
          </motion.h3>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Icono de tecnología (CDN con fallback a iniciales) ─────
function TechIcon({ name }: { name: string }) {
  const info = getTechInfo(name);
  const iconUrl = getTechIconUrl(name);
  const [imgError, setImgError] = useState(false);

  // Intentar cargar icono desde CDN (iconUrl directo o simple-icons)
  if (iconUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt={name}
        width={24}
        height={24}
        className="w-6 h-6 flex-shrink-0 object-contain"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback: iniciales estilizadas sobre fondo de marca
  return (
    <div
      className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 shadow-sm"
      style={{ backgroundColor: info.color }}
    >
      {info.initials}
    </div>
  );
}

// ── Barra de progreso animada ──────────────────
function SkillBar({ skill, delay }: { skill: SkillItem; delay: number }) {
  const info = getTechInfo(skill.name);
  const pct = (skill.level / 5) * 100;

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Nombre */}
      <span
        className="text-[13px] font-medium text-gray-700 w-[7.5rem] truncate"
        title={skill.name}
      >
        {skill.name}
      </span>

      {/* Icono de marca */}
      <TechIcon name={skill.name} />

      {/* Barra de avance con color de marca */}
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: info.color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, delay: delay * 0.08, ease: 'easeOut' }}
        />
      </div>

      {/* Nivel numérico */}
      <span
        className="text-[11px] font-semibold w-5 text-right"
        style={{ color: info.color }}
      >
        {skill.level}
      </span>
    </div>
  );
}

// ── Grid principal ─────────────────────────────
export default function SkillsGrid({ skills }: { skills: SkillItem[] }) {
  // Agrupar por categoría
  const grouped = categoryOrder.reduce((acc, cat) => {
    acc[cat] = skills.filter((s) => s.category === cat);
    return acc;
  }, {} as Record<string, SkillItem[]>);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categoryOrder.map((cat) => {
        const config = categoryConfig[cat];
        if (!config) return null;
        const catSkills = grouped[cat] || [];
        if (catSkills.length === 0) return null;

        return (
          <Card key={cat} hover>
            <CategoryHeader cat={cat} />

            {/* Lista de skills */}
            <div className="space-y-0.5">
              {catSkills.map((skill, idx) => (
                <SkillBar key={skill.name} skill={skill} delay={idx} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
