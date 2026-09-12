import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, Video } from 'lucide-react';

interface VideoChapter {
  id: string;
  label: string;
  description: string;
  module: string;
  src: string;
}

const chapters: VideoChapter[] = [
  { id: 'V0', label: 'MaTBC 品牌介紹', description: 'MaTBC 伺服器品牌理念與產品線概覽', module: '全部', src: '/videos/0.mp4' },
  { id: 'V1', label: '基座與主機板前置準備', description: '伺服器基座安裝與主機板預裝作業', module: '模組 1', src: '/videos/1.mp4' },
  { id: 'V2', label: '記憶體與高速儲存配置', description: '記憶體模組與 NVMe 儲存裝置安裝', module: '模組 2', src: '/videos/2.mp4' },
  { id: 'V3', label: '散熱風扇與氣流導風罩配置', description: '系統風扇模組與導風罩組裝', module: '模組 3', src: '/videos/3.mp4' },
  { id: 'V4', label: 'AI 加速基板與 GPU 安裝', description: 'AI 加速卡與 GPU 擴充槽安裝示範', module: '模組 4', src: '/videos/4.mp4' },
  { id: 'V5', label: '電源分配與高速走線', description: '電源供應器安裝與纜線整線佈局', module: '模組 5', src: '/videos/5.mp4' },
  { id: 'V6', label: '介面卡與網路模組擴充', description: 'PCIe 介面卡與 10GbE 網路模組安裝', module: '模組 6', src: '/videos/6.mp4' },
  { id: 'V7', label: '伺服器組裝與檢查流程', description: '整機組裝完成後的目視檢查要點', module: '模組 7', src: '/videos/7.mp4' },
  { id: 'V8', label: '自動化測試與出貨準備', description: '燒機測試與出貨前最終檢驗流程', module: '模組 8', src: '/videos/8.mp4' },
];

const VideoCenter: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = chapters[currentIdx];

  useEffect(() => {
    if (current.src && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [currentIdx]);

  const togglePlay = () => {
    if (!videoRef.current || !current.src) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (videoRef.current) videoRef.current.requestFullscreen?.();
  };

  return (
    <section id="video-center" className="py-24 px-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-center mb-14"
      >
        <span className="text-accent-green text-sm font-mono tracking-widest uppercase">Video Showcase</span>
        <h2 className="text-3xl md:text-4xl font-bold mt-2 text-text-primary">影片展示中心</h2>
        <p className="text-text-muted mt-3">掛載您的 MP4 影片，展示各模組實際操作流程</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main Player */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-white/10 bg-surface">
          <div className="relative bg-black aspect-video flex items-center justify-center">
            {current.src ? (
              <video
                ref={videoRef}
                src={current.src}
                className="w-full h-full object-contain"
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 select-none">
                <div className="p-5 rounded-full bg-white/5 border border-white/10 mb-4">
                  <Video size={48} className="text-text-muted" />
                </div>
                <div className="text-accent-blue font-mono text-xl font-bold mb-1">{current.id}</div>
                <div className="text-text-primary font-semibold text-lg mb-2">{current.label}</div>
                <div className="text-text-muted text-sm max-w-xs">{current.description}</div>
                <div className="mt-4 px-3 py-1.5 rounded-full border border-accent-blue/30 text-accent-blue text-xs font-mono">
                  待掛載 MP4 — 請將影片路徑填入 src
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 flex items-center justify-between border-t border-white/10">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-text-primary disabled:opacity-40" disabled={!current.src}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button onClick={toggleMute} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-text-primary">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
            <div className="flex-1 px-4">
              <div className="font-medium text-sm text-text-primary">{current.label}</div>
              <div className="text-text-muted text-xs">{current.module}</div>
            </div>
            <button onClick={handleFullscreen} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-text-primary" disabled={!current.src}>
              <Maximize size={20} />
            </button>
          </div>
        </div>

        {/* Chapter List */}
        <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-text-primary text-sm">章節選單</h3>
            <p className="text-text-muted text-xs mt-1">{chapters.length} 支影片</p>
          </div>
          <div className="overflow-y-auto max-h-[420px] divide-y divide-white/5">
            {chapters.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => { setCurrentIdx(idx); setIsPlaying(false); }}
                className={`w-full text-left p-4 transition-all duration-200 ${currentIdx === idx
                  ? 'bg-accent-blue/10 border-l-2 border-accent-blue'
                  : 'hover:bg-white/5 border-l-2 border-transparent'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-xs font-bold ${currentIdx === idx ? 'text-accent-blue' : 'text-text-muted'}`}>{ch.id}</span>
                  {!ch.src && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-warning/30 text-warning bg-warning/5">待上傳</span>
                  )}
                </div>
                <div className="text-sm font-medium text-text-primary leading-snug">{ch.label}</div>
                <div className="text-text-muted text-xs mt-0.5">{ch.module}</div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default VideoCenter;
