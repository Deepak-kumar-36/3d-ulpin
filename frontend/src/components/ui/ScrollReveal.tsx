import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right';
}

export default function ScrollReveal({ children, className = '', delay = 0, direction = 'up' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  // We map the direction to a starting transform.
  const getTransform = () => {
    switch (direction) {
      case 'left': return 'translateX(-20px)';
      case 'right': return 'translateX(20px)';
      case 'up':
      default:
        return 'translateY(20px)';
    }
  };

  return (
    <div 
      ref={ref} 
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0,0)' : getTransform(),
        transition: `opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
}
