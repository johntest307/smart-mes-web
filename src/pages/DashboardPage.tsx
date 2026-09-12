import React from 'react';
import { motion } from 'framer-motion';
import SkillHeatMap from '../components/dashboard/SkillHeatMap';
import ChartContainer from '../components/common/ChartContainer';
import GuideLink from '../components/ui/GuideLink';

const SkillMatrixPage: React.FC = () => {
  const handleTimeRange = () => {};

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-xl font-bold text-text-primary">員工技能矩陣</h1>
          <p className="text-[11px] font-mono text-text-muted mt-0.5">Skill Matrix — 員工多能工能力與站點等級分佈</p>
        </motion.div>

        <div className="flex items-center gap-4 mb-4">
          <GuideLink section="skill-matrix" label="技能矩陣說明" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="技能矩陣熱圖" onTimeRangeChange={handleTimeRange}>
            <SkillHeatMap mode="heatmap" />
          </ChartContainer>
          <ChartContainer title="技能矩陣分析" onTimeRangeChange={handleTimeRange}>
            <SkillHeatMap mode="analysis" />
          </ChartContainer>
        </div>

      </div>
    </div>
  );
};

export default SkillMatrixPage;
