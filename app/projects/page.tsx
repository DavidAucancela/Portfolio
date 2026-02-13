'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllProjects, getProjectsByCategory } from '@/lib/api';
import { Project } from '@/types';
import Container from '@/components/ui/Container';
import ProjectGrid from '@/components/ProjectGrid';
import { Layers, Star, Code, Wrench, LayoutGrid } from 'lucide-react';

const categories: Array<{
  key: 'all' | 'P1' | 'P2' | 'P3';
  label: string;
  icon: typeof Star;
  description: string;
}> = [
  { key: 'all', label: 'Todos', icon: LayoutGrid, description: 'Todos los proyectos' },
  { key: 'P1', label: 'Principales', icon: Star, description: 'Proyectos destacados y de mayor alcance' },
  { key: 'P2', label: 'Proyectos', icon: Code, description: 'Proyectos académicos y profesionales' },
  { key: 'P3', label: 'Prácticas', icon: Wrench, description: 'Ejercicios y prácticas' },
];

export default function ProjectsPage() {
  const [selectedCategory, setSelectedCategory] = useState<'P1' | 'P2' | 'P3' | 'all'>('all');

  const projects: Project[] =
    selectedCategory === 'all'
      ? getAllProjects()
      : getProjectsByCategory(selectedCategory);

  const activeCategory = categories.find((c) => c.key === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-20">
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-primary/5 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Layers className="h-4 w-4" />
            Repositorios & Proyectos
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Mis Proyectos
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Cada proyecto representa un reto real resuelto con código, creatividad y
            tecnología. Desde IA y búsqueda semántica hasta seguridad bancaria.
          </p>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-wrap justify-center gap-2 mb-4"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.key;

            return (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`
                  inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                  transition-all duration-300 border
                  ${isActive
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary/30 hover:text-primary hover:bg-primary/5'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {category.label}
              </button>
            );
          })}
        </motion.div>

        {/* Results info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="text-center mb-10"
        >
          <p className="text-sm text-gray-400">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
            {activeCategory && selectedCategory !== 'all' && (
              <> &middot; {activeCategory.description}</>
            )}
          </p>
        </motion.div>

        {/* Projects Grid with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <ProjectGrid projects={projects} />
          </motion.div>
        </AnimatePresence>
      </Container>
    </div>
  );
}
