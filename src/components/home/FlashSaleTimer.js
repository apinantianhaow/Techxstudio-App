'use client';

import { useState, useEffect } from 'react';
import { Timer, Zap } from 'lucide-react';

export default function FlashSaleTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Set flash sale end to midnight tonight
    const getEndTime = () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return end;
    };

    const updateTimer = () => {
      const now = new Date();
      const end = getEndTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

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
        <span className="text-sm font-bold">Flash Sale</span>
      </div>

      <div className="flex items-center gap-1">
        <TimeBlock value={pad(timeLeft.hours)} label="ชม." />
        <span className="text-error font-bold text-lg animate-pulse">:</span>
        <TimeBlock value={pad(timeLeft.minutes)} label="นาที" />
        <span className="text-error font-bold text-lg animate-pulse">:</span>
        <TimeBlock value={pad(timeLeft.seconds)} label="วินาที" />
      </div>
    </div>
  );
}

function TimeBlock({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900
        rounded-lg px-2.5 py-1 text-sm font-bold font-mono min-w-[36px] text-center">
        {value}
      </div>
    </div>
  );
}
