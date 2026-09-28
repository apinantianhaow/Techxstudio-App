'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/context/LanguageContext';

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  text?: GoogleButtonOptions['text'];
}

/**
 * Google's official "Sign in with Google" button. Renders nothing until the
 * API reports a GOOGLE_CLIENT_ID (GET /api/auth/providers).
 */
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }: GoogleSignInButtonProps) {
  const [clientId, setClientId] = useState('');
  const [scriptReady, setScriptReady] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const { resolvedTheme } = useTheme();
  const { locale } = useTranslation();

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setClientId(data?.google_client_id || ''))
      .catch(() => setClientId(''));
  }, []);

  useEffect(() => {
    const el = container.current;
    const gsi = window.google?.accounts.id;
    if (!clientId || !scriptReady || !el || !gsi) return;
    gsi.initialize({ client_id: clientId, callback: (res) => callback.current(res.credential) });
    el.replaceChildren();
    gsi.renderButton(el, {
      type: 'standard',
      theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      shape: 'pill',
      text,
      logo_alignment: 'center',
      width: Math.min(400, Math.max(200, el.offsetWidth)),
      locale: locale === 'th' ? 'th' : 'en',
    });
  }, [clientId, scriptReady, resolvedTheme, locale, text]);

  if (!clientId) return null;
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div ref={container} className="flex h-11 w-full justify-center" />
    </>
  );
}
