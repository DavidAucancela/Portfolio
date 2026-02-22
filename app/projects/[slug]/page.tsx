import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Github, Calendar, Tag, ArrowLeft, Star, CheckCircle2 } from 'lucide-react';
import { getProjectBySlug, getAllProjects } from '@/lib/api';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProjectGallery from '@/components/ProjectGallery';
import { formatDateRange } from '@/lib/utils';

const categoryLabels: Record<string, { label: string; color: string }> = {
  P1: { label: 'Principal', color: 'bg-emerald-500' },
  P2: { label: 'Proyecto', color: 'bg-blue-500' },
  P3: { label: 'Práctica', color: 'bg-amber-500' },
};

export async function generateStaticParams() {
  const projects = getAllProjects();
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export default function ProjectDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const project = getProjectBySlug(params.slug);

  if (!project) {
    notFound();
  }

  const catInfo = categoryLabels[project.category] || categoryLabels.P2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-20">
      <Container size="lg">
        {/* Back nav */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
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
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Destacado
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            {project.title}
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl leading-relaxed mb-6">{project.description}</p>
          {project.links.demo && (
            <Link
              href={project.links.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl"
            >
              <ExternalLink className="h-5 w-5" />
              Acceder al sistema
            </Link>
          )}
        </div>

        {/* Main Image */}
        <div className="relative h-72 md:h-96 w-full rounded-2xl overflow-hidden mb-10 shadow-lg">
          <Image
            src={project.images.thumbnail}
            alt={project.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        {/* Project Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Sobre el Proyecto
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                  {project.fullDescription || project.description}
                </p>
              </div>
            </Card>

            {/* Highlights */}
            {project.highlights && project.highlights.length > 0 && (
              <Card>
                <h2 className="text-2xl font-bold text-gray-900 mb-5">
                  Características Destacadas
                </h2>
                <ul className="space-y-3">
                  {project.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Gallery */}
            {project.images.gallery && project.images.gallery.length > 0 && (
              <ProjectGallery
                images={project.images.gallery}
                title={project.title}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Links */}
            <Card>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Enlaces
              </h2>
              <div className="space-y-3">
                {project.links.demo && (
                  <Link href={project.links.demo} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="primary" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Acceder al sistema
                    </Button>
                  </Link>
                )}
                {project.links.github && (
                  <Link
                    href={project.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      <Github className="h-4 w-4 mr-2" />
                      Ver Código
                    </Button>
                  </Link>
                )}
              </div>
            </Card>

            {/* Info */}
            <Card>
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                Información
              </h2>

              {/* Date */}
              <div className="mb-5 pb-5 border-b border-gray-100">
                <div className="flex items-center text-gray-500 mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Período</span>
                </div>
                <p className="text-sm text-gray-700 font-medium">
                  {formatDateRange(project.date.start, project.date.end)}
                </p>
              </div>

              {/* Tech Stack */}
              <div className="mb-5">
                <div className="flex items-center text-gray-500 mb-3">
                  <Tag className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Stack Tecnológico</span>
                </div>
                <div className="space-y-3">
                  {project.techStack.frontend.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Frontend
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.techStack.frontend.map((tech) => (
                          <span
                            key={tech}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.techStack.backend.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Backend
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.techStack.backend.map((tech) => (
                          <span
                            key={tech}
                            className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.techStack.tools.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Herramientas
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.techStack.tools.map((tool) => (
                          <span
                            key={tool}
                            className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-md font-medium"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {project.tags.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
