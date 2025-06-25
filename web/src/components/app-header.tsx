'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Menu, X, Settings, ChevronDown } from 'lucide-react'
import { ThemeSelect } from '@/components/theme-select'
import { ClusterUiSelect } from './cluster/cluster-ui'
import { WalletButton } from '@/components/solana/solana-provider'
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
    { label: 'Overview', path: '/overview', badge: null },
  ]

  return (
    <header className="relative z-50 w-full backdrop-blur-md bg-black/20 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative rounded-lg">
              <Image
                src="/logo.png"
                alt="Rippner Labs Logo"
                width={30}
                height={30}
                className="transition-transform duration-200 group-hover:scale-105 rounded-lg"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Stargate
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map(({ label, path, badge }) => (
              <Link
                key={path}
                href={path}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg group",
                  isActive(path) 
                    ? "text-white bg-white/10 shadow-lg" 
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                )}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {label}
                  {badge && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border-blue-400/30">
                      {badge}
                    </Badge>
                  )}
                </span>
                {isActive(path) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-lg" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-black/90 backdrop-blur-md border-white/10"
              >
                <div className="p-2">
                  <div className="mb-2">
                    <p className="text-sm font-medium text-white mb-2">Cluster</p>
                    <ClusterUiSelect />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white mb-2">Theme</p>
                    <ThemeSelect />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="h-6 w-px bg-white/20" />
            
            <WalletButton />
          </div>

          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-white hover:bg-white/10 transition-all duration-200" 
            onClick={() => setShowMenu(!showMenu)}
          >
            {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {showMenu && (
          <div className="md:hidden mt-6 pb-6 border-t border-white/10">
            <nav className="flex flex-col space-y-2 pt-6">
              {navigationItems.map(({ label, path, badge }) => (
                <Link
                  key={path}
                  href={path}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg",
                    isActive(path) 
                      ? "text-white bg-white/10" 
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  )}
                  onClick={() => setShowMenu(false)}
                >
                  <span>{label}</span>
                  {badge && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border-blue-400/30">
                      {badge}
                    </Badge>
                  )}
                </Link>
              ))}
              
              <div className="pt-6 space-y-4 border-t border-white/10 mt-6">
                <WalletButton />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Settings</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-300 hover:text-white hover:bg-white/10"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 pl-4">
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-2">Cluster</p>
                    <ClusterUiSelect />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-2">Theme</p>
                    <ThemeSelect />
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
