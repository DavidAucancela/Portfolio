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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      className="group h-full"
    >
      <div className="relative h-full flex flex-col rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 hover:-translate-y-1">
        {/* Image container */}
        <div className="relative h-52 w-full overflow-hidden">
          <Image
            src={project.images.thumbnail}
            alt={project.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className={`${catInfo.color} text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm`}>
              {catInfo.label}
            </span>
            {project.featured && (
              <span className="bg-amber-400/90 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Destacado
              </span>
            )}
          </div>

          {/* Quick action buttons on hover */}
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            {project.links.github && (
              <Link
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-primary hover:bg-white transition-colors shadow-lg"
              >
                <Github className="h-4 w-4" />
              </Link>
            )}
            {project.links.demo && (
              <Link
                href={project.links.demo}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-primary hover:bg-white transition-colors shadow-lg"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Date on image */}
          <div className="absolute bottom-3 left-3">
            <span className="text-xs text-white/90 font-medium backdrop-blur-sm bg-black/20 px-2 py-1 rounded-md">
              {formatDateRange(project.date.start, project.date.end)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-1">
            {project.title}
          </h3>
          <p className="text-sm text-gray-500 mb-4 flex-1 line-clamp-3 leading-relaxed">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-colors duration-200"
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

          {/* Action link */}
          <Link
            href={`/projects/${project.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark transition-colors group/link"
          >
            Ver detalles
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
