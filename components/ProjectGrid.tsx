'use client';

import { Project } from '@/types';
import ProjectCard from './ProjectCard';
import { FolderOpen } from 'lucide-react';

interface ProjectGridProps {
  projects: Project[];
  featured?: boolean;
}

export default function ProjectGrid({ projects, featured = false }: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
          <FolderOpen className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-lg">No se encontraron proyectos.</p>
        <p className="text-gray-400 text-sm mt-1">Prueba con otra categoría o filtro.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          featured={featured}
          index={index}
        />
      ))}
    </div>
  );
}
