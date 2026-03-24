pragma circom 2.0.0;

template AgeVerification() {
    signal input birthYear;
    signal input salt;
    signal input willId;
    signal input minimumAge;
    signal input currentYear;
    signal input commitment;
    
    // Verify commitment
    signal computedCommitment;
    computedCommitment <== birthYear + salt + willId;
    commitment === computedCommitment;
    
    // Compute age
    signal age;
    age <== currentYear - birthYear;
    
    // Check age >= minimumAge
    signal ageDiff;
    ageDiff <== age - minimumAge;
    
    // Ensure ageDiff >= 0
    component n2b = Num2Bits(32);
    n2b.in <== ageDiff;
    
    // Sanity checks
    signal yearCheck;
    yearCheck <== birthYear - 1900;
    component yearValid = Num2Bits(32);
    yearValid.in <== yearCheck;
    
    signal futureCheck;
    futureCheck <== currentYear - birthYear;
    component futureValid = Num2Bits(32);
    futureValid.in <== futureCheck;
}

template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;
    var e2 = 1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2 + e2;
    }
    lc1 === in;
}

component main {public [willId, minimumAge, currentYear, commitment]} = AgeVerification();