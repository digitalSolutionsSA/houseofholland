interface ArtistPortraitProps {
  portrait: string;
  alt: string;
  className?: string;
  /** Fill the parent's own box (parent controls size) instead of sizing to natural aspect ratio. */
  fill?: boolean;
}

export default function ArtistPortrait({ portrait, alt, className, fill }: ArtistPortraitProps) {
  return (
    <img
      src={portrait}
      alt={alt}
      className={className}
      style={fill ? { width: '100%', height: '100%', objectFit: 'contain' } : undefined}
    />
  );
}
