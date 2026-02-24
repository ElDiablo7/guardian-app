document.addEventListener("DOMContentLoaded", () => {
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
            document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
        });
    });

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
            } catch (err) {
                pwdResults.style.display = 'block';
                pwdResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
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
                }
            } catch (err) {
                breachResults.style.display = 'block';
                breachResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
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
            } catch (err) {
                footprintResults.style.display = 'block';
                footprintResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
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
            } catch (err) {
                scoreResults.style.display = 'block';
                scoreResults.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[ERROR]</div>${err.message}</div>`;
            } finally {
                calcScoreBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Calculate Score`;
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
});
