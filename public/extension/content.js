// FairAudit AI — Content Script

// Keep track of highlights state
let highlightsActive = true;

// Default list of bias terms to highlight when active
const HIGH_BIAS_TERMS = [
  "recent graduate", "recent grad", "native english speaker", "males only", "females only", "iit bombay", "iit delhi", 
  "gender", "race", "religion", "nationality", "zip code", "pincode", "marital status", "birthplace", "young energetic"
];

const MODERATE_BIAS_TERMS = [
  "culture fit", "gut feeling", "overqualified", "vibe check", "maternity", "paternity", "years of experience", 
  "aggressive", "native speaker", "local resident", "background check", "subjective rating", "unstructured review"
];

// Listen for messages from popup or background scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractText") {
    const textData = extractMainContentText();
    const pageType = detectPageType();
    sendResponse({ text: textData, pageType: pageType });
  } else if (message.action === "updateHighlights") {
    highlightsActive = message.enabled;
    if (highlightsActive) {
      applyHighlights();
    } else {
      removeHighlights();
    }
    sendResponse({ success: true });
  }
  return true;
});

// Auto-run on page load
setTimeout(() => {
  chrome.storage.local.get(["highlightsEnabled"], (result) => {
    highlightsActive = result.highlightsEnabled !== false;
    if (highlightsActive) {
      applyHighlights();
    }
  });
}, 1500);

// Screen Page Content Type
function detectPageType() {
  const url = window.location.href.toLowerCase();
  const pageText = document.body.innerText.toLowerCase();

  if (url.includes("linkedin.com/jobs") || url.includes("indeed.com") || pageText.includes("job description") || pageText.includes("requirements") || pageText.includes("role overview")) {
    return "JOBS";
  } else if (url.includes("bank") || url.includes("loan") || pageText.includes("credit score") || pageText.includes("loan amount") || pageText.includes("annual income")) {
    return "LOANS";
  } else if (url.includes("medical") || url.includes("hospital") || pageText.includes("patient intake") || pageText.includes("medical history") || pageText.includes("symptoms")) {
    return "MEDICAL";
  }
  return "OTHER";
}

// Extraction algorithm targeting main content elements
function extractMainContentText() {
  // Select target elements to scan while ignoring common layout noise
  const selectorsToIgnore = 'nav, footer, header, script, style, iframe, noscript, .ads, #ads, [role="banner"], [role="contentinfo"]';
  
  // Clone body to manipulate without altering live page
  const bodyClone = document.body.cloneNode(true);
  const ignoredElements = bodyClone.querySelectorAll(selectorsToIgnore);
  ignoredElements.forEach(el => el.remove());

  // Focus on major narrative elements
  const contentSelections = bodyClone.querySelectorAll('p, li, td, h1, h2, h3, h4, span, label');
  let extractedChunks = [];
  
  contentSelections.forEach(el => {
    const text = el.innerText ? el.innerText.trim() : '';
    if (text.length > 10) {
      extractedChunks.push(text);
    }
  });

  // Combine and truncate to 2000 words limit
  const fullText = extractedChunks.join("\n");
  const words = fullText.split(/\s+/);
  if (words.length > 2000) {
    return words.slice(0, 2000).join(" ") + "...";
  }
  return fullText;
}

// In-site text highlighter tags injector
function applyHighlights() {
  removeHighlights(); // Clean existing
  
  const ignoreTags = new Set([
    "SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "NOSCRIPT", "IFRAME", "CANVAS", "SVG", "HEAD"
  ]);

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        let parent = node.parentElement;
        while (parent) {
          if (ignoreTags.has(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.isContentEditable || parent.tagName === "BUTTON" || parent.getAttribute("role") === "button") {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightTextNode(node) {
    const text = node.nodeValue;
    if (!text || text.trim().length === 0) return;

    let earliestIndex = Infinity;
    let matchedTermLength = 0;
    let selectedTerm = null;
    let isRed = true;

    HIGH_BIAS_TERMS.forEach(term => {
      const regex = new RegExp(`\\b(${escapeRegExp(term)})\\b`, 'i');
      const match = regex.exec(text);
      if (match && match.index < earliestIndex) {
        earliestIndex = match.index;
        matchedTermLength = match[0].length;
        selectedTerm = match[0];
        isRed = true;
      }
    });

    MODERATE_BIAS_TERMS.forEach(term => {
      const regex = new RegExp(`\\b(${escapeRegExp(term)})\\b`, 'i');
      const match = regex.exec(text);
      if (match && match.index < earliestIndex) {
        earliestIndex = match.index;
        matchedTermLength = match[0].length;
        selectedTerm = match[0];
        isRed = false;
      }
    });

    if (selectedTerm !== null && earliestIndex !== Infinity) {
      const parent = node.parentNode;
      if (!parent) return;

      const partBefore = text.substring(0, earliestIndex);
      const partMatch = text.substring(earliestIndex, earliestIndex + matchedTermLength);
      const partAfter = text.substring(earliestIndex + matchedTermLength);

      const mark = document.createElement("mark");
      if (isRed) {
        mark.className = "fairaudit-highlight-red";
        mark.title = "This term may introduce high bias — FairAudit AI";
        mark.style.cssText = "background-color: #f43f5e; color: white; padding: 1px 4px; border-radius: 4px; cursor: help; font-weight: bold;";
      } else {
        mark.className = "fairaudit-highlight-yellow";
        mark.title = "This term may introduce moderate bias — FairAudit AI";
        mark.style.cssText = "background-color: #eab308; color: black; padding: 1px 4px; border-radius: 4px; cursor: help; font-weight: bold;";
      }
      mark.appendChild(document.createTextNode(partMatch));

      const beforeNode = partBefore ? document.createTextNode(partBefore) : null;
      const afterNode = partAfter ? document.createTextNode(partAfter) : null;

      if (beforeNode) {
        parent.insertBefore(beforeNode, node);
      }
      parent.insertBefore(mark, node);
      if (afterNode) {
        parent.insertBefore(afterNode, node);
      }

      parent.removeChild(node);

      if (afterNode) {
        highlightTextNode(afterNode);
      }
    }
  }

  textNodes.forEach(node => {
    highlightTextNode(node);
  });
}

function removeHighlights() {
  const highlights = document.querySelectorAll('.fairaudit-highlight-red, .fairaudit-highlight-yellow');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize(); // Combine adjacent text fragments
    }
  });
}
