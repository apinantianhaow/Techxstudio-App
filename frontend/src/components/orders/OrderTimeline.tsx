'use client';

import { Check } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import type { OrderStatus } from '@/types';

export default function OrderTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const { t } = useTranslation();

  const STEPS = [
    { status: 'confirmed', label: t('orders.timeline.confirmed') },
    { status: 'processing', label: t('orders.timeline.processing') },
    { status: 'shipped', label: t('orders.timeline.shipped') },
    { status: 'delivered', label: t('orders.timeline.delivered') },
  ];

  const currentIndex = STEPS.findIndex(s => s.status === currentStatus);

  return (
    <div>
      <div className="relative mx-[12.5%] h-1 rounded-full bg-fill-strong">
        <div className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${Math.max(0, (currentIndex / (STEPS.length - 1)) * 100)}%` }} />
      </div>
      <ol className="-mt-2.5 grid grid-cols-4">
        {STEPS.map((step, i) => {
          const isComplete = i <= currentIndex;
          return (
            <li key={step.status} className="flex flex-col items-center">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-card
                ${isComplete ? 'bg-accent text-white' : 'bg-fill-strong'}`}>
                {isComplete && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              <span className={`mt-2 text-center text-[12px] ${i === currentIndex ? 'font-semibold text-ink' : isComplete ? 'text-ink' : 'text-ink-3'}`}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
