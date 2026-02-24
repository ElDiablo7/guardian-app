document.addEventListener("DOMContentLoaded", () => {
    const tier = sessionStorage.getItem('guardian_tier') || 'basic';
    const tierBadge = document.getElementById('tierBadge');
    if (tierBadge) tierBadge.textContent = tier.toUpperCase();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            sessionStorage.removeItem('guardian_tier');
            try { await fetch('/api/logout', { method: 'POST' }); } catch (e) { }
            window.location.href = 'index.html';
        });
    }

    const scanBtn = document.getElementById('scanBtn');
    const clearBtn = document.getElementById('clearBtn');
    const inputEl = document.getElementById('scanInput');
    const resultsDiv = document.getElementById('results');
    const threatLog = document.getElementById('threatLog');
    const actionPlan = document.getElementById('actionPlan');

    if (!scanBtn) return;

    clearBtn.addEventListener('click', () => {
        inputEl.value = '';
        resultsDiv.style.display = 'none';
    });

    // Helper to add history
    function addHistory(text, maxLevel) {
        let history = JSON.parse(localStorage.getItem('guardian_history') || '[]');
        history.unshift({
            date: new Date().toISOString(),
            text: text.length > 50 ? text.substring(0, 50) + '...' : text,
            level: maxLevel
        });
        if (history.length > 10) history.pop();
        localStorage.setItem('guardian_history', JSON.stringify(history));
        renderHistory();
    }

    // Helper to render history
    function renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        let history = JSON.parse(localStorage.getItem('guardian_history') || '[]');
        if (history.length === 0) {
            historyList.innerHTML = '<div style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin-top: 20px;">No scan history found.</div>';
            return;
        }

        historyList.innerHTML = '';
        history.forEach(item => {
            const date = new Date(item.date).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            let col = "var(--green)";
            if (item.level === 'warn') col = "var(--amber)";
            if (item.level === 'critical') col = "var(--red)";

            historyList.innerHTML += `
                <div style="display:flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px;">
                    <span style="color: var(--muted);">${date}</span>
                    <span style="color: white; flex: 1; margin: 0 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.text}</span>
                    <span style="color: ${col}; font-weight: bold; text-transform: uppercase;">${item.level}</span>
                </div>
            `;
        });
    }

    // Call on load
    renderHistory();

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            localStorage.removeItem('guardian_history');
            renderHistory();
        });
    }

    // DOWNLOAD REPORT FUNCTIONALITY
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    let latestReportText = "";

    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', () => {
            if (!latestReportText) return;
            const blob = new Blob([latestReportText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Guardian_Report_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
    }

    // BREACH CHECKER FUNCTIONALITY
    const checkBreachBtn = document.getElementById('checkBreachBtn');
    const breachEmail = document.getElementById('breachEmail');
    const breachResults = document.getElementById('breachResults');

    if (tier === 'basic' && checkBreachBtn && breachEmail) {
        checkBreachBtn.textContent = '🔒 Upgrade to Standard';
        checkBreachBtn.classList.replace('primary', 'sec');
        breachEmail.disabled = true;
        checkBreachBtn.addEventListener('click', () => alert('This feature requires the Standard or Pro Tier. Please upgrade your subscription on the main hub.'));
    } else if (checkBreachBtn && breachEmail) {
        checkBreachBtn.addEventListener('click', async () => {
            const email = breachEmail.value.trim();
            if (!email) return;

            checkBreachBtn.textContent = 'Scanning...';
            breachResults.style.display = 'none';
            breachResults.innerHTML = '';

            try {
                const res = await fetch('/api/check-breach', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await res.json();
                breachResults.style.display = 'block';

                if (!res.ok) {
                    breachResults.innerHTML = `<div style="color: var(--red); font-size: 13px;">Error: ${data.error || 'Check failed'}</div>`;
                    return;
                }

                if (data.breaches && data.breaches.length > 0) {
                    let html = `<div style="color: var(--red); font-weight: bold; margin-bottom: 8px;">⚠️ Found in ${data.breaches.length} Data Breach(es)</div>`;
                    data.breaches.forEach(b => {
                        html += `<div style="background: rgba(255,76,76,0.1); border: 1px solid rgba(255,76,76,0.3); padding: 8px; border-radius: 6px; margin-bottom: 6px; font-size: 12px;">
                            <strong>Source:</strong> ${b.source}<br>
                            <strong>Compromised Data:</strong> ${b.data.join(', ')}
                        </div>`;
                    });
                    html += `<div style="font-size: 11px; color: var(--muted); margin-top: 8px;">Action: Change passwords immediately & enable 2FA where possible.</div>`;
                    breachResults.innerHTML = html;
                } else {
                    breachResults.innerHTML = `<div style="color: var(--green); font-weight: bold; padding: 10px; background: rgba(72,255,176,0.1); border: 1px solid rgba(72,255,176,0.3); border-radius: 6px;">✅ No known public breaches found for this email.</div>`;
                }

            } catch (err) {
                breachResults.style.display = 'block';
                breachResults.innerHTML = `<div style="color: var(--red); font-size: 13px;">Connection Error</div>`;
            } finally {
                checkBreachBtn.textContent = 'Scan Deep Web';
            }
        });
    }

    // MAIN SCANNER
    scanBtn.addEventListener('click', async () => {
        const text = inputEl.value;
        if (!text.trim()) return;

        // UI Loading state
        scanBtn.textContent = 'Analyzing...';
        scanBtn.style.opacity = '0.7';
        scanBtn.style.pointerEvents = 'none';
        if (downloadReportBtn) downloadReportBtn.style.display = 'none';

        resultsDiv.style.display = 'none';
        threatLog.innerHTML = '';
        actionPlan.innerHTML = '';

        try {
            // Call Backend API
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API Error');
            }

            // Render Findings
            resultsDiv.style.display = 'block';
            let maxLevel = 'safe';
            latestReportText = `GRACE-X GUARDIAN REPORT\nDate: ${new Date().toLocaleString()}\n\n-- Assessment Findings --\n`;

            data.findings.forEach(f => {
                if (f.level === 'critical') maxLevel = 'critical';
                if (f.level === 'warn' && maxLevel !== 'critical') maxLevel = 'warn';

                const div = document.createElement('div');
                div.className = `threat-item threat-${f.level}`;
                div.innerHTML = `<div class="threat-head">[${f.type}]</div>${f.msg}`;
                threatLog.appendChild(div);

                latestReportText += `[${f.type}] - ${f.level.toUpperCase()}\n${f.msg}\n\n`;
            });

            addHistory(text, maxLevel);

            // Render Suggested Actions based on Backend Meta
            const { isPredatory, isPhishing, domains } = data.meta;

            let actionHTML = `<h4>Recommended Guardian Actions</h4><ul>`;
            latestReportText += `-- Action Plan --\n`;

            if (isPredatory) {
                actionHTML += `<li><strong>IMMEDIATE ACTION:</strong> Do not reply. Take screenshots of the entire conversation.</li>`;
                actionHTML += `<li><strong>Block the sender</strong> across all platforms immediately.</li>`;
                actionHTML += `<li><strong>Report</strong> the account to the platform (Facebook, Discord, Snapchat, etc.).</li>`;
                actionHTML += `<li>Consider reporting this to local law enforcement or CEOP (Child Exploitation and Online Protection) in the UK.</li>`;

                latestReportText += `- Do not reply. Take screenshots.\n- Block sender immediately.\n- Report to platform/law enforcement.\n`;
            } else if (isPhishing) {
                actionHTML += `<li><strong>DO NOT CLICK</strong> any links provided in the message.</li>`;
                actionHTML += `<li><strong>Delete</strong> the email/message and block the sender.</li>`;
                latestReportText += `- Do NOT click any links.\n- Delete message and block sender.\n`;

                if (domains && domains.length > 0) {
                    actionHTML += `<li>You may safely verify the domains here without risk:</li><ul>`;
                    domains.forEach(d => {
                        actionHTML += `<li><a href="https://www.virustotal.com/gui/domain/${d}" target="_blank">Safe VirusTotal Scan (${d})</a></li>`;
                        latestReportText += `- Investigate Domain: ${d}\n`;
                    });
                    actionHTML += `</ul>`;
                }
            } else {
                actionHTML += `<li>If you don't recognize the sender, it's safer to delete the message.</li>`;
                actionHTML += `<li>Never send money, crypto, or gift cards to unverified strangers.</li>`;
                latestReportText += `- Delete if sender is unrecognized.\n- Do not send money to strangers.\n`;
            }

            actionHTML += `</ul>`;
            actionPlan.innerHTML = actionHTML;

            if (downloadReportBtn) {
                downloadReportBtn.style.display = 'inline-block';
                if (tier === 'basic') {
                    downloadReportBtn.textContent = '🔒 Export (Pro/Std Only)';
                    downloadReportBtn.className = 'btn sec';
                    downloadReportBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        alert('Export functionality requires the Standard or Pro Tier. Please upgrade your subscription.');
                    };
                }
            }

        } catch (err) {
            console.error(err);
            resultsDiv.style.display = 'block';
            threatLog.innerHTML = `<div class="threat-item threat-warn"><div class="threat-head">[SYSTEM ERROR]</div>Failed to connect to GRACE-X Guardian Backend. Ensure the node server is running.</div>`;
        } finally {
            scanBtn.textContent = 'Run Guardian Analysis';
            scanBtn.style.opacity = '1';
            scanBtn.style.pointerEvents = 'auto';
        }
    });

    // HELP TOUR INTEGRATION
    const startTourBtn = document.getElementById('startTourBtn');
    if (startTourBtn) {
        startTourBtn.addEventListener('click', () => {
            alert('Welcome to Guardian Setup Tour.\n\n1. Use the Data Breach Checker to see if your email is compromised.\n2. Paste suspicious texts into the Sandbox to scan them without clicking links.\n3. Turn on Guardian rules on family devices to restrict adult content.\n4. Export Scan Reports if you need to provide evidence to law enforcement.');
        });
    }
});
