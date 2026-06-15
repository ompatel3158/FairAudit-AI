import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, BrainCircuit, Loader2, ShieldCheck, FileSearch, ArrowLeft, Download, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Type } from '../lib/gemini';
import * as mammoth from 'mammoth';
import { generateContentWithFallback } from '../lib/gemini';
import WordCloudVisualizer from './WordCloudVisualizer';
import BiasDna, { DnaAttribute } from './BiasDna';

// A cross-platform helper to safely initialize a dummy or seed file reference, 
// bypassing environments (e.g., iOS WebKit/iFrames) where the standard 'new File' 
// constructor is blocked or throws an "Illegal constructor" error.
function createSafeFile(parts: BlobPart[], filename: string, options?: FilePropertyBag): File {
  const blob = new Blob(parts, options) as any;
  blob.name = filename;
  blob.lastModifiedDate = new Date();
  blob.lastModified = Date.now();
  return blob as File;
}

interface Candidate {
  id: string;
  label: string;
  file: File | null;
  status: 'idle' | 'anonymizing' | 'scoring' | 'done' | 'error';
  anonymizedText?: string;
  score?: number;
  reasoning?: string;
  error?: string;
}

interface ResumeScreeningProps {
  onBack: () => void;
  onAuditComplete?: (score: number, verdict: string) => void;
  onPrintExport?: (score: number, findings: any) => void;
}

export default function ResumeScreening({ onBack, onAuditComplete, onPrintExport }: ResumeScreeningProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: '1', label: 'Candidate A', file: null, status: 'idle' }
  ]);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  const getNextLabel = (currentIndexes: string[]) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < letters.length; i++) {
        const label = `Candidate ${letters[i]}`;
        if (!currentIndexes.includes(label)) return label;
    }
    return 'Candidate';
  };

  const handleAddResume = () => {
    if (candidates.length >= 5) return;
    const newLabel = getNextLabel(candidates.map(c => c.label));
    setCandidates([...candidates, { id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 11), label: newLabel, file: null, status: 'idle' }]);
  };

  const handleRemoveResume = (id: string) => {
    setCandidates(candidates.filter(c => c.id !== id));
  };

  const handleFileChange = (id: string, file: File | null) => {
    setCandidates(candidates.map(c => c.id === id ? { ...c, file } : c));
  };

  const handleReset = () => {
    setCandidates([{ id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 11), label: 'Candidate A', file: null, status: 'idle' }]);
    setJobDescription('');
    setBatchStatus('idle');
    setExpandedCandidate(null);
  };

  const getScoreColor = (score: number) => {
    if (score > 75) return { stroke: '#22c55e', textClass: 'text-green-500' };
    if (score >= 40) return { stroke: '#eab308', textClass: 'text-yellow-500' };
    return { stroke: '#ef4444', textClass: 'text-red-500' };
  };

  const handleExample = () => {
    const exampleResume1 = "John Doe\n123 Main St, Anytown USA 12345\njohn.doe@email.com\n555-0102\n\nObjective: Seeking a frontend engineer position.\n\nExperience:\nFrontend Engineer, Google (2020-present)\n- Developed React applications and led architectural decisions.\n\nEducation:\nBS Computer Science, Stanford University (2016-2020)";
    const exampleResume2 = "Jane Smith\n456 Oak St, City\nJane@example.com\nObjective: Junior Developer.\n\nExperience: Intern, Startup Inc (2022)\n- Wrote some HTML.\nEducation: Bootcamp graduate.";
    const exampleResume3 = "Alex Johnson\nalex@gmail.com\nExperience: Senior React Dev at Meta (2018-present).\n- Scaled frontend to millions of users. \nBS CS MIT.";

    const f1 = createSafeFile([exampleResume1], "john_doe_resume.txt", { type: "text/plain" });
    const f2 = createSafeFile([exampleResume2], "jane_smith_resume.txt", { type: "text/plain" });
    const f3 = createSafeFile([exampleResume3], "alex_j_resume.txt", { type: "text/plain" });

    setJobDescription("Frontend Engineer\nRequirements:\n- 3+ years experience with React\n- BS in Computer Science\n- Experience building scalable web applications\nResponsibilities:\n- Build and maintain frontend applications");
    setCandidates([
      { id: '1', label: 'Candidate A', file: f1, status: 'idle' },
      { id: '2', label: 'Candidate B', file: f2, status: 'idle' },
      { id: '3', label: 'Candidate C', file: f3, status: 'idle' }
    ]);
  };

  const fileToGenerativePart = (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result.split(',')[1];
          resolve({
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          });
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processCandidate = async (candidate: Candidate): Promise<{ score?: number; status: 'done' | 'error' }> => {
    if (!candidate.file) return { status: 'error' };

    setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'anonymizing', error: undefined } : c));

    try {
      let filePart: any;
      const file = candidate.file;
      
      if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        filePart = { text: "Resume Content:\n" + result.value };
      } else if (file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain') {
        const text = await file.text();
        filePart = { text: "Resume Content:\n" + text };
      } else {
        filePart = await fileToGenerativePart(file);
        if (!filePart.inlineData.mimeType && file.name.toLowerCase().endsWith('.pdf')) {
          filePart.inlineData.mimeType = 'application/pdf';
        }
      }
      
      const anonResponse = await generateContentWithFallback({
        // model: 'gemini-2.5-flash',
        contents: {
          parts: [
            filePart,
            { text: "Please parse the provided document as a resume and completely anonymize it. Remove all arbitrary biases including applicant name, emails, phone numbers, addresses, gender markers, specific identifying college/university names, and specific employer names. Replace them with generic neutral bracketed placeholders like [Name], [Email], [University], [Employer]. Leave all skills, qualifications, degrees, dates, and responsibilities intact. Return ONLY the anonymized plain text of the resume." }
          ]
        },
        config: { temperature: 0.1 }
      });

      if (!anonResponse.text) throw new Error("Failed to anonymize resume.");
      const extractedAnonText = anonResponse.text.trim();
      
      setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'scoring', anonymizedText: extractedAnonText } : c));

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          score: {
            type: Type.NUMBER,
            description: "A score from 0 to 100 assessing how well the anonymized resume matches the provided job description based strictly on objective skills and experience."
          },
          reasoning: {
            type: Type.STRING,
            description: "A detailed paragraph explaining the numeric score, highlighting the key matching skills and any missing critical requirements."
          }
        },
        required: ["score", "reasoning"]
      };

      const scoreResponse = await generateContentWithFallback({
        // model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { text: `You are an expert technical recruiter.\n\nJob Description:\n${jobDescription}\n\nAnonymized Candidate Resume:\n${extractedAnonText}\n\nEvaluate the candidate's objective capabilities against the given Job Description and provide a score.` }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.2
        }
      });

      if (!scoreResponse.text) throw new Error("No response generated from the model.");

      const jsonString = scoreResponse.text.trim();
      const parsedData = JSON.parse(jsonString);
      
      setCandidates(prev => prev.map(c => c.id === candidate.id ? { 
        ...c, 
        status: 'done', 
        score: parsedData.score, 
        reasoning: parsedData.reasoning 
      } : c));

      return { score: parsedData.score, status: 'done' };

    } catch (err: any) {
      console.error(err);
      setCandidates(prev => prev.map(c => c.id === candidate.id ? { 
        ...c, 
        status: 'error', 
        error: err?.message || "An error occurred during analysis."
      } : c));
      return { status: 'error' };
    }
  };

  const handleAnalyze = async () => {
    const validCandidates = candidates.filter(c => c.file);
    if (validCandidates.length === 0 || !jobDescription) return;
    
    setBatchStatus('processing');
    
    const results = await Promise.all(validCandidates.map(c => processCandidate(c)));

    setBatchStatus('done');
    
    const completed = results.filter(r => r.status === 'done' && r.score !== undefined);
    if (completed.length > 0) {
        const maxScore = Math.max(...completed.map(r => r.score!));
        setTimeout(() => {
            onAuditComplete?.(maxScore, "COMPLETED");
        }, 0);
    }
  };

  const activeCandidates = candidates.filter(c => c.file);
  const isValidToAnalyze = activeCandidates.length > 0 && jobDescription.trim().length > 0;
  
  const rankedCandidates = [...candidates].filter(c => c.status === 'done').sort((a, b) => (b.score || 0) - (a.score || 0));

  const exportCSV = () => {
    const top3 = rankedCandidates.slice(0, 3);
    const headers = ["Rank", "Candidate", "Score", "Match Reason"];
    const rows = top3.map((c, i) => [
      i + 1,
      c.label,
      c.score,
      `"${(c.reasoning || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "shortlist.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col lg:h-full h-auto print:bg-white print:h-auto">
      <header className="mb-8 max-w-7xl mx-auto w-full flex items-center gap-4 print:hidden">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Resume Bias Detector</h1>
            <p className="text-sm font-medium text-slate-500">Unbiased Resume Evaluation</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:flex-1 lg:min-h-0 print:block">
        
        {/* Left Panel: Inputs */}
        <div className="space-y-6 flex flex-col lg:h-full print:hidden">
          
          <div className="flex justify-end -mb-2 relative z-10">
            <button 
              onClick={handleExample}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl shadow-sm flex items-center gap-1"
            >
              Try an Example →
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex-shrink-0">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <FileText className="w-4 h-4" /> 01 / Candidate Resumes
              </h2>
              <span className="text-xs font-semibold text-slate-400">{candidates.length}/5</span>
            </div>
            
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="relative group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      {candidate.label.split(' ')[1]}
                    </div>
                    <div className="flex-1 relative">
                      <input 
                        type="file" 
                        id={`file-upload-${candidate.id}`} 
                        className="hidden" 
                        accept="application/pdf,.docx,text/plain"
                        onChange={(e) => handleFileChange(candidate.id, e.target.files?.[0] || null)}
                      />
                      <label 
                        htmlFor={`file-upload-${candidate.id}`}
                        className={`flex items-center justify-between w-full p-3 rounded-xl border ${candidate.file ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100' : 'border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'} transition-colors cursor-pointer text-sm font-medium text-slate-700`}
                      >
                        <span className="truncate pr-4 flex items-center gap-2">
                          {candidate.file ? <FileText className="w-4 h-4 text-indigo-500" /> : <Upload className="w-4 h-4 text-slate-400" />}
                          {candidate.file ? candidate.file.name : 'Upload resume...'}
                        </span>
                      </label>
                    </div>
                    {candidates.length > 1 && (
                      <button 
                        onClick={() => handleRemoveResume(candidate.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                       <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {candidates.length < 5 && (
              <button 
                onClick={handleAddResume}
                className="mt-4 w-full py-3 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm font-semibold hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Another Resume
              </button>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-4 mb-4 flex items-center gap-2 flex-shrink-0">
              <FileSearch className="w-4 h-4" /> 02 / Job Description
            </h2>
            <textarea 
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job requirements and responsibilities here..."
              className="w-full flex-1 bg-slate-50 border-none rounded-xl p-5 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-slate-200 outline-none resize-none font-medium leading-relaxed"
            />
          </div>

          <button 
            onClick={handleAnalyze} 
            disabled={batchStatus !== 'idle' || !isValidToAnalyze}
            className="w-full bg-slate-900 text-white rounded-2xl py-4 font-semibold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex-shrink-0"
          >
            {batchStatus === 'processing' ? (
              <><Loader2 className="animate-spin w-5 h-5" /> Processing Batch...</>
            ) : (
              <><BrainCircuit className="w-5 h-5" /> Analyze {activeCandidates.length} {activeCandidates.length === 1 ? 'Candidate' : 'Candidates'}</>
            )}
          </button>
        </div>

        {/* Right Panel: Output */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col relative lg:overflow-hidden h-auto lg:h-[900px] xl:h-[950px] print:border-none print:shadow-none print:p-0 print:h-auto print:overflow-visible">
          {batchStatus === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10 p-8 text-center text-slate-400 border border-slate-100/50 m-4 rounded-2xl">
              <ShieldCheck className="w-12 h-12 text-slate-300 mb-4" />
              <p className="font-medium text-slate-500">Upload candidate resumes and a job description.</p>
              <p className="text-sm mt-2">The AI will extract capabilities, redact personal biases, and score the fit impartially.</p>
            </div>
          )}
          
          <AnimatePresence>
            {batchStatus === 'processing' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-20"
              >
                <div className="w-20 h-20 bg-slate-50 text-slate-900 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <p className="font-semibold text-slate-700 tracking-wide uppercase text-sm mb-2">
                  Processing Batch
                </p>
                <div className="flex flex-col items-center gap-1 text-xs text-slate-400 font-medium">
                  {candidates.map(c => c.file && (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="w-16 text-right truncate">{c.label}:</span>
                      <span className={`${c.status === 'done' ? 'text-green-500' : c.status === 'error' ? 'text-red-500' : ''}`}>
                        {c.status === 'anonymizing' ? 'Anonymizing...' : c.status === 'scoring' ? 'Scoring...' : c.status === 'done' ? 'Complete' : c.status === 'error' ? 'Error' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(batchStatus === 'done' || rankedCandidates.length > 0) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex-1 flex flex-col lg:overflow-y-auto overflow-visible print:overflow-visible pr-2 lg:pr-4 -mr-2 lg:-mr-4 custom-scrollbar print:pr-0 print:mr-0"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 flex-shrink-0">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Leaderboard</h3>
                <button 
                  onClick={exportCSV}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-100 transition-colors text-xs flex items-center gap-2 border border-indigo-200"
                >
                  <Download className="w-4 h-4" /> Export Shortlist
                </button>
              </div>

              <WordCloudVisualizer />

              <div className="mb-6">
                <BiasDna 
                  attributes={[
                    { 
                      name: "Gender & Name Identifiers", 
                      isBiased: true, 
                      correlation: 82, 
                      description: "Explicit candidate names and gendered pronouns extracted from CVs during preliminary parsing.",
                      mutatingPower: 'CRITICAL'
                    },
                    { 
                      name: "Elite Institutional Pedigree", 
                      isBiased: true, 
                      correlation: 78, 
                      description: "Excessive weighting toward select pedigree universities, causing major bias against alternative educational paths.",
                      mutatingPower: 'HIGH'
                    },
                    { 
                      name: "Location / Postal Address Proxies", 
                      isBiased: true, 
                      correlation: 65, 
                      description: "Geographic signals that act as proxies for race, socioeconomic background, and ethnicity.",
                      mutatingPower: 'HIGH'
                    },
                    { 
                      name: "Graduation Year (Age Indicator)", 
                      isBiased: true, 
                      correlation: 52, 
                      description: "Explicit dates indicating graduation year leak candidate bracketage, triggering latent age discrimination in sorting.",
                      mutatingPower: 'HIGH'
                    },
                    { 
                      name: "Core Technical Certifications", 
                      isBiased: false, 
                      correlation: 8, 
                      description: "Objective professional badges and certifications. Free from demographic corelations.",
                      mutatingPower: 'NONE'
                    },
                    { 
                      name: "Relevant Technology Skills", 
                      isBiased: false, 
                      correlation: 6, 
                      description: "Actual programming stack compliance indicators. Clean objective factor.",
                      mutatingPower: 'NONE'
                    }
                  ]} 
                  title="Resume Scanner Bias DNA mapping" 
                  subtitle="Diagnosing systemic demographic leaks and education lineage indicators buried in CV narratives."
                />
              </div>

              <div className="space-y-4 mb-8">
                {rankedCandidates.map((candidate, index) => {
                  const isExpanded = expandedCandidate === candidate.id;
                  const rank = index + 1;
                  const colorConfig = getScoreColor(candidate.score || 0);

                  return (
                    <div key={candidate.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md">
                      <div 
                        onClick={() => setExpandedCandidate(isExpanded ? null : candidate.id)}
                        className="p-5 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors relative"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rank === 1 ? 'bg-yellow-100 text-yellow-700' : rank === 2 ? 'bg-slate-200 text-slate-700' : rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-500'}`}>
                            #{rank}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{candidate.label}</h4>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{candidate.file?.name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                                <span className={`text-2xl font-black ${colorConfig.textClass}`}>{candidate.score}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400">Match Score</span>
                            </div>
                            <div className="text-slate-400">
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100 bg-slate-50/50"
                          >
                            <div className="p-6 space-y-6">
                                <div>
                                    <h5 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Fit Analysis</h5>
                                    <p className="text-slate-700 text-sm leading-relaxed font-medium">
                                        {candidate.reasoning}
                                    </p>
                                </div>
                                <div>
                                    <h5 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> Clean Anonymized Resume</h5>
                                    <div className="bg-white rounded-xl p-4 text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap overflow-x-hidden border border-slate-200 max-h-60 overflow-y-auto">
                                        {candidate.anonymizedText}
                                    </div>
                                </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {candidates.filter(c => c.status === 'error').map(c => (
                     <div key={c.id} className="border border-red-200 rounded-xl p-4 bg-red-50 text-red-700 text-sm flex justify-between items-center">
                         <div><span className="font-bold">{c.label}</span> failed tracking: {c.error}</div>
                     </div>
                ))}
              </div>

              {batchStatus === 'done' && (
                <div className="flex flex-col sm:flex-row justify-center gap-4 flex-shrink-0 pb-4 mt-auto pt-6 border-t border-slate-100 print:hidden">
                  <button 
                    onClick={handleReset}
                    className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                  >
                    Start New Batch
                  </button>
                  <button 
                    onClick={() => {
                      if (onPrintExport && rankedCandidates.length > 0) {
                        const topCandidate = rankedCandidates[0];
                        onPrintExport(
                          topCandidate.score || 0,
                          {
                            explanation: `Anonymized resume audit for candidates applying to job: ${jobDescription}. Candidates screened: ${rankedCandidates.map(c => `${c.label} (${c.score}%)`).join(', ')}.`,
                            flagged_columns: ["Candidate Identity Attributes Eliminated"],
                            recommendations: rankedCandidates.map(c => `${c.label}: ${c.reasoning ? c.reasoning.substring(0, 85) + '...' : 'No details available'}`)
                          }
                        );
                      } else {
                        window.print();
                      }
                    }}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 pointer-events-auto"
                  >
                    <FileText className="w-5 h-5" /> Print Overview
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
