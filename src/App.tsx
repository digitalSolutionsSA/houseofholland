import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Artists from './pages/Artists';
import ArtistProfile from './pages/ArtistProfile';
import Booking from './pages/Booking';
import Merch from './pages/Merch';
import Events from './pages/Events';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/artists/:slug" element={<ArtistProfile />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/merch" element={<Merch />} />
        <Route path="/events" element={<Events />} />
      </Routes>
    </BrowserRouter>
  );
}
