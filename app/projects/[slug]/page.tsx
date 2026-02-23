import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Github, Calendar, Tag, ArrowLeft, Star, CheckCircle2 } from 'lucide-react';
import { getProjectBySlug, getAllProjects } from '@/lib/api';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProjectProcess from '@/components/ProjectProcess';
import { formatDateRange } from '@/lib/utils';

const categoryLabels: Record<string, { label: string; color: string }> = {
  P1: { label: 'Principal', color: 'bg-emerald-500' },
  P2: { label: 'Proyecto', color: 'bg-blue-500' },
  P3: { label: 'Práctica', color: 'bg-amber-500' },
};

/* ── Open Graph por proyecto ── */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const project = getProjectBySlug(params.slug);
  if (!project) return { title: 'Proyecto no encontrado' };

  const isExternal = project.images.thumbnail.startsWith('http');

  return {
    title: project.title,
    description: project.description,
    keywords: project.tags,
    openGraph: {
      title: project.title,
      description: project.description,
      type: 'article',
      tags: project.tags,
      ...(isExternal && {
        images: [
          { url: project.images.thumbnail, width: 800, height: 600, alt: project.title },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description: project.description,
    },
  };
}

export async function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }));
}

export default function ProjectDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const project = getProjectBySlug(params.slug);
  if (!project) notFound();

  const catInfo = categoryLabels[project.category] || categoryLabels.P2;

  /* JSON-LD por proyecto */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: project.title,
    description: project.description,
    applicationCategory: 'WebApplication',
    datePublished: project.date.start,
    ...(project.date.end && { dateModified: project.date.end }),
    ...(project.links.demo && { url: project.links.demo }),
    ...(project.links.github && { codeRepository: project.links.github }),
    keywords: project.tags.join(', '),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 via-white dark:via-gray-950 to-gray-50 dark:to-gray-950 py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container size="lg">
        {/* Back nav */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-primary transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-md"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            Volver a proyectos
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={`${catInfo.color} text-white text-xs font-bold px-3 py-1 rounded-full`}>
              {catInfo.label}
            </span>
            {project.featured && (
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                Destacado
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-50 mb-3 tracking-tight">
            {project.title}
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* Main Image */}
        <div className="relative h-72 md:h-96 w-full rounded-2xl overflow-hidden mb-10 shadow-lg bg-gray-100 dark:bg-gray-800">
          <Image
            src={project.images.thumbnail}
            alt={`Captura principal de ${project.title}`}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        {/* Project Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Sobre el Proyecto
              </h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                {project.fullDescription || project.description}
              </p>
            </Card>

            {project.highlights && project.highlights.length > 0 && (
              <Card>
                <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 mb-5">
                  Características Destacadas
                </h2>
                <ul className="space-y-3">
                  {project.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-gray-600 dark:text-gray-400">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {project.images.gallery && project.images.gallery.length > 0 && (
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 mb-5">
                  Galería
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.images.gallery.map((image, index) => (
                    <div
                      key={index}
                      className="relative h-64 w-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 bg-gray-100 dark:bg-gray-800"
                    >
                      <Image
                        src={image}
                        alt={`${project.title} — imagen ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <h2 className="font-display text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                Enlaces
              </h2>
              <div className="space-y-3">
                {project.links.demo && (
                  <a
                    href={project.links.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ver demo de ${project.title} (abre en nueva pestaña)`}
                    className="block"
                  >
                    <Button variant="primary" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                      Ver Demo
                    </Button>
                  </a>
                )}
                {project.links.github && (
                  <a
                    href={project.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ver código de ${project.title} en GitHub (abre en nueva pestaña)`}
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      <Github className="h-4 w-4 mr-2" aria-hidden="true" />
                      Ver Código
                    </Button>
                  </a>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="font-display text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">
                Información
              </h2>

              <div className="mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center text-gray-500 dark:text-gray-400 mb-2">
                  <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                  <span className="text-sm font-medium">Período</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {formatDateRange(project.date.start, project.date.end)}
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-center text-gray-500 dark:text-gray-400 mb-3">
                  <Tag className="h-4 w-4 mr-2" aria-hidden="true" />
                  <span className="text-sm font-medium">Stack Tecnológico</span>
                </div>
                <div className="space-y-3">
                  {project.techStack.frontend.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Frontend</p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.techStack.frontend.map((tech) => (
                          <span key={tech} className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md font-medium">{tech}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.techStack.backend.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Backend</p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.techStack.backend.map((tech) => (
                          <span key={tech} className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md font-medium">{tech}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.techStack.tools.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Herramientas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.techStack.tools.map((tool) => (
                          <span key={tool} className="text-xs bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-2 py-1 rounded-md font-medium">{tool}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {project.tags.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

        </div>

        {/* Process case study — full width below the grid */}
        {project.process && (
          <ProjectProcess process={project.process} />
        )}
      </Container>
    </div>
  );
}
