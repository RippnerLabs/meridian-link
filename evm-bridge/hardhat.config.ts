import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import path from "path";
import dotenv from "dotenv";
dotenv.config({
  path: path.join(__dirname, "../config/.accounts.env"),
})

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ],
  },
  networks: {
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_URL || "",
      accounts: process.env.ETH_BRIDGE_DEPLOYER_PRIVKEY ? [process.env.ETH_BRIDGE_DEPLOYER_PRIVKEY] : [],
    },
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 1000, // 1 second block time
      },
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10,000 ETH per account
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
