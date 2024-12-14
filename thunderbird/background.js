/* 
 * Inject content script into compose window
 * The background script can command the update routine in the content window
 * When active, the content script triggers preview updates
 * The preview inputs are pulled using the background script
 * The preview is built via a node backend
 *
 */


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

  // We have to manually add in line breaks
  let formatted_body = "";
  for (const child of doc.body.children) {
    formatted_body += child.innerText;
    if (child.tagName == "P") {
      formatted_body += "\n";
    }
  }
  return formatted_body;
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

// ====== Send sequence =======
browser.compose.onBeforeSend.addListener((tab,details) => {
    // we want to bypass this step for regular emails
    // Can we attach a property to the email body?
})

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
