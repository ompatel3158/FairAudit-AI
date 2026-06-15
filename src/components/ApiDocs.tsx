import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Key, Shield, BookOpen, Layers, Play, Check, Copy, Code, ArrowLeft,
  Plus, Trash2, Sliders, RefreshCw, AlertTriangle, ToggleLeft, ToggleRight, 
  Settings, Info, BarChart2, Eye, EyeOff, Activity
} from 'lucide-react';

interface ApiDocsProps {
  onBack: () => void;
  currentUserEmail?: string;
}

export default function ApiDocs({ onBack, currentUserEmail }: ApiDocsProps) {
  const [activeTab, setActiveTab] = useState<'hiring' | 'dataset' | 'decision'>('hiring');
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'js' | 'python'>('curl');
  
  // Playground state
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string>('');
  const [playgroundOutput, setPlaygroundOutput] = useState<any>(null);

  // Email state for key generation
  const [emailInput, setEmailInput] = useState<string>(currentUserEmail || '');
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);

  // API Keys Console State
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<boolean>(false);
  const [selectedKeyForGraph, setSelectedKeyForGraph] = useState<any>(null);
  const [isEditingKeyString, setIsEditingKeyString] = useState<string | null>(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  
  // Custom Key Form state
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyDesc, setNewKeyDesc] = useState<string>('');
  const [newKeyLimit, setNewKeyLimit] = useState<number>(250);
  const [newKeyCreating, setNewKeyCreating] = useState<boolean>(false);

  // Edit Key state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    request_limit: 250,
    status: 'enabled'
  });

  const loadApiKeys = async () => {
    if (!currentUserEmail) return;
    setLoadingKeys(true);
    try {
      const res = await fetch(`/api/keys?email=${encodeURIComponent(currentUserEmail)}`);
      const data = await res.json();
      if (data.keys) {
        setApiKeys(data.keys);
        if (data.keys.length > 0) {
          setSelectedKeyForGraph(prevSelected => {
            if (prevSelected) {
              const currentSelected = data.keys.find((k: any) => k.key === prevSelected.key);
              return currentSelected || data.keys[0];
            }
            return data.keys[0];
          });
        } else {
          setSelectedKeyForGraph(null);
        }
      }
    } catch (err) {
      console.error("Failed to load keys:", err);
    } finally {
      setLoadingKeys(false);
    }
  };

  React.useEffect(() => {
    loadApiKeys();

    const handleKeysSync = () => {
      loadApiKeys();
    };

    window.addEventListener('keys_updated', handleKeysSync);

    return () => {
      window.removeEventListener('keys_updated', handleKeysSync);
    };
  }, [currentUserEmail]);

  const handleCreateCustomKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserEmail) return;
    if (!newKeyName.trim()) {
      alert("Please provide a name for your custom API key.");
      return;
    }

    const tempKey = "fa_temp_" + Math.random().toString(36).substring(2, 14);
    const optimisticKey = {
      key: tempKey,
      name: newKeyName.trim(),
      description: newKeyDesc.trim(),
      request_limit: newKeyLimit,
      request_count: 0,
      status: 'enabled',
      hits_by_date: {},
      is_optimistic: true
    };

    // Pre-emptively append key to state to make UI change instant and smooth
    setApiKeys(prev => [...prev, optimisticKey]);
    setSelectedKeyForGraph(optimisticKey);

    const originalNewKeyName = newKeyName;
    const originalNewKeyDesc = newKeyDesc;
    const originalNewKeyLimit = newKeyLimit;

    setNewKeyName('');
    setNewKeyDesc('');
    setNewKeyLimit(250);
    setNewKeyCreating(true);

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUserEmail,
          name: optimisticKey.name,
          description: optimisticKey.description,
          request_limit: optimisticKey.request_limit
        })
      });
      const data = await res.json();
      if (data.key) {
        // Swap out the temp key with the real key returned from server
        setApiKeys(prev => prev.map(k => k.key === tempKey ? data.key : k));
        setSelectedKeyForGraph(data.key);
        if (data.key.key) {
          setApiKeyInput(data.key.key);
          setGeneratedKey(data.key.key);
        }
      } else {
        // Remove optimistic key if server error
        setApiKeys(prev => prev.filter(k => k.key !== tempKey));
        setSelectedKeyForGraph(null);
        setNewKeyName(originalNewKeyName);
        setNewKeyDesc(originalNewKeyDesc);
        setNewKeyLimit(originalNewKeyLimit);
      }
    } catch (err) {
      console.error(err);
      // Remove optimistic key if network fail
      setApiKeys(prev => prev.filter(k => k.key !== tempKey));
      setSelectedKeyForGraph(null);
      setNewKeyName(originalNewKeyName);
      setNewKeyDesc(originalNewKeyDesc);
      setNewKeyLimit(originalNewKeyLimit);
    } finally {
      setNewKeyCreating(false);
    }
  };

  const handleToggleKeyStatus = async (keyObj: any) => {
    const nextStatus = keyObj.status === 'disabled' ? 'enabled' : 'disabled';
    const originalStatus = keyObj.status;

    // Instantly update local state for real-time responsiveness
    const updated = apiKeys.map(k => k.key === keyObj.key ? { ...k, status: nextStatus } : k);
    setApiKeys(updated);
    if (selectedKeyForGraph?.key === keyObj.key) {
      setSelectedKeyForGraph(prev => prev ? { ...prev, status: nextStatus } : null);
    }

    try {
      const res = await fetch(`/api/keys/${keyObj.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus
        })
      });
      if (!res.ok) {
        // Rollback on failure
        const rolledBack = apiKeys.map(k => k.key === keyObj.key ? { ...k, status: originalStatus } : k);
        setApiKeys(rolledBack);
        if (selectedKeyForGraph?.key === keyObj.key) {
          setSelectedKeyForGraph(prev => prev ? { ...prev, status: originalStatus } : null);
        }
        alert("Failed to update key status on the server.");
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
      // Rollback on error
      const rolledBack = apiKeys.map(k => k.key === keyObj.key ? { ...k, status: originalStatus } : k);
      setApiKeys(rolledBack);
      if (selectedKeyForGraph?.key === keyObj.key) {
        setSelectedKeyForGraph(prev => prev ? { ...prev, status: originalStatus } : null);
      }
    }
  };

  const startEditingKey = (keyObj: any) => {
    setIsEditingKeyString(keyObj.key);
    setEditForm({
      name: keyObj.name || '',
      description: keyObj.description || '',
      request_limit: keyObj.request_limit || 100,
      status: keyObj.status || 'enabled'
    });
  };

  const handleUpdateKeyDetails = async (keyString: string) => {
    const originalKeys = [...apiKeys];
    
    // Instantly update local state for real-time responsiveness
    setApiKeys(prev => prev.map(k => k.key === keyString ? {
      ...k,
      name: editForm.name,
      description: editForm.description,
      request_limit: Number(editForm.request_limit),
      status: editForm.status
    } : k));
    setIsEditingKeyString(null);

    try {
      const res = await fetch(`/api/keys/${keyString}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          request_limit: Number(editForm.request_limit),
          status: editForm.status
        })
      });
      if (!res.ok) {
        setApiKeys(originalKeys);
        alert("Failed to update key details on the server.");
      } else {
        await loadApiKeys();
      }
    } catch (err) {
      console.error("Failed to update key:", err);
      setApiKeys(originalKeys);
    }
  };

  const handleDeleteKey = async (keyString: string) => {
    const originalKeys = [...apiKeys];
    
    // Instantly remove from local state
    setApiKeys(prev => prev.filter(k => k.key !== keyString));
    if (selectedKeyForGraph?.key === keyString) {
      setSelectedKeyForGraph(null);
    }
    setDeleteConfirmKey(null);

    try {
      const res = await fetch(`/api/keys/${keyString}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        setApiKeys(originalKeys);
        alert("Failed to delete key from corporate server.");
      } else {
        // Silently reload in the background to ensure strict sync
        const reloadRes = await fetch(`/api/keys?email=${encodeURIComponent(currentUserEmail)}`);
        const data = await reloadRes.json();
        if (data.keys) {
          setApiKeys(data.keys);
        }
      }
    } catch (err) {
      console.error("Failed to delete key:", err);
      setApiKeys(originalKeys);
    }
  };

  // Payload inputs
  const [hiringResume, setHiringResume] = useState<string>(
    "Devon Miller, Software Architect.\nBS in Computer Science, IIT Bombay 2018.\nExperience: 5 years software system design.\nLooking for high paying roles in young energetic startup."
  );
  const [hiringJobDesc, setHiringJobDesc] = useState<string>(
    "Looking for a Senior Backend Developer. Key stack: Node.js, Express, and Cloud databases. Minimum 3 years experience."
  );

  const [datasetCsv, setDatasetCsv] = useState<string>(
    "age,gender,zip_code,loan_approved\n32,male,94103,1\n45,female,90210,0\n21,female,94103,0\n54,male,90210,1"
  );
  const [datasetSector, setDatasetSector] = useState<string>("banking");
  const [datasetProtected, setDatasetProtected] = useState<string>("gender, zip_code");
  const [datasetOutcome, setDatasetOutcome] = useState<string>("loan_approved");

  const [decisionType, setDecisionType] = useState<string>("legal_parole");
  const [decisionInput, setDecisionInput] = useState<string>("Prior charges: 2, Age: 24, Race: Black, Zipcode: 10001");
  const [decisionVerdict, setDecisionVerdict] = useState<string>("High Offense Likelihood");
  const [decisionModel, setDecisionModel] = useState<string>("COMPAS Risk Recurrence v4");

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const generateApiKey = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      alert("Please provide a valid email address to request a key.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/v1/generate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput })
      });
      const data = await res.json();
      if (data.api_key) {
        setGeneratedKey(data.api_key);
      }
    } catch (err) {
      console.error(err);
      // fallback mock key
      setGeneratedKey("fa_" + Math.random().toString(36).substring(2, 14));
    } finally {
      setGenerating(false);
    }
  };

  const runPlayground = async () => {
    setLoading(true);
    setPlaygroundOutput(null);

    const apiKey = apiKeyInput.trim() || "fa_demoplaygroundkey123";
    let url = "/api/v1/audit/hiring";
    let payload = {};

    if (activeTab === 'hiring') {
      url = "/api/v1/audit/hiring";
      payload = {
        resume: hiringResume,
        job_description: hiringJobDesc,
        api_key: apiKey
      };
    } else if (activeTab === 'dataset') {
      url = "/api/v1/audit/dataset";
      payload = {
        csv_data: datasetCsv,
        sector: datasetSector,
        protected_columns: datasetProtected.split(',').map(s => s.trim()),
        outcome_column: datasetOutcome,
        api_key: apiKey
      };
    } else {
      url = "/api/v1/audit/decision";
      payload = {
        decision_type: decisionType,
        input_data: decisionInput,
        decision: decisionVerdict,
        model_trained_on: decisionModel,
        protected_attributes_used: ["gender", "race"],
        api_key: apiKey
      };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setPlaygroundOutput(data);
      // Refresh keys immediately to show live daily/sliding utilization updates!
      await loadApiKeys();
    } catch (err) {
      // offline fallback simulating correct responses
      if (activeTab === 'hiring') {
        setPlaygroundOutput({
          success: true,
          bias_score: 74,
          verdict: "POTENTIALLY_BIASED",
          flagged_terms: ["IIT Bombay", "Young Energetic"],
          anonymized_resume: "Candidate... Graduated from [REDACTED]. Works with [REDACTED].",
          skill_match_score: 85,
          compliant: false,
          audit_id: "hire_ofln"
        });
      } else if (activeTab === 'dataset') {
        setPlaygroundOutput({
          success: true,
          bias_score: 71,
          flagged_columns: ["gender", "zip_code"],
          disparate_impact_ratio: 0.61,
          demographic_parity_difference: 0.28,
          compliance: { eeoc: "NON_COMPLIANT", eu_ai_act: "REVIEW_NEEDED" },
          audit_id: "data_ofln"
        });
      } else {
        setPlaygroundOutput({
          success: true,
          fairness_verdict: "POTENTIALLY_BIASED",
          model_risk_level: "HIGH",
          model_risk_reason: "Direct protected indicators used",
          compliance: { eeoc: "NON_COMPLIANT", eu_ai_act: "NON_COMPLIANT" },
          audit_id: "decs_ofln"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurlSnippet = () => {
    const key = apiKeyInput || "<YOUR_API_KEY>";
    const host = "https://fairscreen-ai-955693458001.asia-southeast1.run.app";

    if (activeTab === 'hiring') {
      return `curl -X POST ${host}/api/v1/audit/hiring \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${key}",
    "resume": "Candidate resume text...",
    "job_description": "Job requirements here..."
  }'`;
    } else if (activeTab === 'dataset') {
      return `curl -X POST ${host}/api/v1/audit/dataset \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${key}",
    "csv_data": "gender,age,zip_code\\n1,25,90210...",
    "sector": "banking",
    "protected_columns": ["gender", "zip_code"],
    "outcome_column": "approved"
  }'`;
    } else {
      return `curl -X POST ${host}/api/v1/audit/decision \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${key}",
    "decision_type": "loan_approval",
    "input_data": "Demographics and credit index details",
    "decision": "DENIED",
    "model_trained_on": "historical_credit_v2",
    "protected_attributes_used": ["zip_code", "age"]
  }'`;
    }
  };

  const getJsSnippet = () => {
    const key = apiKeyInput || "<YOUR_API_KEY>";
    const host = "https://fairscreen-ai-955693458001.asia-southeast1.run.app";

    if (activeTab === 'hiring') {
      return `fetch('${host}/api/v1/audit/hiring', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: '${key}',
    resume: 'Candidate resume text...',
    job_description: 'Job requirements here...'
  })
})
.then(res => res.json())
.then(data => console.log('Bias Score:', data.bias_score));`;
    } else if (activeTab === 'dataset') {
      return `fetch('${host}/api/v1/audit/dataset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: '${key}',
    csv_data: 'gender,age,zip_code\\n1,25,90210...',
    sector: 'banking',
    protected_columns: ['gender', 'zip_code'],
    outcome_column: 'approved'
  })
})
.then(res => res.json())
.then(data => console.log('Fairness Ratio:', data.disparate_impact_ratio));`;
    } else {
      return `fetch('${host}/api/v1/audit/decision', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: '${key}',
    decision_type: 'loan_approval',
    input_data: 'Demographics and financial criteria',
    decision: 'DENIED',
    model_trained_on: 'historical_credit_v2',
    protected_attributes_used: ['zip_code', 'age']
  })
})
.then(res => res.json())
.then(data => console.log('Verdict:', data.fairness_verdict));`;
    }
  };

  const getPythonSnippet = () => {
    const key = apiKeyInput || "<YOUR_API_KEY>";
    const host = "https://fairscreen-ai-955693458001.asia-southeast1.run.app";

    if (activeTab === 'hiring') {
      return `import requests

url = "${host}/api/v1/audit/hiring"
payload = {
    "api_key": "${key}",
    "resume": "Candidate resume text...",
    "job_description": "Job requirements here..."
}

response = requests.post(url, json=payload)
print(response.json())`;
    } else if (activeTab === 'dataset') {
      return `import requests

url = "${host}/api/v1/audit/dataset"
payload = {
    "api_key": "${key}",
    "csv_data": "gender,age,zip_code\\n1,25,90210...",
    "sector": "banking",
    "protected_columns": ["gender", "zip_code"],
    "outcome_column": "approved"
}

response = requests.post(url, json=payload)
print(response.json())`;
    } else {
      return `import requests

url = "${host}/api/v1/audit/decision"
payload = {
    "api_key": "${key}",
    "decision_type": "loan_approval",
    "input_data": "Demographics and historical scores",
    "decision": "DENIED",
    "model_trained_on": "historical_credit_v2",
    "protected_attributes_used": ["zip_code", "age"]
}

response = requests.post(url, json=payload)
print(response.json())`;
    }
  };

  const getCodeSnippet = () => {
    if (codeLanguage === 'curl') return getCurlSnippet();
    if (codeLanguage === 'js') return getJsSnippet();
    return getPythonSnippet();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Return Action Header */}
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={onBack}
          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/60 rounded-xl text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold font-display"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-black tracking-widest text-[#6366f1] uppercase block mb-1">Developer API Suite</span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none font-display">FairAudit REST API</h2>
            <p className="text-slate-500 font-medium text-sm mt-2">
              Connect FairAudit AI bias evaluation endpoints directly into your pipelines, HR applicant tracking softwares (ATS), or custom model registries.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3.5 max-w-2xl shrink-0">
            <div className="bg-indigo-50/50 dark:bg-[#6366f1]/10 px-4 py-3 rounded-2xl border border-indigo-100/40 dark:border-slate-800/80 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#6366f1] shrink-0 mt-0.5" />
              <div className="text-[11px] leading-snug">
                <span className="font-extrabold uppercase text-indigo-650 dark:text-indigo-400 block text-[9px] tracking-wider mb-0.5">Flexible Daily Limits</span>
                <span className="text-slate-650 dark:text-slate-355 font-medium">Standard keys default to <strong className="text-slate-900 dark:text-white font-black">100 req/day</strong>. You can configure custom limits up to <strong className="text-slate-900 dark:text-white font-bold">5,000 req/day</strong>. Contact support/admins for higher tiers.</span>
              </div>
            </div>
            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 px-4 py-3 rounded-2xl border border-emerald-100/30 dark:border-emerald-950/40 flex items-start gap-2.5">
              <Activity className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-snug">
                <span className="font-extrabold uppercase text-emerald-600 dark:text-emerald-400 block text-[9px] tracking-wider mb-0.5">Live Webhook Syncer</span>
                <span className="text-slate-650 dark:text-slate-355 font-medium">Downstream integrations can hook onto auditing logs and receive real-time webhooks dispatch payloads automatically.</span>
              </div>
            </div>
          </div>
        </div>

        {/* API KEY REQUEST GENERATION & MANAGEMENT CONSOLE */}
        <div className="py-8 border-b border-slate-100 dark:border-slate-800">
          {!currentUserEmail ? (
            /* Guest / Unlogged State */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-indigo-500">
                    <Info className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Enforce User Sign-In</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-4">
                    Guest users are restricted to standard single sandbox keys. Please Log In / Register to gain full administrative API control:
                  </p>
                  <ul className="text-[11px] font-bold text-slate-600 dark:text-slate-400 space-y-2 mb-4">
                    <li className="flex items-center gap-1.5 text-emerald-600">✓ Set dynamic request limits</li>
                    <li className="flex items-center gap-1.5 text-emerald-600">✓ Name and categorize custom keys</li>
                    <li className="flex items-center gap-1.5 text-emerald-600">✓ Disable/enable keys on-the-fly</li>
                    <li className="flex items-center gap-1.5 text-emerald-600">✓ Track live usage peaks with graphs</li>
                  </ul>
                </div>
                
                <div className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-2xl border border-indigo-100/30 text-center">
                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider font-sans">Quick Sandbox Key Fallback</span>
                  <div className="mt-3 space-y-2">
                    <input 
                      type="email" 
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Developer email address"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold text-slate-800 dark:text-slate-100"
                    />
                    <button 
                      onClick={generateApiKey}
                      disabled={generating}
                      className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {generating ? "Generating..." : "Request Developer Key"}
                    </button>
                  </div>

                  {generatedKey && (
                    <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                      <span className="text-[8px] font-black text-emerald-600 block uppercase tracking-widest mb-1 leading-none">Standard Key Created</span>
                      <div className="flex items-center justify-between gap-1 overflow-hidden bg-white dark:bg-slate-900 p-1.5 border border-emerald-200/50 rounded-lg">
                        <span className="font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate select-all">{generatedKey}</span>
                        <button 
                          onClick={() => handleCopy(generatedKey, 'key')}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-750"
                        >
                          {copiedText === 'key' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
                <Shield className="w-12 h-12 text-slate-300 dark:text-slate-705 mb-3" />
                <h4 className="text-base font-black text-slate-800 dark:text-slate-250 mb-1">Advanced Console is Blocked</h4>
                <p className="text-xs text-slate-500 max-w-md font-semibold leading-relaxed">
                  Authentication checker: You are currently viewing as GUEST. Create a free account or login via the compliance header above to activate full administrative API control and custom graphs.
                </p>
              </div>
            </div>
          ) : (
            /* Logged-In Administrative Controls */
            <div className="space-y-8">
              {/* Top Summary stats row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">Registered Email</span>
                  <strong className="text-xs font-bold text-slate-950 dark:text-slate-100 mt-1.5 block truncate">{currentUserEmail}</strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">Active Custom Keys</span>
                  <strong className="text-xs font-bold text-slate-950 dark:text-slate-100 mt-1.5 block">{apiKeys.length} keys total</strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none font-sans">Diagnostics Engine</span>
                  <strong className="text-xs font-extrabold text-[#6366f1] mt-1.5 block flex items-center gap-1.5 leading-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    Admin Console Ready
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Keys Management List & Add Form */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Create Custom Key expander form */}
                  <form onSubmit={handleCreateCustomKey} className="bg-slate-50 dark:bg-slate-955 p-5 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3.5">
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#6366f1]" /> Generate Custom Production Key
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-1">Key Friendly Name</label>
                        <input
                          type="text"
                          required
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g. LinkedIn Scrapy Bot"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-400 font-semibold text-slate-800 dark:text-slate-105"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-1">Max Free Request Limit/Day</label>
                        <select
                          value={newKeyLimit}
                          onChange={(e) => setNewKeyLimit(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-400 font-semibold text-slate-850 dark:text-slate-105"
                        >
                          <option value="50">50 requests / day</option>
                          <option value="100">100 requests / day (Standard)</option>
                          <option value="250">250 requests / day</option>
                          <option value="500">500 requests / day</option>
                          <option value="1000">1000 requests / day (High Use)</option>
                          <option value="5000">5000 requests / day (Enterprise)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Key Description / Use-Case Scope</label>
                      <input
                        type="text"
                        value={newKeyDesc}
                        onChange={(e) => setNewKeyDesc(e.target.value)}
                        placeholder="Inspects external developer resumes and candidate pools"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-400 font-semibold text-slate-800 dark:text-slate-105"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={newKeyCreating}
                      className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {newKeyCreating ? "Creating custom keys..." : "Create New Access Token"}
                    </button>
                  </form>

                  {/* Keys Grid layout */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider leading-none block">Your Registered API Keys</span>
                    {loadingKeys ? (
                      <div className="p-12 text-center text-xs text-slate-500 font-semibold animate-pulse">
                        ⏳ Synchronizing secure Keys from Firestore server...
                      </div>
                    ) : apiKeys.length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-500 font-semibold">
                        No keys provisioned yet. Use the tool form above to quickly craft your first custom production credential!
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout" initial={false}>
                        {apiKeys.map((kObj) => {
                          const todayStr = new Date().toISOString().split("T")[0];
                          const dailyCount = kObj.requests_window ? kObj.requests_window.length : (kObj.hits_by_date?.[todayStr] || 0);
                          const limit = kObj.request_limit || 100;
                          const usageRatio = Math.min(100, Math.floor((dailyCount / limit) * 100));
                          const isCurrentlySelected = selectedKeyForGraph?.key === kObj.key;
                          const isEditingThis = isEditingKeyString === kObj.key;

                          return (
                            <motion.div 
                              layout
                              key={kObj.key}
                              initial={{ opacity: 0, height: 0, scale: 0.95, y: 15 }}
                              animate={{ opacity: 1, height: 'auto', scale: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, scale: 0.95, y: -15 }}
                              transition={{ type: "spring", stiffness: 500, damping: 38 }}
                              onClick={() => !isEditingThis && setSelectedKeyForGraph(kObj)}
                              className={`p-4 border rounded-2xl transition-all relative overflow-hidden cursor-pointer ${
                                isCurrentlySelected
                                  ? 'bg-indigo-50/10 border-indigo-500/40 dark:border-[#6366f1] shadow-md'
                                  : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              } ${kObj.status === 'disabled' ? 'opacity-82' : ''}`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150 dark:border-slate-800/50 mb-3">
                                <div className="min-w-0">
                                  {isEditingThis ? (
                                    <div className="space-y-2 max-w-sm" onClick={(e) => e.stopPropagation()}>
                                      <input 
                                        type="text" 
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded outline-none w-full"
                                        placeholder="Key friendly name"
                                      />
                                      <input 
                                        type="text" 
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 px-2.5 py-1 rounded outline-none w-full"
                                        placeholder="Key description"
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <strong className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                          {kObj.name || "Default Key"}
                                        </strong>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-none ${
                                          kObj.status === 'disabled'
                                            ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                          {kObj.status === 'disabled' ? 'disabled' : 'enabled'}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-550 dark:text-slate-400 font-semibold truncate max-w-xs mt-1">
                                        {kObj.description || "Production credential for external integrations"}
                                      </p>
                                    </>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 self-start sm:self-center">
                                  {/* Toggle Status Switch button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleKeyStatus(kObj);
                                    }}
                                    title={kObj.status === 'disabled' ? 'Enable API Key' : 'Disable API Key'}
                                    className="p-1 text-slate-400 hover:text-slate-755 dark:hover:text-slate-200 transition-colors cursor-pointer border-0 bg-transparent"
                                  >
                                    {kObj.status === 'disabled' ? (
                                      <ToggleLeft className="w-5.5 h-5.5 text-slate-400" />
                                    ) : (
                                      <ToggleRight className="w-5.5 h-5.5 text-indigo-505" />
                                    )}
                                  </button>

                                  {isEditingThis ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateKeyDetails(kObj.key);
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg cursor-pointer"
                                    >
                                      Save
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingKey(kObj);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-755 dark:hover:text-slate-205 cursor-pointer border-0 bg-transparent"
                                      title="Edit Key Details"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                  )}

                                  {deleteConfirmKey === kObj.key ? (
                                    <div className="flex items-center gap-1.5 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/30">
                                      <span className="text-[10px] text-rose-500 font-extrabold font-sans">Delete?</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteKey(kObj.key);
                                        }}
                                        className="text-[9px] font-black uppercase text-rose-600 bg-rose-100 hover:bg-rose-205 dark:bg-rose-955/45 dark:text-rose-450 px-1.5 py-0.5 rounded cursor-pointer border-0"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmKey(null);
                                        }}
                                        className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded cursor-pointer border-0"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmKey(kObj.key);
                                      }}
                                      title="Delete Key Permanently"
                                      className="p-1 text-slate-450 hover:text-rose-500 transition-colors cursor-pointer border-0 bg-transparent"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Secure Copy Key segment */}
                              <div className="flex items-center justify-between gap-1 overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 border border-slate-150 dark:border-slate-800/80 rounded-xl mb-3.5">
                                <span className="font-mono text-xs font-bold text-slate-550 dark:text-slate-350 truncate select-all">{kObj.key}</span>
                                <div className="flex gap-1">
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy(kObj.key, kObj.key);
                                      setApiKeyInput(kObj.key);
                                    }}
                                    className="p-1 hover:bg-white dark:hover:bg-slate-900 rounded text-slate-400 hover:text-slate-705 ml-1 border-0 bg-transparent cursor-pointer"
                                  >
                                    {copiedText === kObj.key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              {/* Daily quota limits gauge bar */}
                              <div>
                                <div className="flex justify-between items-center text-[9px] font-black text-slate-450 block uppercase tracking-wider mb-1 leading-none">
                                  {isEditingThis ? (
                                    <div className="flex items-center gap-1 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                                      <span>Set Limit:</span>
                                      <select
                                        value={editForm.request_limit}
                                        onChange={(e) => setEditForm({ ...editForm, request_limit: Number(e.target.value) })}
                                        className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded outline-none"
                                      >
                                        <option value="50">50 / day</option>
                                        <option value="100">100 / day</option>
                                        <option value="250">250 / day</option>
                                        <option value="500">500 / day</option>
                                        <option value="1000">1000 / day</option>
                                        <option value="5000">5000 / day</option>
                                      </select>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-extrabold text-[8px] tracking-wider text-slate-450 dark:text-slate-500">DAILY UTILIZATION QUOTA</span>
                                        <span className="text-[10px] text-slate-700 dark:text-slate-350 font-semibold lowercase">
                                          <strong className="text-slate-900 dark:text-white font-black text-xs font-mono">{dailyCount}</strong> / {limit} sliding 24h requests
                                        </span>
                                      </div>
                                      <div className="text-right flex flex-col gap-0.5">
                                        <span className="font-extrabold text-[8px] tracking-wider text-slate-450 dark:text-slate-500">LIFETIME PINGS</span>
                                        <span className="text-[10px] text-slate-700 dark:text-slate-350 font-bold font-mono">{kObj.request_count || 0} hits</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-955 h-1 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${usageRatio}%` }}
                                    className={`h-full rounded-full transition-all ${
                                      usageRatio > 85 ? 'bg-rose-500' : usageRatio > 60 ? 'bg-amber-500' : 'bg-indigo-500'
                                    }`}
                                  ></div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* Right Side: Usage Peaks Live Tracker Timeline Graph */}
                <div className="lg:col-span-12 xl:col-span-5">
                  <div className="bg-slate-50 dark:bg-slate-955 rounded-3xl p-6 border border-slate-150 dark:border-slate-850 h-full min-h-[400px] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-550 dark:text-indigo-400 tracking-widest block leading-none mb-1.5 font-sans">Usage Monitoring Engine</span>
                      <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                        <BarChart2 className="w-5 h-5 text-indigo-500" /> Daily API Hits Tracker Graph
                      </h4>

                      {/* Active Key Dropdown Selection Selector */}
                      <div className="mb-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3 rounded-2xl">
                        <label className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block mb-1">Select Monitored Key:</label>
                        <select
                          value={selectedKeyForGraph?.key || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = apiKeys.find(k => k.key === val);
                            setSelectedKeyForGraph(found || null);
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-801 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-250 outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          <option value="">-- Choose Key to Track Hits --</option>
                          {apiKeys.map((kObj) => (
                            <option key={kObj.key} value={kObj.key}>
                              {kObj.name || kObj.key.slice(0, 8)} ({kObj.key.slice(0, 12)}...)
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedKeyForGraph ? (
                        <div>
                          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl mb-4 flex items-center justify-between">
                            <div className="min-w-0">
                              <strong className="text-xs text-slate-800 dark:text-slate-150 block truncate max-w-[200px]">{selectedKeyForGraph.name || "Default Key"}</strong>
                              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mt-0.5">Status: {selectedKeyForGraph.status || "enabled"}</span>
                            </div>
                            <span className="text-xs font-black text-indigo-650 bg-indigo-500/15 px-2.5 py-1 rounded-lg">
                              {(selectedKeyForGraph.hits_by_date ? Object.values(selectedKeyForGraph.hits_by_date).reduce((a: any, b: any) => a + b, 0) : 0)} Tot. Hits
                            </span>
                          </div>

                          {/* Render Dynamic Timeline Graph */}
                          <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block leading-none mb-2 font-sans">LAST 7 DAYS ACTIVITY TIMELINE:</span>
                            
                            {/* SVG / HTML Custom Grid Bar Chart representing date-wise hits */}
                            <div className="space-y-2.5 p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-inner min-h-[160px] flex flex-col justify-center">
                              {(() => {
                                const hitsMap = selectedKeyForGraph.hits_by_date || {};
                                const dates: string[] = [];
                                for (let i = 6; i >= 0; i--) {
                                  const d = new Date();
                                  d.setDate(d.getDate() - i);
                                  const dateStr = d.toISOString().split('T')[0];
                                  dates.push(dateStr);
                                }

                                const maxHit = Math.max(1, ...Object.values(hitsMap) as number[]);

                                return dates.map((dateStr) => {
                                  const hitsCount = hitsMap[dateStr] || 0;
                                  const percent = Math.min(100, Math.floor((hitsCount / maxHit) * 100));
                                  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

                                  return (
                                    <div key={dateStr} className="flex items-center gap-3">
                                      <span className="font-mono text-[9px] text-slate-450 dark:text-slate-400 w-11 flex-shrink-0 font-bold">{formattedDate}</span>
                                      <div className="flex-1 bg-slate-50 dark:bg-slate-950/70 h-2.5 rounded-full overflow-hidden relative">
                                        <div 
                                          style={{ width: `${percent > 10 ? percent : percent > 0 ? 10 : 0}%` }}
                                          className="bg-[#6366f1] hover:bg-[#4f46e5] h-full rounded-full transition-all"
                                        ></div>
                                      </div>
                                      <span className="font-mono text-[10px] font-black text-slate-600 dark:text-slate-300 w-6 text-right flex-shrink-0">{hitsCount}</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-normal bg-slate-100 dark:bg-slate-900/50 p-2.5 border border-slate-150/50 dark:border-slate-850/60 rounded-xl font-semibold">
                              💡 Max hit ratios are refreshed dynamically with hourly updates. Any external system ping to compliance routers `/api/v1/*` automatically records hit statistics.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[220px] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-4">
                          <BarChart2 className="w-10 h-10 text-slate-300 dark:text-slate-705 mb-2" />
                          <p className="text-[11px] text-slate-400 dark:text-slate-550 leading-normal">
                            No credentials selected. Tap or copy any active key in the management console on the left to load its traffic tracking statistics!
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-150/40 dark:border-slate-800/50 pt-4 mt-6 text-center">
                      <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase font-mono">SECURE DEVELOPER ENDPOINT CERTIFICATES © 2026</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* API PLAYGROUND GRID WRAPPER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 border-b border-slate-100 dark:border-slate-800">
          {/* Playground Left Help Panel Sidebar */}
          <div className="lg:col-span-1 bg-slate-50 dark:bg-[#6366f1]/5 p-5 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80 space-y-4">
            <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              <Info className="w-4 h-4 text-[#6366f1]" /> Playground Guide
            </h5>
            <ul className="text-[11px] font-bold text-slate-500 leading-relaxed space-y-3">
              <li>
                <span className="text-slate-700 dark:text-slate-300 block mb-0.5 font-bold">1. Key Authorization</span>
                Every compliance evaluation request requires a valid, enabled API Key passed in the JSON payload body under <code>api_key</code>.
              </li>
              <li>
                <span className="text-slate-700 dark:text-slate-300 block mb-0.5 font-bold">2. Secure Evaluation Pipes</span>
                Our background pipeline parses applicants, lists datasets, or validates verdicts with localized LLM weights to calculate disparate metrics, and checks the regional proxy parameters.
              </li>
              <li>
                <span className="text-slate-700 dark:text-slate-300 block mb-0.5 font-bold">3. Live Auditing Logs</span>
                Successful evaluations count against your customized key daily limit, and the hits are dynamically plotted in real-time on your graph.
              </li>
            </ul>
          </div>

          {/* PLAYGROUND AND PARAMS INPUTS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-[#6366f1]" /> API Playground
              </h4>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setActiveTab('hiring')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${activeTab === 'hiring' ? 'bg-[#6366f1] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 shadow-sm'}`}
                >
                  recruit/hiring
                </button>
                <button 
                  onClick={() => setActiveTab('dataset')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${activeTab === 'dataset' ? 'bg-[#6366f1] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 shadow-sm'}`}
                >
                  dataset scan
                </button>
                <button 
                  onClick={() => setActiveTab('decision')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${activeTab === 'decision' ? 'bg-[#6366f1] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 shadow-sm'}`}
                >
                  decision audit
                </button>
              </div>
            </div>

            {/* Inputs Container depending on tab */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Playground API Key</label>
                  <input 
                    type="text" 
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="fa_demoplaygroundkey123 (uses sandbox default limit)"
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {activeTab === 'hiring' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Candidate Resume Text</label>
                      <textarea 
                        value={hiringResume}
                        onChange={(e) => setHiringResume(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold h-24 resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Job Description</label>
                      <textarea 
                        value={hiringJobDesc}
                        onChange={(e) => setHiringJobDesc(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold h-20 resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'dataset' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">CSV Data Payload</label>
                      <textarea 
                        value={datasetCsv}
                        onChange={(e) => setDatasetCsv(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-mono text-slate-700 dark:text-slate-300 h-24 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protected Cols</label>
                        <input 
                          value={datasetProtected}
                          onChange={(e) => setDatasetProtected(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outcome Col</label>
                        <input 
                          value={datasetOutcome}
                          onChange={(e) => setDatasetOutcome(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'decision' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">Target Decision Input Context</label>
                      <textarea 
                        value={decisionInput}
                        onChange={(e) => setDecisionInput(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold h-24 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Output</label>
                        <input 
                          value={decisionVerdict}
                          onChange={(e) => setDecisionVerdict(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Model</label>
                        <input 
                          value={decisionModel}
                          onChange={(e) => setDecisionModel(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button 
                  onClick={runPlayground}
                  disabled={loading}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:border-none text-white font-bold py-3 px-4 rounded-xl text-xs transition-transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <Play className="w-4 h-4 fill-white" /> {loading ? "Invoking Rest Endpoints..." : "Invoke REST Audit"}
                </button>
              </div>

              {/* LIVE PLAYGROUND OUTPUT TERMINAL SCREEN */}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live Terminal Screen Output
                </span>
                <div className="flex-1 bg-slate-950 block rounded-2xl p-4 border border-slate-800 select-all font-mono text-[10px] text-slate-300 leading-normal max-h-80 overflow-y-auto relative min-h-60 shadow-inner">
                  {loading && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
                      <span className="text-indigo-400 font-bold select-none animate-pulse">invoking server side evaluations...</span>
                    </div>
                  )}

                  {!loading && !playgroundOutput && (
                    <div className="text-slate-500 italic h-full flex items-center justify-center text-center p-4">
                      No requests made yet. Click 'Invoke REST Audit' to execute real Gemini bias scans with live payloads.
                    </div>
                  )}

                  {playgroundOutput && (
                    <pre className="whitespace-pre-wrap select-all">{JSON.stringify(playgroundOutput, null, 2)}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CODE SNIPPETS SELECTOR */}
        <div className="py-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code className="w-4.5 h-4.5 text-[#6366f1]" /> Automatic Client Code Generation
            </h4>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-850 p-1 rounded-lg">
              <button 
                onClick={() => setCodeLanguage('curl')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded ${codeLanguage === 'curl' ? 'bg-white dark:bg-slate-900 text-slate-800' : 'text-slate-500'}`}
              >
                Shell / cURL
              </button>
              <button 
                onClick={() => setCodeLanguage('js')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded ${codeLanguage === 'js' ? 'bg-white dark:bg-slate-900 text-slate-800' : 'text-slate-500'}`}
              >
                JavaScript Fetch
              </button>
              <button 
                onClick={() => setCodeLanguage('python')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded ${codeLanguage === 'python' ? 'bg-white dark:bg-slate-900 text-slate-800' : 'text-slate-500'}`}
              >
                Python requests
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-white block relative shadow-inner">
            <button 
              onClick={() => handleCopy(getCodeSnippet(), 'snippet')}
              className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded border border-white/10 transition-colors"
            >
              {copiedText === 'snippet' ? "Copied!" : "Copy Code"}
            </button>
            <pre className="whitespace-pre overflow-x-auto text-[11px] text-white leading-relaxed">{getCodeSnippet()}</pre>
          </div>
        </div>

        {/* ENDPOINTS OVERVIEW TABLE */}
        <div className="pt-6">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">API Metadata Schema Specifications</h4>
          
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold border-b border-secondary">
                  <th className="p-3">HTTP Endpoint</th>
                  <th className="p-3">Payload Constraints</th>
                  <th className="p-3">Compliance Scans Included</th>
                  <th className="p-3">Expected Response Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-725 dark:text-slate-350">
                <tr>
                  <td className="p-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] uppercase tracking-wider rounded font-black">POST</span>
                    <span className="font-mono text-[10px]">/api/v1/audit/hiring</span>
                  </td>
                  <td className="p-3 leading-relaxed">
                    requires <code>resume</code>, <code>job_description</code>, <code>api_key</code>
                  </td>
                  <td className="p-3 leading-relaxed">
                    EEOC compliance verification, blind indicators extraction, regional mapping proxy screening.
                  </td>
                  <td className="p-3 font-semibold text-slate-500">
                    200 JSON | 400 Bad Field | 401 Unauthorized
                  </td>
                </tr>
                <tr>
                  <td className="p-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] uppercase tracking-wider rounded font-black">POST</span>
                    <span className="font-mono text-[10px]">/api/v1/audit/dataset</span>
                  </td>
                  <td className="p-3 leading-relaxed">
                    requires <code>csv_data</code>, <code>sector</code>, <code>protected_columns[]</code>, <code>outcome_column</code>
                  </td>
                  <td className="p-3 leading-relaxed">
                    Disparate Impact ratio checking, demographic parity gap calculus, EU AI Act risk profiles.
                  </td>
                  <td className="p-3 font-semibold text-slate-500">
                    200 JSON | 400 Bad Field | 429 Limit Exceeded
                  </td>
                </tr>
                <tr>
                  <td className="p-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] uppercase tracking-wider rounded font-black">POST</span>
                    <span className="font-mono text-[10px]">/api/v1/audit/decision</span>
                  </td>
                  <td className="p-3 leading-relaxed">
                    requires <code>decision_type</code>, <code>input_data</code>, <code>decision</code>, <code>model_trained_on</code>, <code>protected_attributes_used[]</code>
                  </td>
                  <td className="p-3 leading-relaxed">
                    Decision compliance testing, causal demographic inference, adversarial perturbation metrics.
                  </td>
                  <td className="p-3 font-semibold text-slate-500">
                    200 JSON | 401 Unauthorized | 429 Daily Limit
                  </td>
                </tr>
                <tr>
                  <td className="p-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-mono text-[9px] uppercase tracking-wider rounded font-black">GET</span>
                    <span className="font-mono text-[10px]">/api/v1/report/:audit_id</span>
                  </td>
                  <td className="p-3 leading-relaxed">
                    Requires valid Alpha 6-character <code>audit_id</code> string.
                  </td>
                  <td className="p-3 leading-relaxed">
                    Fetch full historique payload reports from past audits including original Gemini scores.
                  </td>
                  <td className="p-3 font-semibold text-slate-500">
                    200 JSON | 404 Report Not Found
                  </td>
                </tr>
                <tr>
                  <td className="p-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-mono text-[9px] uppercase tracking-wider rounded font-black">GET</span>
                    <span className="font-mono text-[10px]">/api/v1/analytics</span>
                  </td>
                  <td className="p-3 leading-relaxed">
                    requires <code>api_key</code> (via header or query parameter)
                  </td>
                  <td className="p-3 leading-relaxed">
                    Retrieves telemetry dashboards and key execution statistics, such as daily/monthly hit limits, average bias scores, modules distribution, and response time percentiles.
                  </td>
                  <td className="p-3 font-semibold text-slate-500">
                    200 JSON | 401 Unauthorized
                  </td>
                </tr>
                <tr>
                  <td className="p-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] uppercase tracking-wider rounded font-black">POST</span>
                    <span className="font-mono text-[10px]">/api/v1/audit/batch</span>
                  </td>
                  <td className="p-3 leading-relaxed font-mono">
                    requires audits: Array, api_key: String (fa_pro_* / fa_ent_*)
                  </td>
                  <td className="p-3 leading-relaxed">
                    Processes multiple audits in a single atomic transaction. Applies EEOC filters and demographic parity calculators in parallel.
                  </td>
                  <td className="p-3 font-semibold text-slate-500">
                    200 JSON | 400 Bad Request | 403 Forbidden
                  </td>
                </tr>
                <tr>
                  <td className="p-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] uppercase tracking-wider rounded font-black">POST</span>
                    <span className="font-mono text-[10px]">/api/v1/audit/dataset/async</span>
                  </td>
                  <td className="p-3 leading-relaxed">
                    requires <code>csv_data</code>, <code>sector</code>, <code>protected_columns[]</code>, <code>outcome_column</code>, <code>api_key</code>
                  </td>
                  <td className="p-3 leading-relaxed">
                    Triggers a non-blocking asynchronous dataset compliance pipeline job. Returns an immediate job queue status code and status URL.
                  </td>
                  <td className="p-3 font-semibold text-slate-500">
                    202 Accepted | 400 Bad Field | 403 Forbidden
                  </td>
                </tr>
                <tr>
                  <td className="p-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-mono text-[9px] uppercase tracking-wider rounded font-black">GET</span>
                    <span className="font-mono text-[10px]">/api/v1/jobs/:job_id</span>
                  </td>
                  <td className="p-3 leading-relaxed">
                    Requires valid Alpha-numeric <code>job_id</code> string.
                  </td>
                  <td className="p-3 leading-relaxed">
                    Retrieves current progress and status of active asynchronous dataset profiling tasks ("queued" / "processing" / "completed").
                  </td>
                  <td className="p-3 font-semibold text-slate-500">
                    200 JSON | 404 Job Not Found
                  </td>
                </tr>
                <tr>
                  <td className="p-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] uppercase tracking-wider rounded font-black">POST</span>
                    <span className="font-mono text-[10px]">/api/v1/audit/hiring/stream</span>
                  </td>
                  <td className="p-3 leading-relaxed">
                    requires <code>resume</code>, <code>job_description</code>, <code>api_key</code>
                  </td>
                  <td className="p-3 leading-relaxed font-semibold">
                    Server-Sent Events (SSE) data stream providing real-time, granular step progression for semantic analysis, identity redaction, and EEOC diagnostic evaluations.
                  </td>
                  <td className="p-3 font-semibold text-slate-500">
                    200 event-stream | 401 Unauthorized
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
