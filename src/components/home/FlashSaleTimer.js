'use client';

import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
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
      const diff = end - now;
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

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-error">
        <Zap className="w-4 h-4 fill-current" />
        <span className="text-sm font-bold hidden sm:inline">{t('home.flashSale')}</span>
      </div>
      <div className="flex items-center gap-1">
        <TimeBlock value={pad(timeLeft.hours)} />
        <span className="text-surface-400 font-medium text-sm">:</span>
        <TimeBlock value={pad(timeLeft.minutes)} />
        <span className="text-surface-400 font-medium text-sm">:</span>
        <TimeBlock value={pad(timeLeft.seconds)} />
      </div>
    </div>
  );
}

function TimeBlock({ value }) {
  return (
    <div className="bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900
      rounded-lg px-2.5 py-1 text-sm font-bold font-mono min-w-[36px] text-center
      shadow-sm">
      {value}
    </div>
  );
}
