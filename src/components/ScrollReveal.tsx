import { useRef, useEffect, type ReactNode, type ElementType } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  y?: number;
  delay?: number;
  duration?: number;
  stagger?: number;
  [key: string]: unknown;
}

export default function ScrollReveal({
  children,
  as: Tag = 'div',
  className,
  y = 60,
  delay = 0,
  duration = 1,
  stagger = 0,
  ...rest
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = stagger ? Array.from(el.children) : el;
    // Home page scrolls inside a nested .home-scroll container (for scroll-snap),
    // not the window — ScrollTrigger must watch that scroller or it never fires.
    const scroller = el.closest('.home-scroll') as HTMLElement | null;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          stagger,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            scroller: scroller ?? window,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [y, delay, duration, stagger]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
