import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, BrainCircuit, Loader2, ArrowLeft, ShieldCheck, 
  AlertTriangle, AlertCircle, Download, Award, Share2, Clipboard, RefreshCcw, FileText 
} from 'lucide-react';
import { Type } from '@google/genai';
import { ChecklistResult } from './Checklist';
import { generateContentWithFallback } from '../lib/gemini';
import { DbService } from '../lib/db';
import { ComplianceItem } from '../types';

export interface WhatIfScenario {
  attribute_changed: string;
  scenario_description: string;
  new_outcome: string;
  verdict: 'FAIR' | 'BIASED' | 'HIGH RISK';
  decision_changed: boolean;
}

export interface AuditResult {
  model_risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  model_risk_reason: string;
  decision_fairness: 'FAIR' | 'POTENTIALLY BIASED' | 'BIASED';
  explanation: string;
  recommendations: string[];
  flaggedAttributes?: string[];
  what_if_scenarios?: WhatIfScenario[];
}

// FEATURE 6: Comparative Audit Schema
export interface CompareAuditResult {
  attribute_changed: string;
  decision_changed: boolean;
  bias_verdict: 'CONFIRMED' | 'POSSIBLE' | 'NOT DETECTED';
  legal_risk: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  recommended_action: string;
}

interface DecisionAuditProps {
  onBack: () => void;
  checklistResult?: ChecklistResult | null;
  onAuditComplete?: (score: string | number, verdict: string, details: any) => void;
  onPrintExport?: (score: number, findings: any) => void;
}

export default function DecisionAudit({ onBack, checklistResult, onAuditComplete, onPrintExport }: DecisionAuditProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');
  
  // Single Audit State
  const [decisionType, setDecisionType] = useState('loan');
  const [modelTrainedOn, setModelTrainedOn] = useState('Historical company data');
  const [trainingDataIncludes, setTrainingDataIncludes] = useState<string[]>([]);
  const [attributesDirectInputs, setAttributesDirectInputs] = useState(false);
  const [inputData, setInputData] = useState('');
  const [decisionContext, setDecisionContext] = useState('');
  const [status, setStatus] = useState<'idle' | 'auditing' | 'done'>('idle');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- FEATURE 6: Compare Dual Inputs State ---
  const [inputDataA, setInputDataA] = useState('');
  const [decisionA, setDecisionA] = useState('');
  const [inputDataB, setInputDataB] = useState('');
  const [decisionB, setDecisionB] = useState('');
  const [compareResult, setCompareResult] = useState<CompareAuditResult | null>(null);

  // Sharing states (FEATURE 11)
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [sharing, setSharing] = useState(false);

  const toggleTrainingDataOption = (option: string) => {
    if (option === 'None of the above') {
      setTrainingDataIncludes(['None of the above']);
      return;
    }
    setTrainingDataIncludes(prev => {
      const withoutNone = prev.filter(p => p !== 'None of the above');
      if (withoutNone.includes(option)) {
        return withoutNone.filter(p => p !== option);
      } else {
        return [...withoutNone, option];
      }
    });
  };

  const handleReset = () => {
    setDecisionContext('');
    setInputData('');
    setModelTrainedOn('Historical company data');
    setTrainingDataIncludes([]);
    setAttributesDirectInputs(false);
    setStatus('idle');
    setResult(null);
    setCompareResult(null);
    setError(null);
    setShareId(null);
  };

  // Pre-fill handlers (Fulfilling: Every new feature must work with the 'Try an Example' button)
  const handleExample = () => {
    if (activeTab === 'single') {
      setDecisionType('loan');
      setModelTrainedOn('Historical company data');
      setTrainingDataIncludes(['Zip Code or Location', 'Race or Ethnicity']);
      setAttributesDirectInputs(true);
      setInputData(`Applicant: Marcus Johnson\nIncome: $65,000\nCredit Score: 710\nZip Code: 11212\nEmployment: 4 years\nDebt-to-Income: 32%\nGender: Male`);
      setDecisionContext(`The AI model rejected the loan application. The primary reason cited was "Insufficient credit history and zip code risk factors", despite the applicant being within standard approval ranges for income and credit score.`);
    } else {
      // Comparison Preloads
      setDecisionType('loan');
      setInputDataA(`Applicant: Marcus Johnson\nIncome: $65,000\nCredit Score: 710\nZip Code: 11212\nEmployment: 4 years\nGender: Male`);
      setDecisionA(`Decision: Rejected. Reason: Elevated demographic credit risk profiles.`);
      
      setInputDataB(`Applicant: Maria Johnson\nIncome: $65,000\nCredit Score: 710\nZip Code: 11212\nEmployment: 4 years\nGender: Female`);
      setDecisionB(`Decision: Approved. Reason: Income matches stability brackets.`);
    }
  };

  const handleAudit = async () => {
    if (activeTab === 'single') {
      if (!decisionContext || !inputData) return;
      setStatus('auditing');
      setError(null);
      setResult(null);
      setShareId(null);

      try {
        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            model_risk_level: {
              type: Type.STRING,
              enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
              description: "The risk level, HIGH / MEDIUM / LOW / UNKNOWN."
            },
            model_risk_reason: {
              type: Type.STRING,
              description: "Explanation for the model risk level (e.g. Protected attributes used as direct inputs)."
            },
            decision_fairness: {
              type: Type.STRING,
              enum: ['FAIR', 'POTENTIALLY BIASED', 'BIASED'],
              description: "The fairness verdict for the decision."
            },
            explanation: {
              type: Type.STRING,
              description: "One paragraph plain English explanation for non-technical users. No jargon. Write like explaining to a 16 year old."
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of recommendations for the user."
            },
            flaggedAttributes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of protected attributes found to be direct inputs or otherwise flagged in the input data."
            },
            what_if_scenarios: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  attribute_changed: { type: Type.STRING },
                  scenario_description: { type: Type.STRING },
                  new_outcome: { type: Type.STRING },
                  verdict: { type: Type.STRING, enum: ['FAIR', 'BIASED', 'HIGH RISK'] },
                  decision_changed: { type: Type.BOOLEAN }
                },
                required: ["attribute_changed", "scenario_description", "new_outcome", "verdict", "decision_changed"]
              },
              description: "Exactly 3 automatically generated what-if scenarios: 1) Same application but Gender changed, 2) Zip Code removed, 3) Age changed to 28."
            }
          },
          required: ["model_risk_level", "model_risk_reason", "decision_fairness", "explanation", "recommendations", "flaggedAttributes", "what_if_scenarios"]
        };

        const prompt = `You are an AI fairness auditor. Review this AI system's decision context and the specific input data used. Determine if protected attributes (like race, gender, age, religion, zip code proxy) likely influenced the decision unfairly.

The domain for this decision is: ${decisionType.toUpperCase()}

Model Background:
- Trained on: ${modelTrainedOn}
- Training data included protected attributes: ${trainingDataIncludes.length > 0 ? trainingDataIncludes.join(', ') : 'Not specified'}
- Protected attributes used as direct inputs: ${attributesDirectInputs ? 'Yes' : 'No'}

Input Data Provided to the AI:
${inputData}

AI System Decision & Reason:
${decisionContext}

Audit this decision and provide a plain-English explanation that a 16-year-old can easily understand. Avoid technical jargon.`;

        const response = await generateContentWithFallback({
          contents: [
            { role: 'user', parts: [{ text: prompt }] }
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.1
          }
        });

        if (!response.text) {
          throw new Error("No response generated from the model.");
        }

        const parsedData = JSON.parse(response.text.trim()) as AuditResult;
        setResult(parsedData);
        setStatus('done');
        onAuditComplete?.(
          parsedData.model_risk_level === 'HIGH' ? 85 : 20, 
          parsedData.decision_fairness, 
          parsedData
        );
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "An error occurred during the audit.");
        setStatus('idle');
      }
    } else {
      // --- FEATURE 6: RUN SIDE BY SIDE COMPARISON ---
      if (!inputDataA || !decisionA || !inputDataB || !decisionB) return;
      setStatus('auditing');
      setError(null);
      setCompareResult(null);
      setShareId(null);

      try {
        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            attribute_changed: { type: Type.STRING },
            decision_changed: { type: Type.BOOLEAN },
            bias_verdict: { type: Type.STRING, enum: ['CONFIRMED', 'POSSIBLE', 'NOT DETECTED'] },
            legal_risk: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
            explanation: { type: Type.STRING },
            recommended_action: { type: Type.STRING }
          },
          required: ["attribute_changed", "decision_changed", "bias_verdict", "legal_risk", "explanation", "recommended_action"]
        };

        const prompt = `You are a comparative AI examiner. Audit these two side-by-side decisions for disparity checking.
          LHS Applicant Profile:
          ${inputDataA}
          LHS AI Decision Output:
          ${decisionA}

          RHS Applicant Profile:
          ${inputDataB}
          RHS AI Decision Output:
          ${decisionB}

          Compare both cases. Identify which specific attribute changed, if the decision flipped, assess the bias verdict and risks.`;

        const response = await generateContentWithFallback({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.1
          }
        });

        const parsedData = JSON.parse(response.text.trim()) as CompareAuditResult;
        setCompareResult(parsedData);
        setStatus('done');
        onAuditComplete?.(
          parsedData.bias_verdict === 'CONFIRMED' ? 95 : parsedData.bias_verdict === 'POSSIBLE' ? 55 : 15,
          parsedData.bias_verdict,
          parsedData
        );
      } catch (err: any) {
        console.error(err);
        setError("Failed to resolve decisions comparative metrics. Double-check raw formats.");
        setStatus('idle');
      }
    }
  };

  // FEATURE 11: Shareable URL reports
  const handleShareReport = async () => {
    let score = result ? (result.model_risk_level === 'HIGH' ? 85 : 20) : (compareResult?.bias_verdict === 'CONFIRMED' ? 95 : 15);
    const textData = result ? result.explanation : compareResult?.explanation;
    setSharing(true);
    try {
      const findings = {
        explanation: textData,
        flagged_columns: result?.flaggedAttributes || [compareResult?.attribute_changed || 'Attribute Proxy'],
        recommendations: result?.recommendations || [compareResult?.recommended_action || 'Review inputs']
      };
      const id = await DbService.saveSharedReport('Decision Auditor', score, findings);
      setShareId(id);
      const url = DbService.buildShareLink(id, 'Decision Auditor', score, findings);
      setShareUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setSharing(false);
    }
  };

  // FEATURE 12: Compliance checks data mapping
  const regulatoryChecks = React.useMemo<ComplianceItem[]>(() => {
    const list: ComplianceItem[] = [
      {
        name: 'EU AI Act (2024)',
        regulationName: 'High-risk Automated profiling compliance.',
        status: attributesDirectInputs ? 'NON-COMPLIANT' : 'COMPLIANT',
        ruleDescription: 'Strictly penalizes deploying automated pipelines that utilize raw gender/location attributes as direct weight factors.',
        actionRequired: attributesDirectInputs 
          ? 'Remediate model weights. Prune direct classification inputs (NON-COMPLIANT).' 
          : 'High standards met. No raw weight bias detected.'
      }
    ];

    if (result) {
      const containsGender = result.flaggedAttributes?.some(f => f.toLowerCase().includes('gender') || f.toLowerCase().includes('sex'));
      const containsZip = result.flaggedAttributes?.some(f => f.toLowerCase().includes('zip') || f.toLowerCase().includes('location'));
      
      list.push({
        name: 'US EEOC 4/5ths Rule',
        regulationName: 'Adverse Impact threshold audits.',
        status: containsGender || containsZip ? 'NON-COMPLIANT' : 'COMPLIANT',
        ruleDescription: 'Restricts decisions showing historic gender or localized zip code bias patterns.',
        actionRequired: containsGender || containsZip
          ? 'Establish alternative features to evaluate candidates and remove systemic proxies.'
          : 'Disparate variables minimized.'
      });
    }

    if (compareResult) {
      const confirmed = compareResult.bias_verdict === 'CONFIRMED';
      list.push({
        name: 'RBI Fair Lending Guidelines',
        regulationName: 'Equality in Credit and loan evaluations.',
        status: confirmed ? 'NON-COMPLIANT' : 'COMPLIANT',
        ruleDescription: 'Lending decisions must prove complete gender neutrality under direct profile updates.',
        actionRequired: confirmed 
          ? 'Decision flipped on attribute changes. Modify decision classifiers immediately.'
          : 'Complete decision stability logged.'
      });
    }

    return list;
  }, [attributesDirectInputs, result, compareResult]);

  return (
    <div className="flex flex-col h-full print:bg-white print:h-auto px-4 md:px-0">
      <header className="mb-6 max-w-7xl mx-auto w-full flex items-center gap-4 print:hidden">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">AI Decision Audit</h1>
            <p className="text-sm font-medium text-slate-500">Trace if specific individual decisions are biased or inequitable</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0 print:block">
        
        {/* Left Panel: Inputs */}
        <div className="space-y-6 flex flex-col h-full print:hidden">
          
          <div className="flex items-center justify-between">
            {/* FEATURE 6: Tab Switches */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setActiveTab('single'); handleReset(); }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'single' ? 'bg-white text-slate-905 shadow-sm' : 'text-slate-500'}`}
              >
                Single Decision Audit
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('compare'); handleReset(); }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'compare' ? 'bg-white text-slate-905 shadow-sm' : 'text-slate-500'}`}
              >
                Side-by-Side Comparison (Feature 6)
              </button>
            </div>

            <button 
              onClick={handleExample}
              className="text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1 cursor-pointer"
            >
              Try an Example →
            </button>
          </div>

          {activeTab === 'single' ? (
            <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col gap-6 flex-shrink-0">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  01 / Decision Type
                </h2>
                <select 
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-xs font-bold transition-shadow outline-none"
                >
                  <option value="loan">Loans / Financial Credit approval</option>
                  <option value="job">Recruitment / Hiring metrics</option>
                  <option value="medical">Medical diagnostics / Patient profiling</option>
                  <option value="other">General system triggers</option>
                </select>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  02 / Model Background Context
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Training Data source</label>
                    <select
                      value={modelTrainedOn}
                      onChange={(e) => setModelTrainedOn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold transition-colors text-slate-750"
                    >
                      <option value="Historical company data">Historical company records</option>
                      <option value="Public dataset">Anonymized public dataset</option>
                      <option value="Unknown">Unknown background parameters</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attributes included in training data</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {['Gender', 'Age', 'Race or Ethnicity', 'Zip Code or Location', 'None of the above'].map(option => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trainingDataIncludes.includes(option)}
                            onChange={() => toggleTrainingDataOption(option)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="text-xs text-slate-650 font-bold">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer mt-3 border-t border-slate-50 pt-3">
                    <input
                      type="checkbox"
                      checked={attributesDirectInputs}
                      onChange={(e) => setAttributesDirectInputs(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 mt-0.5"
                    />
                    <span className="text-xs font-semibold text-slate-650 leading-tight">These protective attributes act as direct weighting inputs.</span>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {/* Dual Inputs for Compare Mode (FEATURE 6) */}
          {activeTab === 'compare' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Decision LHS */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase text-[#6366f1] tracking-wider">Candidate Profile A</span>
                <textarea
                  value={inputDataA}
                  onChange={(e) => setInputDataA(e.target.value)}
                  placeholder="Applicant A: Marcus\nGender: Male\nCredit: 710"
                  className="w-full h-32 bg-slate-50 rounded-xl p-3 text-xs outline-none border-none font-mono"
                />
                <span className="text-[10px] font-black uppercase text-slate-400">AI Outcome A</span>
                <textarea
                  value={decisionA}
                  onChange={(e) => setDecisionA(e.target.value)}
                  placeholder="Outcome A: Rejected."
                  className="w-full h-24 bg-slate-50 rounded-xl p-3 text-xs outline-none border-none font-mono"
                />
              </div>

              {/* Decision RHS */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase text-pink-500 tracking-wider">Candidate Profile B</span>
                <textarea
                  value={inputDataB}
                  onChange={(e) => setInputDataB(e.target.value)}
                  placeholder="Applicant B: Maria\nGender: Female\nCredit: 710"
                  className="w-full h-32 bg-slate-50 rounded-xl p-3 text-xs outline-none border-none font-mono"
                />
                <span className="text-[10px] font-black uppercase text-slate-400">AI Outcome B</span>
                <textarea
                  value={decisionB}
                  onChange={(e) => setDecisionB(e.target.value)}
                  placeholder="Outcome B: Approved."
                  className="w-full h-24 bg-slate-50 rounded-xl p-3 text-xs outline-none border-none font-mono"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Single Mode Inputs */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex-1 flex flex-col min-h-[150px]">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-3 mb-3 flex items-center gap-2 flex-shrink-0">
                  <Activity className="w-4 h-4" /> 03 / Input Profile Parameters
                </h2>
                <textarea 
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  placeholder="Age: 38, Gender: Female, Credit Score: 710, Income: 65000..."
                  className="w-full flex-1 bg-slate-50 border-none rounded-xl p-4 text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-200 outline-none resize-none font-mono leading-relaxed"
                />
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex-1 flex flex-col min-h-[150px]">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-3 mb-3 flex items-center gap-2 flex-shrink-0">
                  <BrainCircuit className="w-4 h-4" /> 04 / Decision Context
                </h2>
                <textarea 
                  value={decisionContext}
                  onChange={(e) => setDecisionContext(e.target.value)}
                  placeholder="AI Decision: Reject. Reason: insufficient scoring margins based on zip code proxies..."
                  className="w-full flex-1 bg-slate-50 border-none rounded-xl p-4 text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-200 outline-none resize-none font-mono leading-relaxed"
                />
              </div>
            </>
          )}

          <button 
            onClick={handleAudit} 
            disabled={status === 'auditing'}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-slate-900/5 flex-shrink-0"
          >
            {status === 'auditing' ? (
              <><Loader2 className="animate-spin w-5 h-5" /> Analyzing decision vectors...</>
            ) : (
              <><BrainCircuit className="w-5 h-5" /> Run Audit check</>
            )}
          </button>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 border border-red-100 rounded-xl text-xs font-bold leading-relaxed">
              {error}
            </div>
          )}
        </div>

        {/* Right Panel: Output */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col relative overflow-hidden h-[800px] lg:h-auto print:border-none print:shadow-none print:p-0 print:h-auto">
          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/20 z-10 p-8 text-center text-slate-405 m-3 rounded-2xl border border-slate-50">
              <Activity className="w-12 h-12 text-slate-300 mb-4" />
              <p className="font-bold text-slate-705">Provide decision settings to trace bias.</p>
              <p className="text-xs text-slate-400 mt-2">The auditor compares weight distributions and flags prohibited proxy factors.</p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex-1 flex flex-col overflow-y-auto pr-1">
              
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Decision Audit Findings</h3>
                  <p className="text-xs text-slate-400 font-semibold">Algorithmic fairness stability evaluations.</p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={handleShareReport}
                    disabled={sharing}
                    className="p-2 sm:px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-[10px] sm:text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>

                  <button
                    onClick={() => {
                      if (onPrintExport && result) {
                        const calculatedScore = result.model_risk_level === 'HIGH' ? 85 : result.model_risk_level === 'MEDIUM' ? 45 : 15;
                        onPrintExport(
                          calculatedScore,
                          {
                            explanation: result.explanation,
                            flagged_columns: result.flaggedAttributes || [],
                            recommendations: result.recommendations
                          }
                        );
                      } else {
                        window.print();
                      }
                    }}
                    className="p-2 sm:px-3 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 font-bold text-[10px] sm:text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" /> Export PDF
                  </button>
                </div>
              </div>

              {shareId && (
                <div className="bg-green-50 text-green-800 border border-green-100 rounded-xl p-3 mb-4 flex flex-col gap-2">
                  <div className="text-[10px] font-black">Shareable URL report card generated (portable format):</div>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-green-100">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl || `${window.location.origin}?report=${shareId}`}
                      className="flex-1 text-[10px] font-mono border-none outline-none bg-transparent"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl || `${window.location.origin}?report=${shareId}`);
                        alert('Report Link Copied!');
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                    >
                      <Clipboard className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Render Comparative Metrics Summary (FEATURE 6) */}
              {activeTab === 'compare' && compareResult && (
                <div className="space-y-6">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-450">Flipped?</span>
                      <div className="text-sm font-extrabold text-slate-800 mt-1">
                        {compareResult.decision_changed ? 'YES 🔄' : 'NO'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-455">Verdict</span>
                      <div className="text-xs font-black text-red-650 mt-1">{compareResult.bias_verdict}</div>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-455">Risk Level</span>
                      <div className="text-xs font-black text-red-650 mt-1">{compareResult.legal_risk}</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Changed Attribute Proxy</span>
                    <span className="block mt-1 font-bold text-indigo-700 text-sm">{compareResult.attribute_changed}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Comparative Explanation</span>
                    <p className="text-xs leading-relaxed text-slate-600 mt-1.5 font-medium">{compareResult.explanation}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="text-[9px] uppercase font-black text-slate-400">Recommended Remediations</span>
                    <p className="text-xs text-slate-700 font-semibold leading-relaxed mt-1">{compareResult.recommended_action}</p>
                  </div>
                </div>
              )}

              {/* Render Single Audit Output */}
              {activeTab === 'single' && result && (
                <div className="space-y-6">
                  
                  {/* Verdict Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Model Risk Level</span>
                      <span className={`text-md font-bold block mt-1 ${result.model_risk_level === 'HIGH' ? 'text-red-600' : 'text-green-600'}`}>
                        {result.model_risk_level}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Fairness Verdict</span>
                      <span className="text-md font-bold block mt-1 text-slate-850">
                        {result.decision_fairness}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Plain-English Analysis</span>
                    <p className="text-xs leading-relaxed text-slate-600 font-semibold mt-1 bg-slate-50 border border-slate-50 p-4 rounded-xl">{result.explanation}</p>
                  </div>

                  {result.flaggedAttributes && result.flaggedAttributes.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Identified Proxies</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {result.flaggedAttributes.map((attr, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-50 text-red-705 border border-red-100 text-[10px] font-bold rounded-lg">{attr}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Recommendations</span>
                    <ul className="space-y-2 mt-2">
                      {result.recommendations.map((rec, idx) => (
                        <li key={idx} className="bg-slate-50 border border-slate-50 rounded-xl p-3 flex gap-2 text-xs font-semibold text-slate-650">
                          <ChecklistResultIcon /> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What-If Scenarios */}
                  {result.what_if_scenarios && result.what_if_scenarios.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <span className="text-[10px] font-black uppercase text-indigo-500 block mb-3">Counterfactual simulations</span>
                      <div className="space-y-2">
                        {result.what_if_scenarios.map((sc, idx) => (
                          <div key={idx} className="bg-[#fbfcff] border border-indigo-50 rounded-xl p-3.5 flex flex-col gap-1 text-xs">
                            <span className="font-extrabold text-indigo-700">Scenario {idx+1}: {sc.attribute_changed}</span>
                            <span className="text-slate-500 text-[10px] font-bold leading-normal">{sc.scenario_description}</span>
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 mt-1 border-t border-slate-50 pt-1.5">
                              <span>Future Outcome: <strong>{sc.new_outcome}</strong></span>
                              <span>•</span>
                              <span>Flipped: <strong className="text-indigo-600">{sc.decision_changed ? 'Yes' : 'No'}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* FEATURE 12: Compliance checks */}
              <div className="border-t border-slate-100 pt-6 mt-6">
                <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-3">Regulatory Compliance validations</span>
                <div className="space-y-3">
                  {regulatoryChecks.map((item, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-1">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-black text-slate-800">{item.name}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                          item.status === 'COMPLIANT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-00'
                        }`}>{item.status}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500">{item.regulationName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed border-t border-slate-50 pt-1.5 mt-1.5">
                        <strong>Required Action:</strong> {item.actionRequired}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

function ChecklistResultIcon() {
  return (
    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">✓</span>
  );
}
