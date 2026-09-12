import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Volume2, VolumeX, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useVoiceIntro } from '../../hooks/useVoiceIntro';
import { useAuth } from '../../contexts/AuthContext';
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const ROW1 = ['/', '/video', '/dashboard', '/monitor', '/yield', '/cost', '/guide', '/line', '/org', '/quality-tracking'];
const ROW2 = ['/mva', '/pc', '/temp-humidity', '/security', '/qrcode', '/mpi', '/msforms', '/repair-rate', '/bapm'];

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { enabled: voiceOn, toggle: toggleVoice } = useVoiceIntro();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.video'), path: '/video' },
    { name: t('nav.dashboard'), path: '/dashboard' },
    { name: t('nav.monitor'), path: '/monitor' },
    { name: t('nav.yield'), path: '/yield' },
    { name: t('nav.cost'), path: '/cost' },
    { name: t('nav.guide'), path: '/guide' },
    { name: t('nav.line'), path: '/line' },
    { name: t('nav.org'), path: '/org' },
    { name: t('nav.mva'), path: '/mva' },
    { name: t('nav.pc'), path: '/pc' },
    { name: t('nav.tempHumidity'), path: '/temp-humidity' },
    { name: t('nav.security'), path: '/security' },
    { name: t('nav.qrcode'), path: '/qrcode' },
    { name: 'MPI 文件', path: '/mpi' },
    { name: 'MSForms', path: '/msforms' },
    { name: '維修率異常', path: '/repair-rate' },
    { name: '品質追蹤', path: '/quality-tracking' },
    { name: '痛點分析', path: '/bapm' },
  ];

  const row1Links = navLinks.filter(l => ROW1.includes(l.path));
  const row2Links = navLinks.filter(l => ROW2.includes(l.path));

  return (
    <nav className={cn(
      'sticky top-0 z-50 transition-all duration-300',
      isScrolled ? 'bg-surface border-b border-white/10' : 'bg-transparent'
    )}>
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Row 1: Logo + Primary tabs + Controls */}
        <div className="flex items-center h-10">
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="h-10 w-24" style={{ background: 'url(/logo.png) center/contain no-repeat' }} />
          </Link>
          <div className="hidden md:flex items-center ml-4 gap-1">
            {row1Links.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  'px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap',
                  location.pathname === link.path
                    ? 'text-accent-blue bg-accent-blue/10'
                    : 'text-text-muted hover:text-accent-blue hover:bg-white/5'
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center ml-auto gap-1">
            <button
              onClick={toggleVoice}
              className={cn(
                'p-1.5 rounded transition-colors',
                voiceOn ? 'text-accent-blue hover:bg-accent-blue/10' : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              )}
              title={voiceOn ? 'Voice on' : 'Voice off'}
            >
              {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <LanguageSwitcher />
            {user && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title={t('nav.logout')}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
          <div className="-mr-2 flex md:hidden ml-auto">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-text-muted hover:text-white hover:bg-white/10 focus:outline-none"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {/* Row 2: Secondary tabs (production line tools) */}
        <div className="hidden md:flex items-center ml-[112px] -mt-1 pb-1 gap-1 border-t border-white/5">
          {row2Links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap',
                location.pathname === link.path
                  ? 'text-accent-green bg-accent-green/10'
                  : 'text-text-muted hover:text-accent-green hover:bg-white/5'
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-white/10 animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {row1Links.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'block px-3 py-2.5 rounded-md text-base font-medium',
                  location.pathname === link.path
                    ? 'text-accent-blue bg-accent-blue/10'
                    : 'text-text-muted hover:text-accent-blue hover:bg-white/5'
                )}
              >
                {link.name}
              </Link>
            ))}
            <div className="border-t border-white/10 mt-2 pt-2">
              <div className="px-3 py-1 text-[10px] text-text-muted uppercase tracking-wider">產線工具</div>
              {row2Links.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-sm font-medium',
                    location.pathname === link.path
                      ? 'text-accent-green bg-accent-green/10'
                      : 'text-text-muted hover:text-accent-green hover:bg-white/5'
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="border-t border-white/10 mt-3 pt-3 flex items-center gap-2">
              <button
                onClick={toggleVoice}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  voiceOn ? 'text-accent-blue' : 'text-text-muted'
                )}
              >
                {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <LanguageSwitcher mobile />
              {user && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <LogOut size={16} /> {t('nav.logout')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
