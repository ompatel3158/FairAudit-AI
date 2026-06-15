import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, RefreshCw, AlertTriangle, CheckCircle2, ChevronRight, Play, Sparkles, HelpCircle, ArrowRight, Eye, Code, Lock } from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  category: 'Banking' | 'Hiring' | 'Healthcare';
  label: string;
  payload: string; // Plain JSON string format
  biasedKeys: string[]; // Keys to blink/highlight in red
  explanations: { [key: string]: { concept: string; threat: string; response: string } };
  remediatedPayload: string; // Cleaned JSON
}

export default function LiveApiDemo() {
  const scenarios: Scenario[] = [
    {
      id: 'hiring-standard',
      name: 'Standard Recruiter Sourcing Request',
      category: 'Hiring',
      label: 'Standard Hiring Payload',
      payload: JSON.stringify({
        "applicant_name": "Sarah Jenkins",
        "position": "Senior Software Architect",
        "years_experience": 8,
        "education": "Wellesley College, Class of 1995",
        "biography": "She excels at lead system engineering. She single-handedly built our microservice mesh.",
        "skills_matched": ["Golang", "Kubernetes", "GraphQL"],
        "target_salary": 140000
      }, null, 2),
      biasedKeys: ["education", "biography", "applicant_name"],
      explanations: {
        "applicant_name": {
          concept: "Direct Gender Marker",
          threat: "Commonly triggers downstream algorithmic gender bias in training weight matrices.",
          response: "Anonymized token replacement ('Candidate_Alpha') preserving objective merit parameters."
        },
        "education": {
          concept: "Elite Pedigree & Age Proxy",
          threat: "Historically women-only college matching paired with '1995' year targets age parameters.",
          response: "Class year is stripped; the institution type is masked to generalized educational categories."
        },
        "biography": {
          concept: "Implicit Pronoun Cue",
          threat: "Pronouns ('She/her') leak demographic context to the LLM evaluator, skewing score parity.",
          response: "Rewritten to demographic-blind active voice: 'Excels at lead system engineering. Single-handedly built microservice mesh.'"
        }
      },
      remediatedPayload: JSON.stringify({
        "applicant_id": "FA_CANDIDATE_7A2",
        "position": "Senior Software Architect",
        "years_experience": 8,
        "education": "4-Year Accredited Institution, Degree Conferred",
        "biography": "Excels at lead system engineering. Built core microservice mesh architectures.",
        "skills_matched": ["Golang", "Kubernetes", "GraphQL"],
        "target_salary": 140000
      }, null, 2)
    },
    {
      id: 'banking-standard',
      name: 'Consumer Banking Auto-Underwriter Request',
      category: 'Banking',
      label: 'Credit Evaluation Payload',
      payload: JSON.stringify({
        "account_id": "usr_99837",
        "requested_amount": 35000,
        "monthly_net_income": 6200,
        "credit_score": 680,
        "home_address": "ZIP Code 10027, Manhattan, NY",
        "residence_type": "Public Assisted Housing",
        "repayment_period_months": 36
      }, null, 2),
      biasedKeys: ["home_address", "residence_type"],
      explanations: {
        "home_address": {
          concept: "Demographic Redlining Proxy",
          threat: "Postal codes/cities act as direct proxies for race, ethnicity, and historical household wealth indices.",
          response: "Postal zip codes are generalized or masked entirely, replacing with regional economic benchmarks."
        },
        "residence_type": {
          concept: "Socio-economic Proxy",
          threat: "Evaluation of 'Public Assisted Housing' unfairly penalizes low-income groups regardless of credit scores.",
          response: "Removed or normalized to ensure objective loan affordability ratio metrics rule the model output."
        }
      },
      remediatedPayload: JSON.stringify({
        "account_id": "usr_99837",
        "requested_amount": 35000,
        "monthly_net_income": 6200,
        "credit_score": 680,
        "regional_economic_index": "NORTHEAST_METRO_AVG_L2",
        "repayment_period_months": 36
      }, null, 2)
    },
    {
      id: 'healthcare-standard',
      name: 'Clinical Health Resource Sepsis Screen',
      category: 'Healthcare',
      label: 'Clinical Triage Payload',
      payload: JSON.stringify({
        "patient_id": "pat_3850",
        "symptoms_reported": ["acute cough", "high fever", "lethargy"],
        "assigned_urgency": "unspecified",
        "primary_insurance_carrier": "Medicaid State Program",
        "demographic_profile": "Hispanic Female, Born 1952"
      }, null, 2),
      biasedKeys: ["primary_insurance_carrier", "demographic_profile"],
      explanations: {
        "primary_insurance_carrier": {
          concept: "Unlawful Class Indicator",
          threat: "Welfare program flags bias priority triage models, scoring subsidized patients lower for resources.",
          response: "Masked to 'Public/State Insurance Category' to equalize algorithmic allocation scoring."
        },
        "demographic_profile": {
          concept: "Multiple Protected Classes",
          threat: "Exposes explicit Race, Gender, and Age fields, leading directly to biased clinical priority formulas.",
          response: "Removed. Physiological vital markers are preserved while direct social demographics are redacted."
        }
      },
      remediatedPayload: JSON.stringify({
        "patient_id": "pat_3850",
        "symptoms_reported": ["acute cough", "high fever", "lethargy"],
        "assigned_urgency": "unspecified",
        "insurance_tier": "STATE_STANDARD_PROGRAM_A",
        "clinical_age_bracket": "70-75 (Physiological Risk Group)"
      }, null, 2)
    },
    {
      id: 'sneaky-bias',
      name: 'Subtly Sneaked Bias Pattern (Advocate Bypass)',
      category: 'Hiring',
      label: 'Try to Sneak Bias Past FairAudit 🕵️‍♂️',
      payload: JSON.stringify({
        "applicant_name": "Aisling O'Connor",
        "skills": ["Team Leadership", "Risk Management"],
        "cover_letter_excerpt": "She was a brilliant team organizer at her previous boarding school (Class of '89). She spent her holidays caring for grandchildren.",
        "target_industry": "Finance"
      }, null, 2),
      biasedKeys: ["cover_letter_excerpt", "applicant_name"],
      explanations: {
        "applicant_name": {
          concept: "Implicit Ethnic Indicator",
          threat: "Name structure reveals regional/national origin context, which could trigger bias in origin-biased weights.",
          response: "Masked to 'Candidate_7092' to avoid nationality biases."
        },
        "cover_letter_excerpt": {
          concept: "Age, Gender, & Socio-economic proxies",
          threat: "Phrases 'boarding-school', 'Grandchildren' and 'Class of '89' bypass basic filters but leak elite status, age (55+), and gender.",
          response: "Sanitized to objective summary: 'Brilliant team organizer at past institution. Experienced in administrative leadership workflows.'"
        }
      },
      remediatedPayload: JSON.stringify({
        "applicant_id": "FA_CANDIDATE_38C",
        "skills": ["Team Leadership", "Risk Management"],
        "cover_letter_excerpt": "Brilliant team organizer. Experienced in administrative leadership workflows.",
        "target_industry": "Finance"
      }, null, 2)
    }
  ];

  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const currentScenario = scenarios[activeScenarioIdx];

  // Typing state
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingProgress, setTypingProgress] = useState(0); // For progression bars
  const [auditStep, setAuditStep] = useState<'idle' | 'typing' | 'analyzing' | 'done'>('idle');
  const [parsingStepName, setParsingStepName] = useState('');
  const [highlightedKeys, setHighlightedKeys] = useState<string[]>([]);
  const [selectedKeyExplanation, setSelectedKeyExplanation] = useState<string | null>(null);

  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startDemo = (index: number) => {
    // Reset previous demo states
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setActiveScenarioIdx(index);
    setTypedText('');
    setIsTyping(true);
    setAuditStep('typing');
    setParsingStepName('Streaming raw API call payload...');
    setHighlightedKeys([]);
    setSelectedKeyExplanation(null);

    const fullText = scenarios[index].payload;
    let charIdx = 0;
    // Fast typewriter: types chunks of characters so it finishes quickly but looks highly authentic
    const charsPerTick = 12; 
    
    typingTimerRef.current = setInterval(() => {
      if (charIdx < fullText.length) {
        charIdx += charsPerTick;
        const slice = fullText.slice(0, charIdx);
        setTypedText(slice);
        setTypingProgress(Math.min((charIdx / fullText.length) * 100, 100));
      } else {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setTypedText(fullText);
        setTypingProgress(100);
        setIsTyping(false);
        triggerAuditScanner(index);
      }
    }, 28);
  };

  const triggerAuditScanner = (index: number) => {
    setAuditStep('analyzing');
    const steps = [
      "Securing stream ingress...",
      "Intercepting model input tokens...",
      "Analyzing semantic nodes for protected traits...",
      "De-referencing postal redlining indicators...",
      "Stripping demographic proxy coordinates..."
    ];
    let stepIdx = 0;
    setParsingStepName(steps[0]);

    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setParsingStepName(steps[stepIdx]);
      } else {
        clearInterval(interval);
        setAuditStep('done');
        setHighlightedKeys(scenarios[index].biasedKeys);
        if (scenarios[index].biasedKeys.length > 0) {
          setSelectedKeyExplanation(scenarios[index].biasedKeys[0]); // Auto-select first bias key explanation
        }
      }
    }, 450);
  };

  // Trigger first demo on mount automatically
  useEffect(() => {
    startDemo(0);
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  // Format code display with dynamic highlighted lines
  const renderFormattedJson = () => {
    try {
      const lines = typedText.split('\n');
      return lines.map((line, i) => {
        // Find if this line has a biased key
        let isBiasedLine = false;
        let matchedKey = '';
        currentScenario.biasedKeys.forEach(key => {
          if (line.includes(`"${key}"`) && auditStep === 'done') {
            isBiasedLine = true;
            matchedKey = key;
          }
        });

        // Simple highlighting colors
        let lineClass = "py-0.5 px-3 block transition-all duration-300 ";
        if (isBiasedLine) {
          lineClass += "bg-red-500/10 border-l-2 border-red-500 text-red-300 font-bold animate-pulse";
        } else {
          lineClass += "hover:bg-slate-800/20";
        }

        return (
          <div 
            key={i} 
            className={lineClass}
            onClick={() => {
              if (isBiasedLine) setSelectedKeyExplanation(matchedKey);
            }}
            style={{ cursor: isBiasedLine ? 'pointer' : 'default' }}
            title={isBiasedLine ? "Click to view FairAudit explanation" : ""}
          >
            <span className="inline-block w-6 text-slate-650 dark:text-slate-600 font-mono text-[10px] select-none text-right mr-3">
              {i + 1}
            </span>
            <span className="font-mono text-[11px] leading-relaxed">
              {line}
            </span>
          </div>
        );
      });
    } catch {
      return <pre className="p-4 font-mono text-xs">{typedText}</pre>;
    }
  };

  return (
    <div id="live-api-demo-section" className="bg-slate-950 border border-slate-850 rounded-3xl p-6 md:p-8 text-white mt-12 shadow-2xl relative overflow-hidden">
      {/* Absolute visual tags */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-505/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-850 pb-6 mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">
            <Lock className="w-3 h-3 text-indigo-400" />
            Security Interceptor Active
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
            See How It Works Under The Hood
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">
            Toggle API mock cases below. Inspect how our pipeline hooks into JSON payloads before they are processed by LLMs or decision models.
          </p>
        </div>

        {/* Sneak past CTA Button */}
        <button
          onClick={() => startDemo(3)} // Index 3 is the sneaky one
          disabled={isTyping || auditStep === 'analyzing'}
          className="self-start md:self-center shrink-0 bg-red-500/10 hover:bg-red-500/15 border border-red-500/35 hover:border-red-500/50 rounded-xl px-4 py-2.5 text-xs font-black text-red-400 tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
          id="sneak-bias-past-btn"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-red-400" />
          <span>Try to Sneak Bias Past FairAudit</span>
        </button>
      </div>

      {/* Interactive preset selector tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {scenarios.map((scene, sceneIdx) => {
          const isActive = activeScenarioIdx === sceneIdx;
          return (
            <button
              key={scene.id}
              onClick={() => startDemo(sceneIdx)}
              disabled={isTyping || auditStep === 'analyzing'}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer text-xs ${
                isActive 
                  ? 'bg-slate-900 border-indigo-500/70 text-white shadow-lg shadow-indigo-950/20' 
                  : 'bg-slate-950/50 border-slate-850 hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider mb-1 font-black">
                <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>
                  {scene.category}
                </span>
                {isActive && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400"></span>
                  </span>
                )}
              </div>
              <p className="font-bold truncate text-[11px]">{scene.label}</p>
            </button>
          );
        })}
      </div>

      {/* Main split screens container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Raw API payload JSON typing terminal */}
        <div className="lg:col-span-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between min-h-[420px]">
          {/* Mac style terminal title-bar */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800/75 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                Raw Inbound Request Payload
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] font-bold text-slate-550">
              <span>{typingProgress < 100 ? `${Math.round(typingProgress)}%` : 'JSON'}</span>
              {isTyping && <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />}
            </div>
          </div>

          {/* Terminal content window */}
          <div className="py-4 bg-slate-900 font-mono text-slate-200 flex-1 overflow-y-auto max-h-[460px] custom-scrollbar text-xs">
            {renderFormattedJson()}
            {isTyping && (
              <span className="animate-blink inline-block w-2 h-4 bg-indigo-400 ml-4 mb-[-2px] rounded" />
            )}
          </div>

          {/* Terminal status bar */}
          <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-850 font-mono text-[10px] text-slate-500 flex items-center justify-between flex-wrap gap-2">
            <span>POST /api/v1/decide HTTP/1.1</span>
            <span>Bytes: {typedText.length}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Real-time validation auditor analysis */}
        <div className="lg:col-span-6 bg-slate-900/60 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between min-h-[420px]">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 font-sans flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              FairAudit Intercept Engine
            </h3>
            
            {/* Live Indicator Pillar */}
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-black border ${
              auditStep === 'done' 
                ? 'text-red-400 bg-red-950/20 border-red-900/20 animate-pulse' 
                : auditStep === 'analyzing'
                ? 'text-amber-400 bg-amber-950/20 border-amber-900/20'
                : 'text-indigo-400 bg-indigo-950/20 border-indigo-900/20'
            }`}>
              <span className="relative flex h-1.5 w-1.5">
                {auditStep === 'analyzing' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  auditStep === 'done' ? 'bg-red-500' : auditStep === 'analyzing' ? 'bg-amber-500' : 'bg-indigo-400'
                }`} />
              </span>
              {auditStep === 'done' ? 'INTERCEPTED & STRIPPED' : auditStep === 'analyzing' ? 'AUDITING...' : 'IDLE'}
            </span>
          </div>

          {/* Dynamic Content Panel depends on Audit Steps */}
          <div className="flex-1 flex flex-col justify-between gap-4">
            <AnimatePresence mode="wait">
              {auditStep === 'typing' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center p-8 text-center flex-1"
                >
                  <div className="w-10 h-10 border-2 border-indigo-650 border-t-indigo-400 rounded-full animate-spin mb-3" />
                  <p className="text-[11px] font-bold font-mono text-slate-400">{parsingStepName}</p>
                </motion.div>
              )}

              {auditStep === 'analyzing' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center p-8 text-center flex-1"
                >
                  <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 mb-3 animate-pulse">
                    <Shield className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-indigo-400 animate-pulse uppercase tracking-wider">
                    {parsingStepName}
                  </p>
                </motion.div>
              )}

              {auditStep === 'done' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4 flex-1 flex flex-col justify-between"
                >
                  
                  {/* Explanations section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Detected Proxy Skey Failures ({currentScenario.biasedKeys.length})
                    </h4>

                    {/* Explanatory cards loop */}
                    <div className="space-y-2.5">
                      {currentScenario.biasedKeys.map((key) => {
                        const info = currentScenario.explanations[key];
                        if (!info) return null;
                        const isSelected = selectedKeyExplanation === key;

                        return (
                          <div 
                            key={key}
                            onClick={() => setSelectedKeyExplanation(key)}
                            className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                              isSelected 
                                ? 'bg-red-500/10 border-red-500/50 shadow-md' 
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="font-mono text-[10px] text-red-400 font-extrabold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                  "{key}" → {info.concept}
                                </span>
                                
                                {isSelected && (
                                  <motion.div 
                                    className="mt-2 text-[11px] leading-relaxed space-y-1.5 border-t border-slate-800/80 pt-2"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                  >
                                    <p className="text-slate-350">
                                      <strong className="text-slate-400 font-semibold font-mono">Discriminatory Risk:</strong> {info.threat}
                                    </p>
                                    <p className="text-emerald-450 font-medium">
                                      <strong className="text-slate-450 font-semibold font-mono">Mitigation Applied:</strong> {info.response}
                                    </p>
                                  </motion.div>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 self-start">
                                {isSelected ? '▲ Collapsed' : '▼ Details'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sanitized payload display preview button */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 mt-2 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#535dff] font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Remediated Fair API Payload (Safe to Forward)
                      </span>
                    </div>
                    
                    <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-[140px] custom-scrollbar bg-slate-900/60 p-2.5 rounded border border-emerald-950/25">
                      {currentScenario.remediatedPayload}
                    </pre>
                  </div>

                </motion.div>
              )}

              {auditStep === 'idle' && (
                <motion.div className="flex flex-col items-center justify-center p-8 text-center flex-1">
                  <Play className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
                  <p className="text-[11px] text-slate-500 font-bold">Select a scenario preset above to trigger the validation audit intercept stream demo!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Social / Educational CTA */}
          <div className="border-t border-slate-800/80 pt-3 mt-4 text-[10px] font-semibold text-slate-500 leading-relaxed flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1">
              <Code className="w-3.5 h-3.5 text-indigo-400" />
              Easy Integration: Intercepts as middleware in just 4 lines of Node/Python.
            </span>
            <button
              onClick={() => startDemo(activeScenarioIdx)}
              className="text-[10px] font-mono font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer hover:underline"
            >
              Replay Current Demo
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
