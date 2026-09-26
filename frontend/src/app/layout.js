import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <AuthProvider>
              <TopBar />
              <main className="pt-12 min-h-screen">
                {children}
              </main>
              <BottomNav />
              <ComparePanel />
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    borderRadius: '0',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: '#ffffff',
                    color: '#1e1b2e',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.1)',
                    border: '1px solid #e2dff0',
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
