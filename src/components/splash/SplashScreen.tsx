import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [unmuted, setUnmuted] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFadeOut(true);
    setTimeout(onFinish, 600);
  }, [onFinish]);

  const handleClick = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!unmuted) {
      v.muted = false;
      v.play().catch(() => {});
      setUnmuted(true);
    }
  }, [unmuted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const ended = () => finish();
    const err = () => finish();
    v.addEventListener('ended', ended);
    v.addEventListener('error', err);
    return () => {
      v.removeEventListener('ended', ended);
      v.removeEventListener('error', err);
    };
  }, [finish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-base transition-opacity duration-600 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/0.mp4"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

      {!unmuted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-white/10">
            <svg className="w-10 h-10 md:w-14 md:h-14 text-white ml-1.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="text-white text-lg md:text-xl tracking-widest">
            {t('splash.clickToPlay')}
          </p>
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); finish(); }}
        className="absolute bottom-8 right-8 px-5 py-2 rounded border border-gray-600 text-gray-300 text-sm hover:bg-white/10 transition-colors z-10"
      >
        {t('splash.skip')}
      </button>
    </div>
  );
}
