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
  const gallery = project.images.gallery?.filter(Boolean) ?? [];

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
        <div className="mb-10">
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

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About card — thumbnail inside */}
            <Card className="overflow-hidden !p-0">
              {project.images.thumbnail && (
                <div className="relative h-64 w-full bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={project.images.thumbnail}
                    alt={`Vista principal de ${project.title}`}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}
              <div className="p-6">
                <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Sobre el Proyecto
                </h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                  {project.fullDescription || project.description}
                </p>
              </div>
            </Card>

            {/* Highlights */}
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

        {/* Process case study */}
        {project.process && (
          <ProjectProcess process={project.process} />
        )}

        {/* Gallery — al final, después del resultado */}
        {gallery.length > 0 && (
          <div className="mt-16">
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">
                Capturas del Proyecto
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {gallery.length} {gallery.length === 1 ? 'imagen' : 'imágenes'} del sistema en funcionamiento
              </p>
            </div>

            <div className={`grid gap-5 ${
              gallery.length === 1
                ? 'grid-cols-1 max-w-2xl mx-auto'
                : gallery.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }`}>
              {gallery.map((image, index) => {
                const label = image.split('/').pop()?.replace(/\.[^.]+$/, '') ?? `Pantalla ${index + 1}`;
                return (
                  <div
                    key={index}
                    className="group relative aspect-video rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-primary/30"
                  >
                    <Image
                      src={image}
                      alt={`${project.title} — ${label}`}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="text-white text-sm font-medium capitalize truncate">
                        {label}
                      </p>
                    </div>
                    {/* Index badge */}
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
