import type { Metadata } from 'next'
import './globals.css'
import { AppProviders } from '@/components/app-providers'
import { AppLayout } from '@/components/app-layout'
import { UnicornStudio } from '@/components/unicorn-studio'
import { EthereumProvider } from '@/components/ethereum/ethereum-provider'

export const metadata: Metadata = {
  title: 'Meridian Link',
  description: 'Cross-chain token bridge with zero-knowledge proofs',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const links = [
    { label: 'Account', path: '/account' },
    { label: 'Bridge', path: '/bridge' },
    { label: 'Counter', path: '/counter' },
    { label: 'Dashboard', path: '/dashboard' },
  ]

  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <UnicornStudio projectId="ic8SR9XEydE5ANSP8W0B" asBackground />
        <EthereumProvider>
        <AppProviders>
          <AppLayout links={links}>{children}</AppLayout>
        </AppProviders>
        </EthereumProvider>
      </body>
    </html>
  )
}

// Extend BigInt to support JSON serialization
declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}
