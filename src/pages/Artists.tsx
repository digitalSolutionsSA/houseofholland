import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ArtistsLineup from '../components/sections/ArtistsLineup';
import ArtistsGrid from '../components/sections/ArtistsGrid';

export default function Artists() {
  return (
    <>
      <Navbar />
      <ArtistsLineup showViewAll={false} />
      <ArtistsGrid />
      <Footer />
    </>
  );
}
