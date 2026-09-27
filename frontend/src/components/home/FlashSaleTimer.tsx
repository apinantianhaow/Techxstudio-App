'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';

export default function FlashSaleTimer({ tone = 'default' }: { tone?: 'default' | 'dark' }) {
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
  const dark = tone === 'dark';

  return (
    <div className="flex items-center gap-1.5" role="timer">
      <span className={`mr-1.5 text-[14px] ${dark ? 'text-white/60' : 'text-ink-2'}`}>{t('timer.endsIn')}</span>
      {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((v, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className={dark ? 'text-white/40' : 'text-ink-3'}>:</span>}
          <span className={`min-w-[2.25rem] rounded-lg px-2 py-1 text-center text-[15px] font-semibold tabular-nums
            ${dark ? 'bg-white/12 text-white' : 'bg-card text-ink shadow-card'}`}>
            {pad(v)}
          </span>
        </span>
      ))}
    </div>
  );
}
