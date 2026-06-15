// FairAudit AI — Extension Service Worker (background.js)

chrome.runtime.onInstalled.addListener(() => {
  console.log("FairAudit AI — Bias Detector Chrome Extension successfully installed!");
  
  // Initialize default local config settings
  chrome.storage.local.set({
    highlightsEnabled: true,
    apiKey: ""
  });
});
