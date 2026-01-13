import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Shield, Sparkles, ArrowRight, Link2, Lock, Bolt } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-main border-4 border-border" />
          <div className="absolute top-40 right-20 w-24 h-24 rounded-base bg-chart-1 border-4 border-border rotate-12" />
          <div className="absolute bottom-20 left-1/4 w-16 h-16 rounded-full bg-chart-2 border-4 border-border" />
          <div className="absolute bottom-40 right-1/3 w-20 h-20 rounded-base bg-chart-3 border-4 border-border -rotate-6" />
        </div>

        <div className="relative flex items-center justify-center min-h-[80vh] p-6">
          <div className="text-center space-y-8 max-w-3xl">
            {/* Badge */}
            <div className="flex justify-center">
              <Badge className="text-sm px-4 py-1.5 bg-chart-1 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Cross-Chain Revolution
              </Badge>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-heading text-foreground leading-tight">
                Meridian
                <span className="block text-main">Link</span>
              </h1>
              <p className="text-xl md:text-2xl font-base text-foreground/80 max-w-xl mx-auto">
                The future of cross-chain transfers with zero-knowledge proofs
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/bridge">
                <Button size="lg" className="text-lg px-8">
                  Start Transfer
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/overview">
                <Button variant="neutral" size="lg" className="text-lg px-8">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 pt-8">
              <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-3 shadow-shadow">
                <p className="text-2xl font-heading text-main">$2.5M+</p>
                <p className="text-sm text-foreground/70">Total Volume</p>
              </div>
              <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-3 shadow-shadow">
                <p className="text-2xl font-heading text-chart-4">1,200+</p>
                <p className="text-sm text-foreground/70">Transfers</p>
              </div>
              <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-3 shadow-shadow">
                <p className="text-2xl font-heading text-chart-1">100%</p>
                <p className="text-sm text-foreground/70">Secure</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t-4 border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="neutral" className="mb-4">Features</Badge>
            <h2 className="text-4xl md:text-5xl font-heading text-foreground">
              Why Choose Us?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer">
              <CardHeader>
                <div className="w-14 h-14 rounded-base border-2 border-border bg-main flex items-center justify-center mb-4">
                  <Bolt className="w-7 h-7 text-main-foreground" />
                </div>
                <CardTitle className="text-xl">Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/70">
                  Cross-chain transfers powered by advanced cryptography complete in minutes, not hours.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer">
              <CardHeader>
                <div className="w-14 h-14 rounded-base border-2 border-border bg-chart-4 flex items-center justify-center mb-4">
                  <Shield className="w-7 h-7 text-main-foreground" />
                </div>
                <CardTitle className="text-xl">Maximum Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/70">
                  Zero-knowledge proofs ensure your transfers are private and cryptographically verified.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer">
              <CardHeader>
                <div className="w-14 h-14 rounded-base border-2 border-border bg-chart-1 flex items-center justify-center mb-4">
                  <Link2 className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl">Multi-Chain</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/70">
                  Seamlessly bridge between Ethereum, Solana, and more chains coming soon.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Supported Chains Section */}
      <section className="py-20 px-6 border-t-4 border-border bg-secondary-background">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="neutral" className="mb-4">Supported Networks</Badge>
          <h2 className="text-4xl md:text-5xl font-heading text-foreground mb-12">
            Bridge Across Chains
          </h2>
          
          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-3 rounded-base border-2 border-border bg-background px-6 py-4 shadow-shadow">
              <div className="w-10 h-10 rounded-full bg-[#627EEA] flex items-center justify-center">
                <span className="text-white font-heading">Ξ</span>
              </div>
              <span className="font-heading text-lg">Ethereum</span>
            </div>
            <div className="flex items-center gap-3 rounded-base border-2 border-border bg-background px-6 py-4 shadow-shadow">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center">
                <span className="text-white font-heading text-sm">◎</span>
              </div>
              <span className="font-heading text-lg">Solana</span>
            </div>
            <div className="flex items-center gap-3 rounded-base border-2 border-border bg-background px-6 py-4 opacity-50">
              <div className="w-10 h-10 rounded-full bg-[#8247E5] flex items-center justify-center">
                <span className="text-white font-heading text-sm">⬡</span>
              </div>
              <span className="font-heading text-lg">Polygon</span>
              <Badge variant="neutral" className="text-xs">Soon</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t-4 border-border">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-main text-main-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-4xl md:text-5xl font-heading mb-4">
                Ready to Bridge?
              </h2>
              <p className="text-lg mb-8 opacity-90">
                Start your first cross-chain transfer in under a minute.
              </p>
              <Link href="/bridge">
                <Button variant="neutral" size="lg" className="text-lg px-10">
                  Launch App
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t-4 border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-foreground/70">
            © 2026 Meridian Link. Built with zero-knowledge love.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link href="#" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
              GitHub
            </Link>
            <Link href="#" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
              Twitter
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
