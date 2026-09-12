import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { starContent, videoToModule, type SimMetric } from '../../data/starContent';
import { modulesData } from '../../data/modules';

function MetricBars({ metrics, delay = 0 }: { metrics: SimMetric[]; delay?: number }) {
  if (!metrics.length) return null;
  return (
    <div className="flex gap-3 mt-2">
      {metrics.map((m, i) => {
        const pct = Math.min((m.value / (m.max ?? 100)) * 100, 100);
        const barColor = m.color || '#4A90C7';
        return (
          <div key={i} className="flex-1 min-w-[90px]">
            <div className="flex items-baseline justify-between mb-0.5">
              <span className="text-[9px] text-gray-400 truncate mr-1">{m.label}</span>
              <span className="text-[10px] font-bold text-white whitespace-nowrap">{m.value}{m.unit}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, delay: delay + i * 0.12, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: barColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const layers = [
  {
    labelKey: 'arch.perception',
    sublabel: 'Perception Layer',
    color: '#4A90C7',
    border: 'border-[#4A90C7]/40',
    bg: 'bg-[#4A90C7]/5',
    itemOffset: 0,
    videos: ['/arch/1.mp4', '/arch/2.mp4'],
  },
  {
    labelKey: 'arch.execution',
    sublabel: 'Execution Layer',
    color: '#C9975E',
    border: 'border-[#C9975E]/40',
    bg: 'bg-[#C9975E]/5',
    itemOffset: 4,
    videos: ['/arch/3.mp4', '/arch/5.mp4'],
  },
  {
    labelKey: 'arch.data',
    sublabel: 'Data & Traceability Layer',
    color: '#5BA87A',
    border: 'border-[#5BA87A]/40',
    bg: 'bg-[#5BA87A]/5',
    itemOffset: 8,
    videos: ['/arch/4.mp4', '/arch/6.mp4'],
  },
];

const ArchDiagram: React.FC = () => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [active, setActive] = useState(false);
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isInView) setActive(true);
  }, [isInView]);

  const openModal = useCallback((src: string) => {
    setModalSrc(src);
  }, []);

  const closeModal = useCallback(() => {
    setModalSrc(null);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (modalSrc) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modalSrc, closeModal]);

  return (
    <section id="arch" className="py-24 px-4 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-center mb-14"
      >
        <span className="text-accent-blue text-sm font-mono tracking-widest uppercase">Smart Factory Panorama</span>
        <h2 className="text-3xl md:text-4xl font-bold mt-2 text-text-primary">{t('arch.title')}</h2>
        <p className="text-text-muted mt-3 max-w-2xl mx-auto">{t('arch.subtitle')}</p>
      </motion.div>

      <div ref={ref} className="relative flex flex-col gap-2">
        {layers.map((layer, i) => (
          <React.Fragment key={i}>
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className={`relative rounded-2xl border ${layer.border} ${layer.bg} p-6 group hover:shadow-lg transition-shadow duration-300`}
              style={{ boxShadow: isInView ? `0 0 20px ${layer.color}20` : 'none' }}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="min-w-[160px]">
                  <div className="text-lg font-bold" style={{ color: layer.color }}>{t(layer.labelKey)}</div>
                  <div className="text-text-muted text-xs font-mono">{layer.sublabel}</div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[0, 1, 2, 3].map((j) => (
                    <motion.span
                      key={j}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ delay: i * 0.2 + j * 0.08 + 0.3 }}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-white/10 bg-white/5 text-text-primary hover:border-white/30 transition-colors cursor-default"
                    >
                      {t(`arch.items.${layer.itemOffset + j}`)}
                    </motion.span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                {layer.videos.map((src, k) => (
                  <motion.button
                    key={k}
                    onClick={() => openModal(src)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: i * 0.2 + 0.4 + k * 0.1 }}
                    className="block p-0 rounded-lg overflow-hidden border border-white/10 bg-white/5 cursor-pointer hover:ring-2 hover:ring-accent-blue/50 transition-all focus:outline-none"
                  >
                    {active ? (
                      <video
                        src={src}
                        autoPlay
                        muted
                        playsInline
                        loop
                        className="w-[33.8rem] h-[23.66rem] object-contain pointer-events-none bg-black/20"
                      />
                    ) : (
                      <div className="w-[33.8rem] h-[23.66rem] bg-black/20 rounded-lg" />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </React.Fragment>
        ))}
      </div>

      {modalSrc && (() => {
        const mIdx = videoToModule[modalSrc];
        const star = mIdx !== undefined ? starContent[mIdx] : null;
        const mod = mIdx !== undefined ? modulesData[mIdx] : null;
        return (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm"
            onClick={closeModal}
          >
            <div className="relative flex items-center max-w-[92vw] max-h-[90vh] gap-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0">
                <video
                  ref={modalVideoRef}
                  src={modalSrc}
                  autoPlay
                  playsInline
                  controls
                  className="max-w-[48vw] max-h-[85vh] rounded-lg shadow-2xl"
                />
              </div>
              {star && mod && (
                <div className="w-[36vw] max-h-[85vh] overflow-y-auto pr-2 text-white">
                  <div className="flex items-center gap-3 mb-5">
                    <mod.icon className="w-6 h-6" style={{ color: mod.hex }} />
                    <h3 className="text-2xl font-bold">{mod.title}</h3>
                  </div>
                  <div className="space-y-4 text-sm leading-relaxed">
                    <div>
                      <div className="flex items-center gap-2 text-accent-blue font-semibold mb-1">
                        <span>Situation</span><span className="text-text-muted">| 情境</span>
                      </div>
                      <p className="text-gray-300">{star.situation}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-accent-green font-semibold mb-1">
                        <span>Task</span><span className="text-text-muted">| 任務</span>
                      </div>
                      <p className="text-gray-300">{star.task}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[#FFD700] font-semibold mb-1">
                        <span>Action</span><span className="text-text-muted">| 行動</span>
                      </div>
                      <p className="text-gray-300">{star.action}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[#FF6B35] font-semibold mb-1">
                        <span>Result</span><span className="text-text-muted">| 成果</span>
                      </div>
                      <p className="text-gray-300">{star.result}</p>
                      <MetricBars metrics={star.resultMetrics} delay={0.3} />
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <div className="flex items-center gap-2 text-[#00D4AA] font-semibold mb-1">
                        <span>ROI</span><span className="text-text-muted">| 效益說明</span>
                      </div>
                      <p className="text-gray-300">{star.roi}</p>
                      <MetricBars metrics={star.roiMetrics} delay={0.5} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[#7B68EE] font-semibold mb-1">
                        <span>Coverage</span><span className="text-text-muted">| 涵蓋率</span>
                      </div>
                      <p className="text-gray-300">{star.coverage}</p>
                      <MetricBars metrics={star.coverageMetrics} delay={0.7} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[#FF69B4] font-semibold mb-1">
                        <span>Simulator</span><span className="text-text-muted">| 模擬數據</span>
                      </div>
                      <p className="text-gray-300">{star.simulator}</p>
                      <MetricBars metrics={star.simMetrics} delay={0.9} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[#FFA500] font-semibold mb-1">
                        <span>Overall</span><span className="text-text-muted">| 整體效益</span>
                      </div>
                      <p className="text-gray-300">{star.overallBenefit}</p>
                      <MetricBars metrics={star.overallMetrics} delay={1.1} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={closeModal}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <X size={28} />
            </button>
          </div>
        );
      })()}
    </section>
  );
};

export default ArchDiagram;
