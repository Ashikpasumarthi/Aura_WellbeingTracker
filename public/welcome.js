//reference for francois
async function initializePage() {
    const statusElement = document.getElementById('download-status');
    const downloadButton = document.getElementById('enable-ai-button');

    try {

        const availability = await window.ai.getAvailability();
        console.log("Current AI Status:", availability);

        if (availability === "available") {

            statusElement.textContent = "AI is ready. Getting your budget...";
            await getAndSaveAIBudget();
        } else if (availability === "downloadable") {

            statusElement.textContent = "AI features require a download.";
            downloadButton.style.display = 'block';
        } else {

            statusElement.textContent = `AI is not ready (Status: ${availability}). Using default budget.`;
            await chrome.storage.local.set({ globalBudget: 60 });
        }
    } catch (error) {
        console.error("Could not initialize AI features:", error);
        statusElement.textContent = "Could not initialize AI. Using default budget.";
        await chrome.storage.local.set({ globalBudget: 60 });
    }
}

async function getAndSaveAIBudget() {
    let budgetInMinutes;
    try {
        const session = await window.ai.create();
        const storageData = await chrome.storage.local.get('userInput');
        const userInput = storageData.userInput || {};

        const promptString = `Based on this user profile: ${JSON.stringify(userInput)}, recommend a screen time budget in minutes. Respond with only the number.`;
        const response = await session.run({ prompt: promptString });
        budgetInMinutes = parseInt(response, 10);
    } catch (error) {
        console.error("AI task failed:", error);
        budgetInMinutes = 60; // Fallback on any error.
    }


    await chrome.storage.local.set({ globalBudget: budgetInMinutes });
    document.getElementById("download-status").textContent = `Your personalized AI budget is set to ${budgetInMinutes} minutes.`;
}

async function handleEnableAIModal() {
    const downloadButton = document.getElementById('enable-ai-button');
    const statusElement = document.getElementById("download-status");

    try {
        statusElement.textContent = "Starting download...";
        downloadButton.disabled = true;

        await window.ai.create({
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    statusElement.textContent = `Downloading AI model: ${Math.floor(e.loaded * 100)}%`;
                });
            },
        });

        statusElement.textContent = "AI model enabled successfully!";
        downloadButton.style.display = 'none';

        await getAndSaveAIBudget();

    } catch (error) {
        console.error('Error enabling AI:', error);
        statusElement.textContent = "Download failed. Please try again.";
        downloadButton.disabled = false;
    }
}


// This function saves the user's form input.
async function handleSavePreferences() {
    const userInput = {
        name: document.getElementById('name').value,
        gender: document.getElementById('gender').value,
        age: document.getElementById('age-group').value,
        activityLevel: document.getElementById('activity-level').value,
        officeShift: document.getElementById('office-shift').value,
        officeHours: document.getElementById('office-hours').value,
    };

    try {
        const allData = await chrome.storage.local.get(null);
        allData.userInput = userInput;
        await chrome.storage.local.set(allData);
        console.log("User input saved:", userInput);

        // After saving preferences, re-calculate the AI budget.
        await getAndSaveAIBudget();

    } catch (error) {
        console.error("Failed to save user input:", error);
    }
}



document.getElementById('enable-ai-button').addEventListener('click', handleEnableAIModal);
document.getElementById('save-preferences').addEventListener('click', handleSavePreferences);


initializePage();
