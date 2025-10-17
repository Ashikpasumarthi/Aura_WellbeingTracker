console.log("OFFSCREEN: The offscreen.js script has successfully loaded!");

chrome.runtime.onMessage.addListener(async (message) => {
    console.log("OFFSCREEN: A message was received:", message);
    if (message.target === 'offscreen' && message.action === 'getAIBudget') {
        console.log("OFFSCREEN: Correct 'getAIBudget' message received. Starting AI task...");
        let budgetInMinutes;

        try {
            console.log("OFFSCREEN: Step 1 - Reading user input from storage...");
            console.log("User Input Data:", message.data.userInput)
            
            console.log("OFFSCREEN: Step 3 - Checking AI availability...");
            const availability = await window.ai.getAvailability();

            console.log("OFFSCREEN: Step 4 - AI status is:", availability);
            console.log("AI Availability in Offscreen:", availability);
            if (availability === "available") {
                console.log("OFFSCREEN: Step 5 - AI is available. Creating session...");
                const session = await window.ai.create();
                const promptString = `Based on this user profile: ${JSON.stringify(message.data.userInput)}, recommend a screen time budget in minutes. Respond with only the number.`;
                const response = await session.run({ prompt: promptString });
                budgetInMinutes = parseInt(response, 10);
                console.log("AI recommended budget (mins):", budgetInMinutes);
                console.log("OFFSCREEN: Step 6 - AI call successful. Budget is:", budgetInMinutes);
            } else {
                budgetInMinutes = 60; // Fallback
                console.log(`OFFSCREEN: AI not available, using default budget: ${budgetInMinutes}`);
            }
        } catch (error) {
            console.error("Offscreen AI task failed:", error);
            budgetInMinutes = 60; // Fallback
        }


        try {
            // 1. AWAIT the data from storage.
            const allData = await chrome.storage.local.get(null);

            // 2. Modify the data.
            const windowId = message.windowId.toString();
            if (!allData[windowId]) {
                allData[windowId] = {};
            }
            allData[windowId].budget = budgetInMinutes;

            // 3. AWAIT the save operation to complete.
            await chrome.storage.local.set(allData);
            console.log(`Budget of ${budgetInMinutes} mins set for window ${windowId}`);

        } catch (error) {
            console.error("Failed to save budget to storage:", error);
        }

        // 4. NOW it's safe to close the window.
        // window.close();
    }
});


