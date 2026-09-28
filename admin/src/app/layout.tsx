import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';

export const metadata = {
  title: 'TechXStudio Admin',
  description: 'Manage TechXStudio products, orders and coupons.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* SF Pro is used on Apple devices; these cover everything else (incl. Thai) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <AdminShell>{children}</AdminShell>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: 'var(--card)',
                  color: 'var(--ink)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  border: '1px solid var(--hairline)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
