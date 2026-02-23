document.addEventListener("DOMContentLoaded", () => {
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

    scanBtn.addEventListener('click', async () => {
        const text = inputEl.value;
        if (!text.trim()) return;

        // UI Loading state
        scanBtn.textContent = 'Analyzing...';
        scanBtn.style.opacity = '0.7';
        scanBtn.style.pointerEvents = 'none';

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

            data.findings.forEach(f => {
                const div = document.createElement('div');
                div.className = `threat-item threat-${f.level}`;
                div.innerHTML = `<div class="threat-head">[${f.type}]</div>${f.msg}`;
                threatLog.appendChild(div);
            });

            // Render Suggested Actions based on Backend Meta
            const { isPredatory, isPhishing, domains } = data.meta;

            let actionHTML = `<h4>Recommended Guardian Actions</h4><ul>`;

            if (isPredatory) {
                actionHTML += `<li><strong>IMMEDIATE ACTION:</strong> Do not reply. Take screenshots of the entire conversation.</li>`;
                actionHTML += `<li><strong>Block the sender</strong> across all platforms immediately.</li>`;
                actionHTML += `<li><strong>Report</strong> the account to the platform (Facebook, Discord, Snapchat, etc.).</li>`;
                actionHTML += `<li>Consider reporting this to local law enforcement or CEOP (Child Exploitation and Online Protection) in the UK.</li>`;
            } else if (isPhishing) {
                actionHTML += `<li><strong>DO NOT CLICK</strong> any links provided in the message.</li>`;
                actionHTML += `<li><strong>Delete</strong> the email/message and block the sender.</li>`;
                if (domains && domains.length > 0) {
                    actionHTML += `<li>You may safely verify the domains here without risk:</li><ul>`;
                    domains.forEach(d => {
                        actionHTML += `<li><a href="https://www.virustotal.com/gui/domain/${d}" target="_blank">Safe VirusTotal Scan (${d})</a></li>`;
                    });
                    actionHTML += `</ul>`;
                }
            } else {
                actionHTML += `<li>If you don't recognize the sender, it's safer to delete the message.</li>`;
                actionHTML += `<li>Never send money, crypto, or gift cards to unverified strangers.</li>`;
            }

            actionHTML += `</ul>`;
            actionPlan.innerHTML = actionHTML;

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
});
