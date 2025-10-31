let trackingPaused = false;

// Load data when popup opens
document.addEventListener('DOMContentLoaded', async () => {
    await loadStats();
    setupEventListeners();
});

async function loadStats() {
    try {


        const currentWindow = await chrome.windows.getCurrent();
        const currentWindowKey = currentWindow.id.toString();


        const data = await chrome.storage.local.get(null);


        let budgetInMinutes = 60;

        if (data.globalBudget) {
            budgetInMinutes = data.globalBudget;
        }


        if (currentWindowKey && data[currentWindowKey] && data[currentWindowKey].budget) {
            budgetInMinutes = data[currentWindowKey].budget;
        }
        // const data = await chrome.storage.local.get(['globalBudget', 'userInput', 'CompleteTimeSpent', 'trackingPaused', 'lastSessionDuration']);
        document.getElementById('AI-budget').textContent = `${budgetInMinutes} m`;

        // 2. Update Screen Time (Grand Total)

        const completeTimeSpentData = data.CompleteTimeSpent || 0;
        const completeTimeSpentMins = Math.floor(completeTimeSpentData);
        document.getElementById('screen-time').textContent = `${completeTimeSpentMins} m`;

        const lastSessionMs = data.lastSessionDuration || 0;
        const budgetInMillis = budgetInMinutes * 60 * 1000;
        const progress = budgetInMillis > 0 ? Math.min((lastSessionMs / budgetInMillis) * 100, 100) : 0;
        document.getElementById('progress-fill').style.width = `${progress}%`;


        trackingPaused = data.trackingPaused || false;
        updateTrackingStatus();

        const lastSessionMins = lastSessionMs / 60000;
        const remaining = Math.max(budgetInMinutes - lastSessionMins, 0);
        document.getElementById('next-break').textContent = remaining > 0 ? `${Math.floor(remaining)} m` : 'Now!';

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateTrackingStatus() {
    const statusText = document.getElementById('status-text');
    const pauseBtn = document.getElementById('pause-btn');
    const statusBadge = document.querySelector('.status-badge');

    if (trackingPaused) {
        statusText.textContent = 'Tracking Paused';
        pauseBtn.innerHTML = '▶ Resume Tracking';
        statusBadge.style.background = 'rgba(251, 191, 36, 0.2)';
        statusBadge.style.borderColor = 'rgba(251, 191, 36, 0.4)';
        statusBadge.style.color = '#fbbf24';
        document.querySelector('.status-dot').style.background = '#fbbf24';
    } else {
        statusText.textContent = 'Tracking Active';
        pauseBtn.innerHTML = '⏸ Pause Tracking';
        statusBadge.style.background = 'rgba(34, 197, 94, 0.2)';
        statusBadge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        statusBadge.style.color = '#22c55e';
        document.querySelector('.status-dot').style.background = '#22c55e';
    }
}

function setupEventListeners() {
    // Setup button - opens welcome page
    document.getElementById('setup-btn').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
    });

    // Pause/Resume button
    document.getElementById('pause-btn').addEventListener('click', async () => {
        trackingPaused = !trackingPaused;
        await chrome.storage.local.set({ trackingPaused });
        updateTrackingStatus();
    });
}

// Auto-refresh stats every 30 seconds
setInterval(loadStats, 30000);