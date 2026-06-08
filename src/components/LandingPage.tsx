import React from 'react';
import { ShieldCheck, Database, Activity, ArrowRight, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onSelectModule: (module: 'resume' | 'dataset' | 'decision' | 'checklist') => void;
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-slate-900 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-slate-900/10">
          <BrainCircuit className="text-white w-10 h-10" />
        </div>
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Catch AI Bias Before It Harms Real People</h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium mb-6">
          Audit your datasets, models, and AI decisions for hidden discrimination — before you go live.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold max-w-2xl mx-auto text-center mb-8">
          Used for hiring, loans, medical care, and any AI system that makes decisions about people.
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
    </div>
  );
}
