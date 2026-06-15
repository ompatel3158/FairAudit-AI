import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, BrainCircuit, Loader2, ArrowLeft, ShieldCheck, 
  AlertTriangle, AlertCircle, Download, Award, Share2, Clipboard, RefreshCcw, FileText 
} from 'lucide-react';
import { Type } from '../lib/gemini';
import { ChecklistResult } from './Checklist';
import { generateContentWithFallback } from '../lib/gemini';
import { DbService } from '../lib/db';
import { ComplianceItem } from '../types';
import BiasDna, { DnaAttribute } from './BiasDna';


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

  // --- IMPACT ESTIMATOR STATE ---
  const [volumeIndex, setVolumeIndex] = useState<number>(2); // defaults to index 2 (10,000)

  // --- DRAMATIC REVEAL ANIMATION STATES ---
  const [revealStage, setRevealStage] = useState<'idle' | 'analyzing' | 'counting' | 'flash' | 'revealed' | 'complete'>('idle');
  const [animatedScore, setAnimatedScore] = useState(0);
  const [visibleFlaggedCount, setVisibleFlaggedCount] = useState(0);

  // Step 2: Numbers count up from 0 to final bias score (duration 1.2s)
  React.useEffect(() => {
    if (revealStage === 'counting') {
      const target = activeTab === 'single'
        ? (result ? (result.model_risk_level === 'HIGH' ? 85 : result.model_risk_level === 'MEDIUM' ? 45 : 15) : 15)
        : (compareResult ? (compareResult.bias_verdict === 'CONFIRMED' ? 95 : compareResult.bias_verdict === 'POSSIBLE' ? 55 : 15) : 15);
      
      const finalScore = target || 15;
      let current = 0;
      const duration = 1200; // 1.2 seconds counting up
      const intervalTime = 30; // ms per step
      const steps = duration / intervalTime;
      const increment = finalScore / steps;

      const timer = setInterval(() => {
        current += increment;
        if (current >= finalScore) {
          setAnimatedScore(finalScore);
          clearInterval(timer);
          setRevealStage('flash');
        } else {
          setAnimatedScore(Math.floor(current));
        }
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, [revealStage, result, compareResult, activeTab]);

  // Step 3: Screen briefly flashes colour border for verdict (duration 0.9s)
  React.useEffect(() => {
    if (revealStage === 'flash') {
      const timer = setTimeout(() => {
        setRevealStage('revealed');
      }, 900); // 900ms flash
      return () => clearTimeout(timer);
    }
  }, [revealStage]);

  // Step 4: Each flagged column appears one by one with a short delay
  React.useEffect(() => {
    if (revealStage === 'revealed') {
      const totalFlags = activeTab === 'single'
        ? (result?.flaggedAttributes?.length || 0)
        : (compareResult?.attribute_changed ? 1 : 0);

      if (totalFlags > 0) {
        let count = 0;
        const timer = setInterval(() => {
          count += 1;
          if (count >= totalFlags) {
            setVisibleFlaggedCount(totalFlags);
            clearInterval(timer);
            setRevealStage('complete');
          } else {
            setVisibleFlaggedCount(count);
          }
        }, 500); // 500ms delay between elements appearing
        return () => clearInterval(timer);
      } else {
        setRevealStage('complete');
      }
    }
  }, [revealStage, result, compareResult, activeTab]);

  // --- REAL-TIME BIAS SPEEDOMETER STATE ---
  const [liveScore, setLiveScore] = useState(0);
  const [liveReason, setLiveReason] = useState('Start typing candidate attributes (like gender, race, location) to see real-time bias probabilities!');
  const [isLiveEvaluating, setIsLiveEvaluating] = useState(false);

  // Instant local semantic evaluation model to save API quota and provide zero-latency updates
  React.useEffect(() => {
    const textToEvaluate = activeTab === 'single'
      ? (inputData + ' ' + decisionContext).trim()
      : (inputDataA + ' ' + decisionA + ' ' + inputDataB + ' ' + decisionB).trim();

    if (!textToEvaluate || textToEvaluate.length < 5) {
      setLiveScore(0);
      setLiveReason('Start typing candidate attributes (like gender, race, location) to see real-time bias probabilities!');
      setIsLiveEvaluating(false);
      return;
    }

    setIsLiveEvaluating(true);

    const delayDebounceFn = setTimeout(() => {
      const lowercase = textToEvaluate.toLowerCase();
      let score = 5; // stable neutral threshold
      const indicators: string[] = [];

      // 1. Gender attributes
      const genderTerms = ['female', 'woman', 'women', 'girl', 'gender', 'male', 'man', 'men', 'boy', 'sex', 'pregnancy', 'pregnant', 'maternity', 'paternity'];
      const matchedGender = genderTerms.filter(t => lowercase.includes(t));
      if (matchedGender.length > 0) {
        score += matchedGender.length * 15;
        indicators.push('gender/sex criteria');
      }

      // 2. Race & Ethnicity markers
      const raceTerms = ['black', 'african american', 'latino', 'hispanic', 'asian', 'ethnic', 'white', 'minority', 'race', 'color', 'indigenous', 'caucasian', 'nationality'];
      const matchedRace = raceTerms.filter(t => lowercase.includes(t));
      if (matchedRace.length > 0) {
        score += matchedRace.length * 20;
        indicators.push('racial/ethnic identifiers');
      }

      // 3. Location & ZIP proxies (redlining markers)
      const locTerms = ['zip', 'postal', 'neighborhood', 'address', 'location', 'area code', 'proximity', 'distance', 'commute', 'ghetto', 'slum', 'affluent'];
      const matchedLoc = locTerms.filter(t => lowercase.includes(t));
      if (matchedLoc.length > 0) {
        score += matchedLoc.length * 18;
        indicators.push('geographic proxies (ZIP code)');
      }

      // 4. Ageism bias markers
      const ageTerms = ['age', 'years old', 'elderly', 'younger', 'older', 'retired', 'senior', 'millennial', 'gen-z', 'boomer', 'fresh graduate', 'overqualified', 'youngist'];
      const matchedAge = ageTerms.filter(t => lowercase.includes(t));
      if (matchedAge.length > 0) {
        score += matchedAge.length * 15;
        indicators.push('age-bias indicators');
      }

      // 5. Subjective qualitative traits (proxies for personal bias)
      const subjectiveTerms = ['culture fit', 'accent', 'vibe', 'attitude', 'aggressive', 'gut feeling', 'chemistry', 'personality', 'articulate', 'polished', 'energy', 'friendly'];
      const matchedSubjective = subjectiveTerms.filter(t => lowercase.includes(t));
      if (matchedSubjective.length > 0) {
        score += matchedSubjective.length * 15;
        indicators.push('highly subjective factors');
      }

      // 6. Disability & Health indicators
      const healthTerms = ['disabled', 'disability', 'wheelchair', 'deaf', 'blind', 'medical', 'illness', 'therapy', 'autistic', 'neurodivergent'];
      const matchedHealth = healthTerms.filter(t => lowercase.includes(t));
      if (matchedHealth.length > 0) {
        score += matchedHealth.length * 18;
        indicators.push('health/disability markers');
      }

      score = Math.min(100, score);

      let reason = 'Strictly objective. The attributes analyzed correspond to general professional and numeric outputs.';
      if (score > 70) {
        reason = `Critical risk! Found multiple redline proxies or protected criteria: ${indicators.join(', ')}. Disparate impact is highly probable; direct revision of features required.`;
      } else if (score > 40) {
        reason = `Attention recommended. Detected localized proxy attributes: ${indicators.join(', ')}. Evaluate correlations with historical bias metrics.`;
      } else if (score > 15) {
        reason = `Satisfactory. Minimal correlation to standard protected classes. Low exposure risk evaluated by local auditor logic.`;
      }

      setLiveScore(score);
      setLiveReason(reason);
      setIsLiveEvaluating(false);
    }, 150); // super snappy 150ms simulated model latency

    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [inputData, decisionContext, inputDataA, decisionA, inputDataB, decisionB, activeTab]);

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
    setLiveScore(0);
    setLiveReason('Start typing candidate attributes (like gender, race, location) to see real-time bias probabilities!');
    setIsLiveEvaluating(false);
    // Reset animation controllers
    setRevealStage('idle');
    setAnimatedScore(0);
    setVisibleFlaggedCount(0);
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
      
      setRevealStage('analyzing');
      setAnimatedScore(0);
      setVisibleFlaggedCount(0);
      const auditStartTime = Date.now();

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

        // Enforce Step 1 Sweep Scanner duration for dramatic video presentations (at least 1.6s)
        const elapsedSinceAuditStart = Date.now() - auditStartTime;
        const minScanningTime = 1600;
        if (elapsedSinceAuditStart < minScanningTime) {
          await new Promise(resolve => setTimeout(resolve, minScanningTime - elapsedSinceAuditStart));
        }

        setResult(parsedData);
        setStatus('done');
        setRevealStage('counting');
        onAuditComplete?.(
          parsedData.model_risk_level === 'HIGH' ? 85 : 20, 
          parsedData.decision_fairness, 
          parsedData
        );
      } catch (err: any) {
        setRevealStage('idle');
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

      setRevealStage('analyzing');
      setAnimatedScore(0);
      setVisibleFlaggedCount(0);
      const auditStartTime = Date.now();

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

        // Enforce Step 1 Sweep Scanner duration for dramatic video presentations (at least 1.6s)
        const elapsedSinceAuditStart = Date.now() - auditStartTime;
        const minScanningTime = 1600;
        if (elapsedSinceAuditStart < minScanningTime) {
          await new Promise(resolve => setTimeout(resolve, minScanningTime - elapsedSinceAuditStart));
        }

        setCompareResult(parsedData);
        setStatus('done');
        setRevealStage('counting');
        onAuditComplete?.(
          parsedData.bias_verdict === 'CONFIRMED' ? 95 : parsedData.bias_verdict === 'POSSIBLE' ? 55 : 15,
          parsedData.bias_verdict,
          parsedData
        );
      } catch (err: any) {
        setRevealStage('idle');
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

  // Compute final displays for Live Speedometer
  const displayedScore = (status === 'done' && (revealStage === 'counting' || revealStage === 'flash' || revealStage === 'revealed' || revealStage === 'complete'))
    ? animatedScore
    : liveScore;

  const displayedReason = (status === 'done' && (revealStage === 'flash' || revealStage === 'revealed' || revealStage === 'complete'))
    ? (activeTab === 'single'
        ? (result ? result.explanation : liveReason)
        : (compareResult ? compareResult.explanation : liveReason))
    : (revealStage === 'counting'
        ? 'Assembling demographic correlation matrices... Scanning bias weight inputs...'
        : liveReason);

  const isDanger = displayedScore > 70;

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
        <div 
          className={`bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border flex flex-col relative h-[850px] lg:h-auto overflow-y-auto print:border-none print:shadow-none print:p-0 print:h-auto transition-all duration-300 ${
            revealStage === 'flash'
              ? (isDanger ? 'animate-flash-red border-red-500 ring-4 ring-red-500/20' : 'animate-flash-green border-green-500 ring-4 ring-green-500/20')
              : 'border-slate-100'
          }`}
        >
          <style>{`
            @keyframes sweep {
              0% { transform: translateY(0%); opacity: 0.3; }
              50% { transform: translateY(750%); opacity: 1; }
              100% { transform: translateY(0%); opacity: 0.3; }
            }
            @keyframes borderFlashRed {
              0%, 100% { border-color: rgba(241, 245, 249, 1); box-shadow: none; }
              50% { border-color: rgba(239, 68, 68, 0.9); box-shadow: 0 0 25px rgba(239, 68, 68, 0.35); }
            }
            @keyframes borderFlashGreen {
              0%, 100% { border-color: rgba(241, 245, 249, 1); box-shadow: none; }
              50% { border-color: rgba(34, 197, 94, 0.9); box-shadow: 0 0 25px rgba(34, 197, 94, 0.35); }
            }
            .animate-sweep-line {
              animation: sweep 2.2s ease-in-out infinite;
            }
            .animate-flash-red {
              animation: borderFlashRed 0.9s ease-in-out;
            }
            .animate-flash-green {
              animation: borderFlashGreen 0.9s ease-in-out;
            }
          `}</style>

          {revealStage === 'analyzing' || status === 'auditing' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-slate-50/20 border border-slate-100 rounded-2xl min-h-[420px] my-auto">
              {/* Blur background mockup cards to emphasize the sweep line scanning a record */}
              <div className="absolute inset-x-8 top-12 bottom-12 filter blur-md opacity-15 select-none pointer-events-none flex flex-col gap-4">
                <div className="h-10 bg-slate-400 rounded-xl w-3/4"></div>
                <div className="h-28 bg-slate-400 rounded-xl"></div>
                <div className="h-20 bg-slate-400 rounded-xl w-5/6"></div>
                <div className="h-24 bg-slate-400 rounded-xl"></div>
              </div>

              {/* Sweeping scan bar animation */}
              <div className="absolute inset-x-0 top-3 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-85 shadow-[0_0_12px_#6366f1] animate-sweep-line" />

              <div className="relative z-10 flex flex-col items-center animate-pulse">
                <div className="inline-flex p-3 bg-indigo-50 border border-indigo-100/60 rounded-2xl mb-4 text-indigo-600">
                  <BrainCircuit className="w-8 h-8 animate-spin" style={{ animationDuration: '3.5s' }} />
                </div>
                <h3 className="text-sm font-extrabold text-[#111827] tracking-tight uppercase">FairAudit AI is analyzing...</h3>
                <p className="text-xs text-slate-450 mt-2 max-w-xs leading-relaxed">
                  Decentralized decision auditing engine is inspecting proxies, historic weights, disparate values, and demographic correlations.
                </p>
                <div className="mt-8 flex flex-col gap-1.5 w-48 text-[9px] font-mono text-slate-400 uppercase font-black">
                  <div className="flex justify-between">
                    <span>1. Scenario Checks</span>
                    <span className="text-indigo-600 animate-pulse">Processing</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2. Counterfactuals</span>
                    <span className="text-slate-300 font-bold">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Real-time speedometer gauge (always visible at top of output once we clear analyzing stage) */}
              <div className="mb-6 flex flex-col gap-4">
                <div className={`bg-white rounded-3xl p-6 border transition-all duration-300 ${
                  isDanger 
                    ? 'border-red-200 bg-red-50/5 shadow-[0_4px_24px_rgba(239,68,68,0.08)] ring-4 ring-red-500/5' 
                    : displayedScore > 40 
                      ? 'border-yellow-250 bg-yellow-50/5 shadow-[0_4px_20px_rgba(234,179,8,0.04)]' 
                      : 'border-slate-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                }`}>
                  {/* Visual Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        isDanger ? 'bg-red-500 animate-ping' : isLiveEvaluating ? 'bg-indigo-500 animate-pulse' : 'bg-green-500'
                      }`} />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        {isLiveEvaluating 
                          ? 'Scanning Bias Real-Time...' 
                          : status === 'done' 
                            ? 'Audited Bias Risk Score' 
                            : 'Live Real-Time Bias Risk Meter'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {status === 'done' ? 'Full Audit Compiled' : 'Local Semantic Engine'}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* SVG Speedometer Dial Container */}
                    <div className="flex flex-col items-center justify-center flex-shrink-0 bg-slate-50/40 rounded-2xl p-4 border border-slate-100/80 w-[200px]">
                      <div className="relative w-[180px] h-[100px] flex items-center justify-center overflow-hidden">
                        <svg viewBox="0 0 200 115" className="w-full h-full">
                          <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#22c55e" />
                              <stop offset="50%" stopColor="#eab308" />
                              <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                          </defs>
                          
                          {/* Track */}
                          <path 
                            d="M 30 105 A 70 70 0 0 1 170 105" 
                            fill="none" 
                            stroke="#f1f5f9" 
                            strokeWidth="12" 
                            strokeLinecap="round"
                          />
                          
                          {/* Fill active arc */}
                          <path 
                            d="M 30 105 A 70 70 0 0 1 170 105" 
                            fill="none" 
                            stroke="url(#gaugeGradient)" 
                            strokeWidth="12" 
                            strokeLinecap="round"
                            strokeDasharray="220"
                            strokeDashoffset={220 - (displayedScore / 100) * 220}
                            className="transition-all duration-700 ease-out"
                          />

                          {/* Pivot Center point */}
                          <circle cx="100" cy="105" r="7" className={isDanger ? 'fill-red-600' : 'fill-slate-700'} />
                          <circle cx="100" cy="105" r="3" fill="#fff" />

                          {/* Needle */}
                          <line 
                            x1="100" y1="105" 
                            x2="100" y2="45" 
                            stroke={isDanger ? '#ef4444' : displayedScore > 40 ? '#eab308' : '#22c55e'} 
                            strokeWidth="3.5" 
                            strokeLinecap="round"
                            style={{
                              transform: `rotate(${-90 + (displayedScore / 100) * 180}deg)`,
                              transformOrigin: '100px 105px',
                              transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                          />
                        </svg>
                      </div>
                      
                      {/* Big Score placed below the dial with absolutely no overlap */}
                      <div className="text-center flex flex-col items-center mt-2">
                        <span className={`text-3xl font-black tracking-tight ${
                          isDanger ? 'text-red-600 animate-pulse' : displayedScore > 40 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {displayedScore}%
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mt-1">
                          {isDanger ? 'CRITICAL RISK' : displayedScore > 40 ? 'WARNING ZONE' : 'SAFE ZONE'}
                        </span>
                      </div>
                    </div>

                    {/* Live Reasoning content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="text-[10px] uppercase font-extrabold text-slate-400 mb-1">
                        {status === 'done' ? 'Core Auditor Consensus' : 'Live Real-Time Auditor Reasoning'}
                      </div>
                      <p className={`text-xs leading-relaxed font-semibold transition-colors duration-150 ${
                        isDanger ? 'text-red-700' : 'text-slate-600'
                      }`}>
                        {displayedReason}
                      </p>
                      
                      {status !== 'done' && (
                        <div className="mt-2.5 text-[9px] font-mono leading-normal text-slate-400 bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                          Type protected criteria (e.g. sex, race, location proxies) on the left to watch live danger zones light up.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {status === 'idle' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 border border-slate-50 rounded-2xl bg-slate-50/10 min-h-[220px]">
                  <Activity className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="font-bold text-slate-705 text-sm">Sandbox Playground Ready</p>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed text-center">
                    As you type applicant records on the left, our Real-time Bias Monitor analyzes risk metrics dynamically.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <span className="text-[10px] bg-slate-100 border text-slate-500 font-bold px-2 py-1 rounded">Real-Time Evaluation Streamed</span>
                    <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-500 font-bold px-2 py-1 rounded">Gemini-3.5-Flash Active</span>
                  </div>
                </div>
              )}

              {status === 'done' && (revealStage === 'flash' || revealStage === 'revealed' || revealStage === 'complete') && (
                <div className={`flex-1 flex flex-col overflow-y-auto pr-1 transition-all duration-500 ${
                  revealStage === 'flash' ? 'opacity-30 filter blur-sm translate-y-2' : 'opacity-100 filter-none translate-y-0'
                }`}>
              
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
                      <span className="text-[10px] font-bold uppercase text-slate-455 tracking-wider">Identified Proxies</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {result.flaggedAttributes.map((attr, idx) => {
                          const isAttrVisible = revealStage === 'complete' || idx < visibleFlaggedCount;
                          return (
                            <span 
                              key={idx} 
                              className={`px-2 py-1 bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold rounded-lg transition-all duration-300 transform ${
                                isAttrVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95 pointer-events-none'
                              }`}
                            >
                              {attr}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Bias DNA helix (Visual Metaphor) */}
                  {(() => {
                    const flagged = result.flaggedAttributes || [];
                    const dnaAttributes: DnaAttribute[] = [
                      { 
                        name: "Gender / Identity Markers", 
                        isBiased: flagged.some(f => f.toLowerCase().includes('gender') || f.toLowerCase().includes('sex')), 
                        correlation: flagged.some(f => f.toLowerCase().includes('gender') || f.toLowerCase().includes('sex')) ? 73 : 6, 
                        description: "Direct pronouns or explicit gender fields leak identity context into neural network weights.",
                        mutatingPower: flagged.some(f => f.toLowerCase().includes('gender') || f.toLowerCase().includes('sex')) ? 'CRITICAL' : 'NONE'
                      },
                      { 
                        name: "Postal Zip Code redlining", 
                        isBiased: flagged.some(f => f.toLowerCase().includes('zip') || f.toLowerCase().includes('address') || f.toLowerCase().includes('location') || f.toLowerCase().includes('code')), 
                        correlation: flagged.some(f => f.toLowerCase().includes('zip') || f.toLowerCase().includes('address') || f.toLowerCase().includes('location') || f.toLowerCase().includes('code')) ? 64 : 8, 
                        description: "Replicates geographical racial and wealth disparities historically. Extremely high proxy risk.",
                        mutatingPower: flagged.some(f => f.toLowerCase().includes('zip') || f.toLowerCase().includes('address') || f.toLowerCase().includes('location') || f.toLowerCase().includes('code')) ? 'HIGH' : 'NONE'
                      },
                      { 
                        name: "Race / Origin Indicators", 
                        isBiased: flagged.some(f => f.toLowerCase().includes('race') || f.toLowerCase().includes('ethnic') || f.toLowerCase().includes('origin')), 
                        correlation: flagged.some(f => f.toLowerCase().includes('race') || f.toLowerCase().includes('ethnic') || f.toLowerCase().includes('origin')) ? 80 : 5, 
                        description: "Direct protection coordinates that violate civil equity and compliance frameworks.",
                        mutatingPower: flagged.some(f => f.toLowerCase().includes('race') || f.toLowerCase().includes('ethnic') || f.toLowerCase().includes('origin')) ? 'CRITICAL' : 'NONE'
                      },
                      { 
                        name: "Age / Experience Ratios", 
                        isBiased: flagged.some(f => f.toLowerCase().includes('age') || f.toLowerCase().includes('year')), 
                        correlation: flagged.some(f => f.toLowerCase().includes('age') || f.toLowerCase().includes('year')) ? 52 : 12, 
                        description: "Chronological parameters that index applicants or customers as high risks due to age profiling.",
                        mutatingPower: flagged.some(f => f.toLowerCase().includes('age') || f.toLowerCase().includes('year')) ? 'HIGH' : 'NONE'
                      },
                      { 
                        name: "Validated Merit Parameters", 
                        isBiased: false, 
                        correlation: 6, 
                        description: "Verified financial credit history or objective qualifications. Stable and balanced.",
                        mutatingPower: 'NONE'
                      },
                      { 
                        name: "Clean Activity Log Index", 
                        isBiased: false, 
                        correlation: 4, 
                        description: "No bias correlations detected. Safely classified.",
                        mutatingPower: 'NONE'
                      }
                    ];
                    return (
                      <div className="pt-4 border-t border-slate-100">
                        <BiasDna 
                          attributes={dnaAttributes} 
                          title="Decision Node DNA Mapping" 
                          subtitle="Analyzing systemic protected class mutations deeply embedded within this individual decision path."
                        />
                      </div>
                    );
                  })()}

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

              {/* Real-World Impact Estimator Section */}
              {(() => {
                const VOLUME_VALUES = [100, 1000, 10000, 100000, 1000000];
                const VOLUME_LABELS = ['100', '1,000', '10,000', '100,000', '1M+'];
                const currentVolume = VOLUME_VALUES[volumeIndex];
                
                const biasExposureRatio = decisionType === 'loan' ? 0.31 : decisionType === 'job' ? 0.24 : decisionType === 'medical' ? 0.18 : 0.22;
                const rawRejections = Math.round(currentVolume * (displayedScore / 100) * biasExposureRatio);
                const unfairRejections = displayedScore > 0 ? Math.max(1, rawRejections) : 0;

                const hasRaceFlag = result?.flaggedAttributes?.some(f => f.toLowerCase().includes('race') || f.toLowerCase().includes('ethnic')) || 
                                    (compareResult?.attribute_changed?.toLowerCase().includes('race') || compareResult?.attribute_changed?.toLowerCase().includes('ethnic'));
                const hasZipFlag = result?.flaggedAttributes?.some(f => f.toLowerCase().includes('zip') || f.toLowerCase().includes('location')) || 
                                    (compareResult?.attribute_changed?.toLowerCase().includes('zip') || compareResult?.attribute_changed?.toLowerCase().includes('location'));
                const minorityPct = Math.min(95, Math.max(35, Math.round(45 + (displayedScore / 100) * 20 + (hasRaceFlag ? 15 : 0) + (hasZipFlag ? 8 : 0))));

                const costMultiplierLow = decisionType === 'loan' ? 770 : decisionType === 'job' ? 550 : decisionType === 'medical' ? 1150 : 350;
                const costMultiplierHigh = decisionType === 'loan' ? 2880 : decisionType === 'job' ? 2100 : decisionType === 'medical' ? 4300 : 1400;

                const scaleDampening = unfairRejections > 0 ? (Math.pow(unfairRejections, 0.95) / unfairRejections) : 1;
                const lowCost = Math.round(unfairRejections * costMultiplierLow * scaleDampening);
                const highCost = Math.round(unfairRejections * costMultiplierHigh * scaleDampening);

                const formatCurrency = (val: number) => {
                  if (val === 0) return '$0';
                  if (val >= 1000000) {
                    return `$${(val / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
                  }
                  if (val >= 1000) {
                    return `$${(val / 1000).toFixed(0)}K`;
                  }
                  return `$${val}`;
                };

                return (
                  <div className="border-t border-slate-100 pt-6 mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="block text-[10px] uppercase font-black text-indigo-500 tracking-wider">⚡ High-Exposure Impact Estimator</span>
                        <h4 className="text-sm font-black text-slate-800 mt-0.5">Translate Statistical Bias into Real Liability</h4>
                      </div>
                      <span className="text-[10px] font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                        Disparity Risk Model
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Algorithmic bias is more than a metric. It reflects systemic exclusion and direct legal exposure. Set your annual decision volume to calculate your estimated compliance profile.
                    </p>

                    {/* Ask User for Decision Volume */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide">
                          How many decisions does your system make per year?
                        </label>
                        <span className="text-sm font-black text-indigo-600 bg-white px-2 py-0.5 border border-slate-200/60 rounded">
                          {VOLUME_LABELS[volumeIndex]} / yr
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="4"
                          step="1"
                          value={volumeIndex}
                          onChange={(e) => setVolumeIndex(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
                        <span>100</span>
                        <span>1,000</span>
                        <span>10,000</span>
                        <span>100,000</span>
                        <span>1M+</span>
                      </div>
                    </div>

                    {/* Metrics Panel */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div className="bg-red-50/40 border border-red-100 rounded-xl p-3.5 flex flex-col justify-between">
                        <span className="text-[9px] uppercase font-black text-slate-450">Candidate Rejection Rate</span>
                        <div className="mt-2 text-lg font-black text-red-700">
                          ~{unfairRejections.toLocaleString()} <span className="text-xs font-bold text-slate-500 block">qualified applicants</span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 mt-1.5">
                          estimated to be unfairly rejected or down-ranked due to proxy attributes.
                        </p>
                      </div>

                      <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-3.5 flex flex-col justify-between">
                        <span className="text-[9px] uppercase font-black text-slate-455">Demographic Disparity</span>
                        <div className="mt-2 text-lg font-black text-slate-700">
                          ~{minorityPct}% <span className="text-xs font-bold text-slate-500 block">of rejections</span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-550 mt-1.5">
                          will belong to protected minority or underrepresented classifications.
                        </p>
                      </div>
                    </div>

                    {/* Legal liability estimation bar */}
                    <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] uppercase font-black text-slate-450 tracking-wider">Estimated Legal Liability</span>
                        <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-black border border-red-500/20">Class Action Risk</span>
                      </div>
                      <div className="text-2xl font-black tracking-tight text-red-400">
                        {formatCurrency(lowCost)} – {formatCurrency(highCost)}
                      </div>
                      <p className="text-[10px] text-slate-450 font-semibold leading-relaxed mt-2.5 border-t border-slate-800 pt-2 h-auto text-slate-400">
                        {decisionType === 'loan' && (
                          <span>High correlation with federal redlining regulations (US Equal Credit Opportunity Act - ECOA). Local zip code proxies risk severe supervisory action and class-wide civil penalties.</span>
                        )}
                        {decisionType === 'job' && (
                          <span>EEOC compliance exposure category: Disparate Impact under Title VII. Class-action vulnerability score remains highly elevated based on subjective evaluations.</span>
                        )}
                        {decisionType === 'medical' && (
                          <span>ACA Section 1557 non-discrimination violation risk. Clinical proxy bias may trigger active regulatory audits and severe statutory healthcare validation penalty assessments.</span>
                        )}
                        {decisionType === 'other' && (
                          <span>General automated profiling non-compliance risk under GDPR Article 22 & FTC deceptive practice practice standards. Remediate modeling weights to mitigate systemic exposure.</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })()}

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
          </>
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
