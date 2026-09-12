import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import KpiCounter from '../ui/KpiCounter';

const kpiItems = [
  { prefix: '+', target: 23, suffix: '%', labelKey: 'home.kpiFpy', color: '#5BA87A' },
  { prefix: '-', target: 45, suffix: '%', labelKey: 'home.kpiChangeover', color: '#4A90C7' },
  { prefix: '×', target: 10, suffix: '', labelKey: 'home.kpiTraceability', color: '#C9975E' },
  { prefix: '-', target: 98, suffix: '%', labelKey: 'home.kpiPokayoke', color: '#E8A838' },
];

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Animated Grid Background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(74,144,199,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,144,199,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(201,151,94,0.12) 0%, transparent 60%)'
      }} />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold mb-3 leading-tight"
          style={{
            background: 'linear-gradient(135deg, #4A90C7 0%, #C9975E 50%, #5BA87A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {t('home.heroTitle')}
          <br />
          <span className="text-text-primary">{t('home.heroHighlight')}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-text-muted text-lg md:text-xl max-w-3xl mx-auto mb-6 leading-relaxed lang-adj"
        >
          <Trans i18nKey="home.heroDesc" components={{ bold: <span className="text-accent-blue font-semibold" /> }} />
        </motion.p>

        {/* KPI Grid */}
        <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {kpiItems.map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
              className="relative rounded-xl p-5 border border-white/10 bg-surface overflow-hidden"
            >
              <div className="absolute inset-0 opacity-10 rounded-xl" style={{ background: `radial-gradient(circle at center, ${kpi.color}, transparent)` }} />
              <div className="relative z-10">
                <div className="text-3xl font-bold font-mono" style={{ color: kpi.color }}>
                  {isInView ? <KpiCounter target={kpi.target} prefix={kpi.prefix} suffix={kpi.suffix} /> : '0'}
                </div>
                <div className="text-text-muted text-xs mt-1">{t(kpi.labelKey)}</div>
              </div>
            </motion.div>
          ))}
        </div>


      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-muted"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <ChevronDown size={28} />
      </motion.div>
    </section>
  );
};

export default HeroSection;
