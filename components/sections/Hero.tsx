'use client';

import { motion } from 'framer-motion';
import { ArrowDown, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { getPersonalInfo } from '@/lib/api';
import Button from '../ui/Button';
import Container from '../ui/Container';

export default function Hero() {
  const personalInfo = getPersonalInfo();

  return (
    <section
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-20"
      aria-label="Presentación"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-violet-950/20" />
      {/* Decorative blobs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <Container className="relative">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Location badge */}
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {personalInfo.location}
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-gray-50 mb-4 tracking-tight text-balance">
              Hola, soy{' '}
              <span className="text-primary relative">
                {personalInfo.name.split(' ')[0]}
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-primary/30 rounded-full" aria-hidden="true" />
              </span>
            </h1>

            <p className="font-display text-xl md:text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
              {personalInfo.title}
            </p>
            <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed text-balance">
              {personalInfo.bio}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/projects">
              <Button size="lg" variant="primary" className="group gap-2">
                <Sparkles className="h-5 w-5 transition-transform group-hover:scale-110" aria-hidden="true" />
                Ver Proyectos
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contactar
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16"
          >
            <a
              href="#projects"
              aria-label="Explorar proyectos"
              className="inline-flex flex-col items-center text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary transition-colors group"
            >
              <span className="text-xs font-medium mb-2 tracking-wider uppercase">Explorar</span>
              <ArrowDown
                className="h-5 w-5 animate-bounce"
                aria-hidden="true"
              />
            </a>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
