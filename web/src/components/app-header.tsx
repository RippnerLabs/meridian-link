'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Menu, X, Settings, Wallet, Zap, Sparkles } from 'lucide-react'
import { ThemeSelect } from '@/components/theme-select'
import { ClusterUiSelect } from './cluster/cluster-ui'
import { WalletButton } from '@/components/solana/solana-provider'
import { WalletConnectionDrawer } from '@/components/bridge/wallet-connection-drawer'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  const navigationItems = [
    { label: 'Transfer', path: '/bridge', badge: null },
    { label: 'Earn', path: '/earn', badge: 'NEW' },
    { label: 'Stake', path: '/stake', badge: null },
    { label: 'Faucet', path: '/faucet', badge: null },
    { label: 'Overview', path: '/overview', badge: null },
  ]

  return (
    <header className="relative z-50 w-full border-b-4 border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative rounded-base border-2 border-border p-1 bg-main shadow-shadow transition-all group-hover:translate-x-boxShadowX group-hover:translate-y-boxShadowY group-hover:shadow-none">
              <Image
                src="/logo.png"
                alt="Meridian Link Logo"
                width={32}
                height={32}
                className="rounded-sm"
                priority
              />
            </div>
            <span className="text-2xl font-heading text-foreground">
              Meridian Link
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navigationItems.map(({ label, path, badge }) => (
              <Link
                key={path}
                href={path}
                className={cn(
                  "relative px-4 py-2 text-sm font-base rounded-base border-2 transition-all",
                  isActive(path) 
                    ? "bg-main text-main-foreground border-border shadow-shadow" 
                    : "bg-secondary-background text-foreground border-border hover:bg-main hover:text-main-foreground hover:shadow-shadow"
                )}
              >
                <span className="flex items-center gap-2">
                  {label}
                  {badge && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-chart-1 text-white">
                      {badge}
                    </Badge>
                  )}
                </span>
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="neutral"
                  size="icon"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56"
              >
                <div className="p-3 space-y-4">
                  <div>
                    <p className="text-sm font-heading mb-2">Cluster</p>
                    <ClusterUiSelect />
                  </div>
                  <div>
                    <p className="text-sm font-heading mb-2">Theme</p>
                    <ThemeSelect />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="h-8 w-[3px] bg-border" />
            
            <WalletConnectionDrawer>
              <Button variant="default">
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            </WalletConnectionDrawer>
          </div>

          {/* Mobile Menu Button */}
          <Button 
            variant="neutral" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setShowMenu(!showMenu)}
          >
            {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {showMenu && (
          <div className="md:hidden mt-6 pb-6 border-t-4 border-border">
            <nav className="flex flex-col gap-2 pt-6">
              {navigationItems.map(({ label, path, badge }) => (
                <Link
                  key={path}
                  href={path}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 text-sm font-base rounded-base border-2 transition-all",
                    isActive(path) 
                      ? "bg-main text-main-foreground border-border shadow-shadow" 
                      : "bg-secondary-background text-foreground border-border hover:bg-main hover:text-main-foreground"
                  )}
                  onClick={() => setShowMenu(false)}
                >
                  <span>{label}</span>
                  {badge && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-chart-1 text-white">
                      {badge}
                    </Badge>
                  )}
                </Link>
              ))}
              
              <div className="pt-6 space-y-4 border-t-4 border-border mt-6">
                <WalletConnectionDrawer>
                  <Button 
                    variant="default"
                    className="w-full"
                  >
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                  </Button>
                </WalletConnectionDrawer>
                <div className="space-y-4 mt-4">
                  <div className="rounded-base border-2 border-border bg-secondary-background p-4">
                    <p className="text-sm font-heading mb-3">Settings</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-foreground/70 mb-2">Cluster</p>
                        <ClusterUiSelect />
                      </div>
                      <div>
                        <p className="text-xs text-foreground/70 mb-2">Theme</p>
                        <ThemeSelect />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
