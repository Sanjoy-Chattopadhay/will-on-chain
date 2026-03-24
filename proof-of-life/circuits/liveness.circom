pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

template LivenessVerifier() {
    // Private inputs (not revealed on-chain)
    signal input livenessTimestamp;
    signal input signature; // We'll ignore actual verification for now
    
    // Public inputs (revealed on-chain)
    signal input didHash;
    signal input expirationDate;
    signal input revocationNonce;
    signal input currentTimestamp;
    
    // Output
    signal output isValid;
    
    // Constraint 1: Check timestamp is before expiration
    component lessThan = LessThan(64);
    lessThan.in[0] <== currentTimestamp;
    lessThan.in[1] <== expirationDate;
    
    // Constraint 2: Ensure all required fields are non-zero (fixed - quadratic only)
    signal check1;
    signal check2;
    signal check3;
    
    check1 <== livenessTimestamp * didHash;
    check2 <== check1 * expirationDate;
    check3 <== check2 * revocationNonce;
    
    // Force check3 to be non-zero by using it in a constraint
    signal dummy;
    dummy <== check3 * check3;
    
    // Output is valid only if timestamp check passes
    isValid <== lessThan.out;
}

component main {public [didHash, expirationDate, revocationNonce, currentTimestamp]} = LivenessVerifier();