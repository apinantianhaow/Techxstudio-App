'use client';

import { useState } from 'react';
import { Star, Send, User, Pencil, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StarRatingInput from '@/components/ui/StarRatingInput';
import StarRating from '@/components/ui/StarRating';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProductReviews({ productId, reviews = [] }) {
  const { user, isLoggedIn, authFetch } = useAuth();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error(t('reviews.selectRating')); return; }

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, title, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLocalReviews([{ ...data.review, user_id: user?.id, users: { full_name: user?.full_name || 'You' } }, ...localReviews]);
      setShowForm(false);
      setRating(0);
      setTitle('');
      setComment('');
      toast.success(t('reviews.reviewSubmitted'));
    } catch (err) {
      toast.error(err.message || t('reviews.reviewFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditTitle(review.title || '');
    setEditComment(review.comment || '');
  };

  const handleSaveEdit = async (reviewId) => {
    if (editRating === 0) { toast.error(t('reviews.selectRating')); return; }
    setSaving(true);
    try {
      const res = await authFetch(`/api/products/${productId}/reviews`, {
        method: 'PUT',
        body: JSON.stringify({ reviewId, rating: editRating, title: editTitle, comment: editComment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLocalReviews((prev) =>
        prev.map((r) => r.id === reviewId
          ? { ...r, rating: editRating, title: editTitle, comment: editComment }
          : r
        )
      );
      setEditingId(null);
      toast.success(t('reviews.reviewUpdated'));
    } catch (err) {
      toast.error(err.message || t('reviews.reviewFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reviewId) => {
    setDeletingId(reviewId);
    try {
      const res = await authFetch(`/api/products/${productId}/reviews?reviewId=${reviewId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLocalReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success(t('reviews.reviewDeleted'));
    } catch (err) {
      toast.error(err.message || t('reviews.reviewFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const isOwner = (review) => user && review.user_id === user.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg section-title text-surface-800 dark:text-surface-200">
          {t('reviews.title')}
        </h3>
        {isLoggedIn && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            {showForm ? t('common.cancel') : t('reviews.writeReview')}
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
            className="glass-card p-4  space-y-3 overflow-hidden"
          >
            <div>
              <label className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1 block">{t('compare.rating')}</label>
              <StarRatingInput value={rating} onChange={setRating} />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('reviews.reviewTitle')}
              className="w-full px-3 py-2  bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('reviews.reviewComment')}
              rows={3}
              className="w-full px-3 py-2  bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={submitting}
              className="gradient-primary text-white px-5 py-2  text-sm font-semibold
                flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? t('reviews.submitting') : t('reviews.submitReview')}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Review list */}
      <div className="space-y-3">
        {localReviews.length === 0 ? (
          <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-6">{t('reviews.noReviews')}</p>
        ) : (
          localReviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 "
            >
              {editingId === review.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-surface-600 dark:text-surface-400">{t('compare.rating')}</label>
                    <button onClick={() => setEditingId(null)} className="text-surface-400 hover:text-surface-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <StarRatingInput value={editRating} onChange={setEditRating} />
                  <input
                    type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t('reviews.reviewTitle')}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                      text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                  <textarea
                    value={editComment} onChange={(e) => setEditComment(e.target.value)}
                    placeholder={t('reviews.reviewComment')} rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                      text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleSaveEdit(review.id)} disabled={saving}
                      className="gradient-primary text-white px-4 py-2 rounded-lg text-sm font-semibold
                        flex items-center gap-1.5 disabled:opacity-50">
                      {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                        <><Send className="w-3.5 h-3.5" /> {t('common.save')}</>
                      )}
                    </motion.button>
                    <button onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm font-medium
                        text-surface-600 dark:text-surface-400">
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8  bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                        {review.users?.full_name || 'User'}
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
                  {/* Edit / Delete buttons for own reviews */}
                  {isOwner(review) && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-surface-100 dark:border-surface-800">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleEdit(review)}
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400
                          hover:underline">
                        <Pencil className="w-3 h-3" /> {t('reviews.editReview')}
                      </motion.button>
                      <span className="text-surface-200 dark:text-surface-700">|</span>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDelete(review.id)}
                        disabled={deletingId === review.id}
                        className="flex items-center gap-1 text-xs font-medium text-error hover:underline
                          disabled:opacity-50">
                        {deletingId === review.id ? (
                          <div className="w-3 h-3 border-2 border-error border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        {t('reviews.deleteReview')}
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
