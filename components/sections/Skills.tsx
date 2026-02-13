import Link from 'next/link';
import { getAllSkills } from '@/lib/api';
import Container from '../ui/Container';
import SkillsGrid from '../SkillsGrid';
import Button from '../ui/Button';

export default function Skills() {
  const allSkills = getAllSkills();

  return (
    <section className="py-20 bg-gray-50">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Stack Tecnológico
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tecnologías y herramientas que utilizo para crear soluciones
            innovadoras.
          </p>
        </div>

        <SkillsGrid skills={allSkills} />

        <div className="text-center mt-10">
          <Link href="/about">
            <Button size="lg" variant="outline">
              Ver perfil completo
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
}
