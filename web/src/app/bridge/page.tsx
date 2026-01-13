"use client";

import dynamic from "next/dynamic";

// Dynamically import BridgeUI to prevent SSR issues with wallet hooks
const BridgeUI = dynamic(() => import("@/components/bridge/bridge-ui"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
});

export default function Page() {
  return <BridgeUI />;
}
