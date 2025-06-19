pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template SimpleTest() {
    signal input depositId;
    signal input amount;
    signal output result;
    
    // Test the constraint that's failing
    component depositIdPositive = GreaterThan(64);
    depositIdPositive.in[0] <== depositId;
    depositIdPositive.in[1] <== 0;
    // depositIdPositive.out === 1;  // This might be failing
    
    result <== depositId + amount;
}

component main = SimpleTest(); 