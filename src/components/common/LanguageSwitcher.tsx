import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'zh-TW', label: '繁中' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本語' },
  { code: 'vi', label: 'Tiếng Việt' },
];

export default function LanguageSwitcher({ mobile }: { mobile?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('zh') ? 'zh-TW' : i18n.language?.startsWith('ja') ? 'ja' : i18n.language?.startsWith('vi') ? 'vi' : 'en';

  if (mobile) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10 mt-2 pt-3">
        <Globe size={16} className="text-text-muted" />
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`text-xs font-mono px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              current === lang.code
                ? 'bg-accent-blue/20 text-accent-blue font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 ml-2">
      <Globe size={16} className="text-text-muted" />
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
            current === lang.code
              ? 'bg-accent-blue/20 text-accent-blue font-semibold border border-accent-blue/30'
              : 'text-text-muted hover:text-text-primary hover:bg-white/10 border border-transparent'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
