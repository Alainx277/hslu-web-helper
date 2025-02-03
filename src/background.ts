chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!("type" in message)) {
    return;
  }
  if (message.type == "saveSettings") {
    chrome.storage.sync.set(message.settings, () => sendResponse({}));
    return true;
  } else if (message.type == "loadSettings") {
    chrome.storage.sync.get(null).then((x) => sendResponse(x));
    return true;
  } else if (message.type == "saveLocal") {
    chrome.storage.local.set(message.session, () => sendResponse({}));
    return true;
  } else if (message.type == "loadLocal") {
    chrome.storage.local.get(null).then((x) => sendResponse(x));
    return true;
  }
});
