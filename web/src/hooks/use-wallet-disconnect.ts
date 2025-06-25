import { useWallet } from "@solana/wallet-adapter-react"

export function useWalletDisconnect() {
  const { disconnect, connected, publicKey } = useWallet()
  
  return {
    disconnect,
    connected,
    publicKey
  }
}
