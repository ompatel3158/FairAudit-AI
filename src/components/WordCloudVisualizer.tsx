import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EyeOff, CheckCircle2, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, Sliders, Settings2 } from 'lucide-react';

interface FeatureWeight {
  name: string;
  category: 'bias' | 'skill';
  weight: number; // 0 to 100
  originalWeight: number;
  description: string;
  remedy: string;
}

export default function WordCloudVisualizer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedFeatureIdx, setExpandedFeatureIdx] = useState<number | null>(0);
  
  const [features, setFeatures] = useState<FeatureWeight[]>([
    { 
      name: "Gender Identifier Markers", 
      category: 'bias', 
      weight: 82, 
      originalWeight: 82,
      description: "Direct sex markers or gendered semantic references extracted in raw text parsing. Highly risky.",
      remedy: "FairAudit sanitizes explicit descriptors and balances historical training selection skews."
    },
    { 
      name: "Geographic Location Proxies", 
      category: 'bias', 
      weight: 65, 
      originalWeight: 65,
      description: "Postal codes/cities acting as proxies for socio-economic background or demographic segmentation.",
      remedy: "Anonymize localized pin codes and abstract address nodes to regional divisions of equal scale."
    },
    { 
      name: "Tier-1 Pedigree Institutional bias", 
      category: 'bias', 
      weight: 78, 
      originalWeight: 78,
      description: "Over-weighting elite colleges, creating systemic exclusion against alternative educational tracks.",
      remedy: "Neutralize institutional bias by focusing strictly on coursework relevancy and verified skill matrices."
    },
    { 
      name: "Graduation Year (Candidate Age proxy)", 
      category: 'bias', 
      weight: 52, 
      originalWeight: 52,
      description: "Chronological timestamps acting as a proxy for age-based discrimination or cost-savings filter skews.",
      remedy: "Remove graduation months/years and evaluate core temporal skills mapping."
    },
    { 
      name: "Core Technical Competencies", 
      category: 'skill', 
      weight: 90, 
      originalWeight: 90,
      description: "True functional skill match parameters (React, Node.js, Systems Architecture) required for performance.",
      remedy: "Preserved and scaled dynamically with no anonymization reductions applied."
    },
    { 
      name: "Direct Professional Experience Range", 
      category: 'skill', 
      weight: 80, 
      originalWeight: 80,
      description: "Verification of past responsibilities and demonstrated role-based capability matrices.",
      remedy: "Retained and extracted strictly to match job requirements fairly."
    }
  ]);

  const handleWeightChange = (index: number, newWeight: number) => {
    setFeatures(prev => prev.map((f, i) => i === index ? { ...f, weight: newWeight } : f));
  };

  const handleResetWeights = () => {
    setFeatures(prev => prev.map(f => ({ ...f, weight: f.originalWeight })));
  };

  // Compute live cumulative bias safety risk estimate
  const biasFeatures = features.filter(f => f.category === 'bias');
  const totalBiasWeight = biasFeatures.reduce((sum, f) => sum + f.weight, 0);
  const maxPossibleBias = biasFeatures.length * 100;
  const liveBiasEstimate = Math.round((totalBiasWeight / (maxPossibleBias || 1)) * 100);

  return (
    <div 
      id="fairaudit-feature-map-module" 
      className="bg-slate-900 rounded-3xl mb-6 border border-slate-800 text-white shadow-2xl relative overflow-hidden transition-all duration-300"
    >
      {/* Decorative gradients */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Accordion Toggle Bar/Header panel */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors focus:outline-none select-none relative z-10"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/20 flex-shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-extrabold font-sans text-slate-100 tracking-wide uppercase">
                Interactive Feature Weight Audit Map
              </h3>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                isExpanded ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-350 border border-emerald-500/30'
              }`}>
                {isExpanded ? 'Weights Tuner opened' : 'Click to Tune Weights'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-1">
              Live Bias Factor Cumulative Index: <span className="text-red-400 font-extrabold">{liveBiasEstimate}%</span> | Adjust sliders below to simulate algorithmic cleansing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="p-1.5 rounded-lg bg-slate-950/50 text-slate-400 border border-slate-800">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expandable Sliders Panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-slate-800"
          >
            <div className="p-5 md:p-6 bg-slate-950/40 font-sans space-y-6">
              
              {/* Summary Dashboard Stat Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-xs font-bold leading-none ${liveBiasEstimate > 50 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {liveBiasEstimate > 50 ? "⚠️ BIAS DETECTED" : "🎉 ALIGNED & FAIR"}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block leading-none">Simulated Model Bias Skew</span>
                    <span className="text-sm font-black text-slate-200 mt-0.5 block">Estimated Risk Multiplier: {liveBiasEstimate}%</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetWeights}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold border border-slate-800 rounded-lg text-[10px] uppercase tracking-wide transition-colors cursor-pointer"
                >
                  Reset parameters
                </button>
              </div>

              {/* Adjustable Parametric List */}
              <div className="space-y-3.5">
                {features.map((feature, idx) => {
                  const isOpen = expandedFeatureIdx === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`bg-slate-900/90 rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isOpen 
                          ? (feature.category === 'bias' ? 'border-red-500/30 bg-slate-900' : 'border-emerald-500/30 bg-slate-900') 
                          : 'border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      {/* Collapsed Header click triggers open */}
                      <button
                        type="button"
                        onClick={() => setExpandedFeatureIdx(isOpen ? null : idx)}
                        className="w-full p-4 flex items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base leading-none">
                            {feature.category === 'bias' ? '⚠️' : '✅'}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-200 tracking-wide block">{feature.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium font-mono uppercase tracking-wider">
                              {feature.category === 'bias' ? 'Sensitive Demographics Proxy' : 'Validated Merit Parameter'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Live slider weight indicator pill */}
                          <span className={`text-[11px] font-mono font-black px-2.5 py-0.5 rounded ${
                            feature.category === 'bias'
                              ? (feature.weight > 50 ? 'text-red-400 bg-red-950/40 border border-red-900/20' : 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/20')
                              : 'text-indigo-400 bg-indigo-950/40 border border-indigo-900/20'
                          }`}>
                            Weight: {feature.weight}%
                          </span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </button>

                      {/* Expandable Slider Drawer */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="bg-slate-950/30 border-t border-slate-850/65"
                          >
                            <div className="p-4 space-y-4">
                              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                                {feature.description}
                              </p>

                              {/* Real Slider component */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                                  <span>0% (Suppressed)</span>
                                  <span className="text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Tuned Weight: {feature.weight}%</span>
                                  <span>100% (Unfiltered)</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  value={feature.weight} 
                                  onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-indigo-505"
                                  id={`slider-range-control-${idx}`}
                                />
                              </div>

                              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 text-[10px] font-semibold text-slate-400 leading-relaxed flex items-start gap-2">
                                <Settings2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-slate-200 font-bold block mb-0.5">Active Fairness Remediation:</span>
                                  {feature.remedy}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Context Summary Footer box */}
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  Adjusting these weights defines how FairAudit’s neural engine masks, balances, or abstracts decision-making models. Suppressing biased demographic proxies (minimizing their sliders) forces the system to rely exclusively on capability matching, which drives down the cumulative bias index!
                </span>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
