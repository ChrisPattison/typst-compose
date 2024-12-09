// Thunderbird can terminate idle backgrounds in Manifest V3.
// Any listener directly added during add-on startup will be registered as a
// persistent listener and the background will wake up (restart) each time the
// event is fired.

// A restarting background will try to re-register the message display scripts,
// and fail. Catch the error.

/* Register the compose content script */
async function registerContentScript() {
  let composeScriptId = "compose-content-script-1";
  // First check if already registered
  const registeredScripts =
    await browser.scripting.compose.getRegisteredScripts();
  if (registeredScripts.length == 0) {
    browser.scripting.compose
      .registerScripts([
        {
          id: composeScriptId,
          css: ["/compose-content/compose-content-styles.css"],
          js: ["/compose-content/compose-content-script.js"],
          runAt: "document_start",
        },
      ])
      .catch(console.info);
  }
}
registerContentScript();

// ======== Action Button =======
messenger.composeAction.onClicked.addListener((tab, info) => {
  browser.tabs.sendMessage(tab.id, { command: "manualRefresh" });
});

// ======== Typst preview =======

function getMessageText(body) {
  let doc = new DOMParser().parseFromString(body, "text/html");
  const display = doc.getElementById("typst-display");
  if (!(display === null)) {
    display.remove();
  }
  return doc.body.innerText;
}

/* Fetch the typst preview from the node backend */
async function fetchPreview(body) {
  const response = await fetch("http://127.0.0.1:3000", {
    method: "POST",
    body: body,
  });
  if (!response.ok) {
    console.log(
      "Backend request faild with " +
        response.status +
        ": " +
        response.statusText,
    );
    return response.status + ": " + response.statusText;
  }
  return await response.text();
}

// ======= Command stuff ======

/**
 * command handler: handles the commands received from the content script
 */
const doHandleCommand = async (msg, sender) => {
  const { command } = msg;
  // Check for known commands.
  switch (command.toLocaleLowerCase()) {
    case "getpreview":
      {
        const details = await browser.compose.getComposeDetails(sender.tab.id);
        const message = details.isPlainText
          ? details.plainTextBody
          : getMessageText(details.body);
        return await fetchPreview(message);
      }
      break;
    default:
      {
        console.log("unrecognized command " + command);
      }
      break;
  }
};

/**
 * Add a handler for communication with other parts of the extension,
 * like our messageDisplayScript.
 *
 * 👉 There should be only one handler in the background script
 *    for all incoming messages
 *
 * 👉 Handle the received message by filtering for a distinct property and select
 *    the appropriate handler
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.hasOwnProperty("command")) {
    // If we have a command, return a promise from the command handler.
    return doHandleCommand(message, sender);
  }
  return false;
});
