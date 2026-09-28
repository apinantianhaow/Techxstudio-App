'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { errorMessage } from '@/lib/utils';
import type { OtpChallenge } from '@/types';

const spinner = 'h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent';

interface OtpStepProps {
  challenge: OtpChallenge;
  onVerified: () => void;
  onBack: () => void;
}

/** Step 2 of password sign-in: the 6-digit code from the email. */
export default function OtpStep({ challenge: initial, onVerified, onBack }: OtpStepProps) {
  const { verifyCode, resendCode } = useAuth();
  const { t } = useTranslation();
  const [challenge, setChallenge] = useState(initial);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useState(initial.resend_in);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const submit = async (value: string) => {
    if (verifying) return;
    setVerifying(true);
    try {
      await verifyCode(challenge.challenge_id, value);
      onVerified();
    } catch (err) {
      toast.error(errorMessage(err));
      setCode('');
      setVerifying(false);
    }
  };

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) submit(digits);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const next = await resendCode(challenge.challenge_id);
      setChallenge(next);
      setWait(next.resend_in);
      setCode('');
      toast.success(t('account.codeResent'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] bg-accent">
          <MailCheck className="h-8 w-8 text-white" strokeWidth={1.75} />
        </div>
        <h1 className="t-title text-ink">{t('account.checkEmail')}</h1>
        <p className="mt-2 text-[17px] text-ink-2">
          {t('account.codeSentTo')} <span className="font-semibold text-ink">{challenge.email}</span>
        </p>
      </div>

      <form onSubmit={(e: FormEvent) => { e.preventDefault(); submit(code); }} className="mt-10 space-y-3">
        <input
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          disabled={verifying}
          placeholder="••••••"
          aria-label={t('account.code')}
          className="field text-center font-mono text-[28px] tracking-[0.5em] tabular-nums"
        />
        <button type="submit" disabled={verifying || code.length !== 6} className="btn btn-primary btn-block !mt-6">
          {verifying ? <span className={spinner} /> : t('account.verify')}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3 text-[15px]">
        <button type="button" onClick={handleResend} disabled={wait > 0 || resending}
          className="link disabled:cursor-default disabled:text-ink-3 disabled:no-underline">
          {wait > 0 ? `${t('account.resendIn')} ${wait}${t('account.secondsShort')}` : t('account.resend')}
        </button>
        <button type="button" onClick={onBack} className="text-ink-2 hover:text-ink">
          {t('account.differentAccount')}
        </button>
      </div>
    </div>
  );
}
