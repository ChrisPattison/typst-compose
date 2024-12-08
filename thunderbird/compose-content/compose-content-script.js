// Use debounce SO function to set display div to the content
// Refresh queries node backend to compile code
//
// code
// ------
// pretty print or error msg
//
// Suppress key press / edit events in edit window to avoid editing typst-display
// Discard typst-display when sending email (or discard source?)

// setTimeout(async () => {});

/* Construct initial preview area */
const displayDiv = document.createElement("div");
displayDiv.id = "typst-display";

// Initial whitespace
displayDiv.appendChild(document.createElement("p"));

displayDiv.appendChild(document.createElement("hl"));

const preview = document.createElement("div");
preview.id = "typst-preview";
preview.textContent = "aaabaaa";
displayDiv.appendChild(preview);

document.body.append(displayDiv, document.body.lastChild);

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
  try {
    let previewContent = await browser.runtime.sendMessage({
      command: "getPreview",
      message: `
      =test
      aaaa
      ------
      bb*b*bb
      ==second heading
      ----
      ccccc
      ttt

      > a
      > t
      > b
      `,
    });

    const preview = document.getElementById("typst-preview");
    preview.innerText = previewContent;
  } catch (e) {
    console.error(e);
  }
}

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

addEventListener("keydown", debounce(1000, refreshPreview));

// Use action to make extension go "live"
