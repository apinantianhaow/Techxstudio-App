'use client';

import { useState } from 'react';
import { Star, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StarRatingInput from '@/components/ui/StarRatingInput';
import StarRating from '@/components/ui/StarRating';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProductReviews({ productId, reviews = [] }) {
  const { isLoggedIn, authFetch } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error('กรุณาเลือกคะแนน'); return; }

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, title, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLocalReviews([{ ...data.review, users: { full_name: 'คุณ' } }, ...localReviews]);
      setShowForm(false);
      setRating(0);
      setTitle('');
      setComment('');
      toast.success('ส่งรีวิวเรียบร้อยแล้ว ⭐');
    } catch (err) {
      toast.error(err.message || 'ส่งรีวิวไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg section-title text-surface-800 dark:text-surface-200">
          รีวิวจากลูกค้า
        </h3>
        {isLoggedIn && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            {showForm ? 'ยกเลิก' : 'เขียนรีวิว'}
          </motion.button>
        )}
      </div>

      {/* Review form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="glass-card p-4 rounded-xl space-y-3 overflow-hidden"
          >
            <div>
              <label className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1 block">คะแนน</label>
              <StarRatingInput value={rating} onChange={setRating} />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="หัวข้อรีวิว (ไม่บังคับ)"
              className="w-full px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="แชร์ประสบการณ์ของคุณ..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={submitting}
              className="gradient-primary text-white px-5 py-2 rounded-lg text-sm font-semibold
                flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Review list */}
      <div className="space-y-3">
        {localReviews.length === 0 ? (
          <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-6">ยังไม่มีรีวิว</p>
        ) : (
          localReviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                    {review.users?.full_name || 'ผู้ใช้'}
                  </p>
                  <p className="text-[10px] text-surface-400">{formatDate(review.created_at)}</p>
                </div>
                <StarRating rating={review.rating} showCount={false} size="xs" />
              </div>
              {review.title && (
                <p className="font-semibold text-sm text-surface-700 dark:text-surface-300 mb-1">{review.title}</p>
              )}
              {review.comment && (
                <p className="text-sm text-surface-500 dark:text-surface-400">{review.comment}</p>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
