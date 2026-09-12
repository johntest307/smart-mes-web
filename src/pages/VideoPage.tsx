import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Volume2, VolumeX, Maximize, Video } from 'lucide-react';

interface VideoChapter {
  id: string;
  labelKey: string;
  descKey: string;
  moduleIdx: number; // 0=all, 1-8=module number
  src: string;
}

const speeds = [0.5, 1, 1.5, 2];

const chapters: VideoChapter[] = [
  { id: 'V0', labelKey: 'video.ch0Label', descKey: 'video.ch0Desc', moduleIdx: 0, src: '/videos/0.mp4' },
  { id: 'V1', labelKey: 'video.ch1Label', descKey: 'video.ch1Desc', moduleIdx: 1, src: '/videos/1.mp4' },
  { id: 'V2', labelKey: 'video.ch2Label', descKey: 'video.ch2Desc', moduleIdx: 2, src: '/videos/2.mp4' },
  { id: 'V3', labelKey: 'video.ch3Label', descKey: 'video.ch3Desc', moduleIdx: 3, src: '/videos/3.mp4' },
  { id: 'V4', labelKey: 'video.ch4Label', descKey: 'video.ch4Desc', moduleIdx: 4, src: '/videos/4.mp4' },
  { id: 'V5', labelKey: 'video.ch5Label', descKey: 'video.ch5Desc', moduleIdx: 5, src: '/videos/5.mp4' },
  { id: 'V6', labelKey: 'video.ch6Label', descKey: 'video.ch6Desc', moduleIdx: 6, src: '/videos/6.mp4' },
  { id: 'V7', labelKey: 'video.ch7Label', descKey: 'video.ch7Desc', moduleIdx: 7, src: '/videos/7.mp4' },
  { id: 'V8', labelKey: 'video.ch8Label', descKey: 'video.ch8Desc', moduleIdx: 8, src: '/videos/8.mp4' },
];

const VideoPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPlayed = useRef(false);
  const current = chapters[currentIdx];

  useEffect(() => {
    if (current.src && videoRef.current) {
      videoRef.current.load();
      setIsPlaying(false);
      if (hasPlayed.current) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  }, [currentIdx]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target instanceof HTMLButtonElement === false) {
        e.preventDefault();
        togglePlay();
      }
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  });

  const togglePlay = () => {
    if (!videoRef.current || !current.src) return;
    if (isPlaying) videoRef.current.pause();
    else { videoRef.current.play(); hasPlayed.current = true; }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !current.src) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    videoRef.current.currentTime = ratio * videoRef.current.duration;
  };

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '--:--';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const switchChapter = (idx: number) => {
    setCurrentIdx(idx);
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div ref={containerRef} tabIndex={-1} className="min-h-screen py-10 px-4 max-w-7xl mx-auto outline-none">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10 text-center">
        <span className="text-accent-green text-sm font-mono tracking-widest uppercase">Video Center</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-2 text-text-primary">{t('video.title')}</h1>
        <p className="text-text-muted mt-2">{t('video.subtitle')}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Player */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-white/10 bg-surface">
          {/* Video Area */}
          <div className="relative bg-black aspect-video flex items-center justify-center">
            {current.src ? (
              <video
                ref={videoRef}
                src={current.src}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 select-none">
                <div className="p-6 rounded-full bg-white/5 border border-white/10 mb-5">
                  <Video size={56} className="text-text-muted" />
                </div>
                <div className="text-accent-blue font-mono text-2xl font-bold mb-2">{current.id}</div>
                <div className="text-text-primary font-semibold text-xl mb-2">{t(current.labelKey)}</div>
                <div className="text-text-muted text-sm max-w-xs mb-4">{t(current.descKey)}</div>
                <div className="px-4 py-2 rounded-full border border-accent-blue/30 text-accent-blue text-xs font-mono">
                  {t('video.pendingMount')}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="px-4 pt-3 pb-1">
            <div className="h-1.5 rounded-full bg-white/10 cursor-pointer relative" onClick={handleProgressClick}>
              <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-xs font-mono text-text-muted">
              <span>{formatTime(videoRef.current ? videoRef.current.currentTime : 0)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 flex flex-wrap items-center gap-3">
            <button onClick={togglePlay} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-text-primary disabled:opacity-40" disabled={!current.src}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={toggleMute} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-text-primary">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Speed */}
            <div className="flex gap-1 ml-2">
              {speeds.map((s) => (
                <button key={s} onClick={() => handleSpeedChange(s)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${speed === s ? 'bg-accent-blue text-base font-bold' : 'bg-white/5 text-text-muted hover:bg-white/10'}`}>
                  {s}x
                </button>
              ))}
            </div>

            <div className="flex-1 px-2 text-sm">
              <span className="text-text-primary font-medium">{t(current.labelKey)}</span>
              <span className="text-text-muted ml-2 text-xs">({current.moduleIdx === 0 ? t('video.moduleAll') : `${t('video.module')} ${current.moduleIdx}`})</span>
            </div>

            <button onClick={handleFullscreen} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-text-primary" disabled={!current.src}>
              <Maximize size={20} />
            </button>
          </div>
        </div>

        {/* Chapter List */}
        <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-text-primary">{t('video.chapterMenu')}</h3>
            <p className="text-text-muted text-xs mt-1">{t('video.total')} {chapters.length} {t('video.chapters')}</p>
          </div>
          <div className="divide-y divide-white/5">
            {chapters.map((ch, idx) => (
              <button key={ch.id} onClick={() => switchChapter(idx)}
                className={`w-full text-left p-4 transition-all duration-200 ${currentIdx === idx
                  ? 'bg-accent-blue/10 border-l-2 border-accent-blue'
                  : 'hover:bg-white/5 border-l-2 border-transparent'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-xs font-bold ${currentIdx === idx ? 'text-accent-blue' : 'text-text-muted'}`}>{ch.id}</span>
                  {!ch.src && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-warning/30 text-warning bg-warning/5">{t('video.pendingUpload')}</span>
                  )}
                </div>
                <div className="text-sm font-medium text-text-primary leading-snug">{t(ch.labelKey)}</div>
                <div className="text-text-muted text-xs mt-0.5">{ch.moduleIdx === 0 ? t('video.moduleAll') : `${t('video.module')} ${ch.moduleIdx}`}</div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VideoPage;
