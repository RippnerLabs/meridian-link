SHELL := /bin/zsh
NVM := . $$HOME/.nvm/nvm.sh

env:
	$(NVM) && nvm use --lts
	light test-validator

setup:
	$(NVM) && nvm use --lts
	light test-validator
	$(NVM) && cd sol-bridge && make test && make deploy && cd -
	# $(NVM) && cd circom && make sol_deposit_proof && cd -
	$(NVM) && cd evm-bridge && npx hardhat node & sleep 5 && npx hardhat run scripts/deploy.ts --network localhost && cd -
	$(NVM) && cd relayer-ts && make setup && cd -
	$(NVM) && cd web && make setup &

clean:
	$(NVM) && nvm use --lts
	light test-validator --stop
	pkill -f "hardhat node" || true
	pkill -f "npm run dev" || true
	pkill -f "relayer" || true
	rm -rf test-ledger || true