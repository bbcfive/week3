//[assignment] write your own unit test to show that your Mastermind variation circuit is working as expected
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { groth16 } = require("snarkjs");

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);
const wasm_tester = require("circom_tester").wasm;
const BigNumber = ethers.BigNumber;

const { buildPoseidon } = require('circomlibjs')

const poseidonHash = async (items) => {
  let poseidon = await buildPoseidon()
  return BigNumber.from(poseidon.F.toObject(poseidon(items)))
}

describe("MastermindVariation", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("Verifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
      // ["dog", "cat", "duck"]
      const guess = ["1", "2", "3"];
      // ["duck","cat", "bird"]
      const solution = ["3", "2", "4"];
      const salt = "123456789"
      const hash = await poseidonHash([salt, "3", "2", "4"]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubNumHit": "1",
        "pubNumBlow": "1",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSalt": BigInt(salt).toString()
      };

      const { proof, publicSignals } = await groth16.fullProve(
        input, 
        "contracts/circuits/MastermindVariation_js/MastermindVariation.wasm",
        "contracts/circuits/circuit_final.zkey"
      );

      console.log('solnHashOut',publicSignals[0]);

      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
      
      const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

      const a = [argv[0], argv[1]];
      const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
      const c = [argv[6], argv[7]];
      const Input = argv.slice(8);
      
      expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return true for correct hash", async function () {
      const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");

      // ["dog", "cat", "duck"]
      const guess = ["1", "2", "3"];
      // ["duck","cat", "bird"]
      const solution = ["3", "2", "4"];
      const salt = "123456789"
      const hash = await poseidonHash([salt, "3", "2", "4"]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubNumHit": "1",
        "pubNumBlow": "1",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSalt": BigInt(salt).toString()
      };

      const witness = await circuit.calculateWitness(input, true);

      assert(Fr.eq(Fr.e(witness[1]), Fr.e(input.pubSolnHash)));
    });

    it("Should return error for duplicate animals", async function () {
      const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");

      // ["cat", "cat", "duck"]
      const guess = ["2", "2", "3"];
      // ["duck","cat", "bird"]
      const solution = ["3", "2", "4"];
      const salt = "123456789"
      const hash = await poseidonHash([salt, "3", "2", "4"]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubNumHit": "1",
        "pubNumBlow": "1",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSalt": BigInt(salt).toString()
      };

      const witness = async () => await circuit.calculateWitness(input, true);

      try {
        witness();
      } catch(err) {
        expect(witness).to.throw(Error);
      }

    });

    it("Should return error for wrong pubSolnHash", async function () {
      const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");

      // ["dog", "cat", "duck"]
      const guess = ["1", "2", "3"];
      // ["duck","cat", "bird"]
      const solution = ["3", "2", "4"];
      const salt = "123456789"
      const hash = "123456789";
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubNumHit": "1",
        "pubNumBlow": "1",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSalt": BigInt(salt).toString()
      };

      const witness = async () => await circuit.calculateWitness(input, true);

      try {
        witness();
      } catch(err) {
        expect(witness).to.throw(Error);
      }
    });

    it("Should return error for wrong pubGuess", async function () {
      const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");

      // ["dog", "", "duck"]
      const guess = ["1", "0", "3"];
      // ["duck","cat", "bird"]
      const solution = ["3", "2", "4"];
      const salt = "123456789"
      const hash = await poseidonHash([salt, "3", "2", "4"]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubNumHit": "1",
        "pubNumBlow": "1",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSalt": BigInt(salt).toString()
      };

      const witness = async () => await circuit.calculateWitness(input, true);

      try {
        witness();
      } catch(err) {
        expect(witness).to.throw(Error);
      }
    });

    it("Should return error for wrong pubNumHit", async function () {
      const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");

      // ["dog", "", "duck"]
      const guess = ["1", "2", "3"];
      // ["duck","cat", "bird"]
      const solution = ["3", "2", "4"];
      const salt = "123456789"
      const hash = await poseidonHash([salt, "3", "2", "4"]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubNumHit": "2",
        "pubNumBlow": "1",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSalt": BigInt(salt).toString()
      };

      const witness = async () => await circuit.calculateWitness(input, true);

      try {
        witness();
      } catch(err) {
        expect(witness).to.throw(Error);
      }
    });

    it("Should return different hash for different salt", async function () {
      const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");

      // ["dog", "cat", "duck"]
      const guess = ["1", "2", "3"];
      // ["duck","cat", "bird"]
      const solution = ["3", "2", "4"];
      const salt = "123456789"
      const hash = await poseidonHash([salt, "3", "2", "4"]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubNumHit": "1",
        "pubNumBlow": "1",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSalt": BigInt(salt).toString()
      };

      const witness = await circuit.calculateWitness(input, true);

      assert(Fr.eq(Fr.e(witness[1]), Fr.e(input.pubSolnHash)));

      const salt2 = "12345678910";
      const hash2 = await poseidonHash([salt2, "3", "2", "4"]);
      const input2 = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubNumHit": "1",
        "pubNumBlow": "1",
        "pubSolnHash": BigInt(hash2).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSalt": BigInt(salt2).toString()
      };
      const witness2 = await circuit.calculateWitness(input2, true);
      assert(Fr.eq(Fr.e(witness2[1]), Fr.e(input2.pubSolnHash)));

      expect(Fr.eq(Fr.e(witness[1]),Fr.e(witness2[1]))).to.be.false;
    });
});