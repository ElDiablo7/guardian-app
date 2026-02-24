const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Secure Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'gx26-guardian-fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Require auth middleware
const requireAuth = (req, res, next) => {
    // In actual production, ensure req.session is strictly verified
    if (!req.session || !req.session.authenticated) {
        return res.status(401).json({ success: false, error: "Unauthorized access. Please login." });
    }
    next();
};

// Protect the app.html file serving
app.use((req, res, next) => {
    if (req.path === '/app.html' || req.path === '/app') {
        if (!req.session || !req.session.authenticated) {
            return res.redirect('/');
        }
    }
    next();
});

// Load static assets
app.use(express.static(path.join(__dirname, 'public')));

// The TITAN & Guardian Analysis Endpoint
app.post('/api/scan', requireAuth, (req, res) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: "Missing or invalid text input" });
        }

        let findings = [];
        let isPredatory = false;
        let isPhishing = false;
        const textLower = text.toLowerCase();

        // Guardian Module: Predatory / Grooming NLP Patterns
        const isolationWords = ["don't tell your parents", "keep this a secret", "our little secret", "are you alone", "delete this", "sneaky"];
        const coercionWords = ["send me a pic", "show me", "punish you", "i'm older", "trust me", "prove it"];
        const inappropriateWords = ["sexy", "body", "undress", "naughty", "cam", "snap me", "vid"];

        let groomScore = 0;
        if (isolationWords.some(w => textLower.includes(w))) groomScore += 2;
        if (coercionWords.some(w => textLower.includes(w))) groomScore += 2;
        if (inappropriateWords.some(w => textLower.includes(w))) groomScore += 2;

        if (groomScore >= 2) {
            isPredatory = true;
            findings.push({
                level: 'critical',
                type: 'GUARDIAN ALERT (CHILD SAFETY)',
                msg: `High-risk psychological manipulation detected. The text contains phrases commonly used by predators to isolate victims, demand secrecy, or coerce inappropriate material. Adult intervention required immediately.`
            });
        }

        // TITAN Module: Phishing & Financial Scams
        const urgencyWords = ['urgent', 'immediate action', 'suspend', 'verify account', 'unauthorized', 'attention required'];
        const financialWords = ['invoice', 'payment', 'wallet', 'crypto', 'bank', 'refund claim'];

        let phishingScore = 0;
        if (urgencyWords.some(w => textLower.includes(w))) phishingScore += 1;
        if (financialWords.some(w => textLower.includes(w))) phishingScore += 1;

        // URL Extraction (Venus Sandbox)
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/\S*)?\b)/gi;
        const urls = text.match(urlRegex) || [];
        let domains = [];

        if (urls.length > 0) {
            urls.forEach(u => {
                if (!u.startsWith('http')) u = 'https://' + u;
                try {
                    const urlObj = new URL(u);
                    domains.push(urlObj.hostname);

                    if (['bit.ly', 'tinyurl.com', 't.co', 'ow.ly'].includes(urlObj.hostname)) {
                        phishingScore += 2;
                        findings.push({ level: 'warn', type: 'VENUS SANDBOX', msg: `URL shortener detected (${urlObj.hostname}). Attackers use these to hide the true direction.` });
                    } else {
                        findings.push({ level: 'warn', type: 'VENUS SANDBOX', msg: `External link extracted safely: ${urlObj.hostname}. Do not click directly.` });
                    }
                } catch (e) { }
            });
            phishingScore += 1;
        }

        if (phishingScore >= 2 && !isPredatory) {
            isPhishing = true;
            findings.push({
                level: 'critical',
                type: 'TITAN THREAT ALERT',
                msg: `High probability of a phishing or financial scam. The message combines high-pressure urgency tactics, financial keywords, and links.`
            });
        } else if (phishingScore === 1 && !isPredatory) {
            findings.push({
                level: 'warn',
                type: 'TITAN ADVISORY',
                msg: `Moderate risk detected. The text contains some marketing or urgency keywords. Proceed with caution.`
            });
        }

        if (findings.length === 0) {
            findings.push({
                level: 'safe',
                type: 'SYSTEM CLEAR',
                msg: `No known predatory grooming or severe phishing signatures were detected. Use common sense.`
            });
        }

        // Construct the payload
        res.json({
            success: true,
            findings,
            meta: {
                isPredatory,
                isPhishing,
                domains
            }
        });

    } catch (error) {
        console.error("Scan Error:", error);
        res.status(500).json({ error: "Internal Server Error during threat assessment" });
    }
});

// Mock Data Breach Database (for demo/standalone purposes)
const mockBreaches = {
    "test@example.com": [
        { source: "LinkedIn (2012)", data: ["Email", "Passwords"] },
        { source: "Adobe (2013)", data: ["Email", "Passwords", "Usernames"] }
    ],
    "admin@gracex.com": [
        { source: "Canva (2019)", data: ["Email", "Names", "Passwords"] }
    ]
};

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, error: "Key required" });

    // Load dynamically from keys.json
    const keysFile = path.join(__dirname, 'keys.json');
    let validKeys = {};
    if (fs.existsSync(keysFile)) {
        try { validKeys = JSON.parse(fs.readFileSync(keysFile, 'utf8')); } catch (e) { }
    }

    const uppercaseKey = key.toUpperCase();

    // Check if key exists and is valid
    if (validKeys[uppercaseKey]) {
        const keyData = validKeys[uppercaseKey];
        // Establish Session
        req.session.authenticated = true;
        req.session.tier = keyData.tier; // basic, standard, pro
        req.session.keyId = uppercaseKey;

        return res.json({ success: true, message: "Access Granted", tier: keyData.tier });
    }

    return res.status(401).json({ success: false, error: "Invalid Access Key" });
});

// Logout Endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Logged out" });
});

// Data Breach Checker Endpoint
app.post('/api/check-breach', requireAuth, (req, res) => {
    if (req.session.tier === 'basic') {
        return res.status(403).json({ error: "Please upgrade to Standard or Pro to use the Data Breach Checker." });
    }

    const { email } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    // Simulate network delay for realism
    setTimeout(() => {
        const breaches = mockBreaches[email.toLowerCase()] || [];
        res.json({ success: true, breaches });
    }, 800);
});

// Fallback route for SPA / direct file access
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`GRACE-X Guardian Backend Live on Port ${PORT}`);
});
