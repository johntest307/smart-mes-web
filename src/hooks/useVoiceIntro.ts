import { useEffect, useCallback, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'voiceIntroEnabled';

const ROUTE_KEY: Record<string, string> = {
  '/': 'home', '/modules': 'modules', '/video': 'video',
  '/dashboard': 'dashboard', '/monitor': 'monitor', '/yield': 'yield',
  '/cost': 'cost', '/guide': 'guide',
};

const LANG_MAP: Record<string, string> = {
  'zh-TW': 'zh-TW', en: 'en-US', ja: 'ja-JP', vi: 'vi-VN',
};

const FEMALE_VOICES: Record<string, string[]> = {
  'zh-TW': ['Microsoft Hanhan', 'Google 國語（臺灣）', 'Mei-Jia', 'YunJing', 'Yating'],
  'en-US': ['Google UK English Female', 'Microsoft Zira', 'Samantha', 'Google US English'],
  'en-GB': ['Google UK English Female', 'Microsoft Hazel', 'Samantha'],
  'ja-JP': ['Microsoft Haruka', 'Google 日本語', 'Kyoko'],
  'vi-VN': [],
};

export function useVoiceIntro() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const prevPath = useRef(location.pathname);
  const [voicesReady, setVoicesReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { setVoicesReady(true); return; }
    const handler = () => { setVoicesReady(true); };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', handler);
  }, []);

  const speak = useCallback((path: string) => {
    const key = ROUTE_KEY[path];
    if (!key) return;
    const text = t(`voiceIntro.${key}`);
    if (!text || text === `voiceIntro.${key}`) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_MAP[i18n.language] || i18n.language;
    u.rate = 0.9; u.pitch = 1.1;
    pickFemale(u);
    window.speechSynthesis.speak(u);
  }, [t, i18n.language]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      if (next) speak(prevPath.current);
      else window.speechSynthesis?.cancel();
      return next;
    });
  }, [speak]);

  useEffect(() => {
    prevPath.current = location.pathname;
    if (!enabled || !voicesReady) return;
    speak(location.pathname);
  }, [location.pathname, enabled, voicesReady, speak]);

  return { enabled, toggle };
}

function pickFemale(utterance: SpeechSynthesisUtterance) {
  const voices = window.speechSynthesis?.getVoices() || [];
  if (!voices.length) return;

  const preferred = FEMALE_VOICES[utterance.lang] || FEMALE_VOICES[utterance.lang.split('-')[0]] || [];
  const matched = voices.filter(v => v.lang.startsWith(utterance.lang));

  // Try exact name match from per-language preference list
  for (const name of preferred) {
    const found = voices.find(v => v.name.includes(name));
    if (found) { utterance.voice = found; return; }
  }

  if (matched.length === 0) return;

  // Prefer non-default, higher-quality voices from Google/Microsoft
  const branded = matched.filter(v => v.name.includes('Google') || v.name.includes('Microsoft'));
  if (branded.length) { utterance.voice = branded[0]; return; }

  // Pick last (usually highest-index = best quality in browser lists)
  utterance.voice = matched[matched.length - 1];
}
