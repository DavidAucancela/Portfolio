'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, Github, ArrowRight, Star } from 'lucide-react';
import { Project } from '@/types';
import { formatDateRange } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  featured?: boolean;
  index?: number;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  P1: { label: 'Principal', color: 'bg-emerald-500' },
  P2: { label: 'Proyecto', color: 'bg-blue-500' },
  P3: { label: 'Práctica', color: 'bg-amber-500' },
};

export default function ProjectCard({ project, featured = false, index = 0 }: ProjectCardProps) {
  const catInfo = categoryLabels[project.category] || categoryLabels.P2;
  const isAboveTheFold = index === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
      className="group h-full"
    >
      <div className="relative h-full flex flex-col rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-gray-950/50 hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
        {/* Image container */}
        <div className="relative h-52 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          <Image
            src={project.images.thumbnail}
            alt={`Captura de pantalla del proyecto ${project.title}`}
            fill
            priority={isAboveTheFold}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-60 group-hover:opacity-75 transition-opacity duration-500" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className={`${catInfo.color} text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm`}>
              {catInfo.label}
            </span>
            {project.featured && (
              <span className="bg-amber-400/90 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                Destacado
              </span>
            )}
          </div>

          {/* Quick action buttons on hover */}
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            {project.links.github && (
              <a
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver código de ${project.title} en GitHub`}
                className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-gray-700 dark:text-gray-200 hover:text-primary hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg active:scale-90"
                onClick={(e) => e.stopPropagation()}
              >
                <Github className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
            {project.links.demo && (
              <a
                href={project.links.demo}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver demo de ${project.title}`}
                className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-gray-700 dark:text-gray-200 hover:text-primary hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg active:scale-90"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>

          {/* Date on image */}
          <div className="absolute bottom-3 left-3">
            <span className="text-xs text-white/90 font-medium backdrop-blur-sm bg-black/20 px-2 py-1 rounded-md font-mono">
              {formatDateRange(project.date.start, project.date.end)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-5">
          <h3 className="font-display text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary dark:group-hover:text-primary transition-colors duration-300 line-clamp-1">
            {project.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1 line-clamp-3 leading-relaxed">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4" aria-label="Tecnologías">
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-colors duration-200"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 4 && (
              <span className="text-[11px] text-gray-400 px-1 py-1 font-medium">
                +{project.tags.length - 4}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {project.links.demo && (
              <Link
                href={project.links.demo}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Acceder al sistema: ${project.title}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Acceder al sistema
              </Link>
            )}
            <Link
              href={`/projects/${project.slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark transition-colors group/link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-md"
              aria-label={`Ver detalles de ${project.title}`}
            >
              Ver detalles
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
