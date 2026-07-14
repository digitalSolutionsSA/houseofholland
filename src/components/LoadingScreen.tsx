import { useEffect, useRef, useState } from 'react';
import './LoadingScreen.css';

const VIDEO_SRC = '/load.mp4';
const SESSION_KEY = 'hoh-loader-seen';
const EXIT_MS = 800;
const MAX_DURATION = 12000;

function shouldSkipLoader() {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export default function LoadingScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(() => !shouldSkipLoader());
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;

    document.body.classList.add('is-loading');
    let done = false;

    const dismiss = () => {
      if (done) return;
      done = true;
      sessionStorage.setItem(SESSION_KEY, '1');
      setLeaving(true);
      window.setTimeout(() => {
        setVisible(false);
        document.body.classList.remove('is-loading');
      }, EXIT_MS);
    };

    const video = videoRef.current;
    if (video) {
      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(() => dismiss());
      }
    }

    const cap = window.setTimeout(dismiss, MAX_DURATION);
    return () => {
      window.clearTimeout(cap);
      document.body.classList.remove('is-loading');
    };
  }, [visible]);

  if (!visible) return null;

  const handleEnded = () => {
    setLeaving(true);
    window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setVisible(false);
      document.body.classList.remove('is-loading');
    }, EXIT_MS);
  };

  return (
    <div className={`loader ${leaving ? 'loader--leaving' : ''}`} aria-hidden="true">
      <video
        ref={videoRef}
        className="loader__video"
        src={VIDEO_SRC}
        muted
        autoPlay
        playsInline
        preload="auto"
        onEnded={handleEnded}
        onError={() => {
          sessionStorage.setItem(SESSION_KEY, '1');
          setVisible(false);
          document.body.classList.remove('is-loading');
        }}
      />
    </div>
  );
}
