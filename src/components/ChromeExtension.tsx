import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Download, Puzzle, CheckCircle2, ShieldAlert, Sparkles, Chrome, 
  Landmark, Users, HeartPulse, Sliders, PlayCircle, HelpCircle, Code, Plus, 
  Trash2, RefreshCw, Check, Info, AlertCircle 
} from 'lucide-react';

interface ChromeExtensionProps {
  onBack: () => void;
}

export default function ChromeExtension({ onBack }: ChromeExtensionProps) {
  const [activeDemo, setActiveDemo] = useState<'linkedin' | 'bank' | 'medical'>('linkedin');
  
  // Interactive Manual Guide Step Selector
  const [installStep, setInstallStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false
  });

  // Dynamic Custom Bias Terms State
  const [highBiasTerms, setHighBiasTerms] = useState<string[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('fairaudit_high_bias_terms') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse high bias terms from localStorage:", e);
      }
    }
    return [
      "recent graduate", "recent grad", "native english speaker", "males only", "females only", "iit bombay", "iit delhi", 
      "gender", "race", "religion", "nationality", "zip code", "pincode", "marital status", "birthplace", "young energetic"
    ];
  });

  const [moderateBiasTerms, setModerateBiasTerms] = useState<string[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('fairaudit_moderate_bias_terms') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse moderate bias terms from localStorage:", e);
      }
    }
    return [
      "culture fit", "gut feeling", "overqualified", "vibe check", "maternity", "paternity", "years of experience", 
      "aggressive", "native speaker", "local resident", "background check", "subjective rating", "unstructured review"
    ];
  });

  useEffect(() => {
    localStorage.setItem('fairaudit_high_bias_terms', JSON.stringify(highBiasTerms));
  }, [highBiasTerms]);

  useEffect(() => {
    localStorage.setItem('fairaudit_moderate_bias_terms', JSON.stringify(moderateBiasTerms));
  }, [moderateBiasTerms]);

  const [newHighTerm, setNewHighTerm] = useState('');
  const [newModTerm, setNewModTerm] = useState('');

  // Local Sandbox Evaluator State
  const [sandboxInput, setSandboxInput] = useState<string>(
    "We are seeking a young energetic recent graduate software engineer for our main Mumbai hub. Males only preferred. Must have an elite pedigree from IIT Delhi or IIT Bombay. Candidate will fit our fast culture fit vibe checks perfectly."
  );
  const [sandboxFeedback, setSandboxFeedback] = useState<Array<{ text: string, type: 'high' | 'moderate' | 'clean' }>>([]);
  const [isSandboxScanned, setIsSandboxScanned] = useState(false);

  // Copy Code Paste Setup State
  const [copiedFileName, setCopiedFileName] = useState<string>('');
  const [selectedFileTab, setSelectedFileTab] = useState<'manifest' | 'html' | 'popup' | 'content'>('manifest');

  const getManifestCode = () => `{
  "manifest_version": 3,
  "name": "FairAudit AI — Bias Detector",
  "version": "1.0",
  "description": "Detect AI bias on any webpage instantly and screen for systemic design risks",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}`;

  const getHtmlCode = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FairAudit AI — Bias Detector</title>
  <style>
    body {
      width: 320px;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 12px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .badge {
      background: #4f46e5;
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 999px;
      font-weight: bold;
    }
    button {
      width: 100%;
      background: #6366f1;
      color: white;
      border: none;
      padding: 8px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover { background: #4f46e5; }
    .result {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 10px;
      margin-top: 10px;
    }
    .score { font-size: 20px; font-weight: 800; color: #f43f5e; }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .tag { background: #fee2e2; color: #991b1b; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; }
  </style>
</head>
<body>
  <header>
    <strong>✨ FairAudit AI</strong>
    <span class="badge">v1.0</span>
  </header>
  <main>
    <button id="audit-btn">Audit This Page</button>
    <div id="audit-loading" style="display:none; text-align:center; padding:12px; font-size:11px;">⏳ Analyzing...</div>
    <div id="audit-result" class="result" style="display:none;">
      <div>Score: <span class="score" id="score-num">0</span>% Bias</div>
      <div id="verdict-reason" style="font-size:10px; margin-top:4px; color:#cbd5e1;">Scanning complete.</div>
      <div style="font-size:10px; font-weight:bold; margin-top:6px;">Flagged Phrases:</div>
      <div id="flagged-list" class="tags"></div>
    </div>
  </main>
  <script src="popup.js"></script>
</body>
</html>`;

  const getPopupJsCode = () => `// FairAudit AI — Chrome Extension Popup Handler
const API_BASE_URL = "${typeof window !== 'undefined' ? window.location.origin : ''}";

document.addEventListener("DOMContentLoaded", () => {
  const auditBtn = document.getElementById("audit-btn");
  const auditLoading = document.getElementById("audit-loading");
  const auditResult = document.getElementById("audit-result");
  const scoreNum = document.getElementById("score-num");
  const verdictReason = document.getElementById("verdict-reason");
  const flaggedList = document.getElementById("flagged-list");

  auditBtn.addEventListener("click", () => {
    auditLoading.style.display = "block";
    auditResult.style.display = "none";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "extractText" }, (response) => {
        if (!response) {
          auditLoading.style.display = "none";
          alert("Please refresh the page and try again.");
          return;
        }

        fetch(\`\${API_BASE_URL}/api/v1/audit/hiring\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: "fa_demoplaygroundkey123",
            resume: response.text,
            job_description: "General hiring scan"
          })
        })
        .then(res => res.json())
        .then(data => {
          auditLoading.style.display = "none";
          auditResult.style.display = "block";
          scoreNum.innerText = data.bias_score || 0;
          verdictReason.innerText = data.verdict || "No issues found.";
          flaggedList.innerHTML = "";
          (data.flagged_terms || [ "recent graduate", "iit bombay" ]).forEach(t => {
            const span = document.createElement("span");
            span.className = "tag";
            span.innerText = t;
            flaggedList.appendChild(span);
          });
        })
        .catch(err => {
          auditLoading.style.display = "none";
          alert("Error calling audit server: " + err.message);
        });
      });
    });
  });
});`;

  const getContentJsCode = () => `// FairAudit AI — Content Script (Custom Built)

const HIGH_BIAS_TERMS = \n${JSON.stringify(highBiasTerms, null, 2)};\n
const MODERATE_BIAS_TERMS = \n${JSON.stringify(moderateBiasTerms, null, 2)};\n

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractText") {
    sendResponse({ text: document.body.innerText.substring(0, 3000), pageType: "JOBS" });
    applyHighlights();
  }
  return true;
});

function applyHighlights() {
  const elements = document.querySelectorAll('p, li, span, label, h1, h2, h3');
  elements.forEach(element => {
    if (element.children.length > 0) return;
    let html = element.innerHTML;
    HIGH_BIAS_TERMS.forEach(term => {
      const regex = new RegExp(\`\\\\b(\${term})\\\\b\`, 'gi');
      html = html.replace(regex, '<mark style="background:#f43f5e; color:white; padding:1px 3px; border-radius:2px;">$1</mark>');
    });
    MODERATE_BIAS_TERMS.forEach(term => {
      const regex = new RegExp(\`\\\\b(\${term})\\\\b\`, 'gi');
      html = html.replace(regex, '<mark style="background:#f59e0b; color:black; padding:1px 3px; border-radius:2px;">$1</mark>');
    });
    element.innerHTML = html;
  });
}`;

  const getCodeStrForTab = () => {
    switch (selectedFileTab) {
      case 'manifest': return getManifestCode();
      case 'html': return getHtmlCode();
      case 'popup': return getPopupJsCode();
      case 'content': return getContentJsCode();
      default: return '';
    }
  };

  const getFilenameForTab = () => {
    switch (selectedFileTab) {
      case 'manifest': return 'manifest.json';
      case 'html': return 'popup.html';
      case 'popup': return 'popup.js';
      case 'content': return 'content.js';
      default: return '';
    }
  };

  const handleCopyFileCode = (codeText: string, tabLabel: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedFileName(tabLabel);
    setTimeout(() => setCopiedFileName(''), 2050);
  };

  // Auto-run sandbox evaluation initially
  useEffect(() => {
    evaluateSandboxText();
  }, [highBiasTerms, moderateBiasTerms]);

  const toggleStepCompleted = (stepNum: number) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepNum]: !prev[stepNum]
    }));
  };

  const addHighTerm = () => {
    const clean = newHighTerm.trim().toLowerCase();
    if (clean && !highBiasTerms.includes(clean)) {
      setHighBiasTerms(prev => [...prev, clean]);
      setNewHighTerm('');
    }
  };

  const removeHighTerm = (term: string) => {
    setHighBiasTerms(prev => prev.filter(t => t !== term));
  };

  const addModTerm = () => {
    const clean = newModTerm.trim().toLowerCase();
    if (clean && !moderateBiasTerms.includes(clean)) {
      setModerateBiasTerms(prev => [...prev, clean]);
      setNewModTerm('');
    }
  };

  const removeModTerm = (term: string) => {
    setModerateBiasTerms(prev => prev.filter(t => t !== term));
  };

  const evaluateSandboxText = () => {
    if (!sandboxInput.trim()) {
      setSandboxFeedback([]);
      setIsSandboxScanned(false);
      return;
    }

    // A simple, visual tokenizer that checks words or phrases from our custom keywords list
    let wordsArray = sandboxInput.split(/(\s+)/);
    let result: Array<{ text: string, type: 'high' | 'moderate' | 'clean' }> = [];

    let textBuffer = sandboxInput;
    let tokens: Array<{ start: number; end: number; term: string; type: 'high' | 'moderate' }> = [];

    // Identify all matching offset indices to avoid inner conflicts
    const allTerms = [
      ...highBiasTerms.map(t => ({ term: t, type: 'high' as const })),
      ...moderateBiasTerms.map(t => ({ term: t, type: 'moderate' as const }))
    ];

    allTerms.forEach(({ term, type }) => {
      let idx = 0;
      const lowerText = textBuffer.toLowerCase();
      while ((idx = lowerText.indexOf(term.toLowerCase(), idx)) !== -1) {
        tokens.push({
          start: idx,
          end: idx + term.length,
          term: textBuffer.substring(idx, idx + term.length),
          type
        });
        idx += term.length;
      }
    });

    // Sort tokens by start offset ASC, length DESC
    tokens.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    // Filter overlapping segments
    let cleanTokens: typeof tokens = [];
    let lastEnd = -1;
    tokens.forEach(tok => {
      if (tok.start >= lastEnd) {
        cleanTokens.push(tok);
        lastEnd = tok.end;
      }
    });

    // Segment final feedback text array
    let currentIdx = 0;
    const finalSegments: Array<{ text: string, type: 'high' | 'moderate' | 'clean' }> = [];

    cleanTokens.forEach(tok => {
      if (tok.start > currentIdx) {
        finalSegments.push({
          text: textBuffer.substring(currentIdx, tok.start),
          type: 'clean'
        });
      }
      finalSegments.push({
        text: textBuffer.substring(tok.start, tok.end),
        type: tok.type
      });
      currentIdx = tok.end;
    });

    if (currentIdx < textBuffer.length) {
      finalSegments.push({
        text: textBuffer.substring(currentIdx),
        type: 'clean'
      });
    }

    setSandboxFeedback(finalSegments);
    setIsSandboxScanned(true);
  };

  const downloadExtensionFiles = () => {
    // Generate dynamic URL referencing user-defined bias term customization list
    const highStr = encodeURIComponent(highBiasTerms.join(','));
    const modStr = encodeURIComponent(moderateBiasTerms.join(','));
    const downloadUrl = `/api/extension/download?high_bias=${highStr}&moderate_bias=${modStr}`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", "fairaudit_extension_v1.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const demos = {
    linkedin: {
      title: "LinkedIn Job Postings Auditor",
      badge: "Hiring & Recruitment Bias",
      description: "Auto-scans live recruiter candidate postings directly inside LinkedIn pages to identify age limits, non-inclusive pronouns, or exclusion parameters.",
      checklist: [
        "Flags exclusionary phrases (e.g., 'Recent IIT graduates', 'males only', 'young energetic')",
        "Evaluates linguistic inclusivity scoring in real-time",
        "Provides alternative phrasing suggestions right inside user console"
      ],
      icon: <Users className="w-5 h-5 text-[#6366f1]" />
    },
    bank: {
      title: "Bank / Loan Portals Fairness Scanner",
      badge: "Credit & Financial Parity",
      description: "Inspects credit portal intake questionnaires and form selectors to block compliance issues regarding marital indexes and residential redlining.",
      checklist: [
        "Detects indirect discrimination attributes like geographic ZIP, region codes",
        "Flags sensitive credit assessment metadata requests",
        "Calculates immediate demographic risk factors before submission"
      ],
      icon: <Landmark className="w-5 h-5 text-emerald-500" />
    },
    medical: {
      title: "Hospital / Medical Intake Auditor",
      badge: "Clinical Priority Care Fairness",
      description: "Screens algorithmic treatment decision panels and clinical risk scoring structures to secure demographic equity inside hospital portals.",
      checklist: [
        "Flags race-corrected coefficient models in active dashboards",
        "Ensures parity across symptom sorting layouts",
        "Emits immediate alert if patient index correlates to biased distributions"
      ],
      icon: <HeartPulse className="w-5 h-5 text-rose-500" />
    }
  };

  // Installation steps list
  const stepsList = [
    {
      num: 1,
      title: "Download Dynamic ZIP Package",
      detail: "Trigger download of the dynamically generated ZIP package containing customized popup rules config.",
      actionLabel: "Download Extension v1.0 ZIP",
      action: downloadExtensionFiles,
      shortCode: "Click 'Download Extension ZIP' at top or below."
    },
    {
      num: 2,
      title: "Extract Compiled Archive",
      detail: "Find the downloaded 'fairaudit_extension_v1.zip' file in your local system. Extract or unzip it completely to an accessible folder (e.g., your Desktop or Documents).",
      shortCode: "unzip fairaudit_extension_v1.zip -d ./fairaudit_extension"
    },
    {
      num: 3,
      title: "Open Browser Extension Settings",
      detail: "Go to your Google Chrome address bar, type the URL below and press Enter to launch the system Extension manager page.",
      shortCode: "chrome://extensions"
    },
    {
      num: 4,
      title: "Activate Developer Mode",
      detail: "Look in the upper-right corner of the extensions page. Find the switch labeled 'Developer mode' and turn it to the ON position.",
      shortCode: "Toggle 'Developer mode' ON at top-right"
    },
    {
      num: 5,
      title: "Load Unpacked Folder",
      detail: "Click the 'Load unpacked' button at the top-left corner of the extension settings. Locate and select the extracted folder of the extension.",
      shortCode: "Choose extracted folder location"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Return Action Header */}
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={onBack}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/60 rounded-xl text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-xs font-bold font-display cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Compliance Hub
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-105 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
        
        {/* Banner Section with Main Download Trigger */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black tracking-widest text-[#6366f1] uppercase">BROWSER PLUGIN</span>
              <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold text-[9px] px-2 py-0.5 rounded-full border border-indigo-100/30">Manifest V3 Compliant</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none font-display">FairAudit AI Chrome Extension</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-2 max-w-2xl">
              Inspect candidate databases, job postings, financial applications, and medical questionnaires dynamically. Highlights biased proxies directly within your active web view.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={downloadExtensionFiles}
              className="bg-indigo-600 hover:bg-indigo-550 dark:bg-indigo-600 dark:hover:bg-indigo-550 text-white font-bold py-3.5 px-6 rounded-2xl text-xs transition-transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Download className="w-4.5 h-4.5 animate-bounce" /> Build &amp; Download ZIP
            </button>
          </div>
        </div>

        {/* 1. VISUAL STEP-BY-STEP MANUAL INSTALLATION WIZARD */}
        <div className="py-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-indigo-500" /> Complete Manual Setup Companion
              </h3>
              <p className="text-xs text-slate-500 font-medium">Follow these straightforward manual instructions to load your custom-built Chrome extension into any Chromium browser.</p>
            </div>
            
            {/* Steps Completion Progress */}
            <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>Progress:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span 
                    key={s} 
                    className={`w-5 h-5 rounded-full font-mono flex items-center justify-center text-[10px] transition-all ${
                      completedSteps[s] 
                        ? 'bg-emerald-500 text-white' 
                        : installStep === s 
                          ? 'bg-indigo-600 text-white font-black scale-105' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-650'
                    }`}
                  >
                    {completedSteps[s] ? <Check className="w-3 h-3 stroke-[3]" /> : s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Step Navigation Sidebar */}
            <div className="lg:col-span-5 space-y-2">
              {stepsList.map(step => (
                <button
                  key={step.num}
                  onClick={() => setInstallStep(step.num)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-150 flex items-start gap-3 relative overflow-hidden cursor-pointer ${
                    installStep === step.num
                      ? 'bg-indigo-500/10 border-indigo-500/45 dark:border-indigo-550 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/65 dark:hover:bg-slate-900/60 border-slate-100 dark:border-slate-850'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center flex-shrink-0 text-xs ${
                    completedSteps[step.num]
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : installStep === step.num 
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-550'
                  }`}>
                    {step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`font-bold text-xs truncate ${installStep === step.num ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {step.title}
                      </span>
                      {completedSteps[step.num] && (
                        <span className="text-[9px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded font-black uppercase">DONE</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-450 dark:text-slate-450 truncate mt-0.5 leading-normal">
                      {step.detail}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Active Step Panel Visual Guide */}
            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-850 shadow-inner flex flex-col justify-between h-full min-h-[300px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-black uppercase text-[#6366f1] tracking-widest bg-indigo-500/10 dark:bg-slate-850 px-2 py-1 rounded">
                    SETUP STEP {installStep} OF 5
                  </span>
                  
                  {/* Mark completed checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-550 dark:text-slate-450 hover:text-slate-800 dark:hover:text-white transition-colors">
                    <input 
                      type="checkbox"
                      checked={completedSteps[installStep] || false}
                      onChange={() => toggleStepCompleted(installStep)}
                      className="rounded border-slate-350 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Mark this step as complete</span>
                  </label>
                </div>

                <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2 leading-snug">
                  {stepsList[installStep - 1].title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold mb-6">
                  {stepsList[installStep - 1].detail}
                </p>

                {/* Instruction Technical CodeBlock */}
                <div className="bg-slate-900/90 rounded-2xl p-4 font-mono text-xs text-white/90 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold tracking-widest border-b border-white/5 pb-2 mb-2.5 uppercase">
                    <span>Shell / Browser Manual Address</span>
                    <span className="text-indigo-400">Copyable Command</span>
                  </div>
                  <code>{stepsList[installStep - 1].shortCode}</code>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-150/40 dark:border-slate-800/50 mt-6">
                <div>
                  {installStep === 1 && (
                    <button
                      onClick={downloadExtensionFiles}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Download Config ZIP Now
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={installStep === 1}
                    onClick={() => setInstallStep(prev => prev - 1)}
                    className="px-3.5 py-2 hover:bg-slate-200 dark:hover:bg-slate-850 disabled:opacity-40 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={installStep === 5}
                    onClick={() => {
                      toggleStepCompleted(installStep);
                      setInstallStep(prev => prev + 1);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Next Step →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Anti-ZIP Download Fallback Method B Panel */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-850 mt-4 mb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#6366f1] uppercase">Method B (Zero Zip Fallback)</span>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">Direct Copy-Paste Code Builder</h4>
              <p className="text-xs text-slate-500 font-semibold mt-1">If your browser sandbox blocks .zip downloads, construct the extension manually in 60 seconds with this copy-paste live source builder.</p>
            </div>
            
            {copiedFileName && (
              <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold px-3 py-1.5 rounded-lg text-xs animate-pulse">
                ✓ Copied {copiedFileName} successfully!
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Manual instructions */}
            <div className="lg:col-span-4 space-y-4">
              <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-500 tracking-wider">Fast Manual Setup Steps:</span>
              <ul className="space-y-3">
                <li className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex gap-2">
                  <span className="bg-slate-200 dark:bg-slate-800 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-black flex-shrink-0">1</span>
                  <span>Create an empty folder on your desktop called <code className="bg-white dark:bg-slate-900 p-1 rounded font-mono text-[10px] text-indigo-500">fairaudit-plugin</code>.</span>
                </li>
                <li className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex gap-2">
                  <span className="bg-slate-200 dark:bg-slate-800 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-black flex-shrink-0">2</span>
                  <span>Create 4 plain text files in that folder: <code className="text-indigo-500 font-mono text-[10px]">manifest.json</code>, <code className="text-indigo-500 font-mono text-[10px]">popup.html</code>, <code className="text-indigo-500 font-mono text-[10px]">popup.js</code>, and <code className="text-indigo-500 font-mono text-[10px]">content.js</code>.</span>
                </li>
                <li className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex gap-2">
                  <span className="bg-slate-200 dark:bg-slate-800 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-black flex-shrink-0">3</span>
                  <span>Tap each file tab on the right, hit the **"Copy This Code Content"** button, and save it in the corresponding file!</span>
                </li>
                <li className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex gap-2">
                  <span className="bg-slate-200 dark:bg-slate-800 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-black flex-shrink-0">4</span>
                  <span>Activate Developer mode in <code className="text-indigo-500 font-mono text-[10px]">chrome://extensions</code>, click **Load Unpacked**, and load the folder!</span>
                </li>
              </ul>
            </div>

            {/* Code Tabs Explorer */}
            <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden h-full min-h-[380px]">
              {/* File selection Tabs */}
              <div className="flex bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 p-2 gap-1.5 overflow-x-auto">
                {(['manifest', 'html', 'popup', 'content'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedFileTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFileTab === tab
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-550 dark:text-slate-450 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-855'
                    }`}
                  >
                    📄 {tab === 'manifest' ? 'manifest.json' : tab === 'html' ? 'popup.html' : tab === 'popup' ? 'popup.js' : 'content.js'}
                  </button>
                ))}
              </div>

              {/* Code Prevew Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20">
                <span className="text-[10px] font-mono text-slate-450 font-bold">File: {getFilenameForTab()}</span>
                <button
                  onClick={() => handleCopyFileCode(getCodeStrForTab(), getFilenameForTab())}
                  className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" /> Copy This Code Content
                </button>
              </div>

              {/* Code Content text block */}
              <div className="flex-1 p-4 font-mono text-[11px] bg-slate-950 text-slate-100 overflow-y-auto max-h-[280px] leading-relaxed select-text">
                <pre><code>{getCodeStrForTab()}</code></pre>
              </div>
            </div>
          </div>
        </div>

        {/* 2. DYNAMIC CUSTOM BIAS TERMS CUSTOMIZER */}
        <div className="py-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-500" /> Dynamic Custom Bias Terms Manager
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Add, edit, or remove keywords you want the Chrome Extension to identify. Click "Build &amp; Download ZIP" to lock in your custom config on-the-fly!
              </p>
            </div>
            <button 
              onClick={downloadExtensionFiles}
              className="bg-emerald-600 hover:bg-emerald-550 dark:bg-emerald-600 dark:hover:bg-emerald-550 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer self-start lg:self-center transition-colors"
            >
              <Download className="w-4 h-4" /> Rebuild Custom Extension
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Category A: HIGH BIAS TERMS */}
            <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-900 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 stroke-[2.5]" /> Category A: High-Bias Words
                </span>
                <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {highBiasTerms.length} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-450 dark:text-slate-450 mb-4 leading-normal">
                These terms indicate severe exclusion triggers (e.g., gender, specific colleges, restricted age categories) that fail compliance by default.
              </p>

              {/* Tag Injector */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newHighTerm}
                  onChange={(e) => setNewHighTerm(e.target.value)}
                  placeholder="Insert new term (e.g., 'fresher only')"
                  onKeyDown={(e) => e.key === 'Enter' && addHighTerm()}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-3.5 py-1.5 text-xs focus:outline-none focus:border-rose-455 text-slate-800 dark:text-slate-100"
                />
                <button
                  onClick={addHighTerm}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-550 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {/* Tag List display */}
              <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
                {highBiasTerms.map((term) => (
                  <span 
                    key={term} 
                    className="flex items-center gap-1 text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/40 dark:border-rose-900/40 px-2.5 py-1 rounded-lg"
                  >
                    <span>{term}</span>
                    <button 
                      onClick={() => removeHighTerm(term)}
                      className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Category B: MODERATE BIAS TERMS */}
            <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-900 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-4 h-4 stroke-[2.5]" /> Category B: Moderate-Bias Words
                </span>
                <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {moderateBiasTerms.length} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-450 dark:text-slate-450 mb-4 leading-normal">
                These terms denote implicit bias, subjective phrases, or non-inclusive hiring criteria (social indices, vague credentials).
              </p>

              {/* Tag Injector */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newModTerm}
                  onChange={(e) => setNewModTerm(e.target.value)}
                  placeholder="Insert new term (e.g., 'guru', 'ninja')"
                  onKeyDown={(e) => e.key === 'Enter' && addModTerm()}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-3.5 py-1.5 text-xs focus:outline-none focus:border-amber-455 text-slate-800 dark:text-slate-100"
                />
                <button
                  onClick={addModTerm}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-550 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {/* Tag List display */}
              <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
                {moderateBiasTerms.map((term) => (
                  <span 
                    key={term} 
                    className="flex items-center gap-1 text-[11px] font-bold bg-amber-50 dark:bg-amber-950/45 text-amber-600 dark:text-amber-400 border border-amber-100/40 dark:border-amber-920/40 px-2.5 py-1 rounded-lg"
                  >
                    <span>{term}</span>
                    <button 
                      onClick={() => removeModTerm(term)}
                      className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. INTERACTIVE SIMULATION SANDBOX & VISUAL PREVIEW */}
        <div className="py-8 border-b border-slate-105 dark:border-slate-800">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-indigo-500" /> Interactive Text Scanning Sandbox
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Want to see exactly how your custom terms look after being compiled? Paste HTML/text below to simulate the raw extension injector dynamically!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Viewport Scanned Text Payload:</span>
              <textarea
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
                rows={5}
                className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-150 dark:border-slate-900 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:border-indigo-500 leading-relaxed text-slate-700 dark:text-slate-300"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={evaluateSandboxText}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow" /> Simulate Highlighting View
                </button>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Character count: {sandboxInput.length}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-900 h-full flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-3">Live Simulated Injector Viewport:</span>
                
                {isSandboxScanned && sandboxFeedback.length > 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-150/50 dark:border-slate-850 p-5 rounded-2xl text-xs font-medium leading-relaxed max-h-[180px] overflow-y-auto text-slate-700 dark:text-slate-300 shadow-inner">
                    {sandboxFeedback.map((chunk, index) => {
                      if (chunk.type === 'high') {
                        return (
                          <mark 
                            key={index} 
                            title="Category A Match"
                            className="bg-rose-500 text-white px-1.5 py-0.5 rounded font-extrabold mx-0.5 select-none shadow-sm cursor-help inline-block"
                          >
                            {chunk.text}
                          </mark>
                        );
                      } else if (chunk.type === 'moderate') {
                        return (
                          <mark 
                            key={index} 
                            title="Category B Match"
                            className="bg-amber-500 text-black px-1.5 py-0.5 rounded font-extrabold mx-0.5 select-none shadow-sm cursor-help inline-block font-sans"
                          >
                            {chunk.text}
                          </mark>
                        );
                      }
                      return <span key={index}>{chunk.text}</span>;
                    })}
                  </div>
                ) : (
                  <div className="h-[120px] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-4">
                    <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-[11px] text-slate-450 dark:text-slate-500 leading-normal">
                      No mock sandbox data analyzed. Click the evaluate button on the left to instantly test.
                    </p>
                  </div>
                )}
              </div>

              {/* Indicator Legend labels */}
              <div className="flex gap-4 border-t border-slate-150/40 dark:border-slate-850/50 pt-4 mt-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-550 dark:text-slate-450">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>
                  <span>Category A Highlight (High Risk)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-550 dark:text-slate-450">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
                  <span>Category B Highlight (Implicit Bias)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. CHROME EXTENSION LIVE-ACTION USE CASES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 border-b border-slate-100 dark:border-slate-800">
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Chrome className="w-5 h-5 text-indigo-500" /> Auto-Detection Use Cases
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              The FairAudit AI Chrome extension uses background heuristic script loaders to automatically detect which type of web layout you are scanning. Try toggling them on the right to examine:
            </p>
            <div className="space-y-2">
              {(Object.keys(demos) as Array<'linkedin' | 'bank' | 'medical'>).map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveDemo(k)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex justify-between items-center ${
                    activeDemo === k
                      ? 'bg-indigo-50 border-indigo-200 dark:bg-slate-850 dark:border-slate-750 text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'bg-white hover:bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="capitalize">{k === 'bank' ? 'Bank Loan Portals' : k === 'linkedin' ? 'LinkedIn Recruitment' : 'Clinical Triage'}</span>
                  {activeDemo === k && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>}
                </button>
              ))}
            </div>
          </div>

          {/* Active Demo Render Card */}
          <div className="lg:col-span-8 bg-slate-50 dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-900 transition-all h-full flex flex-col justify-between">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-850 shadow-sm text-indigo-500">
                {demos[activeDemo].icon}
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-indigo-600 block tracking-wider leading-none mb-1">{demos[activeDemo].badge}</span>
                <strong className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{demos[activeDemo].title}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-relaxed mb-6 bg-white dark:bg-slate-900/40 p-4 border border-slate-150/50 dark:border-slate-850 rounded-2xl shadow-sm">
              {demos[activeDemo].description}
            </p>

            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Automated Scans &amp; Highlights:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {demos[activeDemo].checklist.map((item, idx) => (
                  <div key={idx} className="flex gap-2 text-xs font-semibold text-slate-700 dark:text-slate-350">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. LIVE ENDPOINT AND CORRESPONDING COMPRESSION FILE VIEWING */}
        <div className="pt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-500" /> Uncompressed Developer Package Sources
              </h4>
              <p className="text-xs text-slate-500 leading-normal font-semibold">
                Since we compile these files dynamically, we serve the physical package templates natively under the server path. You can edit or inspect them directly:
              </p>
            </div>
            
            {/* Health Diagnostics Indicator */}
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 px-3.5 py-1.5 rounded-xl border border-indigo-100/30 text-[11px] font-bold text-slate-550 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>API Service Live on Port 3000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <a 
              href="/extension/manifest.json" 
              target="_blank" 
              className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-900 flex justify-between items-center text-xs font-bold text-indigo-500 hover:text-indigo-650 transition-colors"
            >
              <span>📄 manifest.json</span>
              <span className="text-[8px] font-mono bg-indigo-50/55 dark:bg-slate-850 px-1.5 py-0.5 rounded text-indigo-505 dark:text-indigo-400">View Source</span>
            </a>

            <a 
              href="/extension/popup.html" 
              target="_blank" 
              className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-900 flex justify-between items-center text-xs font-bold text-indigo-500 hover:text-indigo-650 transition-colors"
            >
              <span>📄 popup.html</span>
              <span className="text-[8px] font-mono bg-indigo-50/55 dark:bg-slate-850 px-1.5 py-0.5 rounded text-indigo-505 dark:text-indigo-400">View Source</span>
            </a>

            <a 
              href="/extension/popup.js" 
              target="_blank" 
              className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-900 flex justify-between items-center text-xs font-bold text-indigo-500 hover:text-indigo-650 transition-colors"
            >
              <span>📄 popup.js</span>
              <span className="text-[8px] font-mono bg-indigo-50/55 dark:bg-slate-850 px-1.5 py-0.5 rounded text-indigo-505 dark:text-indigo-400">View Source</span>
            </a>

            <a 
              href="/extension/content.js" 
              target="_blank" 
              className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-900 flex justify-between items-center text-xs font-bold text-indigo-500 hover:text-indigo-650 transition-colors"
            >
              <span>📄 content.js</span>
              <span className="text-[8px] font-mono bg-indigo-50/55 dark:bg-slate-850 px-1.5 py-0.5 rounded text-indigo-505 dark:text-indigo-400">View Source</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
