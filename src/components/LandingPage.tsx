import React from 'react';
import { ShieldCheck, Database, Activity, ArrowRight, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';
import LiveApiDemo from './LiveApiDemo';

interface LandingPageProps {
  onSelectModule: (module: 'resume' | 'dataset' | 'decision' | 'checklist' | 'leaderboard') => void;
}

export default function LandingPage({ onSelectModule }: LandingPageProps) {
  const modules = [
    {
      id: 'resume' as const,
      title: 'Resume/Hiring Bias Detector',
      description: 'Anonymizes resumes by removing personal details to ensure fair, skill-based scoring.',
      tagline: 'Catch hiring bias before your next recruitment cycle',
      icon: <ShieldCheck className="w-8 h-8 text-blue-500" />,
      color: 'bg-blue-50',
      label: 'Module 1'
    },
    {
      id: 'dataset' as const,
      title: 'Dataset Bias Scanner',
      description: 'Upload a CSV dataset and detect columns that contain biased patterns or proxies.',
      tagline: 'Inspect your dataset before training your model',
      icon: <Database className="w-8 h-8 text-purple-500" />,
      color: 'bg-purple-50',
      label: 'Module 2'
    },
    {
      id: 'decision' as const,
      title: 'Decision Audit',
      description: 'Input an AI system\'s decision and data to check if protected attributes influenced it unfairly.',
      tagline: 'Audit any AI decision for hidden discrimination',
      icon: <Activity className="w-8 h-8 text-green-500" />,
      color: 'bg-green-50',
      label: 'Module 3'
    }
  ];

  const BIAS_CASES = [
    { text: "Amazon scrapped AI hiring tool after it showed bias against women", source: "Reuters, 2018" },
    { text: "COMPAS algorithm rated Black defendants as higher risk at twice the rate of white defendants", source: "ProPublica, 2016" },
    { text: "Apple Card offered women lower credit limits than men with identical finances", source: "BBC, 2019" },
    { text: "UK visa AI discriminated against applicants from certain countries", source: "Guardian, 2020" },
    { text: "Healthcare algorithm steered medical care away from Black patients", source: "Science, 2019" },
    { text: "Google Photos auto-tagging algorithm misclassified Black users", source: "BBC, 2015" },
    { text: "Dutch parents wrongly flagged for fraud by dual nationality proxy algorithm", source: "Reuters, 2020" },
    { text: "PredPol predictive policing model concentrated patrols disproportionately in minority neighborhoods", source: "Gizmodo, 2021" },
    { text: "AI face-recognition tool led to the wrongful arrest of an innocent man", source: "New York Times, 2020" },
    { text: "Proctoring software failed to recognize students with darker skin tones", source: "Washington Post, 2020" },
    { text: "Facebook's delivery algorithm served job ads tailored to gender stereotypes", source: "MIT Technology Review, 2021" },
    { text: "A-Level exam grading algorithm downgraded disadvantaged state-school students", source: "Guardian, 2020" }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Red Pulse Warning News Ticker of Real-World Incidents */}
      <div className="relative w-full overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl py-3.5 mb-10 flex items-center shadow-2xl">
        <div className="absolute left-0 z-20 bg-red-700 text-white uppercase font-mono font-black text-[10px] tracking-wider px-4 py-3 h-full flex items-center rounded-l-2xl border-r border-red-800 gap-1.5 shadow-md flex-shrink-0 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Critical Incidents
        </div>
        
        <div className="flex gap-4 items-center overflow-hidden w-full pl-36 whitespace-nowrap mask-fade">
          <style>{`
            @keyframes ticker {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .ticker-wrap {
              display: inline-flex;
              animation: ticker 90s linear infinite;
              white-space: nowrap;
              gap: 3rem;
            }
            .ticker-wrap:hover {
              animation-play-state: paused;
            }
            .mask-fade {
              mask-image: linear-gradient(to right, transparent, white 10%, white 90%, transparent);
              -webkit-mask-image: linear-gradient(to right, transparent, white 20px, white calc(100% - 20px), transparent);
            }
          `}</style>
          <div className="ticker-wrap">
            {/* Set 1 */}
            {BIAS_CASES.map((item, idx) => (
              <span key={`t1-${idx}`} className="inline-flex items-center text-xs text-slate-100 font-semibold select-none">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                <span className="mr-2 text-slate-200">{item.text}</span>
                <span className="text-red-400 font-bold px-1.5 py-0.5 bg-red-950/40 rounded border border-red-900/30 text-[9px] uppercase font-mono tracking-wider">{item.source}</span>
              </span>
            ))}
            {/* Set 2 (Seamless loop) */}
            {BIAS_CASES.map((item, idx) => (
              <span key={`t2-${idx}`} className="inline-flex items-center text-xs text-slate-100 font-semibold select-none">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                <span className="mr-2 text-slate-200">{item.text}</span>
                <span className="text-red-400 font-bold px-1.5 py-0.5 bg-red-950/40 rounded border border-red-900/30 text-[9px] uppercase font-mono tracking-wider">{item.source}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-slate-900 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-slate-900/10">
          <BrainCircuit className="text-white w-10 h-10" />
        </div>
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Catch AI Bias Before It Harms Real People</h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium mb-6">
          Audit your datasets, models, and AI decisions for hidden discrimination — before you go live.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold text-center shadow-sm">
            Used for Hiring, Loans, Medical Care, and Algorithmic Bias Auditing.
          </div>
          <button 
            onClick={() => onSelectModule('leaderboard')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/35 hover:bg-indigo-100 dark:hover:bg-indigo-905/30 text-indigo-700 dark:text-indigo-400 text-xs sm:text-sm font-extrabold transition-all cursor-pointer border border-indigo-100 dark:border-indigo-900/30 shadow-sm hover:scale-[1.02]"
            id="open-leaderboard-cta"
          >
            📊 View Industry Bias Leaderboard
          </button>
        </div>
        
        <div 
          onClick={() => onSelectModule('checklist')}
          className="max-w-2xl mx-auto bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 p-[1px] rounded-2xl cursor-pointer hover:shadow-lg dark:hover:shadow-none transition-shadow group"
        >
          <div className="bg-white dark:bg-slate-900 rounded-[15px] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">Going live soon? Run a free pre-deployment bias check</span>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500 dark:text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {modules.map((mod, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={mod.id}
            className="bg-white rounded-3xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${mod.color}`}>
              {mod.icon}
            </div>
            
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              {mod.label}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mb-3">{mod.title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-4">
              {mod.description}
            </p>
            <p className="text-[13px] font-semibold text-slate-600 mb-8 pt-4 border-t border-slate-100">
              {mod.tagline}
            </p>
            
            <button
              onClick={() => onSelectModule(mod.id)}
              className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors group"
            >
              Launch Module
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Feature 6: Interactive Live Under-The-Hood Developer/Judge Demo API Interceptor */}
      <div className="w-full mt-16" id="under-the-hood-api-demo-wrapper">
        <LiveApiDemo />
      </div>
    </div>
  );
}
