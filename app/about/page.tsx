import type { Metadata } from 'next';
import { getPersonalInfo, getAllSkills } from '@/lib/api';
import Container from '@/components/ui/Container';
import Card from '@/components/ui/Card';
import SkillsGrid from '@/components/SkillsGrid';
import { Github, Linkedin, Mail, MapPin, Briefcase } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sobre mí',
  description: 'Conoce mi experiencia, habilidades y stack tecnológico como Ingeniero de Software.',
  openGraph: {
    title: 'Sobre mí',
    description: 'Conoce mi experiencia, habilidades y stack tecnológico como Ingeniero de Software.',
    type: 'profile',
  },
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
            Experiencia, habilidades y pasión por el desarrollo web.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* About Card */}
          <Card className="lg:col-span-2">
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {personalInfo.name}
            </h2>
            <p className="text-lg text-primary font-medium mb-6">{personalInfo.title}</p>
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

            {/* Social Links */}
            <div className="flex gap-3 mt-8">
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Áreas técnicas</p>
              </div>
            </div>
          </Card>
        </div>

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
