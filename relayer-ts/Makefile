relayer.json:
	solana-keygen new -o ./relayer.json

setup: relayer.json
	solana airdrop 1000 ./relayer.json
	npm run dev &