import type { Metadata } from 'next';
import { getPersonalInfo } from '@/lib/api';
import Container from '@/components/ui/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Mail, Github, Linkedin, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contacto',
  description: '¿Tienes un proyecto en mente? Contáctame por email, GitHub o LinkedIn.',
  openGraph: {
    title: 'Contacto',
    description: '¿Tienes un proyecto en mente? Contáctame por email, GitHub o LinkedIn.',
    type: 'website',
  },
};

export default function ContactPage() {
  const personalInfo = getPersonalInfo();

  const contactMethods = [
    {
      name: 'Email',
      value: personalInfo.email,
      href: `mailto:${personalInfo.email}`,
      icon: Mail,
      description: 'Envíame un correo electrónico',
    },
    {
      name: 'GitHub',
      value: personalInfo.social.github?.replace('https://github.com/', '@') || '',
      href: personalInfo.social.github,
      icon: Github,
      description: 'Revisa mis proyectos en GitHub',
    },
    {
      name: 'LinkedIn',
      value: 'jonathan-david-aucancela',
      href: personalInfo.social.linkedin,
      icon: Linkedin,
      description: 'Conecta conmigo en LinkedIn',
    },
    {
      name: 'Ubicación',
      value: personalInfo.location,
      icon: MapPin,
      description: 'Ubicación actual',
    },
  ].filter((method) => method.href || method.name === 'Ubicación');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-20">
      <Container>
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-50 mb-4 tracking-tight">
            Contacto
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            ¿Tienes un proyecto en mente? ¿Quieres colaborar? No dudes en contactarme.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {contactMethods.map((method) => {
            const Icon = method.icon;
            return (
              <Card key={method.name} hover>
                <div className="flex items-start">
                  <div className="bg-primary/10 dark:bg-primary/15 p-3 rounded-lg mr-4 flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {method.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{method.description}</p>
                    {method.href ? (
                      <a
                        href={method.href}
                        target={method.href.startsWith('mailto:') ? undefined : '_blank'}
                        rel={method.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                        aria-label={`${method.name}: ${method.value}`}
                        className="text-primary hover:text-primary-dark font-medium text-sm truncate block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-sm"
                      >
                        {method.value}
                      </a>
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">{method.value}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <Card className="text-center">
          <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            ¿Listo para trabajar juntos?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto text-sm leading-relaxed">
            Estoy siempre abierto a discutir nuevos proyectos, ideas creativas o
            oportunidades para ser parte de tus visiones.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`mailto:${personalInfo.email}`}
              aria-label="Enviar email"
            >
              <Button size="lg" variant="primary">
                <Mail className="h-5 w-5 mr-2" aria-hidden="true" />
                Enviar Email
              </Button>
            </a>
            <a href="/projects">
              <Button size="lg" variant="outline">
                Ver Proyectos
              </Button>
            </a>
          </div>
        </Card>
      </Container>
    </div>
  );
}
