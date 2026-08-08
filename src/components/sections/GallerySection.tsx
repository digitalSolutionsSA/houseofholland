import gallery1 from '../../assets/images/gallery-1.webp';
import gallery2 from '../../assets/images/gallery-2.webp';
import gallery3 from '../../assets/images/gallery-3.webp';
import gallery4 from '../../assets/images/gallery-4.webp';
import gallery5 from '../../assets/images/gallery-5.webp';
import gallery6 from '../../assets/images/gallery-6.webp';
import gallery7 from '../../assets/images/gallery-7.webp';
import gallery8 from '../../assets/images/gallery-8.webp';
import gallery9 from '../../assets/images/gallery-9.webp';
import gallery10 from '../../assets/images/gallery-10.webp';
import gallery11 from '../../assets/images/gallery-11.webp';
import ScrollReveal from '../ScrollReveal';
import './GallerySection.css';

const images = [
  gallery7,
  gallery4,
  gallery2,
  gallery9,
  gallery5,
  gallery6,
  gallery10,
  gallery8,
  gallery3,
  gallery11,
  gallery1,
];

export default function GallerySection() {
  return (
    <section className="gallery" id="gallery">
      <ScrollReveal as="h2" className="gallery__heading">
        <span className="text-white">FROM THE</span>
        <span className="text-red">GALLERY</span>
      </ScrollReveal>

      <ScrollReveal as="div" className="gallery__grid" stagger={0.06} y={30}>
        {images.map((src, i) => (
          <img key={i} src={src} alt="Tattoo studio work" loading="lazy" decoding="async" />
        ))}
      </ScrollReveal>
    </section>
  );
}
