'use client';

import { Package, Truck, CheckCircle2, MapPin, Clock } from 'lucide-react';

const STEPS = [
  { status: 'confirmed', label: 'ยืนยันแล้ว', icon: CheckCircle2 },
  { status: 'processing', label: 'กำลังเตรียมสินค้า', icon: Package },
  { status: 'shipped', label: 'กำลังจัดส่ง', icon: Truck },
  { status: 'delivered', label: 'จัดส่งสำเร็จ', icon: MapPin },
];

export default function OrderTimeline({ currentStatus }) {
  const currentIndex = STEPS.findIndex(s => s.status === currentStatus);

  return (
    <div className="flex items-center justify-between relative">
      {/* Progress line */}
      <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-surface-200 dark:bg-surface-700">
        <div
          className="h-full gradient-primary transition-all duration-500"
          style={{ width: `${Math.max(0, (currentIndex / (STEPS.length - 1)) * 100)}%` }}
        />
      </div>

      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isComplete = i <= currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.status} className="relative flex flex-col items-center z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
              ${isComplete
                ? 'gradient-primary text-white shadow-md'
                : 'bg-surface-200 dark:bg-surface-700 text-surface-400'
              } ${isCurrent ? 'ring-4 ring-primary-500/20 scale-110' : ''}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <p className={`text-[10px] mt-1.5 font-medium text-center max-w-[70px]
              ${isComplete ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400'}`}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
