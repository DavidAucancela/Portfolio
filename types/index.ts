export interface ProcessStep {
  id: 'problema' | 'analisis' | 'desarrollo' | 'despliegue' | 'seguridad';
  resumen: string;
  puntos: string[];
}

export interface ProjectProcess {
  overview?: string;
  pasos: ProcessStep[];
  resultado?: string;
  metricas?: Array<{ label: string; value: string }>;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  fullDescription?: string;
  category: 'P1' | 'P2' | 'P3';
  tags: string[];
  images: {
    thumbnail: string;
    gallery?: string[];
  };
  links: {
    demo?: string;
    github?: string;
    caseStudy?: string;
  };
  featured: boolean;
  date: {
    start: string;
    end?: string;
  };
  techStack: {
    frontend: string[];
    backend: string[];
    tools: string[];
  };
  highlights: string[];
  process?: ProjectProcess;
}

export type SkillCategory = 'frontend' | 'backend' | 'database' | 'devops' | 'cloud' | 'ai';

export interface Skill {
  name: string;
  category: SkillCategory;
  level: number; // 1 (empezando) - 5 (pro)
}

export interface ExperienceEntry {
  role: string;
  type: string;
  project: string;
  projectSlug?: string;
  description: string;
  period: string;
}

export interface PersonalInfo {
  name: string;
  title: string;
  bio: string;
  bioShort?: string;
  email: string;
  location: string;
  photoUrl?: string;
  cvUrl?: string;
  social: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
    instagram?: string;
  };
  experience: {
    years: number;
    description: string;
  };
  timeline?: ExperienceEntry[];
}
