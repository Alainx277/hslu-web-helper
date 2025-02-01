chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!("type" in message)) {
    return;
  }
  if (message.type == "saveSettings") {
    chrome.storage.sync.set(message.settings, () => sendResponse({}));
    return true;
  } else if (message.type == "loadSettings") {
    chrome.storage.sync.get(["moduleEdits", "semester"]).then((x) => sendResponse(x));
    return true;
  } else if (message.type == "saveLocal") {
    chrome.storage.local.set(message.session, () => sendResponse({}));
    return true;
  } else if (message.type == "loadLocal") {
    chrome.storage.local
      .get(["modules", "bachelor", "major"])
      .then((x) => sendResponse(x));
    return true;
  }
});
