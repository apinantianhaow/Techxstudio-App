'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, MailCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/ui/Spinner';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { errorMessage } from '@/lib/utils';
import type { OtpChallenge } from '@/types';

// AdminShell redirects to /products once a session starts.
export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      setChallenge(await login(email, password));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    try {
      await loginWithGoogle(credential);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas-alt px-5 py-16">
      <div className="w-full max-w-[400px]">
        {challenge ? (
          <CodeStep challenge={challenge} onBack={() => { setChallenge(null); setPassword(''); }} />
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] bg-ink">
                <span className="text-[22px] font-semibold tracking-tight text-canvas">TX</span>
              </div>
              <h1 className="t-title">TechXStudio Admin</h1>
              <p className="mt-2 text-[15px] text-ink-2">Sign in with an admin account.</p>
            </div>

            <div className="card mt-8 space-y-4 p-6">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required autoComplete="email" autoFocus className="field" />
                </div>
                <div>
                  <label htmlFor="password" className="label">Password</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="field pr-11" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="btn btn-primary btn-block !mt-5">
                  {submitting ? <Spinner className="h-5 w-5" /> : 'Continue'}
                </button>
              </form>
              <GoogleSignInButton onCredential={handleGoogle} />
            </div>

            <p className="mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-ink-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Password sign-ins are confirmed with a code sent to your email. Admin accounts are store accounts
                with <code className="font-mono text-ink-2">role = &apos;admin&apos;</code> — see the README.
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Step 2: the 6-digit code from the email. */
function CodeStep({ challenge: initial, onBack }: { challenge: OtpChallenge; onBack: () => void }) {
  const { verifyCode, resendCode } = useAuth();
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
      toast.success('New code sent');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] bg-accent">
          <MailCheck className="h-8 w-8 text-white" strokeWidth={1.75} />
        </div>
        <h1 className="t-title">Check your email</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Enter the 6-digit code we sent to <span className="font-semibold text-ink">{challenge.email}</span>
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submit(code); }} className="card mt-8 space-y-4 p-6">
        <input value={code} onChange={(e) => handleChange(e.target.value)} inputMode="numeric" autoComplete="one-time-code"
          pattern="\d{6}" maxLength={6} required autoFocus disabled={verifying} placeholder="••••••" aria-label="Verification code"
          className="field text-center font-mono text-[26px] tracking-[0.5em] tabular" />
        <button type="submit" disabled={verifying || code.length !== 6} className="btn btn-primary btn-block">
          {verifying ? <Spinner className="h-5 w-5" /> : 'Verify'}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3 text-[14px]">
        <button type="button" onClick={handleResend} disabled={wait > 0 || resending}
          className="link disabled:cursor-default disabled:text-ink-3 disabled:no-underline">
          {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
        <button type="button" onClick={onBack} className="text-ink-2 hover:text-ink">Use a different account</button>
      </div>
    </>
  );
}
