import { Project, Skill, SkillCategory, PersonalInfo } from '@/types';
import projectsData from '@/data/projects.json';
import skillsData from '@/data/skills.json';
import personalData from '@/data/personal.json';

export function getAllProjects(): Project[] {
  return projectsData as Project[];
}

export function getProjectBySlug(slug: string): Project | undefined {
  return getAllProjects().find((project) => project.slug === slug);
}

export function getFeaturedProjects(): Project[] {
  return getAllProjects().filter((project) => project.featured);
}

export function getProjectsByCategory(category: 'P1' | 'P2' | 'P3'): Project[] {
  return getAllProjects().filter((project) => project.category === category);
}

export function getAllSkills(): Skill[] {
  return skillsData as Skill[];
}

export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return getAllSkills().filter((skill) => skill.category === category);
}

export function getPersonalInfo(): PersonalInfo {
  return personalData as PersonalInfo;
}
