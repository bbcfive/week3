// [bonus] implement an example game from part d
pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

template ZkWordle() {
  // Public inputs
  signal input pubGuessA;
  signal input pubGuessB;
  signal input pubGuessC;
  signal input pubGuessD;
  signal input pubGuessE;
  signal input pubLetterGreen;
  signal input pubLetterYellow;
  signal input pubLetterGray;
  signal input pubSolnHash;

  // Private inputs
  signal input privSolnA;
  signal input privSolnB;
  signal input privSolnC;
  signal input privSolnD;
  signal input privSolnE;
  signal input privSalt;

  // Output
  signal output solnHashOut;

  var guess[5] = [pubGuessA, pubGuessB, pubGuessC, pubGuessD, pubGuessE];
  var soln[5] =  [privSolnA, privSolnB, privSolnC, privSolnD,  privSolnE];
  var j = 0;
  var k = 0;

  component lessThan[10];

  // Create a constraint around the Guess input digits are all less than 26(English has 26 letters).
  for (j=0; j<5; j++) {
    lessThan[j] = LessThan(5);
    lessThan[j].in[0] <== guess[j];
    lessThan[j].in[1] <== 26;
    lessThan[j].out === 1;
    lessThan[j+5] = LessThan(5);
    lessThan[j+5].in[0] <== soln[j];
    lessThan[j+5].in[1] <== 26;
    lessThan[j+5].out === 1;
  }

  // Count green & yellow & gray
  // Green is hit, yellow is blow, gray is nothing
  var green = 0;
  var yellow = 0;
  var gray = 0;
  component equalGYG[25];

  for (j=0; j<5; j++) {
      for (k=0; k<5; k++) {
          equalGYG[5*j+k] = IsEqual();
          equalGYG[5*j+k].in[0] <== soln[j];
          equalGYG[5*j+k].in[1] <== guess[k];
          yellow += equalGYG[5*j+k].out;
          if (j == k) {
              green += equalGYG[5*j+k].out;
              yellow -= equalGYG[5*j+k].out;
          }
      }
  }
  gray = 5 - green - yellow;

  // Create a constraint around the number of green
  component equalGreen = IsEqual();
  equalGreen.in[0] <== pubLetterGreen;
  equalGreen.in[1] <== green;
  equalGreen.out === 1;
  
  // Create a constraint around the number of yellow
  component equalYellow = IsEqual();
  equalYellow.in[0] <== pubLetterYellow;
  equalYellow.in[1] <== yellow;
  equalYellow.out === 1;

  // Create a constraint around the number of gray
  component equalGray = IsEqual();
  equalGray.in[0] <== pubLetterGray;
  equalGray.in[1] <== gray;
  equalGray.out === 1;

  // Verify that the hash of the private solution matches pubSolnHash
  component poseidon = Poseidon(6);
  poseidon.inputs[0] <== privSalt;
  poseidon.inputs[1] <== privSolnA;
  poseidon.inputs[2] <== privSolnB;
  poseidon.inputs[3] <== privSolnC;
  poseidon.inputs[4] <== privSolnD;
  poseidon.inputs[5] <== privSolnE;
  
  solnHashOut <== poseidon.out;
  pubSolnHash === solnHashOut;
}

component main {public [pubGuessA, pubGuessB, pubGuessC, pubGuessD, pubGuessE, pubLetterGreen, pubLetterYellow, pubLetterGray, pubSolnHash]} = ZkWordle();