'use client';

import { motion } from 'framer-motion';
import { ArrowDown, Download } from 'lucide-react';
import Link from 'next/link';
import { getPersonalInfo } from '@/lib/api';
import Button from '../ui/Button';
import Container from '../ui/Container';

export default function Hero() {
  const personalInfo = getPersonalInfo();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
      <Container>
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Hola, soy{' '}
              <span className="text-primary">{personalInfo.name}</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {personalInfo.title}
            </p>
            <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto">
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
              <Button size="lg" variant="primary">
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
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16"
          >
            <a
              href="#projects"
              className="inline-flex flex-col items-center text-gray-500 hover:text-primary transition-colors"
            >
              <span className="text-sm mb-2">Explorar más</span>
              <ArrowDown className="h-6 w-6 animate-bounce" />
            </a>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
