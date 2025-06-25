// import { useWalletDisconnect } from "@/hooks/use-wallet-disconnect";
import { WalletButton } from "../solana/solana-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";
import {IconLogout, IconWallet} from '@tabler/icons-react';

export const WalletStatus = () => {
//   const { connected, disconnect, publicKey } = useWalletDisconnect();
  
  if (!true) {
      return (
          <div className="flex items-center">
              <WalletButton />
          </div>
      );
  }
  
  return (
      <Popover>
          <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                  <div className="flex items-center gap-2">
                      <IconWallet className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                      <span className="text-sm font-medium">
                          {/* {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)} */}
                      </span>
                  </div>
              </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end" side="bottom">
              <div className="p-1">
                  <button
                    //   onClick={() => disconnect()}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                      <IconLogout className="h-4 w-4" />
                      <span>Disconnect Wallet</span>
                  </button>
              </div>
          </PopoverContent>
      </Popover>
  );
};

