const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const keysFile = path.join(__dirname, 'keys.json');
const args = process.argv.slice(2);

if (args.length === 0 || !['basic', 'standard', 'pro'].includes(args[0].toLowerCase())) {
    console.log("Usage: node generate-key.js <tier>");
    console.log("Allowed Tiers: basic | standard | pro");
    process.exit(1);
}

const tier = args[0].toLowerCase();
const prefix = tier === 'basic' ? 'B' : (tier === 'standard' ? 'S' : 'P');

// Generate random key e.g., GX26-S-A1B2C3D4
const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
const newKey = `GX26-${prefix}-${randomPart}`;

let validKeys = {};
if (fs.existsSync(keysFile)) {
    try {
        validKeys = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
    } catch (e) {
        console.error("Warning: Could not parse existing keys.json. Initializing new file.");
    }
}

validKeys[newKey] = {
    tier: tier,
    created: new Date().toISOString()
};

fs.writeFileSync(keysFile, JSON.stringify(validKeys, null, 2));

console.log(`\n=============================================`);
console.log(`✅ Successfully generated new [${tier.toUpperCase()}] key`);
console.log(`=============================================`);
console.log(`\n➡  ${newKey}\n`);
console.log(`Key added to keys.json. Provide this to the customer.`);
console.log(`=============================================\n`);
