import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import ComparePanel from '@/components/product/ComparePanel';

export const metadata = {
  title: 'TechXStudio — Apple Premium Store',
  description: 'Your one-stop online Apple Premium Store — iPhone, iPad, AirPods, Mac & accessories. 100% genuine products at special prices.',
  keywords: ['Apple', 'iPhone', 'iPad', 'AirPods', 'TechXStudio', 'Apple Store'],
  openGraph: {
    title: 'TechXStudio — Apple Premium Store',
    description: 'Your one-stop online Apple Premium Store',
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* SF Pro is used on Apple devices; these cover everything else (incl. Thai) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <AuthProvider>
              <TopBar />
              <main className="min-h-screen pt-11">
                {children}
              </main>
              <Footer />
              <BottomNav />
              <ComparePanel />
              <Toaster
                position="top-center"
                offset={56}
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
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
