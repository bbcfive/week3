// [bonus] unit test for bonus.circom
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

describe("bonus", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("zkWordkeVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
      const circuit = await wasm_tester("contracts/circuits/bonus.circom");

      // ["H", "E", "L", "L", "O"]
      const guess = [8, 5, 12, 12, 15];
      // ["W","O", "R", "L", "D"]
      const solution = [23, 15, 18, 12, 4];
      const salt = "123456789"
      const hash = await poseidonHash([salt, 23, 15, 18, 12, 4]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubGuessD": guess[3],
        "pubGuessE": guess[4],
        "pubLetterGreen": "1",
        "pubLetterYellow": "2",
        "pubLetterGray": "2",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSolnD": solution[3],
        "privSolnE": solution[4],
        "privSalt": BigInt(salt).toString()
      };

      const { proof, publicSignals } = await groth16.fullProve(
        input, 
        "contracts/circuits/bonus_js/bonus.wasm",
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
      const circuit = await wasm_tester("contracts/circuits/bonus.circom");

      // ["H", "E", "L", "L", "O"]
      const guess = [8, 5, 12, 12, 15];
      // ["W","O", "R", "L", "D"]
      const solution = [23, 15, 18, 12, 4];
      const salt = "123456789"
      const hash = await poseidonHash([salt, 23, 15, 18, 12, 4]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubGuessD": guess[3],
        "pubGuessE": guess[4],
        "pubLetterGreen": "1",
        "pubLetterYellow": "2",
        "pubLetterGray": "2",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSolnD": solution[3],
        "privSolnE": solution[4],
        "privSalt": BigInt(salt).toString()
      };

      const witness = await circuit.calculateWitness(input, true);

      assert(Fr.eq(Fr.e(witness[1]), Fr.e(input.pubSolnHash)));
    });

    it("Should return error for wrong pubSolnHash", async function () {
      const circuit = await wasm_tester("contracts/circuits/bonus.circom");

      // ["H", "E", "L", "L", "O"]
      const guess = [8, 5, 12, 12, 15];
      // ["W","O", "R", "L", "D"]
      const solution = [23, 15, 18, 12, 4];
      const salt = "123456789"
      const hash = await poseidonHash([23, 15, 18, 12, 4]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubGuessD": guess[3],
        "pubGuessE": guess[4],
        "pubLetterGreen": "1",
        "pubLetterYellow": "2",
        "pubLetterGray": "2",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSolnD": solution[3],
        "privSolnE": solution[4],
        "privSalt": BigInt(salt).toString()
      };

      const witness = async () => await circuit.calculateWitness(input, true);

      try {
        witness();
      } catch(err) {
        expect(witness).to.throw(Error);
      }
    });

    it("Should return error for exceeding 26 letters", async function () {
      const circuit = await wasm_tester("contracts/circuits/bonus.circom");

      // ["H", "E", "L", "L", "!"]
      const guess = [8, 5, 12, 12, 28];
      // ["W","O", "R", "L", "D"]
      const solution = [23, 15, 18, 12, 4];
      const salt = "123456789"
      const hash = await poseidonHash([salt, 23, 15, 18, 12, 4]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubGuessD": guess[3],
        "pubGuessE": guess[4],
        "pubLetterGreen": "1",
        "pubLetterYellow": "2",
        "pubLetterGray": "2",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSolnD": solution[3],
        "privSolnE": solution[4],
        "privSalt": BigInt(salt).toString()
      };

      const witness = async () => await circuit.calculateWitness(input, true);

      try {
        witness();
      } catch(err) {
        expect(witness).to.throw(Error);
      }
    });

    it("Should return error for wrong pubLetterYellow/pubLetterGray", async function () {
      const circuit = await wasm_tester("contracts/circuits/bonus.circom");

      // ["H", "E", "L", "L", "O"]
      const guess = [8, 5, 12, 12, 15];
      // ["W","O", "R", "L", "D"]
      const solution = [23, 15, 18, 12, 4];
      const salt = "123456789"
      const hash = await poseidonHash([salt, 23, 15, 18, 12, 4]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubGuessD": guess[3],
        "pubGuessE": guess[4],
        "pubLetterGreen": "1",
        "pubLetterYellow": "1",
        "pubLetterGray": "3",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSolnD": solution[3],
        "privSolnE": solution[4],
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
      const circuit = await wasm_tester("contracts/circuits/bonus.circom");

      // ["H", "E", "L", "L", "O"]
      const guess = [8, 5, 12, 12, 15];
      // ["W","O", "R", "L", "D"]
      const solution = [23, 15, 18, 12, 4];
      const salt = "123456789"
      const hash = await poseidonHash([salt, 23, 15, 18, 12, 4]);
      const input = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubGuessD": guess[3],
        "pubGuessE": guess[4],
        "pubLetterGreen": "1",
        "pubLetterYellow": "2",
        "pubLetterGray": "2",
        "pubSolnHash": BigInt(hash).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSolnD": solution[3],
        "privSolnE": solution[4],
        "privSalt": BigInt(salt).toString()
      };
      const witness = await circuit.calculateWitness(input, true);

      assert(Fr.eq(Fr.e(witness[1]), Fr.e(input.pubSolnHash)));

      const salt2 = "12345678910";
      const hash2 = await poseidonHash([salt2, 23, 15, 18, 12, 4]);
      const input2 = {
        "pubGuessA": guess[0],
        "pubGuessB": guess[1],
        "pubGuessC": guess[2],
        "pubGuessD": guess[3],
        "pubGuessE": guess[4],
        "pubLetterGreen": "1",
        "pubLetterYellow": "2",
        "pubLetterGray": "2",
        "pubSolnHash": BigInt(hash2).toString(),
        "privSolnA": solution[0],
        "privSolnB": solution[1],
        "privSolnC": solution[2],
        "privSolnD": solution[3],
        "privSolnE": solution[4],
        "privSalt": BigInt(salt2).toString()
      };
      const witness2 = await circuit.calculateWitness(input2, true);
      assert(Fr.eq(Fr.e(witness2[1]), Fr.e(input2.pubSolnHash)));

      expect(Fr.eq(Fr.e(witness[1]),Fr.e(witness2[1]))).to.be.false;
    });
});