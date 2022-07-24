#!/bin/bash

cd contracts/circuits

echo "Compiling bonus.circom..."

# compile circuit

circom bonus.circom --r1cs --wasm --sym -o .
snarkjs r1cs info bonus.r1cs

# Start a new zkey and make a contribution

snarkjs groth16 setup bonus.r1cs powersOfTau28_hez_final_10.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

# generate solidity contract
snarkjs zkey export solidityverifier circuit_final.zkey ../zkWordkeVerifier.sol

cd ../..