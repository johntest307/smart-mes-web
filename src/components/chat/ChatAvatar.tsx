import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatAvatarProps {
  size?: 'sm' | 'normal' | 'lg';
  isMuted?: boolean;
  onToggleMute?: () => void;
  audioUnlocked?: boolean;
  onFirstPlay?: () => void;
  shouldScale?: boolean;
  onVideoEnded?: () => void;
  onClick?: () => void;
}

const VIDEO_BASE = 'https://cdn.jsdelivr.net/gh/jojoyo37198/audio@48a3cee0d6afe22f99ecf63fdbc61d39e55cfb14/Avator';

function getVideoUrl(language: string): string {
  if (language.startsWith('zh')) return `${VIDEO_BASE}ZH.mp4`;
  if (language.startsWith('ja')) return `${VIDEO_BASE}JA.mp4`;
  return `${VIDEO_BASE}EN.mp4`;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  normal: 'w-12 h-12',
  lg: 'w-16 h-16 md:w-20 md:h-20',
};

const ChatAvatar: React.FC<ChatAvatarProps> = ({
  size = 'normal',
  isMuted = true,
  onToggleMute,
  audioUnlocked = false,
  onFirstPlay,
  shouldScale = false,
  onVideoEnded,
  onClick,
}) => {
  const { i18n } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const SCALE_DURATION = 1000;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      if (audioUnlocked && !isMuted) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [i18n.language, isMuted, audioUnlocked]);

  const handleVideoClick = () => {
    if (!audioUnlocked && videoRef.current && onFirstPlay) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
      onFirstPlay();
    }
    onClick?.();
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-accent-blue to-accent-purple shadow-lg relative group transition-transform ${shouldScale ? 'scale-150' : 'scale-100'}`}
      style={{ transitionDuration: `${SCALE_DURATION}ms` }}
    >
      <video
        ref={videoRef}
        src={getVideoUrl(i18n.language)}
        autoPlay
        muted={isMuted}
        playsInline
        className="w-full h-full object-cover cursor-pointer"
        onClick={handleVideoClick}
        onEnded={onVideoEnded}
      />
      {onToggleMute && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          className="absolute bottom-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full transition-all"
        >
          {isMuted ? <VolumeX className="w-3 h-3 text-white" /> : <Volume2 className="w-3 h-3 text-white" />}
        </button>
      )}
    </div>
  );
};

export default ChatAvatar;
