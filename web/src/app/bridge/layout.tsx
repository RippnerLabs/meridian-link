'use client';

import '../globals.css'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { ReactQueryProvider } from '@/components/react-query-provider';
import { SolanaProvider } from '@/components/solana/solana-provider'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ReactQueryProvider>
          <ClusterProvider>
            <SolanaProvider>
                {children}
                <Toaster position='top-right' />
            </SolanaProvider>
          </ClusterProvider>
        </ReactQueryProvider>
      </ThemeProvider>
    </div>
  );
}
