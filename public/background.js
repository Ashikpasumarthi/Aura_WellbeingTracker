chrome.windows.onCreated.addListener(
    async (window) => {
        let userInput = { gender: "Male", age: "25-34", activityLevel: "Moderate" };
        console.log("Gemini API will be called here with async await to get the time he/she should spend on window based on user input", userInput);
        //store the time in local chrome which we got from gemini api and also create a variable which is 0 initially and will be incremented every second using set interval

        const params = await LanguageModel.params({
            ...userInput
        })
        const availability = await chrome.ai.prompt.getAvailability();

        if (availability === "available") {
            const promptString = `Based on this user profile: ${JSON.stringify(userInput)}, recommend a screen time budget in minutes for a new work session. Respond with only the number.`;
            const response = await chrome.ai.prompt.run({ prompt: promptString });
            const recommendedTime = parseInt(response.text, 10);
            console.log(`Recommended screen time budget: ${recommendedTime} minutes`);


        }
        else {
            const session = await chrome.ai.prompt.create({
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(`Downloaded ${e.loaded * 100}%`);
                    });
                },
            });
        }
        console.log("New Window Details:", window); //window details are present here


    },
    {
        windowType: ["normal"]
    }
)


function handleInstalled(details) {
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
    (tab) => {
        let tabId = tab.id.toString();
        let initialtime = new Date().getTime();
        console.log("New Tab Details:", tab);
        // chrome.alarms.create(
        //     tab.id.toString(),
        //     { delayInMinutes: 180 },
        // );
        chrome.storage.local.get(null, (allData) => {      // the null tells to get all the data from local storage
            allData[tabId] = {
                startTime: initialtime, endTime: 0, overAllTimeSpent: 0
            };
            allData.lastActiveTabId = tabId;
            chrome.storage.local.set(allData);
        });
    }
);


chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('Tab activated:', activeInfo);
    let newTabId = activeInfo.tabId.toString();
    let switchTime = new Date().getTime();

    chrome.storage.local.get(null, (allData) => {
        const lastActivatedTabId = allData.lastActivatedTabId;
        if (lastActivatedTabId) {
            if (allData[lastActivatedTabId]) {
                allData[lastActivatedTabId].endTime = switchTime;
                allData[lastActivatedTabId].overAllTimeSpent += allData[lastActivatedTabId].endTime - allData[lastActivatedTabId].startTime;
            }
        }
        if (!allData[newTabId]) {
            allData[newTabId] = { startTime: 0, endTime: 0, overAllTimeSpent: 0 };
        }

        allData[newTabId].startTime = switchTime;

        allData.lastActivatedTabId = newTabId;

        chrome.storage.local.set(allData);
    })

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