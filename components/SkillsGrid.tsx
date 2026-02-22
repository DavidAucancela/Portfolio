'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Monitor, Database, Settings, Cloud, Brain } from 'lucide-react';
import { getTechInfo, getTechIconUrl } from '@/lib/techConfig';
import Card from './ui/Card';

interface SkillItem {
  name: string;
  category: string;
  level: number;
}

const categoryConfig: Record<string, { label: string; icon: typeof Server }> = {
  backend:  { label: 'Backend',            icon: Server },
  frontend: { label: 'Frontend',           icon: Monitor },
  database: { label: 'Base de Datos',      icon: Database },
  devops:   { label: 'DevOps',             icon: Settings },
  cloud:    { label: 'Cloud',             icon: Cloud },
  ai:       { label: 'IA & Herramientas', icon: Brain },
};

const categoryOrder = ['backend', 'frontend', 'database', 'devops', 'cloud', 'ai'];

function CategoryHeader({ cat }: { cat: string }) {
  const [hovered, setHovered] = useState(false);
  const config = categoryConfig[cat];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <div
      className="flex items-center justify-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-800 cursor-default h-16"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={config.label}
    >
      <AnimatePresence mode="wait">
        {!hovered ? (
          <motion.div
            key="icon"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 15 }}
            transition={{ duration: 0.12 }}
            className="p-3 rounded-2xl bg-primary/10 dark:bg-primary/15"
          >
            <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
          </motion.div>
        ) : (
          <motion.h3
            key="label"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="font-display text-lg font-bold text-primary tracking-tight"
          >
            {config.label}
          </motion.h3>
        )}
      </AnimatePresence>
    </div>
  );
}

function TechIcon({ name }: { name: string }) {
  const info = getTechInfo(name);
  const iconUrl = getTechIconUrl(name);
  const [imgError, setImgError] = useState(false);

  if (iconUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        width={24}
        height={24}
        className="w-6 h-6 flex-shrink-0 object-contain"
        loading="lazy"
        onError={() => setImgError(true)}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 shadow-sm"
      style={{ backgroundColor: info.color }}
      aria-hidden="true"
    >
      {info.initials}
    </div>
  );
}

function SkillBar({ skill, delay }: { skill: SkillItem; delay: number }) {
  const info = getTechInfo(skill.name);
  const pct = (skill.level / 5) * 100;
  const levelLabel = ['', 'Básico', 'En progreso', 'Competente', 'Avanzado', 'Experto'][skill.level] || '';

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className="text-[13px] font-medium text-gray-700 dark:text-gray-300 w-[7.5rem] truncate"
        title={skill.name}
      >
        {skill.name}
      </span>

      <TechIcon name={skill.name} />

      <div
        className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={skill.level}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-label={`${skill.name}: nivel ${levelLabel}`}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: info.color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, delay: delay * 0.08, ease: 'easeOut' }}
        />
      </div>

      <span
        className="text-[11px] font-semibold w-5 text-right"
        style={{ color: info.color }}
        aria-hidden="true"
      >
        {skill.level}
      </span>
    </div>
  );
}

export default function SkillsGrid({ skills }: { skills: SkillItem[] }) {
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
