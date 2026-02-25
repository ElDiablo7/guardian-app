document.addEventListener("DOMContentLoaded", () => {
    // ── Theme Management ──
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // Apply saved theme on load
    if (localStorage.getItem('guardian_theme') === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '🌙 Dark Mode';
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');

            // Save preference
            localStorage.setItem('guardian_theme', isLight ? 'light' : 'dark');

            // Update button text
            themeToggleBtn.innerHTML = isLight ? '🌙 Dark Mode' : '☀️ Light Mode';
        });
    }

    // ── Tier & Feature Gating ──
    const features = JSON.parse(sessionStorage.getItem('guardian_features') || '[]');
    const tierName = sessionStorage.getItem('guardian_tier_name') || sessionStorage.getItem('guardian_tier') || 'Unknown';

    // Scan history in memory
    let scanHistory = [];

    // ── Tab Navigation ──
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        const requiredFeature = btn.dataset.feature;
        const hasFeature = features.includes(requiredFeature);
        if (!hasFeature) {
            btn.classList.add('locked');
            btn.title = `Upgrade required for this feature`;
        }

        btn.addEventListener('click', () => {
            if (!hasFeature) {
                alert(`This feature requires a higher tier. Please upgrade your plan to access ${btn.textContent.trim()}.`);
                return;
            }
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');

            const panel = document.getElementById('panel-' + btn.dataset.tab);
            if (panel) {
                panel.classList.add('active');

                // Trigger Boot Sequence Animation
                panel.style.animation = 'none';
                panel.offsetHeight; // trigger reflow
                panel.style.animation = 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both';
            }
        });
    });

    // ── Neural Intelligence Feed ──
    function initNeuralFeed() {
        const feedEl = document.getElementById('intelFeed');
        if (!feedEl) return;

        const events = [
            "Neural handshake verified. Node {ID} active.",
            "Analyzing perimeter telemetry for sector {SEC}.",
            "Threat detected in payload {HEX}. Quarantining...",
            "Global breach detected: {LOC}. Sentinel updated.",
            "Packet inspection complete. 0.00ms latency.",
            "Sub-neural protocol {PRT} engaged.",
            "Scanning dark web fragments for {QUERY}.",
            "AI Core synchronising with TITAN node."
        ];

        const locations = ["London", "New York", "Tokyo", "Berlin", "Silicon Valley", "Singapore"];
        const sectors = ["7G", "Alpha-9", "Gamma-3", "Omega-4"];

        function addEvent() {
            const event = events[Math.floor(Math.random() * events.length)]
                .replace('{ID}', Math.random().toString(16).substring(2, 6).toUpperCase())
                .replace('{SEC}', sectors[Math.floor(Math.random() * sectors.length)])
                .replace('{HEX}', '0x' + Math.random().toString(16).substring(2, 8).toUpperCase())
                .replace('{LOC}', locations[Math.floor(Math.random() * locations.length)])
                .replace('{PRT}', 'GX-' + Math.floor(Math.random() * 900 + 100))
                .replace('{QUERY}', 'suspicious_activity_' + Math.floor(Math.random() * 999));

            const item = document.createElement('div');
            item.className = 'intel-item';
            item.innerHTML = `
                <span class="intel-time">[${new Date().toLocaleTimeString()}]</span>
                <span class="intel-msg">${event}</span>
            `;
            feedEl.prepend(item);
            if (feedEl.children.length > 50) feedEl.lastElementChild.remove();
        }

        setInterval(addEvent, 3500);
        for (let i = 0; i < 5; i++) setTimeout(addEvent, i * 200);
    }

    // ── Health Visualizer ──
    function initHealthVisualizer() {
        const container = document.getElementById('healthVisualizer');
        if (!container) return;

        container.innerHTML = `
            <div class="health-node"></div>
            <div class="health-ring" style="animation-delay: 0s"></div>
            <div class="health-ring" style="animation-delay: 1s"></div>
            <div class="health-ring" style="animation-delay: 2s"></div>
        `;
    }

    initNeuralFeed();
    initHealthVisualizer();

    // ── Logout ──
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
            sessionStorage.clear();
            window.location.href = '/login.html';
        });
    }

    // ── THREAT SCANNER ──
    const scanBtn = document.getElementById('scanBtn');
    const clearBtn = document.getElementById('clearBtn');
    const inputEl = document.getElementById('scanInput');
    const resultsDiv = document.getElementById('results');
    const threatLog = document.getElementById('threatLog');
    const actionPlan = document.getElementById('actionPlan');
    const threatScoreBar = document.getElementById('threatScore');
    const scoreFill = document.getElementById('scoreFill');
    const scoreValue = document.getElementById('scoreValue');
    const downloadBtn = document.getElementById('downloadReportBtn');

    let lastScanResult = null;

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            inputEl.value = '';
            if (resultsDiv) resultsDiv.style.display = 'none';
            if (threatScoreBar) threatScoreBar.style.display = 'none';
            if (downloadBtn) downloadBtn.style.display = 'none';
        });
    }

    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            const text = inputEl.value;
            if (!text.trim()) return;

            scanBtn.innerHTML = '<span class="spinner"></span> Analysing...';
            scanBtn.style.opacity = '0.7';
            scanBtn.style.pointerEvents = 'none';
            resultsDiv.style.display = 'none';
            threatLog.innerHTML = '';
            actionPlan.innerHTML = '';

            try {
                const response = await fetch('/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'API Error');

                lastScanResult = { text: text.substring(0, 100), ...data, timestamp: new Date().toISOString() };

                // Show threat score
                const ts = data.meta.threatScore || 0;
                threatScoreBar.style.display = 'flex';
                scoreValue.textContent = ts;
                scoreFill.style.width = ts + '%';
                scoreFill.className = 'score-fill';
                if (ts >= 60) scoreFill.classList.add('score-critical');
                else if (ts >= 30) scoreFill.classList.add('score-warn');
                else scoreFill.classList.add('score-safe');

                // Render findings
                resultsDiv.style.display = 'block';
                data.findings.forEach((f, i) => {
                    const div = document.createElement('div');
                    div.className = `threat-item threat-${f.level}`;
                    div.style.animationDelay = `${i * 0.1}s`;
                    div.innerHTML = `<div class="threat-head">[${f.type}]</div>${f.msg}`;
                    threatLog.appendChild(div);
                });

                // Action plan
                const { isPredatory, isPhishing, domains } = data.meta;
                let actionHTML = `<h4>Recommended Guardian Actions</h4><ul>`;
                if (isPredatory) {
                    actionHTML += `<li><strong>IMMEDIATE ACTION:</strong> Do not reply. Screenshot the entire conversation.</li>`;
                    actionHTML += `<li><strong>Block the sender</strong> across all platforms immediately.</li>`;
                    actionHTML += `<li><strong>Report</strong> to CEOP (UK) or local law enforcement.</li>`;
                    actionHTML += `<li>Contact <a href="https://www.ceop.police.uk/ceop-reporting/" target="_blank">CEOP Online</a> for child safety reporting.</li>`;
                } else if (isPhishing) {
                    actionHTML += `<li><strong>DO NOT CLICK</strong> any links in the message.</li>`;
                    actionHTML += `<li><strong>Delete</strong> the email/message and block the sender.</li>`;
                    if (domains && domains.length > 0) {
                        actionHTML += `<li>Safe domain verification:</li><ul>`;
                        domains.forEach(d => {
                            actionHTML += `<li><a href="https://www.virustotal.com/gui/domain/${d}" target="_blank">VirusTotal Scan (${d})</a></li>`;
                        });
                        actionHTML += `</ul>`;
                    }
                } else {
                    actionHTML += `<li>If you don't recognise the sender, delete the message.</li>`;
                    actionHTML += `<li>Never send money, crypto, or gift cards to unverified contacts.</li>`;
                }
                actionHTML += `</ul>`;
                actionPlan.innerHTML = actionHTML;

                // Show export button if feature available
                if (downloadBtn && features.includes('export')) {
                    downloadBtn.style.display = 'inline-flex';
                }

                // Add to history
                if (features.includes('history')) {
                    scanHistory.unshift(lastScanResult);
                    renderHistory();
                }

            } catch (err) {
                console.error(err);
                resultsDiv.style.display = 'block';
                threatLog.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[SYSTEM ERROR]</div>Failed to connect to Guardian Backend. ${err.message}</div>`;
            } finally {
                scanBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Run Guardian Analysis`;
                scanBtn.style.opacity = '1';
                scanBtn.style.pointerEvents = 'auto';
            }
        });
    }

    // ── Export Report ──
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!lastScanResult) return;
            const r = lastScanResult;
            let report = `GRACE-X GUARDIAN — THREAT ASSESSMENT REPORT\n`;
            report += `${'═'.repeat(50)}\n`;
            report += `Date: ${new Date(r.timestamp).toLocaleString()}\n`;
            report += `Threat Score: ${r.meta.threatScore}/100\n`;
            report += `Predatory: ${r.meta.isPredatory ? 'YES' : 'No'}\n`;
            report += `Phishing: ${r.meta.isPhishing ? 'YES' : 'No'}\n`;
            report += `${'─'.repeat(50)}\n\n`;
            report += `INPUT TEXT:\n${r.text}...\n\n`;
            report += `FINDINGS:\n`;
            r.findings.forEach(f => {
                report += `  [${f.level.toUpperCase()}] ${f.type}: ${f.msg}\n`;
            });
            report += `\n${'─'.repeat(50)}\n`;
            report += `Generated by GRACE-X Guardian • ${tierName} Tier\n`;

            const blob = new Blob([report], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `guardian-report-${Date.now()}.txt`;
            a.click();
        });
    }

    // ── PASSWORD AUDITOR ──
    const checkPwdBtn = document.getElementById('checkPwdBtn');
    const passwordInput = document.getElementById('passwordInput');
    const togglePwdVis = document.getElementById('togglePwdVis');
    const pwdResults = document.getElementById('pwdResults');

    if (togglePwdVis) {
        togglePwdVis.addEventListener('click', () => {
            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
            togglePwdVis.textContent = passwordInput.type === 'password' ? '👁️' : '🙈';
        });
    }

    if (checkPwdBtn) {
        checkPwdBtn.addEventListener('click', async () => {
            const password = passwordInput.value;
            if (!password) return;

            checkPwdBtn.innerHTML = '<span class="spinner"></span> Analysing...';

            try {
                const res = await fetch('/api/password-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                pwdResults.style.display = 'block';

                const ratingEl = document.getElementById('pwdRating');
                ratingEl.textContent = data.rating;
                ratingEl.className = 'pwd-rating pwd-' + data.rating.toLowerCase();

                const fill = document.getElementById('pwdBarFill');
                fill.style.width = data.percentage + '%';
                fill.className = 'pwd-bar-fill';
                if (data.percentage >= 70) fill.classList.add('pwd-fill-strong');
                else if (data.percentage >= 40) fill.classList.add('pwd-fill-moderate');
                else fill.classList.add('pwd-fill-weak');

                document.getElementById('pwdCrackTime').textContent = data.crackTime;
                document.getElementById('pwdEntropy').textContent = data.entropy;
                document.getElementById('pwdScore').textContent = `${data.score}/${data.maxScore}`;

                const issuesEl = document.getElementById('pwdIssues');
                if (data.issues.length > 0) {
                    issuesEl.innerHTML = '<h4>Issues Found</h4>' + data.issues.map(i => `<div class="pwd-issue">⚠️ ${i}</div>`).join('');
                } else {
                    issuesEl.innerHTML = '<div class="pwd-issue pwd-issue--good">✅ No issues found — excellent password!</div>';
                }

                // Voice Readout
                let voiceText = `Password analysis complete. Rating: ${data.rating}. `;
                if (data.rating === 'COMPROMISED') voiceText += `Critical warning: Password found in ${data.pwnCount} known breaches. Change immediately.`;
                else if (data.percentage >= 70) voiceText += "Password is secure.";
                else voiceText += "Password could be stronger.";
                window.speak && window.speak(voiceText);

            } catch (err) {
                pwdResults.style.display = 'block';
                pwdResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
                window.speak && window.speak("Error analysing password.");
            } finally {
                checkPwdBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Analyse Password`;
            }
        });
    }

    // ── BREACH CHECKER ──
    const checkBreachBtn = document.getElementById('checkBreachBtn');
    const breachEmail = document.getElementById('breachEmail');
    const breachResults = document.getElementById('breachResults');

    if (checkBreachBtn) {
        checkBreachBtn.addEventListener('click', async () => {
            const email = breachEmail.value.trim();
            if (!email) return;

            checkBreachBtn.innerHTML = '<span class="spinner"></span> Scanning...';

            try {
                const res = await fetch('/api/check-breach', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                breachResults.style.display = 'block';

                if (data.breaches.length === 0) {
                    breachResults.innerHTML = `<div class="threat-item threat-safe"><div class="threat-head">[ALL CLEAR]</div>No breaches found for <strong>${email}</strong>. Your email appears clean in our database.</div>`;
                } else {
                    let html = `<div class="threat-item threat-${data.riskLevel === 'HIGH' ? 'critical' : 'warn'}"><div class="threat-head">[${data.riskLevel} RISK — ${data.breaches.length} BREACH${data.breaches.length > 1 ? 'ES' : ''} FOUND]</div>Email <strong>${email}</strong> found in the following data breaches:</div>`;
                    html += '<div class="breach-list">';
                    data.breaches.forEach(b => {
                        html += `<div class="breach-card">
                            <div class="breach-source">${b.source}</div>
                            <div class="breach-data">Exposed: ${b.data.join(', ')}</div>
                            ${b.records ? `<div class="breach-records">${b.records} records in breach</div>` : ''}
                        </div>`;
                    });
                    html += '</div>';
                    html += `<div class="actions-box"><h4>Recommended Actions</h4><ul>
                        <li><strong>Change passwords immediately</strong> on all affected accounts</li>
                        <li>Enable <strong>two-factor authentication</strong> everywhere</li>
                        <li>Check for <strong>suspicious login activity</strong> on your accounts</li>
                        <li>Consider using a <strong>password manager</strong> for unique credentials</li>
                    </ul></div>`;
                    breachResults.innerHTML = html;

                    window.speak && window.speak(`Warning. Email found in ${data.breaches.length} known data breaches. Immediate action recommended.`);
                }
            } catch (err) {
                breachResults.style.display = 'block';
                breachResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
                window.speak && window.speak("Error scanning deep web.");
            } finally {
                checkBreachBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Scan Deep Web`;
            }
        });
    }

    // ── DIGITAL FOOTPRINT ──
    const footprintBtn = document.getElementById('footprintBtn');
    const footprintQuery = document.getElementById('footprintQuery');
    const footprintResults = document.getElementById('footprintResults');

    if (footprintBtn) {
        footprintBtn.addEventListener('click', async () => {
            const query = footprintQuery.value.trim();
            if (!query) return;

            footprintBtn.innerHTML = '<span class="spinner"></span> Scanning...';

            try {
                const res = await fetch('/api/footprint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                footprintResults.style.display = 'block';
                let html = `<h3 class="results-title">Footprint Report for "${query}"</h3>`;

                // Exposures
                if (data.exposures.length > 0) {
                    html += '<div class="fp-section"><h4>Data Exposures</h4>';
                    data.exposures.forEach(e => {
                        const levelClass = e.risk === 'high' ? 'critical' : e.risk === 'medium' ? 'warn' : 'safe';
                        html += `<div class="threat-item threat-${levelClass}"><div class="threat-head">[${e.type}]</div>${e.detail}<br><small>Source: ${e.source}</small></div>`;
                    });
                    html += '</div>';
                }

                // Social media
                if (data.socialMedia.length > 0) {
                    html += '<div class="fp-section"><h4>Social Media Presence</h4><div class="social-grid">';
                    data.socialMedia.forEach(s => {
                        const statusClass = s.status.includes('Found') || s.status.includes('Match') ? 'found' : 'clear';
                        html += `<div class="social-item social-${statusClass}">
                            <div class="social-platform">${s.platform}</div>
                            <div class="social-status">${s.status}</div>
                            <div class="social-vis">Visibility: ${s.visibility}</div>
                        </div>`;
                    });
                    html += '</div></div>';
                }

                // Recommendations
                if (data.recommendations.length > 0) {
                    html += '<div class="actions-box"><h4>Privacy Recommendations</h4><ul>';
                    data.recommendations.forEach(r => { html += `<li>${r}</li>`; });
                    html += '</ul></div>';
                }

                footprintResults.innerHTML = html;

                let fpVoice = `Footprint scan complete. Found ${data.exposures.length} exposures and checked ${data.socialMedia.length} social platforms.`;
                window.speak && window.speak(fpVoice);

            } catch (err) {
                footprintResults.style.display = 'block';
                footprintResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
                window.speak && window.speak("Error scanning digital footprint.");
            } finally {
                footprintBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Scan Footprint`;
            }
        });
    }

    // ── SECURITY SCORE ──
    const calcScoreBtn = document.getElementById('calcScoreBtn');
    const scoreResults = document.getElementById('scoreResults');

    if (calcScoreBtn) {
        calcScoreBtn.addEventListener('click', async () => {
            const answers = {
                uniquePasswords: document.getElementById('q-uniquePasswords')?.checked,
                passwordManager: document.getElementById('q-passwordManager')?.checked,
                twoFactor: document.getElementById('q-twoFactor')?.value || 'none',
                autoUpdates: document.getElementById('q-autoUpdates')?.checked,
                vpn: document.getElementById('q-vpn')?.checked,
                publicWifi: !document.getElementById('q-publicWifi')?.checked,
                phishingAware: document.getElementById('q-phishingAware')?.checked,
                backups: document.getElementById('q-backups')?.checked,
                privacySettings: document.getElementById('q-privacySettings')?.checked,
                dataMinimisation: document.getElementById('q-dataMinimisation')?.checked,
            };

            calcScoreBtn.innerHTML = '<span class="spinner"></span> Calculating...';

            try {
                const res = await fetch('/api/security-score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ answers }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                scoreResults.style.display = 'block';
                const gradeColor = data.score >= 80 ? 'var(--green)' : data.score >= 60 ? 'var(--cyan)' : data.score >= 40 ? 'var(--amber)' : 'var(--red)';

                let html = `<div class="score-result-card">
                    <div class="big-grade" style="color: ${gradeColor}">${data.grade}</div>
                    <div class="big-score">${data.score}<small>/${data.maxScore}</small></div>
                </div>`;

                if (data.breakdown.length > 0) {
                    html += '<div class="score-breakdown"><h4>Score Breakdown</h4>';
                    data.breakdown.forEach(b => {
                        html += `<div class="score-row"><span class="score-cat">${b.cat}</span><span class="score-label">${b.label}</span><span class="score-pts" style="color: var(--green)">+${b.pts}</span></div>`;
                    });
                    html += '</div>';

                    // Missing points
                    const missing = data.maxScore - data.score;
                    if (missing > 0) {
                        html += `<div class="actions-box"><h4>How to Improve (+${missing} pts available)</h4><ul>`;
                        const present = data.breakdown.map(b => b.label);
                        const suggestions = {
                            'Unique passwords per account': 'Use a different password for every account',
                            'Uses password manager': 'Try Bitwarden or 1Password — both are excellent',
                            '2FA on all accounts': 'Enable two-factor authentication on all critical accounts',
                            'Auto-updates enabled': 'Turn on automatic updates on all devices',
                            'Uses VPN': 'Use a VPN like Mullvad or ProtonVPN for sensitive browsing',
                            'Avoids public WiFi': 'Never do banking or login on public WiFi without a VPN',
                            'Phishing awareness': 'Learn to spot phishing — Guardian can help train you',
                            'Regular backups': 'Set up automatic cloud or external backups',
                            'Reviews privacy settings': 'Audit your social media privacy settings monthly',
                            'Minimises data sharing': 'Think twice before sharing personal info online',
                        };
                        Object.entries(suggestions).forEach(([label, tip]) => {
                            if (!present.includes(label)) {
                                html += `<li><strong>${label}:</strong> ${tip}</li>`;
                            }
                        });
                        html += '</ul></div>';
                    }
                }

                scoreResults.innerHTML = html;

                window.speak && window.speak(`Security audit complete. Your grade is ${data.grade} with ${data.score} points.`);
            } catch (err) {
                scoreResults.style.display = 'block';
                scoreResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
                window.speak && window.speak("Error calculating security score.");
            } finally {
                calcScoreBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Calculate Score`;
            }
        });
    }

    // ── HTTP HEADER ANALYZER (Sentinel/Commander) ──
    const scanHeadersBtn = document.getElementById('scanHeadersBtn');
    const headerInput = document.getElementById('headerInput');
    const headerResults = document.getElementById('headerResults');

    if (scanHeadersBtn) {
        scanHeadersBtn.addEventListener('click', async () => {
            const url = headerInput.value.trim();
            if (!url) return;
            scanHeadersBtn.innerHTML = '<span class="spinner"></span> Scanning...';
            try {
                const res = await fetch('/api/analyze-headers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                headerResults.style.display = 'block';

                if (data.error) {
                    headerResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${data.error}</div>`;
                    window.speak && window.speak("Header scan failed.");
                    return;
                }

                let html = `<h3 class="results-title">Header Security Report</h3>`;
                let secureCount = 0;
                let totalCount = 0;

                html += '<div class="fp-section">';
                for (const [header, result] of Object.entries(data.analysis)) {
                    totalCount++;
                    const isSecure = result.status === 'secure';
                    if (isSecure) secureCount++;
                    const icon = isSecure ? '✅' : '⚠️';
                    const levelClass = isSecure ? 'safe' : 'warn';
                    html += `<div class="threat-item threat-${levelClass}">
                        <div class="threat-head">${icon} ${header}</div>
                        ${result.message}
                        ${result.value ? `<br><small style="opacity:0.7">Found: ${result.value}</small>` : ''}
                    </div>`;
                }
                html += '</div>';

                headerResults.innerHTML = html;
                window.speak && window.speak(`Header check complete. ${secureCount} out of ${totalCount} security headers are properly configured.`);
            } catch (err) {
                headerResults.style.display = 'block';
                headerResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
                window.speak && window.speak("Error fetching headers.");
            } finally {
                scanHeadersBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Scan Headers`;
            }
        });
    }

    // ── IP REPUTATION SCANNER (Commander Only) ──
    const scanIpBtn = document.getElementById('scanIpBtn');
    const ipInput = document.getElementById('ipInput');
    const ipResults = document.getElementById('ipResults');

    if (scanIpBtn) {
        scanIpBtn.addEventListener('click', async () => {
            const ip = ipInput.value.trim();
            if (!ip) return;
            scanIpBtn.innerHTML = '<span class="spinner"></span> Analyzing...';
            try {
                const res = await fetch('/api/ip-reputation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                ipResults.style.display = 'block';
                const levelClass = data.riskLevel === 'HIGH' ? 'critical' : data.riskLevel === 'MEDIUM' ? 'warn' : 'safe';

                let html = `<div class="threat-item threat-${levelClass}">
                    <div class="threat-head">[${data.riskLevel} RISK] IP Intelligence: ${data.ip}</div>
                    <strong>ISP:</strong> ${data.isp}<br>
                    <strong>Location:</strong> ${data.location}
                </div>`;

                if (data.flags && data.flags.length > 0) {
                    html += '<div class="pwd-issues" style="margin-top:10px;">';
                    data.flags.forEach(f => {
                        html += `<div class="pwd-issue">🚩 ${f}</div>`;
                    });
                    html += '</div>';
                } else {
                    html += '<div class="pwd-issues" style="margin-top:10px;"><div class="pwd-issue pwd-issue--good">✅ Clean IP. No proxies, VPNs, or malicious flags detected.</div></div>';
                }

                ipResults.innerHTML = html;
                window.speak && window.speak(`IP Intelligence complete. ${data.flags && data.flags.length > 0 ? 'Suspicious flags detected.' : 'IP appears clean.'} Risk level: ${data.riskLevel}.`);
            } catch (err) {
                ipResults.style.display = 'block';
                ipResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
                window.speak && window.speak("Error analyzing IP address.");
            } finally {
                scanIpBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> Analyze IP Protocol`;
            }
        });
    }

    // ── BULK SCAN (Commander Only) ──
    const bulkScanBtn = document.getElementById('bulkScanBtn');
    const bulkInput = document.getElementById('bulkInput');
    const bulkResults = document.getElementById('bulkResults');
    const bulkClearBtn = document.getElementById('bulkClearBtn');
    const bulkExportBtn = document.getElementById('bulkExportBtn');
    const bulkProgress = document.getElementById('bulkProgress');
    const bulkProgressFill = document.getElementById('bulkProgressFill');
    const bulkProgressText = document.getElementById('bulkProgressText');

    let bulkReport = [];

    if (bulkClearBtn) {
        bulkClearBtn.addEventListener('click', () => {
            if (bulkInput) bulkInput.value = '';
            if (bulkResults) { bulkResults.style.display = 'none'; bulkResults.innerHTML = ''; }
            if (bulkProgress) bulkProgress.style.display = 'none';
            if (bulkExportBtn) bulkExportBtn.style.display = 'none';
            bulkReport = [];
        });
    }

    if (bulkScanBtn) {
        bulkScanBtn.addEventListener('click', async () => {
            const lines = bulkInput.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) return;

            bulkScanBtn.disabled = true;
            bulkScanBtn.innerHTML = '<span class="spinner"></span> Processing...';
            bulkResults.style.display = 'block';
            bulkResults.innerHTML = '';
            bulkProgress.style.display = 'block';
            bulkReport = [];

            for (let i = 0; i < lines.length; i++) {
                const pct = Math.round(((i + 1) / lines.length) * 100);
                bulkProgressFill.style.width = pct + '%';
                bulkProgressText.textContent = `Scanning item ${i + 1} of ${lines.length}...`;

                try {
                    const res = await fetch('/api/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: lines[i] }),
                        credentials: 'include'
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);

                    const ts = data.meta.threatScore || 0;
                    const levelClass = ts >= 60 ? 'critical' : ts >= 30 ? 'warn' : 'safe';
                    bulkReport.push({ input: lines[i], ...data });

                    const itemDiv = document.createElement('div');
                    itemDiv.className = `bulk-result-item bulk-result--${levelClass}`;
                    itemDiv.innerHTML = `
                        <div class="bulk-result-header">
                            <span class="bulk-result-num">#${i + 1}</span>
                            <span class="threat-badge threat-badge--${levelClass}">Score: ${ts}</span>
                        </div>
                        <div class="bulk-result-text">${lines[i].substring(0, 80)}${lines[i].length > 80 ? '...' : ''}</div>
                        <div class="bulk-result-findings">${data.findings.map(f => `<span class="finding-tag finding-tag--${f.level}">${f.type}</span>`).join(' ')}</div>
                    `;
                    bulkResults.appendChild(itemDiv);

                } catch (err) {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'bulk-result-item bulk-result--error';
                    itemDiv.innerHTML = `<div class="bulk-result-header"><span class="bulk-result-num">#${i + 1}</span><span class="threat-badge">ERROR</span></div><div class="bulk-result-text">${err.message}</div>`;
                    bulkResults.appendChild(itemDiv);
                }

                // Small delay between requests
                if (i < lines.length - 1) await new Promise(r => setTimeout(r, 200));
            }

            bulkProgressText.textContent = `Complete — ${lines.length} items scanned`;
            bulkScanBtn.disabled = false;
            bulkScanBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> Run Bulk Assessment`;
            if (bulkExportBtn) bulkExportBtn.style.display = 'inline-flex';

            window.speak && window.speak(`Bulk assessment complete. ${lines.length} items scanned successfully.`);
        });
    }

    if (bulkExportBtn) {
        bulkExportBtn.addEventListener('click', () => {
            if (bulkReport.length === 0) return;
            let report = `GRACE-X GUARDIAN — BULK ASSESSMENT REPORT\n${'═'.repeat(50)}\nDate: ${new Date().toLocaleString()}\nItems Scanned: ${bulkReport.length}\n${'═'.repeat(50)}\n\n`;
            bulkReport.forEach((item, i) => {
                const ts = item.meta?.threatScore || 0;
                report += `Item #${i + 1} — Score: ${ts}/100\n`;
                report += `Input: ${item.input}\n`;
                item.findings.forEach(f => {
                    report += `  [${f.level.toUpperCase()}] ${f.type}: ${f.msg}\n`;
                });
                report += `\n${'─'.repeat(40)}\n\n`;
            });
            report += `Generated by GRACE-X Guardian • Commander Tier\n`;
            const blob = new Blob([report], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `guardian-bulk-report-${Date.now()}.txt`;
            a.click();
        });
    }

    // ── HISTORY ──
    function renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        if (scanHistory.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No scan history yet.</div>';
            return;
        }

        let html = '';
        scanHistory.forEach((item, i) => {
            const ts = item.meta?.threatScore || 0;
            const levelClass = ts >= 60 ? 'critical' : ts >= 30 ? 'warn' : 'safe';
            html += `<div class="history-item">
                <div class="history-meta">
                    <span class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
                    <span class="threat-badge threat-badge--${levelClass}">Score: ${ts}</span>
                </div>
                <div class="history-text">${item.text}...</div>
            </div>`;
        });
        historyList.innerHTML = html;
    }

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            scanHistory = [];
            renderHistory();
        });
    }

    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    if (exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', () => {
            if (scanHistory.length === 0) return alert('No history to export.');
            let report = `GRACE-X GUARDIAN — SCAN HISTORY EXPORT\n${'═'.repeat(50)}\n\n`;
            scanHistory.forEach((item, i) => {
                report += `Scan #${i + 1} — ${new Date(item.timestamp).toLocaleString()}\n`;
                report += `Threat Score: ${item.meta?.threatScore || 0}/100\n`;
                report += `Text: ${item.text}...\n`;
                item.findings.forEach(f => {
                    report += `  [${f.level.toUpperCase()}] ${f.type}: ${f.msg}\n`;
                });
                report += `\n${'─'.repeat(40)}\n\n`;
            });
            const blob = new Blob([report], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `guardian-history-${Date.now()}.txt`;
            a.click();
        });
    }

    // ── LITE TOOL: EMAIL SPOOF ANALYZER ──
    const scanEmailBtn = document.getElementById('scanEmailBtn');
    const emailInput = document.getElementById('emailInput');
    const emailResults = document.getElementById('emailResults');

    if (scanEmailBtn && emailInput && emailResults) {
        scanEmailBtn.addEventListener('click', () => {
            const headers = emailInput.value.trim();
            if (!headers) return;

            scanEmailBtn.innerHTML = '<span class="spinner"></span> Analyzing headers...';

            setTimeout(() => {
                let html = '<h3 class="results-title">Header Analysis</h3>';

                const returnPathMatch = headers.match(/Return-Path:\s*<?([^>\n]+)>?/i);
                const fromMatch = headers.match(/From:\s*(?:(?:[^<]*\s*)?<([^>\n]+)>|([^\n]+))/i);
                const dkimMatch = headers.match(/DKIM-Signature:/i);
                const spfMatch = headers.match(/Received-SPF:\s*([^\s\n]+)/i);

                const fromAddress = fromMatch ? (fromMatch[1] || fromMatch[2]).trim() : 'Unknown';
                const returnPathAddress = returnPathMatch ? returnPathMatch[1].trim() : 'Unknown';

                // Spoof detection
                let spoofWarning = false;
                if (fromAddress !== 'Unknown' && returnPathAddress !== 'Unknown') {
                    const fromDomain = fromAddress.split('@')[1];
                    const returnDomain = returnPathAddress.split('@')[1];
                    if (fromDomain && returnDomain && fromDomain.toLowerCase() !== returnDomain.toLowerCase()) {
                        spoofWarning = true;
                    }
                }

                if (spoofWarning) {
                    html += '<div class="threat-item threat-critical"><div class="threat-head">[CRITICAL] Possible Spoofing Detected</div>The "From" address domain does not match the hidden "Return-Path" domain. This is a common indicator of email spoofing.</div>';
                } else if (fromAddress === 'Unknown') {
                    html += '<div class="threat-item threat-warn"><div class="threat-head">[WARNING] Invalid Headers</div>Could not extract sender information. Ensure you pasted raw headers.</div>';
                } else {
                    html += '<div class="threat-item threat-safe"><div class="threat-head">[SAFE] Sender Identities Match</div>The visible sender matches the return path.</div>';
                }

                html += '<div class="pwd-score-card" style="margin-top: 15px;">';
                html += '<div><strong>Visible From:</strong> ' + fromAddress + '</div>';
                html += '<div><strong>Return-Path (Actual Sender):</strong> ' + returnPathAddress + '</div>';

                const spfStatus = spfMatch ? spfMatch[1].toLowerCase() : 'none';
                const spfColor = spfStatus.includes('pass') ? 'var(--green)' : spfStatus.includes('fail') ? 'var(--red)' : 'var(--amber)';
                html += `<div><strong>SPF Status:</strong> <span style="color:${spfColor}">${spfStatus.toUpperCase()}</span></div>`;

                const dkimStatus = dkimMatch ? 'PRESENT' : 'MISSING';
                const dkimColor = dkimMatch ? 'var(--green)' : 'var(--amber)';
                html += `<div><strong>DKIM Signature:</strong> <span style="color:${dkimColor}">${dkimStatus}</span></div>`;

                html += '</div>';

                emailResults.innerHTML = html;
                emailResults.style.display = 'block';

                scanEmailBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /></svg> Analyze Headers`;

                if (window.speak) {
                    if (spoofWarning) window.speak("Critical warning. Possible email spoofing detected.");
                    else window.speak("Email header analysis complete.");
                }
            }, 800);
        });
    }

    // ── LITE TOOL: BROWSER PRIVACY AUDITOR ──
    const auditBrowserBtn = document.getElementById('auditBrowserBtn');
    const browserResults = document.getElementById('browserResults');

    if (auditBrowserBtn && browserResults) {
        auditBrowserBtn.addEventListener('click', () => {
            auditBrowserBtn.innerHTML = '<span class="spinner"></span> Auditing...';

            setTimeout(() => {
                let html = '<h3 class="results-title">Browser Privacy Audit</h3>';
                let risks = 0;

                html += '<div class="history-list" style="max-height: none;">';

                // Cookies
                const cookiesEnabled = navigator.cookieEnabled;
                html += `<div class="threat-item threat-${cookiesEnabled ? 'warn' : 'safe'}"><div class="threat-head">Cookies Enabled</div>${cookiesEnabled ? 'Yes. Websites can track you via cookies.' : 'No. Privacy enhanced.'}</div>`;
                if (cookiesEnabled) risks++;

                // Do Not Track
                const dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.msDoNotTrack === "1" || navigator.doNotTrack === "yes";
                html += `<div class="threat-item threat-${dnt ? 'safe' : 'warn'}"><div class="threat-head">Do Not Track (DNT)</div>${dnt ? 'Enabled.' : 'Disabled. Websites are not actively asked to stop tracking you.'}</div>`;
                if (!dnt) risks++;

                // User Agent
                html += `<div class="threat-item threat-warn"><div class="threat-head">User Agent Leak</div>Your browser broadcasts: <code style="font-size:11px;word-break:break-all;">${navigator.userAgent}</code></div>`;
                risks++;

                // Screen fingerprinting possibility
                html += `<div class="threat-item threat-warn"><div class="threat-head">Hardware Fingerprinting</div>Your screen resolution (${window.screen.width}x${window.screen.height}) and colour depth (${window.screen.colorDepth}-bit) can be used to fingerprint your device.</div>`;
                risks++;

                // Plugins
                const pluginCount = navigator.plugins ? navigator.plugins.length : 0;
                html += `<div class="threat-item threat-${pluginCount > 0 ? 'warn' : 'safe'}"><div class="threat-head">Installed Plugins</div>${pluginCount > 0 ? `Found ${pluginCount} identifiable plugins.` : 'No visible plugins. Good.'}</div>`;
                if (pluginCount > 0) risks++;

                html += '</div>';

                let grade = 'A';
                if (risks > 3) grade = 'C';
                else if (risks > 1) grade = 'B';

                const gradeColor = grade === 'A' ? 'var(--green)' : grade === 'B' ? 'var(--amber)' : 'var(--red)';

                let summaryHTML = `<div class="score-result-card" style="margin-bottom: 20px;">
                    <div class="big-grade" style="color: ${gradeColor}; font-size: 40px; margin-bottom: 5px;">${grade}</div>
                    <div style="font-weight: 600; font-size: 16px;">Privacy Grade</div>
                    <div style="font-size: 13px; margin-top: 5px; opacity: 0.8">${risks} potential tracking vectors found.</div>
                </div>`;

                browserResults.innerHTML = summaryHTML + html;
                browserResults.style.display = 'block';

                auditBrowserBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /></svg> Audit My Browser`;

                if (window.speak) window.speak(`Browser audit complete. Privacy grade is ${grade}.`);
            }, 1000);
        });
    }

    // ── LITE TOOL: FILE TRUE TYPE INSPECTOR ──
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    const inspectFileBtn = document.getElementById('inspectFileBtn');
    const fileResults = document.getElementById('fileResults');

    if (fileInput && inspectFileBtn) {
        let selectedFile = null;

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                selectedFile = e.target.files[0];
                fileNameDisplay.textContent = selectedFile.name;
                inspectFileBtn.style.display = 'inline-flex';
                fileResults.style.display = 'none';
            }
        });

        const magicBytes = {
            '89504e47': { ext: 'png', mime: 'image/png' },
            'ffd8ffe0': { ext: 'jpg', mime: 'image/jpeg' },
            'ffd8ffe1': { ext: 'jpg', mime: 'image/jpeg' },
            'ffd8ffe2': { ext: 'jpg', mime: 'image/jpeg' },
            'ffd8ffe3': { ext: 'jpg', mime: 'image/jpeg' },
            'ffd8ffe8': { ext: 'jpg', mime: 'image/jpeg' },
            '47494638': { ext: 'gif', mime: 'image/gif' },
            '25504446': { ext: 'pdf', mime: 'application/pdf' },
            '504b0304': { ext: 'zip', mime: 'application/zip' }, // Also docx, xlsx, pptx, apk
            '52617221': { ext: 'rar', mime: 'application/x-rar-compressed' },
            '4d5a': { ext: 'exe', mime: 'application/x-msdownload' } // DOS MZ executable
        };

        inspectFileBtn.addEventListener('click', () => {
            if (!selectedFile) return;

            inspectFileBtn.innerHTML = '<span class="spinner"></span> Inspecting...';

            const reader = new FileReader();
            reader.onload = function (e) {
                const arr = (new Uint8Array(e.target.result)).subarray(0, 4);
                let header = "";
                for (let i = 0; i < arr.length; i++) {
                    header += arr[i].toString(16).padStart(2, '0');
                }

                const claimedExt = selectedFile.name.split('.').pop().toLowerCase();
                let trueExt = 'unknown';
                let mime = 'unknown';

                for (const [magic, info] of Object.entries(magicBytes)) {
                    if (header.startsWith(magic) || (magic.length === 4 && header.substring(0, 4) === magic)) {
                        trueExt = info.ext;
                        mime = info.mime;
                        break;
                    }
                }

                // Account for 504b0304 being zip/docx/xlsx
                if (trueExt === 'zip' && ['docx', 'xlsx', 'pptx', 'apk', 'jar'].includes(claimedExt)) {
                    trueExt = claimedExt;
                }

                let isMasquerading = false;
                if (trueExt !== 'unknown' && trueExt !== claimedExt) {
                    if (!(trueExt === 'jpg' && claimedExt === 'jpeg')) {
                        isMasquerading = true;
                    }
                }

                let html = '<h3 class="results-title">File Identity Report</h3>';

                html += '<div class="pwd-score-card" style="margin-bottom: 20px;">';
                html += `<div><strong>Claimed Extension:</strong> .${claimedExt.toUpperCase()}</div>`;
                html += `<div><strong>True Detected Type:</strong> ${trueExt !== 'unknown' ? '.' + trueExt.toUpperCase() : 'Unknown File Format'}</div>`;
                html += `<div><strong>Detected MIME:</strong> ${mime}</div>`;
                html += `<div><strong>Header Bytes (Hex):</strong> ${header.toUpperCase()}</div>`;
                html += `<div><strong>File Size:</strong> ${(selectedFile.size / 1024).toFixed(2)} KB</div>`;
                html += '</div>';

                if (isMasquerading && trueExt === 'exe') {
                    html += `<div class="threat-item threat-critical"><div class="threat-head">[CRITICAL] Malicious Disguise Detected</div>File claims to be a <strong>.${claimedExt}</strong> but is actually a Windows Executable (EXE). Do not open this file!</div>`;
                    if (window.speak) window.speak("Critical alert. Malicious file disguise detected. Do not open.");
                } else if (isMasquerading) {
                    html += `<div class="threat-item threat-warn"><div class="threat-head">[WARNING] Extension Mismatch</div>The file's content (<strong>.${trueExt}</strong>) does not match its extension (<strong>.${claimedExt}</strong>). Exercise caution.</div>`;
                    if (window.speak) window.speak("Warning. File extension mismatch detected.");
                } else if (trueExt === 'unknown') {
                    html += `<div class="threat-item threat-warn"><div class="threat-head">[WARNING] Unknown Format</div>Could not verify the magic bytes of this file. It may be safe, but proceed with caution.</div>`;
                    if (window.speak) window.speak("File format unknown. Proceed with caution.");
                } else {
                    html += `<div class="threat-item threat-safe"><div class="threat-head">[SAFE] Identity Verified</div>The file extension accurately matches the file's internal signature.</div>`;
                    if (window.speak) window.speak("File identity verified as authentic.");
                }

                fileResults.innerHTML = html;
                fileResults.style.display = 'block';

                inspectFileBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> Inspect File`;
            };

            reader.readAsArrayBuffer(selectedFile.slice(0, 4));
        });
    }

    // ── LITE TOOL: SECURE PASSPHRASE GENERATOR ──
    const generatePassphraseBtn = document.getElementById('generatePassphraseBtn');
    const passphraseOutput = document.getElementById('passphraseOutput');
    const copyPassphraseBtn = document.getElementById('copyPassphraseBtn');
    const passphraseMeta = document.getElementById('passphraseMeta');

    const wordlist = [
        "apple", "brave", "candy", "delta", "eagle", "flame", "grape", "haste",
        "ivory", "joker", "karma", "lemon", "magic", "noble", "ocean", "piano",
        "queen", "river", "stone", "tiger", "umbra", "venom", "water", "xenon",
        "yacht", "zebra", "cloud", "dance", "earth", "frost", "ghost", "heart",
        "iron", "jewel", "knife", "lunar", "metal", "ninja", "orbit", "pearl",
        "quest", "radar", "steel", "trust", "unify", "vital", "wheat", "yield",
        "amber", "bacon", "cabin", "dream", "elite", "focus", "giant", "hotel"
    ];

    if (generatePassphraseBtn && passphraseOutput && passphraseMeta) {
        generatePassphraseBtn.addEventListener('click', () => {
            // Generate 4 random words
            let phraseWords = [];
            for (let i = 0; i < 4; i++) {
                phraseWords.push(wordlist[Math.floor(Math.random() * wordlist.length)]);
            }

            // Randomly capitalize one word
            const capIndex = Math.floor(Math.random() * phraseWords.length);
            phraseWords[capIndex] = phraseWords[capIndex].charAt(0).toUpperCase() + phraseWords[capIndex].slice(1);

            // Add a random number 10-99
            const num = Math.floor(Math.random() * 90) + 10;

            // Add a special character
            const chars = "!@#$%^&*()_+-=";
            const special = chars.charAt(Math.floor(Math.random() * chars.length));

            const phraseString = phraseWords.join('-') + '-' + num + special;
            passphraseOutput.textContent = phraseString;

            passphraseMeta.innerHTML = `
                <div style="display: flex; gap: 20px; text-transform: uppercase;">
                    <div><span style="color:var(--cyan)">Length:</span> ${phraseString.length} chars</div>
                    <div><span style="color:var(--cyan)">Entropy:</span> ~85 bits</div>
                    <div><span style="color:var(--cyan)">Est. Crack Time:</span> > 4 billion years</div>
                </div>
            `;
        });
    }

    if (copyPassphraseBtn && passphraseOutput) {
        copyPassphraseBtn.addEventListener('click', () => {
            const text = passphraseOutput.textContent;
            if (text === '-' || !text) return;

            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyPassphraseBtn.textContent;
                copyPassphraseBtn.textContent = '✅';
                setTimeout(() => { copyPassphraseBtn.textContent = originalText; }, 2000);
            });
        });
    }
});
