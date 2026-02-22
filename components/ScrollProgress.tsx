'use client';

import { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY;
      const total =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };

    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[200] h-[3px]">
      <div
        className="h-full origin-left bg-primary"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(0, 102, 255, 0.7), 0 0 20px rgba(0, 102, 255, 0.3)',
          transition: 'width 80ms linear',
        }}
      />
    </div>
  );
}
