import React, { useEffect, useState, useRef } from 'react';
import { useInView, useSpring, useMotionValue } from 'framer-motion';

interface KpiCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
}

const KpiCounter: React.FC<KpiCounterProps> = ({ target, suffix = '', prefix = '', decimals = 0, duration = 2000 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState('0');
  
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
    duration: duration,
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(target);
    }
  }, [isInView, target, motionValue]);

  useEffect(() => {
    return springValue.onChange((latest) => {
      setDisplayValue(latest.toFixed(decimals));
    });
  }, [springValue, decimals]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {prefix}{displayValue}{suffix}
    </span>
  );
};

export default KpiCounter;
