import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, Clock, Lock, Coins, Sparkles, ArrowRight, Percent } from "lucide-react"
import Link from "next/link"

export default function EarnPage() {
  const earnOptions = [
    {
      title: "Liquidity Pools",
      description: "Provide liquidity and earn trading fees",
      apy: "12.5%",
      tvl: "$2.1M",
      icon: Coins,
      color: "bg-chart-1",
      status: "coming_soon"
    },
    {
      title: "Staking Rewards",
      description: "Stake your bridge tokens for rewards",
      apy: "8.2%",
      tvl: "$850K",
      icon: Lock,
      color: "bg-chart-4",
      status: "coming_soon"
    },
    {
      title: "Yield Farming",
      description: "Farm yield across multiple chains",
      apy: "25.0%",
      tvl: "$450K",
      icon: TrendingUp,
      color: "bg-main",
      status: "coming_soon"
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-chart-1 text-white">
            <Sparkles className="w-3 h-3 mr-1" />
            New
          </Badge>
          <h1 className="text-5xl md:text-6xl font-heading text-foreground">
            Earn
          </h1>
          <p className="text-xl text-foreground/70 max-w-xl mx-auto">
            Put your assets to work and earn passive income through various DeFi strategies
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-4">
          <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-3 shadow-shadow">
            <p className="text-2xl font-heading text-main">$3.4M</p>
            <p className="text-sm text-foreground/60">Total Value Locked</p>
          </div>
          <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-3 shadow-shadow">
            <p className="text-2xl font-heading text-chart-4">15.2%</p>
            <p className="text-sm text-foreground/60">Avg APY</p>
          </div>
          <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-3 shadow-shadow">
            <p className="text-2xl font-heading text-chart-1">500+</p>
            <p className="text-sm text-foreground/60">Active Earners</p>
          </div>
        </div>

        {/* Earn Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {earnOptions.map((option, index) => {
            const IconComponent = option.icon
            return (
              <Card key={index} className="relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <Badge variant="neutral">
                    <Clock className="w-3 h-3 mr-1" />
                    Coming Soon
                  </Badge>
                </div>
                <CardHeader>
                  <div className={`w-14 h-14 rounded-base border-2 border-border ${option.color} flex items-center justify-center mb-4`}>
                    <IconComponent className="w-7 h-7 text-main-foreground" />
                  </div>
                  <CardTitle className="text-xl">{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-base border-2 border-border bg-secondary-background p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/60">APY</span>
                      <span className="font-heading text-chart-4">{option.apy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/60">TVL</span>
                      <span className="font-heading">{option.tvl}</span>
                    </div>
                  </div>
                  <Button variant="neutral" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* CTA Section */}
        <Card className="bg-main text-main-foreground">
          <CardContent className="p-8 md:p-12 text-center">
            <Percent className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-3xl font-heading mb-4">
              Get Notified When We Launch
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Be the first to know when earning opportunities go live
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/bridge">
                <Button variant="neutral" size="lg">
                  Bridge Now
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
