import { describe, it, expect } from 'vitest';
import {
  getAllProjects,
  getProjectBySlug,
  getFeaturedProjects,
  getProjectsByCategory,
  getAllSkills,
  getSkillsByCategory,
  getPersonalInfo,
} from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// getAllProjects()
// ─────────────────────────────────────────────────────────────────────────────
describe('getAllProjects()', () => {
  it('retorna un array no vacío', () => {
    const projects = getAllProjects();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
  });

  it('cada proyecto tiene los campos requeridos', () => {
    const projects = getAllProjects();
    for (const p of projects) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('slug');
      expect(p).toHaveProperty('title');
      expect(p).toHaveProperty('description');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('tags');
      expect(p).toHaveProperty('images');
      expect(p).toHaveProperty('links');
      expect(p).toHaveProperty('featured');
      expect(p).toHaveProperty('date');
      expect(p).toHaveProperty('techStack');
      expect(p).toHaveProperty('highlights');
    }
  });

  it('las categorías son solo P1, P2 o P3', () => {
    const validCategories = ['P1', 'P2', 'P3'];
    getAllProjects().forEach((p) => {
      expect(validCategories).toContain(p.category);
    });
  });

  it('cada slug es único', () => {
    const slugs = getAllProjects().map((p) => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('los tags son arrays no vacíos', () => {
    getAllProjects().forEach((p) => {
      expect(Array.isArray(p.tags)).toBe(true);
      expect(p.tags.length).toBeGreaterThan(0);
    });
  });

  it('las imágenes tienen thumbnail', () => {
    getAllProjects().forEach((p) => {
      expect(p.images.thumbnail).toBeTruthy();
      expect(typeof p.images.thumbnail).toBe('string');
    });
  });

  it('los highlights son arrays no vacíos', () => {
    getAllProjects().forEach((p) => {
      expect(Array.isArray(p.highlights)).toBe(true);
      expect(p.highlights.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getProjectBySlug()
// ─────────────────────────────────────────────────────────────────────────────
describe('getProjectBySlug()', () => {
  it('encuentra el proyecto "ubapp"', () => {
    const p = getProjectBySlug('ubapp');
    expect(p).toBeDefined();
    expect(p!.slug).toBe('ubapp');
    expect(p!.title).toContain('UBApp');
  });

  it('encuentra el proyecto "ideancestral"', () => {
    const p = getProjectBySlug('ideancestral');
    expect(p).toBeDefined();
    expect(p!.slug).toBe('ideancestral');
  });

  it('retorna undefined para un slug inválido', () => {
    const p = getProjectBySlug('proyecto-que-no-existe');
    expect(p).toBeUndefined();
  });

  it('retorna undefined para slug vacío', () => {
    expect(getProjectBySlug('')).toBeUndefined();
  });

  it('es sensible a mayúsculas (case-sensitive)', () => {
    expect(getProjectBySlug('UBAPP')).toBeUndefined();
    expect(getProjectBySlug('Ubapp')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getFeaturedProjects()
// ─────────────────────────────────────────────────────────────────────────────
describe('getFeaturedProjects()', () => {
  it('retorna solo proyectos con featured=true', () => {
    const featured = getFeaturedProjects();
    expect(featured.length).toBeGreaterThan(0);
    featured.forEach((p) => {
      expect(p.featured).toBe(true);
    });
  });

  it('los proyectos destacados son subconjunto de todos', () => {
    const all = getAllProjects();
    const featured = getFeaturedProjects();
    featured.forEach((fp) => {
      expect(all.find((p) => p.slug === fp.slug)).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getProjectsByCategory()
// ─────────────────────────────────────────────────────────────────────────────
describe('getProjectsByCategory()', () => {
  it('filtra proyectos P1 correctamente', () => {
    const p1 = getProjectsByCategory('P1');
    expect(p1.length).toBeGreaterThan(0);
    p1.forEach((p) => expect(p.category).toBe('P1'));
  });

  it('filtra proyectos P2 correctamente', () => {
    const p2 = getProjectsByCategory('P2');
    p2.forEach((p) => expect(p.category).toBe('P2'));
  });

  it('filtra proyectos P3 correctamente', () => {
    const p3 = getProjectsByCategory('P3');
    p3.forEach((p) => expect(p.category).toBe('P3'));
  });

  it('P1 + P2 + P3 suman el total de proyectos', () => {
    const total = getAllProjects().length;
    const p1 = getProjectsByCategory('P1').length;
    const p2 = getProjectsByCategory('P2').length;
    const p3 = getProjectsByCategory('P3').length;
    expect(p1 + p2 + p3).toBe(total);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAllSkills()
// ─────────────────────────────────────────────────────────────────────────────
describe('getAllSkills()', () => {
  it('retorna un array no vacío de skills', () => {
    const skills = getAllSkills();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThan(0);
  });

  it('cada skill tiene name, category y level', () => {
    getAllSkills().forEach((s) => {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('category');
      expect(s).toHaveProperty('level');
    });
  });

  it('el nivel de cada skill está entre 1 y 5', () => {
    getAllSkills().forEach((s) => {
      expect(s.level).toBeGreaterThanOrEqual(1);
      expect(s.level).toBeLessThanOrEqual(5);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSkillsByCategory()
// ─────────────────────────────────────────────────────────────────────────────
describe('getSkillsByCategory()', () => {
  it('filtra skills de frontend', () => {
    const fe = getSkillsByCategory('frontend');
    expect(fe.length).toBeGreaterThan(0);
    fe.forEach((s) => expect(s.category).toBe('frontend'));
  });

  it('filtra skills de backend', () => {
    const be = getSkillsByCategory('backend');
    expect(be.length).toBeGreaterThan(0);
    be.forEach((s) => expect(s.category).toBe('backend'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPersonalInfo()
// ─────────────────────────────────────────────────────────────────────────────
describe('getPersonalInfo()', () => {
  it('retorna info con campos básicos', () => {
    const info = getPersonalInfo();
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('title');
    expect(info).toHaveProperty('bio');
    expect(info).toHaveProperty('email');
    expect(info).toHaveProperty('social');
  });

  it('el email tiene formato válido', () => {
    const { email } = getPersonalInfo();
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('el nombre no está vacío', () => {
    expect(getPersonalInfo().name.trim()).not.toBe('');
  });

  it('el social object tiene al menos github o linkedin', () => {
    const { social } = getPersonalInfo();
    const hasAny = social.github || social.linkedin || social.twitter;
    expect(hasAny).toBeTruthy();
  });
});
