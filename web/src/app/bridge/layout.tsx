'use client';

import '../globals.css'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { ReactQueryProvider } from '@/components/react-query-provider';
import { SolanaProvider } from '@/components/solana/solana-provider'
import { EthereumProvider } from '@/components/ethereum/ethereum-provider'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ReactQueryProvider>
          <EthereumProvider>
          <ClusterProvider>
            <SolanaProvider>
                {children}
                <Toaster position='top-right' />
            </SolanaProvider>
          </ClusterProvider>
          </EthereumProvider>
        </ReactQueryProvider>
      </ThemeProvider>
    </div>
  );
}
