'use client';

import { useState, type FormEvent } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StarRatingInput from '@/components/ui/StarRatingInput';
import StarRating from '@/components/ui/StarRating';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { formatDate, errorMessage } from '@/lib/utils';
import type { Review } from '@/types';
import { toast } from 'sonner';
import { toastIcons } from '@/components/ui/toastIcons';

const spinner = 'h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent';

export default function ProductReviews({ productId, reviews = [] }: { productId: string; reviews?: Review[] }) {
  const { user, isLoggedIn, authFetch } = useAuth();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
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

      setLocalReviews([{ ...data.review, user_id: user?.id ?? '', users: { username: user?.username, full_name: user?.full_name || 'You' } }, ...localReviews]);
      setShowForm(false);
      setRating(0);
      setTitle('');
      setComment('');
      toast.success(t('reviews.reviewSubmitted'), { icon: toastIcons.review });
    } catch (err) {
      toast.error(errorMessage(err) || t('reviews.reviewFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditTitle(review.title || '');
    setEditComment(review.comment || '');
  };

  const handleSaveEdit = async (reviewId: string) => {
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
      toast.success(t('reviews.reviewUpdated'), { icon: toastIcons.review });
    } catch (err) {
      toast.error(errorMessage(err) || t('reviews.reviewFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
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
      toast.error(errorMessage(err) || t('reviews.reviewFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const isOwner = (review: Review) => user && review.user_id === user.id;

  return (
    <section>
      <div className="flex items-end justify-between gap-4 border-b border-line pb-5">
        <h2 className="t-title text-ink">{t('reviews.title')}</h2>
        {isLoggedIn && (
          <button onClick={() => setShowForm(!showForm)} className="link text-[17px]">
            {showForm ? t('common.cancel') : t('reviews.writeReview')}
          </button>
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
            className="overflow-hidden"
          >
            <div className="mt-6 max-w-2xl space-y-4 rounded-card bg-canvas-alt p-6 dark:bg-card">
              <div>
                <label className="mb-2 block text-[14px] font-semibold text-ink">{t('compare.rating')}</label>
                <StarRatingInput value={rating} onChange={setRating} />
              </div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={t('reviews.reviewTitle')} className="field" />
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder={t('reviews.reviewComment')} rows={4} className="field resize-none" />
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? t('reviews.submitting') : t('reviews.submitReview')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Review list */}
      {localReviews.length === 0 ? (
        <p className="py-10 text-[17px] text-ink-2">{t('reviews.noReviews')}</p>
      ) : (
        <ul className="grid gap-x-14 md:grid-cols-2">
          {localReviews.map((review) => (
            <li key={review.id} className="border-b border-line py-6">
              {editingId === review.id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <StarRatingInput value={editRating} onChange={setEditRating} />
                    <button onClick={() => setEditingId(null)} className="icon-btn" aria-label={t('common.cancel')}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t('reviews.reviewTitle')} className="field" />
                  <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)}
                    placeholder={t('reviews.reviewComment')} rows={3} className="field resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(review.id)} disabled={saving} className="btn btn-primary btn-sm">
                      {saving ? <span className={spinner} /> : t('common.save')}
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn btn-tinted btn-sm">{t('common.cancel')}</button>
                  </div>
                </div>
              ) : (
                <>
                  <StarRating rating={review.rating} showCount={false} size="sm" />
                  {review.title && (
                    <p className="mt-3 text-[17px] font-semibold text-ink">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{review.comment}</p>
                  )}
                  <p className="mt-3 text-[12px] text-ink-3">
                    {review.users?.username ? `@${review.users.username}` : review.users?.full_name || 'User'} · {formatDate(review.created_at)}
                  </p>
                  {isOwner(review) && (
                    <div className="mt-3 flex items-center gap-5 text-[14px]">
                      <button onClick={() => handleEdit(review)} className="link inline-flex items-center gap-1">
                        <Pencil className="h-3.5 w-3.5" /> {t('reviews.editReview')}
                      </button>
                      <button onClick={() => handleDelete(review.id)} disabled={deletingId === review.id}
                        className="inline-flex items-center gap-1 text-danger hover:underline disabled:opacity-50">
                        {deletingId === review.id ? <span className={spinner} /> : <Trash2 className="h-3.5 w-3.5" />}
                        {t('reviews.deleteReview')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
