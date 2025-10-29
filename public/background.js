chrome.windows.onCreated.addListener(
    async (window) => {
        // let userInput = { gender: "Male", age: "25-34", activityLevel: "Moderate" };
        // console.log("Gemini API will be called here with async await to get the time he/she should spend on window based on user input", userInput);
        //store the time in local chrome which we got from gemini api and also create a variable which is 0 initially and will be incremented every second using set interval
        console.log("BG: New window detected. Starting AI budget process...");

        await createOffScreenDoc();
        const storageData = await chrome.storage.local.get('userInput');
        const userInput = storageData.userInput || {};
        chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'getAIBudget',
            windowId: window.id,
            data: userInput
        });
    },
    {
        windowType: ["normal"]
    }
)

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.endsWith('welcome.html')) {


        try {
            await chrome.tabs.sendMessage(tabId, { action: "showEnableAIButton" });
        }
        catch (error) {
            console.error("Error sending message to welcome tab:", error);
        }
    }
});

let creating;
async function createOffScreenDoc() {
    if (await chrome.offscreen.hasDocument()) {
        return;
    }
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['DOM_PARSER'],
            justification: 'Needed to run AI model in the background'
        });
        await creating;
        creating = null;
    }
}

chrome.runtime.onMessage.addListener(async (message) => {
    console.log("BG: A message was received:", message);
    if (message.target === 'background' && message.action === 'saveAIBudget') {
        console.log("BG: Correct 'saveAIBudget' message received. Saving AI budget...");
        const { windowId, budget } = message;

        try {
            const allData = await chrome.storage.local.get(null);
            if (!allData[windowId]) {
                allData[windowId] = {};
            }
            allData[windowId].budget = budget;

            await chrome.storage.local.set(allData);
            console.log(`BG: Budget of ${budget} mins saved for NEW window ${windowId}`);

        } catch (error) {
            console.error("BG: Failed to save budget to storage:", error);
        }
    }
    else if (message.target === 'background' && message.action === 'wellnessTipNotification') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Wellness Reminder',
            message: message.tip,
            priority: 2
        });
    }
});


async function handleInstalled(details) {
    console.log(details.reason);
    chrome.tabs.create({
        url: "welcome.html",
    });
}

async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}


chrome.tabs.onCreated.addListener(
    async (tab) => {
        let tabId = tab.id.toString();
        let initialtime = new Date().getTime();
        console.log("New Tab Details:", tab);
        try {
            chrome.storage.local.get(null, async (allData) => {      // the null tells to get all the data from local storage
                allData[tabId] = {
                    startTime: initialtime, endTime: 0, overAllTimeSpent: 0, windowId: tab.windowId
                };
                allData.lastActiveTabId = tabId;
                await chrome.storage.local.set(allData);
            });
        }
        catch (error) {
            console.error("Error updating tab data:", error);
        }

    });


chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log('Tab activated:', activeInfo);
    let newTabId = activeInfo.tabId.toString();
    let switchTime = new Date().getTime();
    try {
        // --- Use await to get data ---
        const allData = await chrome.storage.local.get(null);
        const lastActivatedTabId = allData.lastActiveTabId;

        console.log("Last Activated Tab ID:", lastActivatedTabId);
        console.log("New Activated Tab ID:", newTabId);

        let previousTabWindowId = null; // Variable to store the window ID

        // --- Process the tab the user just LEFT ---
        if (lastActivatedTabId && allData[lastActivatedTabId]) {
            allData[lastActivatedTabId].endTime = switchTime;
            const duration = switchTime - allData[lastActivatedTabId].startTime;
            if (duration > 0) {
                allData[lastActivatedTabId].overAllTimeSpent += duration;
            }
            // Get the window ID from the tab we just processed
            previousTabWindowId = allData[lastActivatedTabId].windowId;
        }

        // --- BUDGET CHECK LOGIC (Using Cumulative Sum) ---
        let cumulativeWindowTime = 0;
        const windowKeyToCheck = previousTabWindowId ? previousTabWindowId.toString() : null;

        if (windowKeyToCheck) {
            // 1. Sum the time for ALL tabs in the relevant window
            for (const key in allData) {
                if (allData[key] && allData[key].windowId === previousTabWindowId) {
                    cumulativeWindowTime += allData[key].overAllTimeSpent;
                }
            }

            // 2. Get the budget for that window
            const budgetInMinutes = (allData[windowKeyToCheck] && allData[windowKeyToCheck].budget)
                ? allData[windowKeyToCheck].budget
                : (allData.globalBudget || 60); // Fallback logic
            const budgetInMillis = budgetInMinutes * 60 * 1000;

            console.log(`Window ${windowKeyToCheck}: Cumulative Time = ${cumulativeWindowTime}ms, Budget = ${budgetInMillis}ms`);

            // 3. Compare cumulative time against the window's budget
            if (cumulativeWindowTime >= budgetInMillis) {
                console.log(`Window ${windowKeyToCheck} exceeded budget! Triggering notification...`);
                const storageData = await chrome.storage.local.get('userInput');
                const userInput = storageData.userInput || {};

                await createOffScreenDoc();
                chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'budgetExceededNotificationWriterAPI',
                    windowId: previousTabWindowId,   // Use the windowId received in the message
                    budget: budgetInMinutes, // Send the calculated budget
                    data: userInput
                });

                // 4. Act: Reset timers for ALL tabs in this window and trigger notification
                for (const key in allData) {
                    if (allData[key] && allData[key].windowId === previousTabWindowId) {
                        allData[key].overAllTimeSpent = 0; // Reset time
                    }
                }


                console.log("Budget exceeded - Notification logic would run here.");
            }
        }
        // --- END BUDGET CHECK ---

        // --- Process the tab the user just ENTERED ---
        if (!allData[newTabId]) {
            allData[newTabId] = { startTime: 0, endTime: 0, overAllTimeSpent: 0, windowId: activeInfo.windowId };
        } else {
            allData[newTabId].windowId = activeInfo.windowId;
        }
        allData[newTabId].startTime = switchTime;
        allData.lastActiveTabId = newTabId;

        // --- Use await to save data ---
        await chrome.storage.local.set(allData);

    } catch (error) {
        console.error("Error updating tab activation data:", error);
    }

});

// Add this log OUTSIDE the listener to confirm the script loaded
console.log("BG: onRemoved listener script is loaded.");

chrome.windows.onRemoved.addListener(async (windowId) => {
    // Add this log INSIDE to confirm the event fired
    console.log(`ON_REMOVED: Listener fired for window ${windowId}. Starting cleanup.`);

    try {
        const allData = await chrome.storage.local.get(null);
        console.log("ON_REMOVED: Got storage data. Checking items..."); // Log 2

        const keysToRemove = [];
        let checkedItems = 0; // Counter

        for (const key in allData) {
            checkedItems++; // Count how many items we checked
            // Log the check BEFORE the 'if'
            console.log(`ON_REMOVED: Checking key [${key}] - Stored windowId: ${allData[key]?.windowId} | Closed windowId: ${windowId}`);

            if (allData[key] && allData[key].windowId === windowId) {
                console.log(`ON_REMOVED: Match found! Adding key ${key} to removal list.`); // Match log
                keysToRemove.push(key);
            }
        }
        console.log(`ON_REMOVED: Checked ${checkedItems} items in storage.`); // Log how many items were checked

        if (keysToRemove.length > 0) {
            console.log("ON_REMOVED: Attempting to remove keys:", keysToRemove);
            await chrome.storage.local.remove(keysToRemove);
            console.log("ON_REMOVED: Removal successful.");
        } else {
            // This is the most important log if cleanup isn't happening
            console.log(`ON_REMOVED: No keys found matching window ${windowId}. Nothing removed.`);
        }
    } catch (error) {
        console.error("ON_REMOVED: Error during cleanup:", error);
    }
});

chrome.runtime.onInstalled.addListener(handleInstalled);






//this file is more often like a watchman whose primary task is guard the house and they are not involved in the day to day activities within the house.
//The guard is always on duty, even when the office workers have closed their doors and gone home (it runs in the background even when your UI is closed).
//The guard doesn't do anything until a specific event happens—a fire alarm goes off, a delivery arrives, a door opens. They react to events.

//we need this file for persistence, unlike any react js scripts which are ephemeral and get destroyed when the UI is closed.But background.js is persistent and always running in the background.
// So if you need to maintain state or perform tasks that should continue even when the user isn't actively interacting with your extension, background.js is the place to do it.
//The service worker is needed because it lives independently. It's the browser's way of giving your extension a place to run important logic that must continue working no matter what the user is doing.
//In summary, you need the service worker because it's the only part of your extension that is always on-duty, allowing you to reliably run your timer and notification logic in the background.

//what it does?
//Event Handling: This is its most important job in your extension. It constantly listens for browser events and runs code when they happen. For your project, it will listen for:

// A tab being activated (chrome.tabs.onActivated)

// The user going idle (chrome.idle.onStateChanged)

// A pre-set alarm going off (chrome.alarms.onAlarm)








// Read, modify, write pattern
// That's an excellent question, and the good news is that the "Read, Modify, Write" pattern handles this situation perfectly.

// If it's a fresh start and no other data exists, the `allData` variable inside your `get` callback will simply be an **empty object (`{}`).**

// -----

// ## The "Fresh Start" Example

// Let's walk through the process for the very first tab ever created.

// ### 1\. Read

// You call **`chrome.storage.local.get(null, (allData) => { ... })`**.

//   * Because storage is empty, the `allData` variable inside your callback is now just `{}`.

// ### 2\. Modify

// Your code then adds the new tab's information to this empty object.

//   * `allData[tabId] = { ... };`
//   * `allData.lastActiveTabId = tabId;`

// Now, your `allData` variable looks like this:

// ```javascript
// {
//   "123": { "timeSpent": 0, "lastActivated": 1664884200000 },
//   "lastActiveTabId": "123"
// }
// ```

// ### 3\. Write

// Finally, you call **`chrome.storage.local.set(allData)`**, which saves this new object to storage.

// So, the logic works exactly the same. Adding a new property to an empty object is a standard operation, which means your current code already handles a fresh start without any changes.