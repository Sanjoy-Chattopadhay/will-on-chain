const fs = require('fs');
const snarkjs = require('snarkjs');
const crypto = require('crypto');

async function main() {
    // Read Privado credential JSON
    const credentialPath = process.argv[2] || './input/credential.json';
    const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
    
    // Extract data from JSON
    const credSubject = credential.credential.credentialSubject;
    const livenessTimestamp = credSubject.livenessTimestamp;
    const expirationDate = new Date(credential.credential.expirationDate).getTime() / 1000;
    const revocationNonce = credential.credential.credentialStatus.revocationNonce;
    
    // Hash the DID to get a number
    const didString = credSubject.id;
    const didHash = BigInt('0x' + crypto.createHash('sha256').update(didString).digest('hex')) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    // Get current timestamp (you can modify this for testing)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    // For signature, we'll use a dummy value since we're not verifying it
    const signature = BigInt('0x' + credential.credential.proof[0].signature.substring(0, 64));
    
    // Create circuit input
    const input = {
        livenessTimestamp: livenessTimestamp.toString(),
        signature: signature.toString(),
        didHash: didHash.toString(),
        expirationDate: Math.floor(expirationDate).toString(),
        revocationNonce: revocationNonce.toString(),
        currentTimestamp: currentTimestamp.toString()
    };
    
    console.log('\n=== EXTRACTED DATA ===');
    console.log('DID:', didString);
    console.log('DID Hash:', didHash.toString());
    console.log('Liveness Timestamp:', livenessTimestamp);
    console.log('Expiration Date:', expirationDate, '(', new Date(expirationDate * 1000).toISOString(), ')');
    console.log('Revocation Nonce:', revocationNonce);
    console.log('Current Timestamp:', currentTimestamp, '(', new Date(currentTimestamp * 1000).toISOString(), ')');
    console.log('Valid?', currentTimestamp < expirationDate);
    
    // Save input
    fs.writeFileSync('./output/input.json', JSON.stringify(input, null, 2));
    console.log('\n✓ Input saved to output/input.json');
    
    // Generate witness
    console.log('\n=== GENERATING WITNESS ===');
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        './build/liveness_js/liveness.wasm',
        './build/liveness_final.zkey'
    );
    
    console.log('✓ Witness generated');
    console.log('Public Signals:', publicSignals);
    console.log('Output (isValid):', publicSignals[0]);
    console.log('DID Hash:', publicSignals[1]);
    console.log('Expiration Date:', publicSignals[2]);
    console.log('Revocation Nonce:', publicSignals[3]);
    console.log('Current Timestamp:', publicSignals[4]);
    
    // Save proof
    fs.writeFileSync('./output/proof.json', JSON.stringify(proof, null, 2));
    fs.writeFileSync('./output/public.json', JSON.stringify(publicSignals, null, 2));
    console.log('✓ Proof saved to output/proof.json');
    console.log('✓ Public signals saved to output/public.json');
    
    // Verify proof locally
    console.log('\n=== VERIFYING PROOF LOCALLY ===');
    const vKey = JSON.parse(fs.readFileSync('./build/verification_key.json'));
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    console.log('Verification result:', verified ? '✓ VALID' : '✗ INVALID');
    
    // Format for Remix - CORRECTED VERSION
    console.log('\n=== REMIX FUNCTION CALL DATA ===');
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    
    // Parse calldata
    const argv = calldata.replace(/["[\]\s]/g, "").split(',');
    
    const a = [argv[0], argv[1]];
    const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
    const c = [argv[6], argv[7]];
    const inputs = argv.slice(8);
    
    console.log('\n--- For Verifier.verifyProof (to test) ---');
    console.log('a:', JSON.stringify(a));
    console.log('b:', JSON.stringify(b));
    console.log('c:', JSON.stringify(c));
    console.log('input:', JSON.stringify(inputs));
    
    console.log('\n--- For LivenessRegistry.updateLiveness ---');
    console.log('\nCopy these EXACT values into Remix:');
    console.log('\na (uint256[2]):');
    console.log(JSON.stringify(a));
    console.log('\nb (uint256[2][2]):');
    console.log(JSON.stringify(b));
    console.log('\nc (uint256[2]):');
    console.log(JSON.stringify(c));
    console.log('\ndidHash (uint256):');
    console.log(inputs[1]);  // Second public signal is didHash
    console.log('\nexpirationDate (uint256):');
    console.log(inputs[2]);  // Third is expirationDate
    console.log('\nrevocationNonce (uint256):');
    console.log(inputs[3]);  // Fourth is revocationNonce
    console.log('\ncurrentTimestamp (uint256):');
    console.log(inputs[4]);  // Fifth is currentTimestamp
    console.log('\nisValid (uint256):');
    console.log(inputs[0]);  // First is isValid (output from circuit)
    
    // Save formatted output
    const remixData = {
        proof: { a, b, c },
        publicSignals: {
            isValid: inputs[0],
            didHash: inputs[1],
            expirationDate: inputs[2],
            revocationNonce: inputs[3],
            currentTimestamp: inputs[4]
        },
        forUpdateLiveness: {
            a: a,
            b: b,
            c: c,
            didHash: inputs[1],
            expirationDate: inputs[2],
            revocationNonce: inputs[3],
            currentTimestamp: inputs[4],
            isValid: inputs[0]
        }
    };
    fs.writeFileSync('./output/remix_data.json', JSON.stringify(remixData, null, 2));
    console.log('\n✓ Remix data saved to output/remix_data.json');
}

main().then(() => {
    console.log('\n✓✓✓ ALL DONE! ✓✓✓\n');
    process.exit(0);
}).catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});