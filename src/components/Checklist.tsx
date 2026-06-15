import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, CheckCircle2, ArrowLeft, Loader2, ArrowRight, XCircle, Download } from 'lucide-react';
import { Type } from '../lib/gemini';
import { generateContentWithFallback } from '../lib/gemini';

const questions = [
  "Does your model use gender as an input?",
  "Does your model use location/zip code as an input?",
  "Was your training data collected before 2015?",
  "Does your training data reflect historical human decisions?",
  "Have you tested your model's accuracy across gender groups?",
  "Have you tested across age groups?",
  "Have you tested across location or income groups?",
  "Does your model affect employment, credit, or healthcare?"
];

export interface ChecklistResult {
  readiness: 'READY' | 'NEEDS REVIEW' | 'NOT READY';
  risk_flags: {
    question: string;
    flag: string;
  }[];
  fix_steps: string[];
}

interface ChecklistProps {
  onBack: () => void;
  onChecklistComplete?: (result: ChecklistResult) => void;
}

export default function Checklist({ onBack, onChecklistComplete }: ChecklistProps) {
  const [answers, setAnswers] = useState<boolean[]>(Array(questions.length).fill(null));
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'scoring' | 'done'>('idle');
  const [result, setResult] = useState<ChecklistResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnswer = (answer: boolean) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = answer;
    setAnswers(newAnswers);

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Completed, ready to submit
    }
  };

  const handleReset = () => {
    setAnswers(Array(questions.length).fill(null));
    setCurrentStep(0);
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setStatus('scoring');
    setError(null);
    setResult(null);

    const qaPairs = questions.map((q, i) => `Q: ${q} \nA: ${answers[i] ? 'Yes' : 'No'}`).join('\n\n');

    try {
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          readiness: {
            type: Type.STRING,
            enum: ['READY', 'NEEDS REVIEW', 'NOT READY'],
            description: "Overall deployment readiness"
          },
          risk_flags: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                flag: { type: Type.STRING, description: "Risk explanation for this answer" }
              },
              required: ["question", "flag"]
            },
            description: "Risk flags for concerning answers"
          },
          fix_steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 specific steps to fix before going live"
          }
        },
        required: ["readiness", "risk_flags", "fix_steps"]
      };

      const prompt = `You are an AI fairness auditor evaluating a system before deployment based on a checklist.
Review the following answers to the pre-deployment bias checklist:

${qaPairs}

Scoring logic:
- 'Yes' to using gender/location or historical human decisions is a risk.
- 'No' to testing accuracy across demographic groups is a risk.
- 'Yes' to affecting employment/credit/healthcare raises the stakes and strictness.

Provide the overall readiness status, specific risk flags for the concerning answers, and exactly 3 actionable steps to fix before going live.`;

      const response = await generateContentWithFallback({
        // model: 'gemini-2.5-flash', (handled by fallback)
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.1
        }
      });

      if (!response.text) throw new Error('No response');
      const parsedData = JSON.parse(response.text.trim()) as ChecklistResult;
      setResult(parsedData);
      if (onChecklistComplete) onChecklistComplete(parsedData);
      setStatus('done');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred while scoring the checklist.");
      setStatus('idle');
    }
  };

  const getReadinessColor = (readiness: string) => {
    if (readiness === 'READY') return 'bg-green-50 text-green-700 border-green-200';
    if (readiness === 'NEEDS REVIEW') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full print:bg-white print:h-auto print:max-w-none">
      <header className="mb-8 flex items-center gap-4 print:hidden">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md">
            <ShieldAlert className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Pre-Deployment Check</h1>
            <p className="text-sm font-medium text-slate-500">Ensure your system is fair before going live</p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-3xl p-8 flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex-1 relative overflow-hidden print:border-none print:shadow-none print:p-0 print:overflow-visible">
        {status === 'idle' && (
          <div className="flex flex-col h-full">
            <div className="mb-8 flex justify-between items-center text-sm font-bold uppercase tracking-widest text-slate-400">
              <span>Question {currentStep + 1} of {questions.length}</span>
              <div className="flex gap-1">
                {questions.map((_, idx) => (
                  <div key={idx} className={`h-1.5 w-6 rounded-full transition-colors ${idx <= currentStep ? 'bg-slate-900' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center mb-8"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight text-center max-w-xl mx-auto">
                  {questions[currentStep]}
                </h2>
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row gap-4 max-w-sm mx-auto w-full mb-8">
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl font-bold hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500" /> Yes
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl font-bold hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5 text-red-500" /> No
              </button>
            </div>

            {currentStep > 0 && currentStep < questions.length && (
              <div className="flex justify-center mt-auto">
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Go Back to Previous
                </button>
              </div>
            )}

            {currentStep === questions.length - 1 && answers[currentStep] !== undefined && (
               <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleSubmit}
                className="mt-6 w-full max-w-sm mx-auto bg-slate-900 text-white rounded-2xl py-4 font-semibold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
              >
                Generate Readiness Report <ArrowRight className="w-5 h-5" />
              </motion.button>
            )}

            {error && (
               <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 text-center max-w-sm mx-auto w-full">
                 {error}
               </div>
            )}
          </div>
        )}

        {status === 'scoring' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-white z-20 min-h-[300px]">
            <div className="w-20 h-20 bg-slate-50 text-slate-900 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <p className="font-semibold text-slate-700 tracking-wide uppercase text-sm mb-2">
              Evaluating Checklist
            </p>
            <p className="text-xs text-slate-400 font-medium text-center">Analyzing inputs against fairness standards...</p>
          </div>
        )}

        {status === 'done' && result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex flex-col h-full w-full"
          >
            <div className={`p-6 rounded-2xl border mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left ${getReadinessColor(result.readiness)}`}>
              <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center flex-shrink-0">
                {result.readiness === 'READY' ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <ShieldAlert className={`w-6 h-6 ${result.readiness === 'NEEDS REVIEW' ? 'text-yellow-600' : 'text-red-600'}`} />}
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight mb-1">{result.readiness}</h3>
                <p className="text-sm font-medium opacity-90">
                  {result.readiness === 'READY' ? 'Your system passes the basic fairness checks. Keep monitoring it in production.' : 'Your system poses risks and requires attention before going live.'}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                Risk Flags
              </h4>
              {result.risk_flags.length > 0 ? (
                <div className="space-y-3">
                  {result.risk_flags.map((flag, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm">
                      <p className="font-bold text-slate-800 mb-1">{flag.question}</p>
                      <p className="text-slate-600">{flag.flag}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm text-slate-600 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> No significant risk flags identified.
                </div>
              )}
            </div>

            <div className="mb-8">
              <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                Steps to Fix
              </h4>
              <ul className="space-y-3">
                {result.fix_steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="w-6 h-6 flex-shrink-0 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-700 font-medium pt-0.5">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row justify-center mt-auto gap-4 print:hidden border-t border-slate-100 pt-6">
              <button 
                onClick={handleReset}
                className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors shadow-sm"
              >
                Start Over
              </button>
              <button 
                onClick={() => window.print()}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> Download Report Card
              </button>
            </div>

            <p className="hidden print:block text-xs text-center text-slate-500 mt-8 italic border-t border-slate-200 pt-4 pb-4">
              This audit was generated to help organizations identify and fix bias before their AI systems impact real people.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
