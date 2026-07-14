import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Hero from '../components/sections/Hero';
import SinceDayOne from '../components/sections/SinceDayOne';
import ArtistsLineup from '../components/sections/ArtistsLineup';
import GallerySection from '../components/sections/GallerySection';
import './Home.css';

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="home-scroll">
        <Hero />
        <SinceDayOne />
        <ArtistsLineup />
        <GallerySection />
        <Footer />
      </div>
    </>
  );
}
