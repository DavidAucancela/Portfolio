import Link from 'next/link';
import { Github, Linkedin, Mail, Twitter } from 'lucide-react';
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
      name: 'Twitter',
      href: personalInfo.social.twitter,
      icon: Twitter,
    },
    {
      name: 'Email',
      href: `mailto:${personalInfo.email}`,
      icon: Mail,
    },
  ];

  return (
    <footer className="bg-gray-900 text-white py-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Portfolio</h3>
            <p className="text-gray-400">
              Desarrollador Fullstack creando soluciones web innovadoras.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Enlaces</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link
                  href="/projects"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Proyectos
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Sobre mí
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Redes Sociales</h3>
            <div className="flex space-x-4">
              {socialLinks.map((link) => {
                if (!link.href) return null;
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label={link.name}
                  >
                    <Icon className="h-6 w-6" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>
            © {new Date().getFullYear()} {personalInfo.name}. Todos los derechos
            reservados.
          </p>
        </div>
      </Container>
    </footer>
  );
}
