//reference for francois
async function initializePage() {
    const statusElement = document.getElementById('download-status');
    const downloadButton = document.getElementById('enable-ai-button');

    try {

        const availability = await LanguageModel.availability();
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
    console.log("getAndSaveAIBudget: Starting budget calculation..."); // <-- Log 5
    let budgetInMinutes;
    const finalStatusElement = document.getElementById("download-status");
    try {
        
        const params = await LanguageModel.params();
        const session = await LanguageModel.create({
            temperature: 0.7,
            topK: params.defaultTopK
        });

        console.log("getAndSaveAIBudget: Reading userInput from storage..."); // <-- Log 6
        const storageData = await chrome.storage.local.get('userInput');
        const userInputFromStorage = storageData.userInput || {};
        console.log("getAndSaveAIBudget: User input read from storage:", userInputFromStorage); // <-- Log 7

        const promptString = `Given the user profile: ${JSON.stringify(userInput)}. Recommend a maximum continuous screen time budget in minutes for a single focused work session before a break is advised. Consider that this is during office hours and should balance productivity with well-being. Respond with only an integer representing the total minutes where the minutes should not be restricted only ending with 0 `;
        console.log("getAndSaveAIBudget: Sending prompt to AI:", promptString); // <-- Log 8
        const response = await session.prompt(promptString);
        budgetInMinutes = parseInt(response, 10);
        console.log("getAndSaveAIBudget: AI responded with budget:", budgetInMinutes); // <-- Log 9

    } catch (error) {
        console.error("AI task failed during recalculation:", error);
        budgetInMinutes = 60; // Fallback
    }

    // Save the new budget
    console.log("getAndSaveAIBudget: Saving new budget to storage:", budgetInMinutes); // <-- Log 10
    await chrome.storage.local.set({ globalBudget: budgetInMinutes });
    document.getElementById("download-status").textContent = `Your personalized AI budget is set to ${budgetInMinutes} minutes.`;
}

async function handleEnableAIModal() {
    const downloadButton = document.getElementById('enable-ai-button');
    const statusElement = document.getElementById("download-status");

    try {
        statusElement.textContent = "Starting download...";
        downloadButton.disabled = true;

        await LanguageModel.create({
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    // console.log(`Downloaded ${e.loaded * 100}%`);
                    statusElement = document.getElementById("download-status");
                    statusElement.textContent = `Downloading AI model... ${Math.floor(e.loaded * 100)}% completed.`;
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
        age: document.getElementById('age').value,
        activityLevel: document.getElementById('activity-level').value,
        officeShift: document.getElementById('office-shift').value,
        officeHours: document.getElementById('office-hours').value,
    };

    console.log("Save Clicked: New user input gathered:", userInput); // <-- Log 1
    const statusContainer = document.getElementById('ai-status-container');
    const finalStatusElement = document.getElementById('download-status');

    try {
        const allData = await chrome.storage.local.get(null);
        allData.userInput = userInput;
        await chrome.storage.local.set(allData);
        console.log("Save Complete: User input has been saved to storage."); // <-- Log 2


        // --- START ANIMATION ---
        statusContainer.style.display = 'flex';
        await runStatusAnimation();
        // --- ANIMATION COMPLETE ---


        
        console.log("Triggering AI budget recalculation..."); // <-- Log 3
        await getAndSaveAIBudget();
        console.log("AI budget recalculation finished."); // <-- Log 4

        statusContainer.style.display = 'none';

    } catch (error) {
        console.error("Failed to save user input or recalculate budget:", error);
        finalStatusElement.textContent = "Error saving preferences.";
        statusContainer.style.display = 'none';
    }
}


// New function to handle the typing animation
function runStatusAnimation() {
    return new Promise(async (resolve) => { 
        const statusMessages = [
            'AI is ready. Getting your budget…',
            'Analyzing wellness patterns…',
            'Calibrating neural pathways…',
            'Profile calibrated ✅',
        ];
        const statusElement = document.getElementById('ai-status-text');
        const typingDelay = 50; // ms per character
        const messageDelay = 1500; // ms between messages

        for (let i = 0; i < statusMessages.length; i++) {
            const message = statusMessages[i];
            // Simulate typing
            for (let j = 0; j <= message.length; j++) {
                statusElement.textContent = message.slice(0, j);
                // Add typing cursor simulation here if needed via CSS class toggle
                await new Promise(r => setTimeout(r, typingDelay));
            }
            // Pause before next message (or finishing)
            if (i < statusMessages.length - 1) {
                await new Promise(r => setTimeout(r, messageDelay));
            }
        }
        resolve(); // Signal that the animation is complete
    });
}





document.getElementById('enable-ai-button').addEventListener('click', handleEnableAIModal);
document.getElementById('save-preferences').addEventListener('click', handleSavePreferences);


initializePage();
