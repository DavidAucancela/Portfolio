'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getFeaturedProjects, getProjectsByCategory } from '@/lib/api';
import Container from '../ui/Container';
import ProjectGrid from '../ProjectGrid';
import Button from '../ui/Button';

interface ProjectsSectionProps {
  featured?: boolean;
  category?: 'P1' | 'P2' | 'P3';
  title?: string;
  showViewAll?: boolean;
}

export default function ProjectsSection({
  featured = true,
  category,
  title,
  showViewAll = true,
}: ProjectsSectionProps) {
  const projects = category
    ? getProjectsByCategory(category)
    : featured
    ? getFeaturedProjects()
    : [];

  const sectionTitle = title || (featured ? 'Proyectos Destacados' : 'Todos los Proyectos');

  return (
    <section id="projects" className="py-24 bg-gradient-to-b from-white via-gray-50/50 to-white">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-primary/5 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Sparkles className="h-4 w-4" />
            Portafolio
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {sectionTitle}
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Proyectos reales que reflejan mi experiencia en desarrollo fullstack,
            desde sistemas de IA hasta plataformas de gestión empresarial.
          </p>
        </motion.div>

        <ProjectGrid projects={projects} featured={featured} />

        {showViewAll && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-center mt-14"
          >
            <Link href="/projects">
              <Button size="lg" variant="outline" className="group">
                Ver Todos los Proyectos
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        )}
      </Container>
    </section>
  );
}
