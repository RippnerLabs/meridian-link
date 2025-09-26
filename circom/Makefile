download_pot15_final_ptau: pot15_final.ptau
	curl https://raw.githubusercontent.com/darkforest-eth/circuits/refs/heads/master/pot15_final.ptau --output pot15_final.ptau

snarkjs:
	npm i -g snarkjs

sol_deposit_proof:
	circom solDepositProof.circom --O2 --sym --r1cs --wasm
	npx esrun ./scripts/generate-solana-deposit-proof-circuit-input.ts.ts
	cd solDepositProof_js/ && node generate_witness.js ./solDepositProof.wasm ../../config/sol_deposit_proof_circom_circuit_input.json witness.wtns && cd -
	snarkjs groth16 setup ./solDepositProof.r1cs pot15_final.ptau 1_0000.zkey
	snarkjs zkey export verificationkey 1_0000.zkey verification_key.json
	snarkjs groth16 prove 1_0000.zkey ./solDepositProof_js/witness.wtns proof.json public.json
	snarkjs groth16 verify verification_key.json public.json proof.json
	snarkjs zkey export solidityverifier 1_0000.zkey verifier.sol
