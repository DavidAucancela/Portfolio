import Hero from '@/components/sections/Hero';
import ProjectsSection from '@/components/sections/Projects';
import Skills from '@/components/sections/Skills';

export default function Home() {
  return (
    <>
      <Hero />
      <ProjectsSection featured />
      <Skills />
    </>
  );
}
