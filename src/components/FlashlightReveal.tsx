import { useCallback, useRef, type CSSProperties, type MouseEvent } from 'react';
import './FlashlightReveal.css';

interface FlashlightRevealProps {
  base: string;
  baseAlt: string;
  reveal: string;
  revealAlt: string;
  className?: string;
  imgClassName?: string;
  /** Use eager loading only for above-the-fold artwork. */
  loading?: 'eager' | 'lazy';
  /** Flashlight radius in px. */
  radius?: number;
}

export default function FlashlightReveal({
  base,
  baseAlt,
  reveal,
  revealAlt,
  className,
  imgClassName,
  loading = 'lazy',
  radius = 200,
}: FlashlightRevealProps) {
  const revealRef = useRef<HTMLImageElement>(null);

  const handleMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = revealRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mx', `${x}%`);
    el.style.setProperty('--my', `${y}%`);
    el.style.opacity = '1';
  }, []);

  const handleLeave = useCallback(() => {
    const el = revealRef.current;
    if (!el) return;
    el.style.opacity = '0';
  }, []);

  return (
    <div
      className={`flashlight ${className ?? ''}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <img
        src={base}
        alt={baseAlt}
        className={imgClassName}
        loading={loading}
        decoding="async"
      />
      <img
        ref={revealRef}
        src={reveal}
        alt={revealAlt}
        className={`flashlight__reveal ${imgClassName ?? ''}`}
        style={{ '--flashlight-radius': `${radius}px` } as CSSProperties}
        aria-hidden="true"
        loading={loading}
        decoding="async"
      />
    </div>
  );
}
