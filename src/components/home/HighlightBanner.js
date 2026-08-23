'use client';

import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { motion } from 'framer-motion';
import 'swiper/css';
import 'swiper/css/pagination';

const BANNERS = [
  {
    id: 1,
    title: 'iPhone 16 Pro Max',
    subtitle: 'ชิป A18 Pro สุดล้ำ',
    desc: 'ระบบกล้อง Pro ที่ดีที่สุด พร้อม USB-C ที่เร็วกว่าเดิม',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    emoji: '📱',
  },
  {
    id: 2,
    title: 'iPad Pro M4',
    subtitle: 'บางเฉียบ ทรงพลังสุดขีด',
    desc: 'จอ Ultra Retina XDR พร้อมชิป M4 ใหม่ล่าสุด',
    gradient: 'from-blue-600 via-cyan-600 to-teal-600',
    emoji: '💻',
  },
  {
    id: 3,
    title: 'Flash Sale 🔥',
    subtitle: 'ลดสูงสุด 15%',
    desc: 'สินค้า Apple แท้ 100% ราคาพิเศษ เฉพาะวันนี้',
    gradient: 'from-rose-600 via-pink-600 to-fuchsia-600',
    emoji: '🏷️',
  },
];

export default function HighlightBanner() {
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        className="rounded-2xl"
      >
        {BANNERS.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div className={`relative bg-gradient-to-br ${banner.gradient} p-6 md:p-10 min-h-[200px] md:min-h-[280px] flex items-center`}>
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

              <div className="relative z-10 flex-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-white/80 text-sm font-medium mb-1">{banner.subtitle}</p>
                  <h2 className="text-white text-2xl md:text-4xl font-bold mb-2">{banner.title}</h2>
                  <p className="text-white/70 text-sm md:text-base max-w-md">{banner.desc}</p>
                  <button className="mt-4 px-6 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-full
                    text-sm font-semibold hover:bg-white/30 transition-colors border border-white/30">
                    ดูเพิ่มเติม →
                  </button>
                </motion.div>
              </div>

              <div className="hidden md:flex items-center justify-center text-8xl opacity-30 select-none">
                {banner.emoji}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
