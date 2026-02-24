import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getPersonalInfo, getAllSkills } from '@/lib/api';
import Container from '@/components/ui/Container';
import Card from '@/components/ui/Card';
import SkillsGrid from '@/components/SkillsGrid';
import { Github, Linkedin, Mail, MapPin, Briefcase, Download, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sobre mí',
  description: 'Conoce mi experiencia, habilidades y stack tecnológico como Ingeniero de Software.',
  openGraph: {
    title: 'Sobre mí',
    description: 'Conoce mi experiencia, habilidades y stack tecnológico como Ingeniero de Software.',
    type: 'profile',
  },
};

const typeColors: Record<string, string> = {
  Titulación: 'bg-primary/10 text-primary',
  Freelance: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Académico: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  Cliente: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Práctica: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

export default function AboutPage() {
  const personalInfo = getPersonalInfo();
  const allSkills = getAllSkills();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-20">
      <Container>
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-50 mb-4 tracking-tight">
            Conóceme
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Experiencia, habilidades y pasión por el desarrollo de software.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* About Card */}
          <Card className="lg:col-span-2">
            {/* Photo + name */}
            <div className="flex items-center gap-5 mb-6">
              {personalInfo.photoUrl && (
                <div className="flex-shrink-0">
                  <Image
                    src={personalInfo.photoUrl}
                    alt={`Foto de ${personalInfo.name}`}
                    width={88}
                    height={88}
                    className="rounded-full object-cover ring-4 ring-primary/20"
                    priority
                  />
                </div>
              )}
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {personalInfo.name}
                </h2>
                <p className="text-lg text-primary font-medium">{personalInfo.title}</p>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed mb-6">
              {personalInfo.bio}
            </p>

            {/* Info */}
            <div className="space-y-3 mt-8">
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <MapPin className="h-5 w-5 mr-3 text-primary flex-shrink-0" aria-hidden="true" />
                <span>{personalInfo.location}</span>
              </div>
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <Briefcase className="h-5 w-5 mr-3 text-primary flex-shrink-0" aria-hidden="true" />
                <span>{personalInfo.experience.years} años de experiencia</span>
              </div>
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <Mail className="h-5 w-5 mr-3 text-primary flex-shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${personalInfo.email}`}
                  className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-sm"
                >
                  {personalInfo.email}
                </a>
              </div>
            </div>

            {/* Social + CV */}
            <div className="flex flex-wrap items-center gap-3 mt-8">
              {personalInfo.social.github && (
                <a
                  href={personalInfo.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ver perfil de GitHub"
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Github className="h-5 w-5" aria-hidden="true" />
                </a>
              )}
              {personalInfo.social.linkedin && (
                <a
                  href={personalInfo.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ver perfil de LinkedIn"
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Linkedin className="h-5 w-5" aria-hidden="true" />
                </a>
              )}
              {personalInfo.cvUrl && (
                <a
                  href={personalInfo.cvUrl}
                  download
                  aria-label="Descargar CV en PDF"
                  className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Descargar CV
                </a>
              )}
            </div>
          </Card>

          {/* Experience Card */}
          <Card>
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Experiencia
            </h2>
            <div className="mb-6">
              <p className="font-display text-5xl font-bold text-primary mb-1">
                {personalInfo.experience.years}+
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Años desarrollando</p>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              {personalInfo.experience.description}
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {allSkills.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tecnologías</p>
              </div>
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">6</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Proyectos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Experience Timeline */}
        {personalInfo.timeline && personalInfo.timeline.length > 0 && (
          <div className="mb-16">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-3">
                Trayectoria
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Proyectos y trabajos que han definido mi experiencia.
              </p>
            </div>

            <div className="relative max-w-3xl mx-auto">
              {/* Vertical line */}
              <div
                className="absolute left-5 top-3 bottom-3 w-0.5 bg-gray-200 dark:bg-gray-800"
                aria-hidden="true"
              />

              <div className="space-y-6">
                {personalInfo.timeline.map((entry, i) => (
                  <div key={i} className="relative pl-14">
                    {/* Dot */}
                    <div
                      className="absolute left-[14px] top-4 w-3 h-3 rounded-full bg-primary ring-4 ring-gray-50 dark:ring-gray-950"
                      aria-hidden="true"
                    />

                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-primary/30 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`self-start text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeColors[entry.type] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {entry.type}
                          </span>
                          <h3 className="font-display font-bold text-gray-900 dark:text-gray-100 mt-1">
                            {entry.project}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{entry.role}</p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap font-mono">
                          {entry.period}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {entry.description}
                      </p>

                      {entry.projectSlug && (
                        <Link
                          href={`/projects/${entry.projectSlug}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3 font-medium"
                        >
                          Ver proyecto
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Skills Section */}
        <div className="mb-12">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-3">
              Stack tecnológico
            </h2>
          </div>
          <SkillsGrid skills={allSkills} />
        </div>
      </Container>
    </div>
  );
}
