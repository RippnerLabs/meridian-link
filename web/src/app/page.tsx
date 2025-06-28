import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen text-white">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-8 max-w-2xl">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Meridian Link
            </h1>
            <p className="text-xl text-gray-400">
              The future of cross-chain transfers
            </p>
            <p className="text-gray-500 max-w-md mx-auto">
              Transfer tokens seamlessly across different blockchains with zero-knowledge proofs and advanced security.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/bridge">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">
                Start Transfer
              </Button>
            </Link>
            <Button variant="outline" className="border-gray-600 text-gray-400 hover:bg-gray-800 px-8 py-3 text-lg">
              Learn More
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 bg-gray-900/60 backdrop-blur rounded-lg border border-gray-800">
              <h3 className="text-lg font-semibold mb-2">Fast</h3>
              <p className="text-gray-400 text-sm">Lightning-fast cross-chain transfers powered by advanced cryptography</p>
            </div>
            <div className="p-6 bg-gray-900/60 backdrop-blur rounded-lg border border-gray-800">
              <h3 className="text-lg font-semibold mb-2">Secure</h3>
              <p className="text-gray-400 text-sm">Zero-knowledge proofs ensure maximum security for your transfers</p>
            </div>
            <div className="p-6 bg-gray-900/60 backdrop-blur rounded-lg border border-gray-800">
              <h3 className="text-lg font-semibold mb-2">Simple</h3>
              <p className="text-gray-400 text-sm">Intuitive interface makes cross-chain transfers accessible to everyone</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
