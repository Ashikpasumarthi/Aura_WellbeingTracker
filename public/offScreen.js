console.log("OFFSCREEN: Script loaded and waiting for a message.");

chrome.runtime.onMessage.addListener(async (message) => {
    console.log("OFFSCREEN: A message was received:", message);

    if (message.target === 'offscreen' && message.action === 'getAIBudget') {
        console.log("OFFSCREEN: Correct 'getAIBudget' message received. Starting AI task...");
        let budgetInMinutes;

        // --- THIS IS THE FIX ---
        // Get the userInput DIRECTLY from the message sent by background.js
        const userInput = message.data || {};
        const windowId = message.windowId; // Get the windowId from the message too

        try {
            // Check AI availability using LanguageModel
            const availability = await LanguageModel.availability();
            console.log("OFFSCREEN: AI Availability:", availability);

            if (availability === "available") {
                const params = await LanguageModel.params();
                const session = await LanguageModel.create({
                    temperature: 0.3, // Keep the variation
                    topK: params.defaultTopK
                });


                const promptString = `Given the user profile: ${JSON.stringify(userInput)}. Recommend a maximum continuous screen time budget in minutes for a single focused work session before a break is advised. Consider that this is during office hours and should balance productivity with well-being. Respond with only an integer representing the total minutes`;
                console.log("OFFSCREEN: Sending prompt:", promptString);

                const response = await session.prompt(promptString);
                budgetInMinutes = parseInt(response, 10);
                console.log("OFFSCREEN: AI responded with budget:", budgetInMinutes);

                if (isNaN(budgetInMinutes)) {
                    console.warn("OFFSCREEN: AI response NaN. Falling back.");
                    budgetInMinutes = 60;
                }
            } else {
                console.log("OFFSCREEN: AI not available. Falling back.");
                budgetInMinutes = 60; // Fallback
            }
        } catch (error) {
            console.error("OFFSCREEN: AI task failed:", error);
            budgetInMinutes = 60; // Fallback
        }

        // --- THIS IS THE FIX ---
        // Send the result BACK to background.js
        chrome.runtime.sendMessage({
            target: 'background',
            action: 'saveAIBudget',
            windowId: windowId,   // Use the windowId received in the message
            budget: budgetInMinutes // Send the calculated budget
        });

        // --- THIS IS THE FIX ---
        // Close the hidden page now that the job is done
        window.close();
    }

    else if (message.target === 'offscreen' && message.action === 'budgetExceededNotificationWriterAPI') {
        const userInput = message.data || {};
        const windowId = message.windowId;
        const budget = message.budget;

        try {
            const availability = await LanguageModel.availability();
            if (available === 'unavailable') {
                // The Writer API isn't usable.
                return;
            }
            else if (availability === "available") {
                const params = await LanguageModel.params();
                const options = {
                    sharedContext: 'This is about user well-being and productivity during work hours.',
                    tone: 'formal',
                    format: 'plain-text',
                    length: 'long',
                    temperature: 0.8,
                    topK: params.defaultTopK
                };
                writer = await LanguageModel.create(options);
                const promptString = `You are an AI wellness assistant creating a brief reminder for ${userInput.name || 'an office worker'}. 
                                     This user identifies as ${userInput.gender || 'an adult'} in the ${userInput.age || 'working'} age group, has a ${userInput.activityLevel || 'moderate'} activity level, and works a ${userInput.officeShift || 'standard'} shift (${userInput.officeHours || 'business hours'}). They just exceeded their screen time budget of ${budget} minutes.

                                     Generate a short, encouraging wellness tip (under 50 words). Suggest 1-2 simple, actionable activities suitable for a quick break at their desk or office to refresh their mind and body. 

                                     Keep the instructions concise.`;
                // 5. Run the prompt to generate the tip
                console.log("OFFSCREEN: Sending prompt to Writer API...");
                wellnessTip = await writer.prompt(promptString);
                console.log("OFFSCREEN: Got wellness tip:", wellnessTip)
            }
            else {
                console.log(`OFFSCREEN: Writer API not available (Status: ${availability}). Using default tip.`);
                wellnessTip = "Time for a quick break! Stand up, stretch your back, and drink a glass of water."; // Assign default
            }
        }
        catch (error) {
            console.error("OFFSCREEN: Writer API initialization failed:", error);
        }

        chrome.runtime.sendMessage({
            target: 'background',
            action: 'wellnessTipNotification',
            windowId: windowId,
            tip: wellnessTip
        });

        window.close();

    }
});

// try {
//     // 1. AWAIT the data from storage.
//     const allData = await chrome.storage.local.get(null);

//     // 2. Modify the data.
//     const windowId = message.windowId.toString();
//     if (!allData[windowId]) {
//         allData[windowId] = {};
//     }
//     allData[windowId].budget = budgetInMinutes;

//     // 3. AWAIT the save operation to complete.
//     await chrome.storage.local.set(allData);
//     console.log(`Budget of ${budgetInMinutes} mins set for window ${windowId}`);

// } catch (error) {
//     console.error("Failed to save budget to storage:", error);
// }

// 4. NOW it's safe to close the window.
// window.close();


