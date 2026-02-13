import { getPersonalInfo, getAllSkills } from '@/lib/api';
import Container from '@/components/ui/Container';
import Card from '@/components/ui/Card';
import SkillsGrid from '@/components/SkillsGrid';
import { Github, Linkedin, Mail, MapPin, Briefcase } from 'lucide-react';

export default function AboutPage() {
  const personalInfo = getPersonalInfo();
  const allSkills = getAllSkills();

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <Container>
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Conóceme
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experiencia, habilidades y pasión por el desarrollo web.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* About Card */}
          <Card className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {personalInfo.name}
            </h2>
            <p className="text-xl text-primary mb-6">{personalInfo.title}</p>
            <div className="prose prose-lg max-w-none text-gray-700 mb-6">
              <p className="whitespace-pre-line">{personalInfo.bio}</p>
            </div>

            {/* Info */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center text-gray-700">
                <MapPin className="h-5 w-5 mr-3 text-primary" />
                <span>{personalInfo.location}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Briefcase className="h-5 w-5 mr-3 text-primary" />
                <span>
                  {personalInfo.experience.years} años de experiencia
                </span>
              </div>
              <div className="flex items-center text-gray-700">
                <Mail className="h-5 w-5 mr-3 text-primary" />
                <a
                  href={`mailto:${personalInfo.email}`}
                  className="hover:text-primary transition-colors"
                >
                  {personalInfo.email}
                </a>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4 mt-8">
              {personalInfo.social.github && (
                <a
                  href={personalInfo.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="h-6 w-6" />
                </a>
              )}
              {personalInfo.social.linkedin && (
                <a
                  href={personalInfo.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-6 w-6" />
                </a>
              )}
            </div>
          </Card>

          {/* Experience Card */}
          <Card>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Experiencia
            </h2>
            <div className="mb-6">
              <p className="text-4xl font-bold text-primary mb-2">
                {personalInfo.experience.years}+
              </p>
              <p className="text-gray-600">Años desarrollando</p>
            </div>
            <p className="text-gray-700">
              {personalInfo.experience.description}
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{allSkills.length}</p>
                <p className="text-xs text-gray-500">Tecnologías</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">6</p>
                <p className="text-xs text-gray-500">Áreas técnicas</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Skills Section */}
        <div className="mb-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Stack tecnológico
            </h2>
          </div>
          <SkillsGrid skills={allSkills} />
        </div>
      </Container>
    </div>
  );
}

