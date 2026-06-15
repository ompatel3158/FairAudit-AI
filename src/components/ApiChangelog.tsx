import React, { useState } from 'react';
import { 
  ArrowLeft, Download, Code, CheckCircle, 
  FileText, Shield, Sparkles, RefreshCw, Layers, Check 
} from 'lucide-react';

interface ApiChangelogProps {
  onBack: () => void;
}

export default function ApiChangelog({ onBack }: ApiChangelogProps) {
  const [downloaded, setDownloaded] = useState(false);

  const downloadPostmanCollection = () => {
    const collection = {
      "info": {
        "_postman_id": "fairaudit-collection-id-123",
        "name": "FairAudit AI v1.1 API Collection",
        "description": "Comprehensive Postman collection for interfacing with FairAudit's fair-recruitment and algorithmic bias testing systems.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      "item": [
        {
          "name": "System Health & Test",
          "item": [
            {
              "name": "Check Health Status",
              "request": {
                "method": "GET",
                "header": [],
                "url": {
                  "raw": "{{baseUrl}}/api/v1/health",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "health"]
                }
              }
            },
            {
              "name": "Test Instant Scan (No API Key Required)",
              "request": {
                "method": "GET",
                "header": [],
                "url": {
                  "raw": "{{baseUrl}}/api/v1/test",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "test"]
                }
              }
            }
          ]
        },
        {
          "name": "Authentication & Key Provisioning",
          "item": [
            {
              "name": "Generate API Key",
              "request": {
                "method": "POST",
                "header": [
                  { "key": "Content-Type", "value": "application/json" }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"email\": \"developer@yourfirm.com\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/v1/generate-key",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "generate-key"]
                }
              }
            },
            {
              "name": "Retrieve API Analytics",
              "request": {
                "method": "GET",
                "header": [
                  { "key": "Authorization", "value": "Bearer {{apiKey}}" }
                ],
                "url": {
                  "raw": "{{baseUrl}}/api/v1/analytics?api_key={{apiKey}}",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "analytics"],
                  "query": [
                    { "key": "api_key", "value": "{{apiKey}}" }
                  ]
                }
              }
            }
          ]
        },
        {
          "name": "Algorithmic Bias Audits",
          "item": [
            {
              "name": "Audit Hiring Resume (Standard)",
              "request": {
                "method": "POST",
                "header": [
                  { "key": "Content-Type", "value": "application/json" }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"api_key\": \"{{apiKey}}\",\n  \"resume\": \"Devon Miller\\nBS in CS from IIT Bombay 2018\\nLooking for energetic startup roles.\",\n  \"job_description\": \"Senior Backend Developer. Key stack: NodeJS, Express. Minimum 3 years experience.\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/v1/audit/hiring",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "audit", "hiring"]
                }
              }
            },
            {
              "name": "Audit Hiring Resume (Streaming Events)",
              "request": {
                "method": "POST",
                "header": [
                  { "key": "Content-Type", "value": "application/json" },
                  { "key": "Accept", "value": "text/event-stream" }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"api_key\": \"{{apiKey}}\",\n  \"resume\": \"John Doe, experienced manager from Stanford with 10 years experience...\",\n  \"job_description\": \"Manager, 5+ years experience...\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/v1/audit/hiring/stream",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "audit", "hiring", "stream"]
                }
              }
            },
            {
              "name": "Audit Dataset (Sync/Pro/Enterprise)",
              "request": {
                "method": "POST",
                "header": [
                  { "key": "Content-Type", "value": "application/json" }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"api_key\": \"{{apiKey}}\",\n  \"csv_data\": \"age,gender,income,loan_approved\\n32,male,50000,1\\n45,female,60000,0\\n21,female,20000,0\",\n  \"column_mappings\": {\n    \"protected_attributes\": [\"gender\", \"age\"],\n    \"outcome_variable\": \"loan_approved\"\n  }\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/v1/audit/dataset",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "audit", "dataset"]
                }
              }
            },
            {
              "name": "Audit Dataset Async (Large/Batch Queue)",
              "request": {
                "method": "POST",
                "header": [
                  { "key": "Content-Type", "value": "application/json" }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"api_key\": \"{{apiKey}}\",\n  \"csv_data\": \"age,gender,zip_code,outcome\\n34,female,90210,0\\n52,male,10001,1\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/v1/audit/dataset/async",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "audit", "dataset", "async"]
                }
              }
            },
            {
              "name": "Check Async Job Status",
              "request": {
                "method": "GET",
                "header": [],
                "url": {
                  "raw": "{{baseUrl}}/api/v1/jobs/:job_id",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "jobs", ":job_id"],
                  "variable": [
                    { "key": "job_id", "value": "job_abc123" }
                  ]
                }
              }
            },
            {
              "name": "Audit Decision Rule-System",
              "request": {
                "method": "POST",
                "header": [
                  { "key": "Content-Type", "value": "application/json" }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"api_key\": \"{{apiKey}}\",\n  \"decision_type\": \"legal_parole\",\n  \"input_data\": \"Age: 24, Race: Black, Prior charges: 2\",\n  \"decision\": \"High Recidivism Score\"\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/v1/audit/decision",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "audit", "decision"]
                }
              }
            },
            {
              "name": "Audit Multiple Batched Inputs Parallelly",
              "request": {
                "method": "POST",
                "header": [
                  { "key": "Content-Type", "value": "application/json" }
                ],
                "body": {
                  "mode": "raw",
                  "raw": "{\n  \"api_key\": \"{{apiKey}}\",\n  \"audits\": [\n    {\n      \"id\": \"batch_idx_1\",\n      \"type\": \"hiring\",\n      \"resume\": \"Resume text for Candidate A...\",\n      \"job_description\": \"Sales Engineer\"\n    },\n    {\n      \"id\": \"batch_idx_2\",\n      \"type\": \"hiring\",\n      \"resume\": \"Resume text for Candidate B...\",\n      \"job_description\": \"Sales Engineer\"\n    }\n  ]\n}"
                },
                "url": {
                  "raw": "{{baseUrl}}/api/v1/audit/batch",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "audit", "batch"]
                }
              }
            },
            {
              "name": "Fetch Audit Report (UUID)",
              "request": {
                "method": "GET",
                "header": [],
                "url": {
                  "raw": "{{baseUrl}}/api/v1/report/:audit_id",
                  "host": ["{{baseUrl}}"],
                  "path": ["api", "v1", "report", ":audit_id"],
                  "variable": [
                    { "key": "audit_id", "value": "abc123" }
                  ]
                }
              }
            }
          ]
        }
      ],
      "event": [
        {
          "listen": "prerequest",
          "script": { "type": "text/javascript", "exec": [""] }
        },
        {
          "listen": "test",
          "script": { "type": "text/javascript", "exec": [""] }
        }
      ],
      "variable": [
        { "key": "baseUrl", "value": window.location.origin },
        { "key": "apiKey", "value": "fa_pro_demokey1122" }
      ]
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(collection, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "fairaudit_api_collection.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Back navigation header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 mr-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-750 text-slate-600 dark:text-slate-350 rounded-xl cursor-pointer transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded leading-none">Changelog</span>
                <span className="text-[10px] font-bold text-slate-400">v1.1 API Docs Extra</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">API Changelog & Versioning Log</h1>
            </div>
          </div>

          <button 
            onClick={downloadPostmanCollection}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              downloaded 
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-indigo-600 hover:bg-indigo-550 text-white shadow-sm hover:shadow'
            }`}
          >
            {downloaded ? <Check className="w-4 h-4 animate-scale-up" /> : <Download className="w-4 h-4" />}
            {downloaded ? 'Collection Downloaded!' : 'Download Postman JSON'}
          </button>
        </div>

        {/* Section: Welcome cards and highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="p-2 w-fit bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-500">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">API Versioning Policy</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              All active API routes resides under the standard version <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono text-indigo-400">/v1</code>. Pre-version paths emit deprecation warnings.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="p-2 w-fit bg-[#6366f1]/10 rounded-xl text-[#6366f1]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Parallel Batch Audits</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Execute up to 50 concurrent algorithms assessments programmatically. Batch is optimized with thread pooling.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="p-2 w-fit bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-500">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Large Datasets Engine</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Integrate non-blocking background queue tasks via the state machine polling URL system, designed for enterprise auditing.
            </p>
          </div>
        </div>

        {/* Section: Timeline log */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-8">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-wider uppercase mb-1 flex items-center gap-2">
              <span>📅 Version Timeline Log</span>
            </h2>
            <p className="text-xs text-slate-400">Trace history releases of the FairAudit AI public API endpoints</p>
          </div>

          <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-10">
            {/* Version 1.1 */}
            <div className="relative">
              {/* Timeline bubble */}
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-950 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white font-mono">v1.1 Release</h3>
                    <span className="text-[9px] font-medium bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">June 2024</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">
                  Comprehensive upgrade of key external programmatic triggers, optimizing performance and async job distribution blocks:
                </p>

                <ul className="text-xs text-slate-650 dark:text-slate-350 space-y-2 pl-4 list-disc font-sans font-medium">
                  <li><strong className="text-slate-800 dark:text-slate-200">+ Added batch endpoint:</strong> Submit arrays of up to 50 concurrent audits through <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono">POST /api/v1/audit/batch</code>.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">+ Added async processing:</strong> Offload large inputs cleanly to our task daemon using <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono">POST /api/v1/audit/dataset/async</code> with status checking.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">+ Added streaming responses:</strong> Recieve Event Triggers as the Gemini analysis operates with <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono">POST /api/v1/audit/hiring/stream</code>.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">+ Added analytics endpoints:</strong> Monitor API key traffic trends programmatically through <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono">GET /api/v1/analytics</code>.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">✓ Fixed:</strong> Standardized rate limit compliance header responses (<code className="text-[10px] px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono">X-RateLimit-*</code>) uniformly across endpoints.</li>
                </ul>
              </div>
            </div>

            {/* Version 1.0 */}
            <div className="relative">
              {/* Timeline bubble */}
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white font-mono">v1.0 (Initial Release)</h3>
                    <span className="text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">Legacy</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">June 2024</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">
                  The initial release of the modular algorithmic vetting APIs, allowing recruiters to screens resumes & data pipelines programmatically:
                </p>

                <ul className="text-xs text-slate-650 dark:text-slate-350 space-y-2 pl-4 list-disc font-sans font-medium animate-fade-in">
                  <li><strong className="text-slate-800 dark:text-slate-200">+ Core Hiring Vetting:</strong> Structured resume anonymization and grading framework.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">+ Dataset Bias Checking:</strong> Evaluation of training features against target indices.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">+ Automated Report Fetching:</strong> Persistent storage retrieval using uniquely encoded tracking IDs.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">+ Token Authority:</strong> Developer portal API keys self-generation interface.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Migration Guide */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-wider uppercase mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              <span>Migration Guide (v0 to v1 endpoints)</span>
            </h2>
            <p className="text-xs text-slate-400">Step-by-step tutorial on adapting internal script connectors to versioned endpoints</p>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              To support modern scale benchmarks, old endpoints under the <code className="text-indigo-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono">/api/audit/*</code> structures are designated as deprecated. While these pathways will continue executing to guarantee downstream compatibility, they will emit a warning header. Adjust your clients immediately:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-[#cbd5e1] border-collapse">
                <thead>
                  <tr className="border-b border-slate-250 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wide">
                    <th className="py-2.5">Resource Description</th>
                    <th className="py-2.5">Legacy Endpoint (Deprecated)</th>
                    <th className="py-2.5 text-indigo-400">New v1 Pathway (Recommended)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 leading-loose">
                  <tr>
                    <td className="py-2.5 font-bold">Resume Scan</td>
                    <td className="py-2.5 font-mono text-slate-400">POST /api/audit/hiring</td>
                    <td className="py-2.5 font-mono text-[#6366f1] font-bold">POST /api/v1/audit/hiring</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold">Training Set Assess</td>
                    <td className="py-2.5 font-mono text-slate-400">POST /api/audit/dataset</td>
                    <td className="py-2.5 font-mono text-[#6366f1] font-bold">POST /api/v1/audit/dataset</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold">Ruleset Screening</td>
                    <td className="py-2.5 font-mono text-slate-400">POST /api/audit/decision</td>
                    <td className="py-2.5 font-mono text-[#6366f1] font-bold">POST /api/v1/audit/decision</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold">Fetch PDF / JSON Report</td>
                    <td className="py-2.5 font-mono text-slate-400">GET /api/report/:id</td>
                    <td className="py-2.5 font-mono text-[#6366f1] font-bold">GET /api/v1/report/:id</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold">Auth Token Genesis</td>
                    <td className="py-2.5 font-mono text-slate-400">POST /api/generate-key</td>
                    <td className="py-2.5 font-mono text-[#6366f1] font-bold">POST /api/v1/generate-key</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
              <span className="text-amber-500 text-lg shrink-0">⚠️</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-500">Notice about deprecation headers</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Our legacy proxy automatically injects the response header <code className="bg-amber-500/10 px-1 py-0.2 rounded font-mono text-amber-500">X-Deprecation-Warning: "Use /api/v1/ endpoints"</code>. Ensure that your automated parsers or gateway validators are not configured to block unknown headers to prevent routing drops.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
