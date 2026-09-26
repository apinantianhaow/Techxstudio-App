'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';

export default function FlashSaleTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const { t } = useTranslation();

  useEffect(() => {
    const getEndTime = () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return end;
    };

    const updateTimer = () => {
      const now = new Date();
      const end = getEndTime();
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft({ hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-surface-400 font-medium mr-1">Ends in</span>
      <TimeBlock value={pad(timeLeft.hours)} />
      <span className="text-surface-300 text-xs">:</span>
      <TimeBlock value={pad(timeLeft.minutes)} />
      <span className="text-surface-300 text-xs">:</span>
      <TimeBlock value={pad(timeLeft.seconds)} />
    </div>
  );
}

function TimeBlock({ value }: { value: string }) {
  return (
    <div className="bg-surface-800 dark:bg-surface-100
      text-white dark:text-surface-900
      px-2 py-1 text-xs font-bold font-mono min-w-[28px] text-center">
      {value}
    </div>
  );
}
