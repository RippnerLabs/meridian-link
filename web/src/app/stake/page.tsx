import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lock, Shield, Zap, Gift, Clock, ArrowRight, Percent, Users } from "lucide-react"
import Link from "next/link"

export default function StakePage() {
  const stakingTiers = [
    {
      name: "Bronze",
      minStake: "100",
      apy: "5%",
      lockPeriod: "7 days",
      benefits: ["Basic rewards", "Community access"],
      color: "bg-[#CD7F32]",
    },
    {
      name: "Silver",
      minStake: "1,000",
      apy: "8%",
      lockPeriod: "30 days",
      benefits: ["Enhanced rewards", "Fee discounts", "Priority support"],
      color: "bg-[#C0C0C0]",
    },
    {
      name: "Gold",
      minStake: "10,000",
      apy: "12%",
      lockPeriod: "90 days",
      benefits: ["Maximum rewards", "Zero fees", "Governance rights", "Exclusive airdrops"],
      color: "bg-chart-2",
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="neutral">
            <Clock className="w-3 h-3 mr-1" />
            Coming Soon
          </Badge>
          <h1 className="text-5xl md:text-6xl font-heading text-foreground">
            Stake
          </h1>
          <p className="text-xl text-foreground/70 max-w-xl mx-auto">
            Lock your tokens to earn rewards and unlock exclusive platform benefits
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-4">
          <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-3 shadow-shadow">
            <p className="text-2xl font-heading text-main">$1.2M</p>
            <p className="text-sm text-foreground/60">Total Staked</p>
          </div>
          <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-3 shadow-shadow">
            <p className="text-2xl font-heading text-chart-4">8.5%</p>
            <p className="text-sm text-foreground/60">Avg APY</p>
          </div>
          <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-3 shadow-shadow">
            <p className="text-2xl font-heading text-chart-1">320</p>
            <p className="text-sm text-foreground/60">Stakers</p>
          </div>
        </div>

        {/* Staking Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stakingTiers.map((tier, index) => (
            <Card key={index} className="relative">
              <CardHeader>
                <div className={`w-14 h-14 rounded-base border-2 border-border ${tier.color} flex items-center justify-center mb-4`}>
                  <Lock className="w-7 h-7 text-main-foreground" />
                </div>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>Min stake: {tier.minStake} tokens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-base border-2 border-border bg-secondary-background p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/60 flex items-center gap-1">
                      <Percent className="w-4 h-4" /> APY
                    </span>
                    <span className="font-heading text-chart-4">{tier.apy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/60 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Lock Period
                    </span>
                    <span className="font-heading">{tier.lockPeriod}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-heading">Benefits</p>
                  <ul className="space-y-1">
                    {tier.benefits.map((benefit, i) => (
                      <li key={i} className="text-sm text-foreground/70 flex items-center gap-2">
                        <Gift className="w-3 h-3 text-main" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button variant="neutral" className="w-full" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 rounded-base border-2 border-border bg-main">
                <Shield className="w-6 h-6 text-main-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-lg mb-1">Secure Staking</h3>
                <p className="text-sm text-foreground/70">
                  Your staked tokens are secured by battle-tested smart contracts
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 rounded-base border-2 border-border bg-chart-4">
                <Zap className="w-6 h-6 text-main-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-lg mb-1">Instant Rewards</h3>
                <p className="text-sm text-foreground/70">
                  Claim your rewards anytime without waiting for lock periods
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card className="bg-main text-main-foreground">
          <CardContent className="p-8 md:p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-3xl font-heading mb-4">
              Join the Staking Waitlist
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Start bridging now to accumulate tokens for staking
            </p>
            <Link href="/bridge">
              <Button variant="neutral" size="lg">
                Start Bridging
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
