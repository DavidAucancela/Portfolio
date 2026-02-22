import Link from 'next/link';
import { Github, Linkedin, Mail, Instagram } from 'lucide-react';
import { getPersonalInfo } from '@/lib/api';
import Container from './ui/Container';

export default function Footer() {
  const personalInfo = getPersonalInfo();

  const socialLinks = [
    {
      name: 'GitHub',
      href: personalInfo.social.github,
      icon: Github,
    },
    {
      name: 'LinkedIn',
      href: personalInfo.social.linkedin,
      icon: Linkedin,
    },
    {
      name: 'Instagram',
      href: (personalInfo.social as Record<string, string | undefined>).instagram,
      icon: Instagram,
    },
    {
      name: 'Email',
      href: `mailto:${personalInfo.email}`,
      icon: Mail,
    },
  ];

  return (
    <footer className="bg-gray-950 dark:bg-black text-white py-12 border-t border-gray-800">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-display text-xl font-bold mb-3 text-white">
              Jonathan.dev
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Ingeniero de Software construyendo soluciones web con React, Django y IA.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Navegación
            </h3>
            <ul className="space-y-2">
              {[
                { href: '/', label: 'Inicio' },
                { href: '/projects', label: 'Proyectos' },
                { href: '/about', label: 'Sobre mí' },
                { href: '/contact', label: 'Contacto' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Redes
            </h3>
            <div className="flex gap-3">
              {socialLinks.map((link) => {
                if (!link.href) return null;
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                    rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                    aria-label={link.name}
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-500 text-sm">
          <p>
            © {new Date().getFullYear()} {personalInfo.name}. Todos los derechos reservados.
          </p>
          <p className="font-mono text-xs text-gray-600">
            Built with Next.js + TypeScript
          </p>
        </div>
      </Container>
    </footer>
  );
}
