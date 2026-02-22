import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/components/ThemeProvider';
import ProjectCard from '@/components/ProjectCard';
import type { Project } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockProjectBase: Project = {
  id: '1',
  slug: 'test-project',
  title: 'Test Project',
  description: 'Descripción del proyecto de prueba.',
  category: 'P1',
  tags: ['TypeScript', 'React', 'Next.js'],
  images: {
    thumbnail: '/images/projects/test/thumb.png',
    gallery: ['/images/projects/test/thumb.png'],
  },
  links: {
    github: 'https://github.com/user/test-project',
  },
  featured: true,
  date: { start: '2025-01-01', end: '2025-06-30' },
  techStack: {
    frontend: ['React', 'TypeScript'],
    backend: ['Node.js'],
    tools: ['Git'],
  },
  highlights: ['Feature A', 'Feature B'],
};

const mockProjectWithDemo: Project = {
  ...mockProjectBase,
  slug: 'project-with-demo',
  title: 'Proyecto con Demo',
  links: {
    github: 'https://github.com/user/project',
    demo: 'https://demo.example.com',
  },
};

function renderCard(project: Project, index = 0) {
  return render(
    <ThemeProvider>
      <ProjectCard project={project} index={index} />
    </ThemeProvider>
  );
}

describe('ProjectCard', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  // ── Renderizado básico ────────────────────────────────────────────────────
  it('muestra el título del proyecto', () => {
    renderCard(mockProjectBase);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('muestra la descripción del proyecto', () => {
    renderCard(mockProjectBase);
    expect(screen.getByText('Descripción del proyecto de prueba.')).toBeInTheDocument();
  });

  it('muestra los tags del proyecto', () => {
    renderCard(mockProjectBase);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
  });

  // ── Link "Ver detalles" ───────────────────────────────────────────────────
  it('tiene el link "Ver detalles" con la ruta correcta', () => {
    renderCard(mockProjectBase);
    const link = screen.getByRole('link', { name: /ver detalles/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/projects/test-project');
  });

  it('"Ver detalles" tiene aria-label descriptivo', () => {
    renderCard(mockProjectBase);
    const link = screen.getByRole('link', { name: /ver detalles de test project/i });
    expect(link).toBeInTheDocument();
  });

  // ── Link de GitHub ────────────────────────────────────────────────────────
  it('muestra el botón de GitHub cuando existe github link', () => {
    renderCard(mockProjectBase);
    const githubLink = screen.getByRole('link', { name: /github/i });
    expect(githubLink).toBeInTheDocument();
    expect(githubLink.getAttribute('href')).toBe('https://github.com/user/test-project');
    expect(githubLink.getAttribute('target')).toBe('_blank');
    expect(githubLink.getAttribute('rel')).toContain('noopener');
    expect(githubLink.getAttribute('rel')).toContain('noreferrer');
  });

  // ── Demo button (condicional) ─────────────────────────────────────────────
  it('NO muestra "Acceder al sistema" cuando no hay demo link', () => {
    renderCard(mockProjectBase);
    expect(screen.queryByText(/acceder al sistema/i)).not.toBeInTheDocument();
  });

  it('SÍ muestra "Acceder al sistema" cuando hay demo link', () => {
    renderCard(mockProjectWithDemo);
    const demoLink = screen.getByRole('link', { name: /acceder al sistema/i });
    expect(demoLink).toBeInTheDocument();
    expect(demoLink.getAttribute('href')).toBe('https://demo.example.com');
    expect(demoLink.getAttribute('target')).toBe('_blank');
    expect(demoLink.getAttribute('rel')).toContain('noopener');
  });

  // ── Tags overflow ─────────────────────────────────────────────────────────
  it('muestra indicador "+N" cuando hay más de 4 tags', () => {
    const manyTagsProject: Project = {
      ...mockProjectBase,
      tags: ['Tag1', 'Tag2', 'Tag3', 'Tag4', 'Tag5', 'Tag6'],
    };
    renderCard(manyTagsProject);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('no muestra "+N" cuando hay 4 tags o menos', () => {
    const fewTagsProject: Project = {
      ...mockProjectBase,
      tags: ['Tag1', 'Tag2'],
    };
    renderCard(fewTagsProject);
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  // ── Imagen ────────────────────────────────────────────────────────────────
  it('renderiza la imagen thumbnail con alt descriptivo', () => {
    renderCard(mockProjectBase);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    // alt = "Captura de pantalla del proyecto Test Project"
    expect(img.getAttribute('alt')).toContain('Test Project');
  });

  // ── Categoría ─────────────────────────────────────────────────────────────
  it('muestra la etiqueta "Principal" para proyectos P1', () => {
    renderCard(mockProjectBase);
    expect(screen.getByText('Principal')).toBeInTheDocument();
  });

  it('muestra badge "Destacado" cuando featured=true', () => {
    renderCard(mockProjectBase); // fixture: featured: true
    expect(screen.getByText('Destacado')).toBeInTheDocument();
  });

  it('NO muestra badge "Destacado" cuando featured=false', () => {
    const notFeatured: Project = { ...mockProjectBase, featured: false };
    renderCard(notFeatured);
    expect(screen.queryByText('Destacado')).not.toBeInTheDocument();
  });
});
