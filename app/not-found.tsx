import Link from 'next/link';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-20">
      <Container>
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-4">
            404
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Página no encontrada
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Lo sentimos, la página que estás buscando no existe o ha sido
            movida.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" variant="primary">
                Volver al Inicio
              </Button>
            </Link>
            <Link href="/projects">
              <Button size="lg" variant="outline">
                Ver Proyectos
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
