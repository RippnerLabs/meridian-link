import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Shield, 
  Zap, 
  Lock, 
  ArrowRight, 
  Globe, 
  Code, 
  FileCheck, 
  Link2,
  CheckCircle2,
  ExternalLink,
  BookOpen
} from "lucide-react"
import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function OverviewPage() {
  const features = [
    {
      icon: Shield,
      title: "Zero-Knowledge Security",
      description: "Every transfer is verified using ZK-proofs, ensuring cryptographic security without revealing transaction details.",
      color: "bg-chart-4"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Complete cross-chain transfers in 2-3 minutes instead of hours. Our optimized relayers ensure quick settlement.",
      color: "bg-chart-2"
    },
    {
      icon: Lock,
      title: "Trustless Architecture",
      description: "No centralized custody. Your assets are secured by smart contracts on both source and destination chains.",
      color: "bg-main"
    },
    {
      icon: Globe,
      title: "Multi-Chain Support",
      description: "Bridge between Ethereum and Solana today, with Polygon, Arbitrum, and more chains coming soon.",
      color: "bg-chart-1"
    }
  ]

  const howItWorks = [
    {
      step: "1",
      title: "Connect Wallets",
      description: "Connect both your source chain (Ethereum) and destination chain (Solana) wallets."
    },
    {
      step: "2",
      title: "Enter Amount",
      description: "Specify how many tokens you want to bridge. The system calculates fees and estimated time."
    },
    {
      step: "3",
      title: "Approve & Deposit",
      description: "Approve the token transfer and deposit to the bridge contract on the source chain."
    },
    {
      step: "4",
      title: "ZK Proof Generation",
      description: "A zero-knowledge proof is generated to verify your deposit without revealing details."
    },
    {
      step: "5",
      title: "Relayer Processing",
      description: "Our decentralized relayers verify the proof and trigger the withdrawal on the destination chain."
    },
    {
      step: "6",
      title: "Receive Tokens",
      description: "Tokens arrive in your destination wallet automatically. No claiming required."
    }
  ]

  const faqs = [
    {
      question: "What makes this bridge different from others?",
      answer: "We use zero-knowledge proofs for verification, providing cryptographic security without relying on multisig committees or centralized validators. This makes our bridge truly trustless."
    },
    {
      question: "How long does a transfer take?",
      answer: "Typical transfers complete in 2-3 minutes. This includes deposit confirmation, proof generation, and destination chain settlement."
    },
    {
      question: "What are the fees?",
      answer: "Fees are approximately $0.50 per transfer, covering gas costs on both chains and relayer operation. This is significantly lower than most alternatives."
    },
    {
      question: "Is my transfer private?",
      answer: "While the transaction amounts are visible on-chain, zero-knowledge proofs ensure the verification process doesn't expose any unnecessary data."
    },
    {
      question: "What tokens are supported?",
      answer: "Currently we support BridgeToken (BrTN) between Ethereum and Solana. More tokens will be added as we expand."
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-16">
        
        {/* Hero */}
        <div className="text-center space-y-6">
          <Badge className="bg-main text-main-foreground">
            <BookOpen className="w-3 h-3 mr-1" />
            Learn More
          </Badge>
          <h1 className="text-5xl md:text-6xl font-heading text-foreground">
            How It Works
          </h1>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Meridian Link is a next-generation cross-chain bridge powered by zero-knowledge cryptography
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <Card key={index} className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className={`p-3 rounded-base border-2 border-border ${feature.color} shrink-0`}>
                    <IconComponent className="w-6 h-6 text-main-foreground" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-foreground/70">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* How It Works */}
        <div className="space-y-8">
          <div className="text-center">
            <Badge variant="neutral" className="mb-4">Process</Badge>
            <h2 className="text-4xl font-heading text-foreground">
              Step by Step
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {howItWorks.map((step, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-full border-2 border-border bg-main flex items-center justify-center mb-2">
                    <span className="font-heading text-main-foreground">{step.step}</span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/70">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Architecture */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-base border-2 border-border bg-main">
                <Code className="w-5 h-5 text-main-foreground" />
              </div>
              <div>
                <CardTitle>Technical Architecture</CardTitle>
                <CardDescription>Built on proven cryptographic primitives</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-base border-2 border-border bg-secondary-background p-4">
                <FileCheck className="w-6 h-6 text-main mb-2" />
                <h4 className="font-heading mb-1">Circom Circuits</h4>
                <p className="text-xs text-foreground/60">Zero-knowledge circuits verify deposits without exposing data</p>
              </div>
              <div className="rounded-base border-2 border-border bg-secondary-background p-4">
                <Link2 className="w-6 h-6 text-chart-4 mb-2" />
                <h4 className="font-heading mb-1">Smart Contracts</h4>
                <p className="text-xs text-foreground/60">Solidity and Anchor programs handle on-chain logic</p>
              </div>
              <div className="rounded-base border-2 border-border bg-secondary-background p-4">
                <Globe className="w-6 h-6 text-chart-1 mb-2" />
                <h4 className="font-heading mb-1">Relayer Network</h4>
                <p className="text-xs text-foreground/60">Decentralized relayers process and verify proofs</p>
              </div>
            </div>
            
            <div className="rounded-base border-2 border-border bg-secondary-background p-4">
              <h4 className="font-heading mb-3">Security Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Groth16 ZK-SNARK proofs",
                  "Incremental Merkle Tree commitments",
                  "Rate limiting & fraud prevention",
                  "Multi-sig admin controls",
                  "Open source & audited code",
                  "Testnet proven security"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-chart-4" />
                    <span className="text-foreground/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="space-y-6">
          <div className="text-center">
            <Badge variant="neutral" className="mb-4">FAQ</Badge>
            <h2 className="text-4xl font-heading text-foreground">
              Common Questions
            </h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card className="bg-main text-main-foreground">
          <CardContent className="p-8 md:p-12 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-3xl font-heading mb-4">
              Ready to Try It Out?
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Experience the future of cross-chain bridging
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/bridge">
                <Button variant="neutral" size="lg">
                  Launch Bridge
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/faucet">
                <Button variant="neutral" size="lg">
                  Get Test Tokens
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="#" className="block">
            <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all h-full">
              <CardContent className="p-6 flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-main" />
                <span className="font-heading">Documentation</span>
                <ExternalLink className="w-4 h-4 ml-auto text-foreground/40" />
              </CardContent>
            </Card>
          </a>
          <a href="#" className="block">
            <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all h-full">
              <CardContent className="p-6 flex items-center gap-3">
                <Code className="w-5 h-5 text-chart-4" />
                <span className="font-heading">GitHub</span>
                <ExternalLink className="w-4 h-4 ml-auto text-foreground/40" />
              </CardContent>
            </Card>
          </a>
          <a href="#" className="block">
            <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all h-full">
              <CardContent className="p-6 flex items-center gap-3">
                <Shield className="w-5 h-5 text-chart-1" />
                <span className="font-heading">Security Audit</span>
                <ExternalLink className="w-4 h-4 ml-auto text-foreground/40" />
              </CardContent>
            </Card>
          </a>
        </div>
      </div>
    </div>
  )
}
