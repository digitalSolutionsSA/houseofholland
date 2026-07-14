import gallery1 from '../../assets/images/gallery-1.png';
import gallery2 from '../../assets/images/gallery-2.png';
import gallery3 from '../../assets/images/gallery-3.png';
import gallery4 from '../../assets/images/gallery-4.png';
import gallery5 from '../../assets/images/gallery-5.png';
import gallery6 from '../../assets/images/gallery-6.png';
import gallery7 from '../../assets/images/gallery-7.png';
import gallery8 from '../../assets/images/gallery-8.png';
import gallery9 from '../../assets/images/gallery-9.png';
import gallery10 from '../../assets/images/gallery-10.png';
import gallery11 from '../../assets/images/gallery-11.png';
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
          <img key={i} src={src} alt="Tattoo studio work" />
        ))}
      </ScrollReveal>
    </section>
  );
}
