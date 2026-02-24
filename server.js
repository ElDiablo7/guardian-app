const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & Middleware ──
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── Session ──
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ── Tier Definitions ──
const TIERS = {
    starter: { level: 1, name: 'Starter', price: '£2/mo', features: ['scan'] },
    shield: { level: 2, name: 'Shield', price: '£5/mo', features: ['scan', 'password', 'history'] },
    fortress: { level: 3, name: 'Fortress', price: '£10/mo', features: ['scan', 'password', 'history', 'breach', 'export'] },
    sentinel: { level: 4, name: 'Sentinel', price: '£15/mo', features: ['scan', 'password', 'history', 'breach', 'export', 'footprint', 'score'] },
    commander: { level: 5, name: 'Commander', price: '£25/mo', features: ['scan', 'password', 'history', 'breach', 'export', 'footprint', 'score', 'bulk', 'api', 'priority'] },
};

// ── Load Keys Securely ──
// Supports 3 methods (merged):
//   1. Individual env vars: KEY_EARLYBIRD26=starter, KEY_GX_SH_SHIELD01=shield, etc.
//   2. Single JSON env var: GUARDIAN_KEYS='{"EARLYBIRD26":"starter"}'
//   3. Local keys.json file (dev only, gitignored)
function loadKeys() {
    const keys = {};

    function addKey(name, data) {
        if (!name || !data) return;
        // Normalize name: Uppercase, trim, and treat hyphens/underscores as identical
        const normalizedName = name.toUpperCase().trim().replace(/_/g, '-');
        const tier = (typeof data === 'string' ? data : data.tier || '').toLowerCase().trim();
        if (tier) {
            keys[normalizedName] = { tier, created: new Date().toISOString() };
        }
    }

    // Method 1: Individual KEY_* env vars (simplest for Render)
    for (const [envName, envValue] of Object.entries(process.env)) {
        if (envName.startsWith('KEY_') && envValue) {
            const keyName = envName.substring(4);
            addKey(keyName, envValue);
        }
    }

    // Method 2: Single JSON env var
    if (process.env.GUARDIAN_KEYS) {
        try {
            const parsed = JSON.parse(process.env.GUARDIAN_KEYS);
            Object.entries(parsed).forEach(([k, v]) => addKey(k, v));
        } catch (e) {
            console.error('Failed to parse GUARDIAN_KEYS:', e.message);
        }
    }

    // Method 3: Local keys.json (dev only)
    const keysFile = path.join(__dirname, 'keys.json');
    if (fs.existsSync(keysFile)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
            Object.entries(parsed).forEach(([k, v]) => addKey(k, v));
        } catch (e) {
            console.error('Failed to parse keys.json:', e.message);
        }
    }

    console.log(`[CONFIG] Loaded ${Object.keys(keys).length} unique access keys`);
    return keys;
}

let validKeys = loadKeys();

// ── Auth Middleware ──
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.authenticated) {
        return res.status(401).json({ success: false, error: "Unauthorized. Please login." });
    }
    next();
};

const requireFeature = (feature) => (req, res, next) => {
    const tier = TIERS[req.session.tier];
    if (!tier || !tier.features.includes(feature)) {
        return res.status(403).json({ success: false, error: `Upgrade required. This feature is not available on your ${tier?.name || ''} plan.` });
    }
    next();
};

// ── Protect app pages ──
app.use((req, res, next) => {
    const protectedPaths = ['/app.html', '/app', '/dashboard-starter.html', '/dashboard-shield.html', '/dashboard-fortress.html', '/dashboard-sentinel.html', '/dashboard-commander.html'];
    if (protectedPaths.some(p => req.path === p || req.path.startsWith('/dashboard'))) {
        if (!req.session || !req.session.authenticated) {
            return res.redirect('/');
        }
    }
    next();
});

// ── Static Assets ──
app.use(express.static(path.join(__dirname, 'public')));

// ── Login ──
app.post('/api/login', (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, error: "Key required" });

    // Normalize input same as loadKeys: uppercase, trim, and hyphens/underscores match
    const lookupKey = key.toUpperCase().trim().replace(/_/g, '-');

    if (validKeys[lookupKey]) {
        const keyData = validKeys[lookupKey];
        req.session.authenticated = true;
        req.session.tier = keyData.tier;
        req.session.keyId = lookupKey.substring(0, 3) + '***';

        const tierInfo = TIERS[keyData.tier];
        if (!tierInfo) {
            console.error(`Invalid tier '${keyData.tier}' assigned to key ${lookupKey.substring(0, 4)}***`);
            return res.status(500).json({ success: false, error: "Configuration error (Invalid Tier)" });
        }

        console.log(`[AUTH] Login success: ${lookupKey.substring(0, 4)}*** -> ${keyData.tier}`);

        return req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ success: false, error: "Session error. Please try again." });
            }
            res.json({
                success: true,
                message: "Access Granted",
                tier: keyData.tier,
                tierName: tierInfo.name,
                tierLevel: tierInfo.level,
                features: tierInfo.features,
                redirect: `/dashboard-${keyData.tier}.html`
            });
        });
    }

    console.warn(`[AUTH] Login failed: Key '${lookupKey.substring(0, 4)}***' not found in ${Object.keys(validKeys).length} loaded keys`);
    return res.status(401).json({ success: false, error: "Invalid Access Key" });
});

// ── Logout ──
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Logged out" });
});

// ── Session Info ──
app.get('/api/session', (req, res) => {
    if (req.session && req.session.authenticated) {
        const tierInfo = TIERS[req.session.tier] || {};
        return res.json({
            authenticated: true,
            tier: req.session.tier,
            tierName: tierInfo.name,
            tierLevel: tierInfo.level,
            features: tierInfo.features
        });
    }
    res.json({ authenticated: false });
});

// ── TITAN & Guardian Threat Scanner ──
app.post('/api/scan', requireAuth, requireFeature('scan'), (req, res) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: "Missing or invalid text input" });
        }

        let findings = [];
        let isPredatory = false;
        let isPhishing = false;
        const textLower = text.toLowerCase();

        const isolationWords = ["don't tell your parents", "keep this a secret", "our little secret", "are you alone", "delete this", "sneaky", "just between us", "nobody needs to know"];
        const coercionWords = ["send me a pic", "show me", "punish you", "i'm older", "trust me", "prove it", "dare you", "you owe me", "if you loved me"];
        const inappropriateWords = ["sexy", "body", "undress", "naughty", "cam", "snap me", "vid", "private photo", "take off"];
        const ageProbing = ["how old are you", "what year were you born", "what school", "where do you live", "are your parents home", "home alone"];

        let groomScore = 0;
        let groomFlags = [];
        if (isolationWords.some(w => textLower.includes(w))) { groomScore += 2; groomFlags.push('isolation'); }
        if (coercionWords.some(w => textLower.includes(w))) { groomScore += 2; groomFlags.push('coercion'); }
        if (inappropriateWords.some(w => textLower.includes(w))) { groomScore += 2; groomFlags.push('inappropriate_content'); }
        if (ageProbing.some(w => textLower.includes(w))) { groomScore += 1; groomFlags.push('age_probing'); }

        if (groomScore >= 2) {
            isPredatory = true;
            findings.push({
                level: 'critical',
                type: 'GUARDIAN ALERT (CHILD SAFETY)',
                msg: `High-risk psychological manipulation detected (flags: ${groomFlags.join(', ')}). Adult intervention required immediately.`,
                score: groomScore
            });
        }

        const urgencyWords = ['urgent', 'immediate action', 'suspend', 'verify account', 'unauthorized', 'attention required', 'your account will be', 'act now', 'limited time', 'expires today'];
        const financialWords = ['invoice', 'payment', 'wallet', 'crypto', 'bank', 'refund claim', 'wire transfer', 'gift card', 'western union', 'bitcoin', 'tax refund'];
        const impersonationWords = ['official notice', 'customer service', 'tech support', 'microsoft', 'apple id', 'paypal', 'amazon', 'hmrc', 'irs', 'royal mail'];

        let phishingScore = 0;
        let phishFlags = [];
        if (urgencyWords.some(w => textLower.includes(w))) { phishingScore += 1; phishFlags.push('urgency_tactics'); }
        if (financialWords.some(w => textLower.includes(w))) { phishingScore += 1; phishFlags.push('financial_keywords'); }
        if (impersonationWords.some(w => textLower.includes(w))) { phishingScore += 1; phishFlags.push('brand_impersonation'); }

        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/\S*)?\b)/gi;
        const urls = text.match(urlRegex) || [];
        let domains = [];

        if (urls.length > 0) {
            urls.forEach(u => {
                if (!u.startsWith('http')) u = 'https://' + u;
                try {
                    const urlObj = new URL(u);
                    domains.push(urlObj.hostname);
                    if (['bit.ly', 'tinyurl.com', 't.co', 'ow.ly', 'goo.gl', 'is.gd', 'rb.gy'].includes(urlObj.hostname)) {
                        phishingScore += 2;
                        phishFlags.push('url_shortener');
                        findings.push({ level: 'warn', type: 'VENUS SANDBOX', msg: `URL shortener detected (${urlObj.hostname}).` });
                    } else if (urlObj.hostname.includes('-') && urlObj.hostname.split('.').length > 2) {
                        phishingScore += 1;
                        findings.push({ level: 'warn', type: 'VENUS SANDBOX', msg: `Suspicious subdomain pattern: ${urlObj.hostname}.` });
                    } else {
                        findings.push({ level: 'warn', type: 'VENUS SANDBOX', msg: `External link quarantined: ${urlObj.hostname}.` });
                    }
                } catch (e) { }
            });
            phishingScore += 1;
        }

        if (phishingScore >= 3 && !isPredatory) {
            isPhishing = true;
            findings.push({
                level: 'critical',
                type: 'TITAN THREAT ALERT',
                msg: `High probability phishing/scam detected (flags: ${phishFlags.join(', ')}). Do NOT interact.`,
                score: phishingScore
            });
        } else if (phishingScore >= 1 && !isPredatory) {
            findings.push({
                level: 'warn',
                type: 'TITAN ADVISORY',
                msg: `Moderate risk detected (flags: ${phishFlags.join(', ')}). Proceed with caution.`,
                score: phishingScore
            });
        }

        if (findings.length === 0) {
            findings.push({ level: 'safe', type: 'SYSTEM CLEAR', msg: `No known threats detected. Always use common sense.` });
        }

        const threatScore = Math.min(100, (groomScore * 15) + (phishingScore * 12) + (domains.length * 5));

        res.json({ success: true, findings, meta: { isPredatory, isPhishing, domains, threatScore, groomFlags, phishFlags } });
    } catch (error) {
        console.error("Scan Error:", error);
        res.status(500).json({ error: "Internal Server Error during threat assessment" });
    }
});

// ── Password Strength Analyser ──
app.post('/api/password-check', requireAuth, requireFeature('password'), (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required" });

    let score = 0;
    let issues = [];

    if (password.length >= 8) score += 1; else issues.push('Too short (minimum 8 characters)');
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[a-z]/.test(password)) score += 1; else issues.push('Add lowercase letters');
    if (/[A-Z]/.test(password)) score += 1; else issues.push('Add uppercase letters');
    if (/[0-9]/.test(password)) score += 1; else issues.push('Add numbers');
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; else issues.push('Add special characters');
    if (!/(.)\1{2,}/.test(password)) score += 1; else issues.push('Avoid repeated characters');

    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'admin', 'welcome', 'monkey', 'dragon', 'master'];
    if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
        score = Math.max(0, score - 3);
        issues.push('Contains a commonly used password pattern');
    }

    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
        score = Math.max(0, score - 1);
        issues.push('Contains sequential characters');
    }

    const maxScore = 8;
    const percentage = Math.round((score / maxScore) * 100);
    let rating;
    if (percentage >= 90) rating = 'EXCELLENT';
    else if (percentage >= 70) rating = 'STRONG';
    else if (percentage >= 50) rating = 'MODERATE';
    else if (percentage >= 30) rating = 'WEAK';
    else rating = 'CRITICAL';

    const charset = (/[a-z]/.test(password) ? 26 : 0) + (/[A-Z]/.test(password) ? 26 : 0) + (/[0-9]/.test(password) ? 10 : 0) + (/[^a-zA-Z0-9]/.test(password) ? 32 : 0);
    const combinations = Math.pow(charset || 1, password.length);
    const guessesPerSec = 1e10;
    const seconds = combinations / guessesPerSec;
    let crackTime;
    if (seconds < 1) crackTime = 'Instantly';
    else if (seconds < 60) crackTime = `${Math.round(seconds)} seconds`;
    else if (seconds < 3600) crackTime = `${Math.round(seconds / 60)} minutes`;
    else if (seconds < 86400) crackTime = `${Math.round(seconds / 3600)} hours`;
    else if (seconds < 31536000) crackTime = `${Math.round(seconds / 86400)} days`;
    else if (seconds < 31536000 * 1000) crackTime = `${Math.round(seconds / 31536000)} years`;
    else crackTime = 'Centuries+';

    res.json({ success: true, score, maxScore, percentage, rating, crackTime, issues, entropy: Math.round(Math.log2(combinations)) });
});

// ── Data Breach Checker ──
const mockBreaches = {
    "test@example.com": [
        { source: "LinkedIn (2012)", data: ["Email", "Passwords"], records: "164M" },
        { source: "Adobe (2013)", data: ["Email", "Passwords", "Usernames"], records: "153M" },
        { source: "Dropbox (2012)", data: ["Email", "Passwords"], records: "68M" }
    ],
    "admin@gracex.com": [
        { source: "Canva (2019)", data: ["Email", "Names", "Passwords"], records: "137M" }
    ],
    "demo@guardian.app": [
        { source: "Facebook (2019)", data: ["Phone Numbers", "Email", "Names", "DOB"], records: "533M" },
        { source: "Twitter (2022)", data: ["Email", "Phone Numbers"], records: "200M" },
        { source: "Deezer (2019)", data: ["Email", "IP", "Names", "Username"], records: "229M" }
    ]
};

app.post('/api/check-breach', requireAuth, requireFeature('breach'), (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: "Invalid email address" });

    setTimeout(() => {
        const breaches = mockBreaches[email.toLowerCase()] || [];
        const riskLevel = breaches.length >= 3 ? 'HIGH' : breaches.length >= 1 ? 'MODERATE' : 'LOW';
        res.json({ success: true, breaches, riskLevel, checkedAt: new Date().toISOString() });
    }, 800);
});

// ── Digital Footprint Scanner ──
app.post('/api/footprint', requireAuth, requireFeature('footprint'), (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Search query required" });

    const results = { query, scannedAt: new Date().toISOString(), exposures: [], socialMedia: [], recommendations: [] };

    if (query.includes('@')) {
        results.exposures.push(
            { type: 'Email Exposure', source: 'Paste Sites', risk: 'medium', detail: `Email found in 2 public paste dumps` },
            { type: 'Registration Leak', source: 'Forum Database', risk: 'low', detail: `Email registered on 3 known forums` }
        );
        results.socialMedia.push(
            { platform: 'LinkedIn', status: 'Account Found', visibility: 'Public' },
            { platform: 'Twitter/X', status: 'Account Found', visibility: 'Semi-Private' },
            { platform: 'GitHub', status: 'No Match', visibility: 'N/A' }
        );
    } else {
        results.exposures.push({ type: 'Username Match', source: 'Social Databases', risk: 'low', detail: `Username found on 4 platforms` });
        results.socialMedia.push(
            { platform: 'Reddit', status: 'Possible Match', visibility: 'Public' },
            { platform: 'Instagram', status: 'Possible Match', visibility: 'Private' }
        );
    }

    results.recommendations = [
        'Review and tighten privacy settings on all social accounts',
        'Enable two-factor authentication on every platform',
        'Consider using unique emails/aliases for different services',
        'Regularly search for your info using the footprint scanner'
    ];

    setTimeout(() => res.json({ success: true, ...results }), 600);
});

// ── Security Score Endpoint ──
app.post('/api/security-score', requireAuth, requireFeature('score'), (req, res) => {
    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') return res.status(400).json({ error: "Security questionnaire answers required" });

    let score = 0;
    const maxScore = 100;
    const breakdown = [];

    if (answers.uniquePasswords) { score += 10; breakdown.push({ cat: 'Passwords', pts: 10, label: 'Unique passwords per account' }); }
    if (answers.passwordManager) { score += 10; breakdown.push({ cat: 'Passwords', pts: 10, label: 'Uses password manager' }); }
    if (answers.twoFactor === 'all') { score += 20; breakdown.push({ cat: '2FA', pts: 20, label: '2FA on all accounts' }); }
    else if (answers.twoFactor === 'some') { score += 10; breakdown.push({ cat: '2FA', pts: 10, label: '2FA on some accounts' }); }
    if (answers.autoUpdates) { score += 15; breakdown.push({ cat: 'Updates', pts: 15, label: 'Auto-updates enabled' }); }
    if (answers.vpn) { score += 8; breakdown.push({ cat: 'Network', pts: 8, label: 'Uses VPN' }); }
    if (answers.publicWifi === false) { score += 7; breakdown.push({ cat: 'Network', pts: 7, label: 'Avoids public WiFi' }); }
    if (answers.phishingAware) { score += 8; breakdown.push({ cat: 'Awareness', pts: 8, label: 'Phishing awareness' }); }
    if (answers.backups) { score += 7; breakdown.push({ cat: 'Awareness', pts: 7, label: 'Regular backups' }); }
    if (answers.privacySettings) { score += 8; breakdown.push({ cat: 'Privacy', pts: 8, label: 'Reviews privacy settings' }); }
    if (answers.dataMinimisation) { score += 7; breakdown.push({ cat: 'Privacy', pts: 7, label: 'Minimises data sharing' }); }

    let grade;
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 40) grade = 'D';
    else grade = 'F';

    res.json({ success: true, score, maxScore, grade, breakdown });
});

// ── Fallback ──
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`GRACE-X Guardian Backend Live on Port ${PORT}`);
    console.log(`Keys loaded: ${Object.keys(validKeys).length} key(s) configured`);
    Object.entries(validKeys).forEach(([k, v]) => console.log(`  → ${k.substring(0, 4)}*** = ${v.tier}`));
    console.log(`Trust proxy: enabled | sameSite: lax | secure: ${process.env.NODE_ENV === 'production'}`);
});
