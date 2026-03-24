/**
 * Commitment Generator for Will Owners
 * 
 * This script helps will owners generate birthdateCommitment values
 * to store when adding heirs to their will.
 * 
 * Usage: node scripts/generate_commitment.js
 */

const crypto = require('crypto');
const fs = require('fs');

// Color output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

function log(color, ...args) {
    console.log(color, ...args, colors.reset);
}

function generateRandomSalt() {
    // Generate a random 32-byte salt as a decimal string
    const bytes = crypto.randomBytes(32);
    return BigInt('0x' + bytes.toString('hex')).toString();
}

async function main() {
    log(colors.cyan, '\n╔═══════════════════════════════════════════════════════╗');
    log(colors.cyan, '║   BIRTHDATE COMMITMENT GENERATOR                     ║');
    log(colors.cyan, '║   For Will Owners Adding Heirs                       ║');
    log(colors.cyan, '╚═══════════════════════════════════════════════════════╝\n');

    // =====================================================
    // Load heir information
    // =====================================================
    const inputPath = './input/heir_data.json';
    
    if (!fs.existsSync(inputPath)) {
        log(colors.red, '❌ ERROR: heir_data.json not found!');
        log(colors.yellow, '\nCreate ./input/heir_data.json with:');
        log(colors.yellow, '{');
        log(colors.yellow, '  "heirName": "Bob",');
        log(colors.yellow, '  "birthYear": 2000,');
        log(colors.yellow, '  "willId": 0,');
        log(colors.yellow, '  "minimumAge": 18');
        log(colors.yellow, '}\n');
        process.exit(1);
    }
    
    const heirData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // Validate
    if (!heirData.birthYear || !heirData.willId === undefined) {
        log(colors.red, '❌ ERROR: heir_data.json must contain birthYear and willId');
        process.exit(1);
    }
    
    // =====================================================
    // Generate or use existing salt
    // =====================================================
    let salt;
    
    if (heirData.salt) {
        log(colors.yellow, '⚠️  Using existing salt from heir_data.json');
        salt = heirData.salt;
    } else {
        log(colors.green, '🎲 Generating new random salt...');
        salt = generateRandomSalt();
        
        // Update heir_data.json with the new salt
        heirData.salt = salt;
        fs.writeFileSync(inputPath, JSON.stringify(heirData, null, 2));
        log(colors.green, '✅ Salt saved to heir_data.json');
    }
    
    // =====================================================
    // Compute commitment
    // =====================================================
    log(colors.cyan, '\n📊 Computing commitment...\n');
    
    const commitment = BigInt(heirData.birthYear) + 
                      BigInt(salt) + 
                      BigInt(heirData.willId);
    
    // =====================================================
    // Display results
    // =====================================================
    log(colors.green, '═══════════════════════════════════════════════════════');
    log(colors.green, '  COMMITMENT GENERATED SUCCESSFULLY');
    log(colors.green, '═══════════════════════════════════════════════════════\n');
    
    log(colors.cyan, '📋 HEIR INFORMATION:');
    log(colors.yellow, '   Name:', heirData.heirName || 'Not specified');
    log(colors.yellow, '   Birth Year:', heirData.birthYear);
    log(colors.yellow, '   Will ID:', heirData.willId);
    log(colors.yellow, '   Minimum Age:', heirData.minimumAge || 'Not specified');
    
    log(colors.cyan, '\n🔐 COMMITMENT (store in smart contract):');
    log(colors.green, `   ${commitment.toString()}\n`);
    
    log(colors.cyan, '🔑 SALT (share PRIVATELY with heir):');
    log(colors.yellow, `   ${salt}`);
    
    log(colors.red, '\n⚠️  CRITICAL SECURITY NOTES:');
    log(colors.red, '   1. Send the SALT to your heir through a PRIVATE channel');
    log(colors.red, '   2. Do NOT post the salt publicly (Discord, Telegram, etc.)');
    log(colors.red, '   3. Heir needs this salt to prove their age later');
    log(colors.red, '   4. If salt is lost, heir CANNOT claim inheritance!\n');
    
    // =====================================================
    // Save output
    // =====================================================
    fs.mkdirSync('./output', { recursive: true });
    
    const output = {
        heirName: heirData.heirName,
        willId: heirData.willId,
        minimumAge: heirData.minimumAge || 18,
        commitment: commitment.toString(),
        saltForHeir: salt,
        instructions: {
            step1: 'Copy the commitment value into addHeir() function',
            step2: 'Send the salt PRIVATELY to your heir (text, Signal, etc.)',
            step3: 'Heir will use this salt to generate proof when claiming inheritance',
            warning: 'If salt is lost, heir cannot prove age!'
        },
        smartContractCall: {
            function: 'addHeir',
            parameters: {
                _willId: heirData.willId,
                _heirAddress: '<HEIR_WALLET_ADDRESS>',
                _sharePercentage: '<PERCENTAGE_e.g._5000_for_50%>',
                _birthdateCommitment: commitment.toString(),
                _minimumAge: heirData.minimumAge || 18,
                _vestingPeriod: '<OPTIONAL_VESTING_SECONDS>'
            }
        },
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
        './output/commitment.json',
        JSON.stringify(output, null, 2)
    );
    
    log(colors.green, '✅ Commitment saved to ./output/commitment.json');
    
    // =====================================================
    // Display Remix instructions
    // =====================================================
    log(colors.cyan, '\n╔═══════════════════════════════════════════════════════╗');
    log(colors.cyan, '║   REMIX IDE INSTRUCTIONS                             ║');
    log(colors.cyan, '╚═══════════════════════════════════════════════════════╝\n');
    
    log(colors.yellow, '1. Open WillManager contract in Remix');
    log(colors.yellow, '2. Call function: addHeir');
    log(colors.yellow, '3. Use these values:\n');
    
    log(colors.cyan, '   _willId:', colors.yellow, heirData.willId);
    log(colors.cyan, '   _heirAddress:', colors.yellow, '<YOUR_HEIR_WALLET_ADDRESS>');
    log(colors.cyan, '   _sharePercentage:', colors.yellow, '<e.g. 5000 for 50%>');
    log(colors.cyan, '   _birthdateCommitment:', colors.yellow, commitment.toString());
    log(colors.cyan, '   _minimumAge:', colors.yellow, heirData.minimumAge || 18);
    log(colors.cyan, '   _vestingPeriod:', colors.yellow, '<OPTIONAL: 0 for none>\n');
    
    log(colors.green, '✅ Done! Don\'t forget to send the salt to your heir privately.\n');
}

main().catch(error => {
    log(colors.red, '❌ Error:', error.message);
    process.exit(1);
});