import React, { memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine, ResponsiveContainer
} from 'recharts';
import type { TorqueDataPoint } from '../../hooks/useDashboardData';

interface TorqueChartProps {
  data: TorqueDataPoint[];
}

const CustomDot = (props: { cx?: number; cy?: number; payload?: TorqueDataPoint }) => {
  const { cx, cy, payload } = props;
  if (!payload || payload.status === 'ok') return null;
  return <circle cx={cx} cy={cy} r={5} fill="#E8A838" stroke="#E8A838" strokeOpacity={0.5} strokeWidth={2} />;
};

const TorqueChart: React.FC<TorqueChartProps> = memo(({ data }) => {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" tick={{ fill: '#8896A6', fontSize: 9 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 10]} tick={{ fill: '#8896A6', fontSize: 10 }} tickLine={false} axisLine={false} unit=" Nm" />
          <Tooltip
            contentStyle={{ background: '#1A232E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#8896A6' }}
            itemStyle={{ color: '#4A90C7' }}
            formatter={(value: unknown, _name: unknown, props: { payload?: TorqueDataPoint }) => {
              const v = value as number;
              const status = props.payload?.status;
              return [`${v} Nm (${status === 'ok' ? '✅ 合格' : '❌ 異常'})`, `工站 ${props.payload?.station}`];
            }}
          />
          <ReferenceArea y1={3.5} y2={5.5} fill="#5BA87A" fillOpacity={0.06} />
          <ReferenceLine y={5.5} stroke="#D9534F" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: '上限', fill: '#D9534F', fontSize: 10 }} />
          <ReferenceLine y={3.5} stroke="#E8A838" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: '下限', fill: '#E8A838', fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#4A90C7"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 4, fill: '#4A90C7' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default TorqueChart;
