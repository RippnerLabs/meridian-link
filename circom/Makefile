snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="new" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
snarkjs groth16 setup ../solDepositProof.r1cs pot15_final.ptau 1_0000.zkey
snarkjs zkey export verificationkey 1_0000.zkey verification_key.json
snarkjs groth16 prove 1_0000.zkey witness.wtns proof.json public.json
snarkjs groth16 verify verification_key.json public.json proof.json
snarkjs zkey export solidityverifier 1_0000.zkey verifier.sol

snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="new" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
snarkjs groth16 setup ../ethDepositProof.r1cs ../pot15_final.ptau 1_0000.zkey
snarkjs zkey export verificationkey 1_0000.zkey verification_key.json
snarkjs groth16 prove 1_0000.zkey witness.wtns proof.json public.json
snarkjs groth16 verify verification_key.json public.json proof.json
snarkjs zkey export solidityverifier 1_0000.zkey verifier.sol


node generate_witness.js ./vote.wasm ../vote/input.json witness.wtns
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="new" -v
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
snarkjs groth16 setup ../vote.r1cs pot14_final.ptau 1_0000.zkey
snarkjs zkey export verificationkey 1_0000.zkey verification_key.json
snarkjs groth16 prove 1_0000.zkey witness.wtns proof.json public.json
snarkjs groth16 verify verification_key.json public.json proof.json

ff - 1092
node generate_witness.js ./vote.wasm ../vote/input.json witness.wtns
snarkjs powersoftau new bn128 28 pot28_0000.ptau -v
snarkjs powersoftau contribute pot28_0000.ptau pot28_0001.ptau --name="new" -v
snarkjs powersoftau prepare phase2 pot28_0001.ptau pot28_final.ptau -v
snarkjs groth16 setup ../vote.r1cs pot28_final.ptau 1_0000.zkey
snarkjs zkey export verificationkey 1_0000.zkey verification_key.json
snarkjs groth16 prove 1_0000.zkey witness.wtns proof.json public.json
snarkjs groth16 verify verification_key.json public.json proof.json

node generate_witness.js ./vote.wasm ../vote/input.json witness.wtns
snarkjs powersoftau new bn128 18 pot18_0000.ptau -v
snarkjs powersoftau contribute pot18_0000.ptau pot18_0001.ptau --name="new" -v
snarkjs powersoftau prepare phase2 pot18_0001.ptau pot18_final.ptau -v
snarkjs groth16 setup ../vote.r1cs pot18_final.ptau 1_0000.zkey
snarkjs zkey export verificationkey 1_0000.zkey verification_key.json
snarkjs groth16 prove ../1_0000.key witness.wtns proof.json public.json
snarkjs groth16 verify ../verification_key.json public.json proof.json


255360
262144
16,384

26456


snarkjs powersoftau new bn128 15 pot15_0000.ptau -v
snarkjs powersoftau contribute pot15_0000.ptau pot15_0001.ptau --name="new" -v
snarkjs powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau -v
snarkjs groth16 setup ../vote.r1cs ../pot17_final.ptau 1_0000.zkey
snarkjs zkey export verificationkey 1_0000.zkey verification_key.json
snarkjs groth16 prove 1_0000.zkey witness.wtns proof.json public.json
snarkjs groth16 verify verification_key.json public.json proof.json

89956
