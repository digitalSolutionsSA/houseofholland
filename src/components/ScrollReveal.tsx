import { useRef, useEffect, type ReactNode, type ElementType } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  y?: number;
  delay?: number;
  duration?: number;
  [key: string]: unknown;
}

export default function ScrollReveal({
  children,
  as: Tag = 'div',
  className,
  y = 40,
  delay = 0,
  duration = 0.7,
  ...rest
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = '0';
    el.style.transform = `translateY(${y}px)`;
    el.style.transition = `opacity ${duration}s ease ${delay}s, transform ${duration}s ease ${delay}s`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [y, delay, duration]);

  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} className={className} {...rest}>
      {children}
    </Tag>
  );
}
