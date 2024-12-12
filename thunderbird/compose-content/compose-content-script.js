// Use debounce SO function to set display div to the content
// Refresh queries node backend to compile code
//
// code
// ------
// pretty print or error msg
//
// Suppress key press / edit events in edit window to avoid editing typst-display
// Discard typst-display when sending email (or discard source?)

function createPreview(previewContents) {
  /* Delete preview if already present */
  const display = document.getElementById("typst-display");
  if (!(display === null)) {
    display.remove();
  }

  /* Construct initial preview area */
  const displayDiv = document.createElement("div");
  displayDiv.id = "typst-display";

  // Make this line white?
  displayDiv.append(document.createElement("hr"));

  const preview = document.createElement("div");
  preview.id = "typst-preview";
  preview.innerHTML = previewContents;
  displayDiv.append(preview);

  document.body.append(displayDiv);
}

// ==== Don't do anything until manual refresh =====
let isLive = false;
function goLive() {
  if (isLive) {
    return;
  }
  isLive = true;
  // document.body.append(displayDiv, document.body.lastChild);
  // Register refresh listener
  addEventListener("keydown", debounce(1000, refreshPreview));
}

/* Make the preview area read-only */
// addEventListener("keydown", (event) => {
//   if (
//     event.key == "Backspace" &&
//     document.getElementById("typst-display").contains(document.activeElement())
//   ) {
//     event.stopPropagation();
//     debugger;
//   }
// });

/* Refresh preview */
async function refreshPreview() {
  // console.log("Preview input: ", document.body.innerText);
  try {
    goLive();
    let previewContent = await browser.runtime.sendMessage({
      command: "getPreview",
    });

    createPreview(previewContent);
  } catch (e) {
    console.error(e);
  }
}

// ====== Messages stuff ======
const doHandleCommand = async (msg, sender) => {
  const { command } = msg;
  switch (command.toLocaleLowerCase()) {
    case "manualrefresh":
      {
        refreshPreview();
      }
      break;
    default:
      {
        console.log("unrecognized command " + command);
      }
      break;
  }
};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.hasOwnProperty("command")) {
    // If we have a command, return a promise from the command handler.
    return doHandleCommand(message, sender);
  }
  return false;
});

// ======= Misc for idle refresh =====
/* https://davidwalsh.name/javascript-debounce-function */
function debounce(wait, func) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/* Check if this is already an email where the plugin was used */
function checkPrevTypst() {
  const display = document.getElementById("typst-display");
  if (!(display === null)) {
    goLive();
    refreshPreview();
  }
}
