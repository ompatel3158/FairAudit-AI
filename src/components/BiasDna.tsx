import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, BadgeInfo, HelpCircle, Activity, HeartCrack, CheckCircle, X } from 'lucide-react';

export interface DnaAttribute {
  name: string;
  isBiased: boolean;
  correlation: number; // correlation percentage e.g. 73
  description: string;
  mutatingPower: 'HIGH' | 'CRITICAL' | 'NEUTRAL' | 'NONE';
}

interface BiasDnaProps {
  attributes?: DnaAttribute[];
  title?: string;
  subtitle?: string;
}

export default function BiasDna({ attributes, title, subtitle }: BiasDnaProps) {
  // Option to close/hide compliance DNA visual
  const [isDismissed, setIsDismissed] = useState(false);

  // Safe fallback attributes if none are rendered
  const defaultAttributes: DnaAttribute[] = [
    { 
      name: "Gender Identifier Markers", 
      isBiased: true, 
      correlation: 73, 
      description: "Creates high target deviation. Highly persistent across decision nodes.",
      mutatingPower: 'CRITICAL'
    },
    { 
      name: "Postal Zip Code Redlining", 
      isBiased: true, 
      correlation: 64, 
      description: "Replicates systemic geographical bias pathways, skewing output equity.",
      mutatingPower: 'HIGH'
    },
    { 
      name: "Academic Institution Class Year", 
      isBiased: true, 
      correlation: 52, 
      description: "Acts as a latent chronological age proxy. Accelerates cost-savings filters.",
      mutatingPower: 'HIGH'
    },
    { 
      name: "Direct Past Work Experience Durations", 
      isBiased: false, 
      correlation: 12, 
      description: "Valid competence criterion. Demonstrates high structural merit correlation.",
      mutatingPower: 'NEUTRAL'
    },
    { 
      name: "Explicit Technical Skills Match", 
      isBiased: false, 
      correlation: 6, 
      description: "Objective functional matching. Clean system validation factor.",
      mutatingPower: 'NONE'
    },
    { 
      name: "Historical Peer-Reviewed Credentials", 
      isBiased: false, 
      correlation: 8, 
      description: "Unbiased merit factor. Evaluated as safe.",
      mutatingPower: 'NONE'
    }
  ];

  const list = attributes && attributes.length > 0 ? attributes : defaultAttributes;
  
  // Accordion expands ONLY on click. Default to first index (0) so there is always some view shown.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0); 
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Math-based 3D continuous animation frame state for rotational rendering
  const [time, setTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    
    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      if (!isPaused) {
        // Match the 6-second rotation period of index.css (360 degrees / 6 seconds = 2 * PI / 6.0 radians/sec)
        const rotationSpeed = (Math.PI * 2) / 6.0;
        setTime(prev => (prev + delta * rotationSpeed) % (Math.PI * 2));
      }
      animId = requestAnimationFrame(tick);
    };
    
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPaused]);

  const biasedCount = list.filter(a => a.isBiased).length;
  const healthPercent = Math.round(((list.length - biasedCount) / list.length) * 100);

  // If dismissed, render a subtle pill that enables the user to open/restore the view
  if (isDismissed) {
    return (
      <div 
        className="bg-slate-950 border border-slate-900 rounded-3xl p-4 flex items-center justify-between mt-6 max-w-full hover:border-[#535dff]/30 transition-all duration-300"
        id="fairaudit-bias-dna-collapsed"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <Activity className="w-4 h-4 animate-pulse text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider">
              {title || "Algorithmic Bias DNA Sequence"}
            </h4>
            <p className="text-[10px] text-slate-500">Dual Helix mapping has been collapsed.</p>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setIsDismissed(false)}
          className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-indigo-450 hover:text-indigo-300 bg-indigo-505/10 bg-indigo-950/40 border border-indigo-900/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
        >
          Show Helix Model
        </button>
      </div>
    );
  }

  // --- MATHEMATICAL DUAL-HELIX DATA POINT INTERPOLATION ---
  // To avoid any "empty nothingness" between our 6 attributes, we model a continuous 
  // double helix made of 36 points, and anchor our 6 attributes at 6 evenly distributed key indices.
  const N_total = 36;
  const height = 280;
  const center_x = 80;
  const radius = 30; // compact consistent radius preventing element collisions

  // Attribute anchors: Map our 6 attributes evenly onto point indices 3, 9, 15, 21, 27, 33
  const attributeAnchorPoints = [3, 9, 15, 21, 27, 33];

  const helixPoints = Array.from({ length: N_total }).map((_, j) => {
    // Distribute Y from 25 to 255
    const y = 25 + j * (230 / (N_total - 1));
    // Continuous spiral phase offset
    const phase = time + j * 0.42;

    const xLeft = center_x - radius * Math.cos(phase);
    const xRight = center_x + radius * Math.cos(phase);
    
    // Depth projection coordinate (-1 for back, +1 for front)
    const zLeft = Math.sin(phase);
    const zRight = -Math.sin(phase);

    // Is this point an attribute anchor?
    const attrIdx = attributeAnchorPoints.indexOf(j);
    const attribute = attrIdx !== -1 && list[attrIdx] ? list[attrIdx] : null;

    return {
      index: j,
      y,
      xLeft,
      xRight,
      zLeft,
      zRight,
      attribute,
      attrIdx,
    };
  });

  // Construct smooth bezier/curved path coordinates for the Left and Right backbone strands
  const leftStrandPath = helixPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.xLeft} ${p.y}`).join(' ');
  const rightStrandPath = helixPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.xRight} ${p.y}`).join(' ');

  return (
    <div 
      className="bg-slate-950 border border-slate-900 rounded-3xl p-5 md:p-6 text-white shadow-2xl relative overflow-hidden transition-all duration-300 w-full mt-6"
      id="fairaudit-bias-dna-card"
    >
      {/* Decorative radial gradients */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Manual Dismiss Trigger inside header */}
      <button 
        type="button"
        onClick={() => setIsDismissed(true)}
        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 absolute top-4 right-4 cursor-pointer transition-colors"
        title="Hide and close DNA sequence panel"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-900/80 pr-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-sans">
                {title || "Algorithmic Bias DNA Sequence"}
              </h3>
              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                biasedCount > 0 
                  ? 'bg-red-950/45 border-red-900/30 text-red-400' 
                  : 'bg-emerald-950/45 border-emerald-900/30 text-emerald-400'
              }`}>
                {biasedCount > 0 ? `${biasedCount} Mutations Detected` : 'All Strands Safe'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              {subtitle || "Visualizing deeply embedded systemic bias and social proxies in decision-making nodes."}
            </p>
          </div>
        </div>

        {/* Genome Stability Index Score */}
        <div className="flex items-center gap-3 bg-slate-900/40 p-2.5 rounded-2xl border border-slate-900 shrink-0">
          <div className="text-right">
            <span className="text-[9px] font-extrabold text-slate-500 block leading-none uppercase">Model DNA Stability</span>
            <span className={`text-xs font-black mt-1 block ${healthPercent < 60 ? 'text-red-400' : 'text-emerald-400'}`}>
              {healthPercent}% Uncorrupted
            </span>
          </div>
          <div className={`p-1.5 rounded-lg text-xs font-bold leading-none ${healthPercent < 60 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Grid: Dynamic SVG Helix Left, Click Accordion Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left Column: Continuous Revolving DNA Double Helix (Pauses on Hover for optimal interactivity) */}
        <div 
          className="md:col-span-5 flex flex-col items-center justify-center bg-slate-950/65 p-4 rounded-2xl border border-slate-900 relative min-h-[310px] transition-all"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          
          <div className="relative w-40 h-[280px] flex items-center justify-center">
            <svg 
              className="w-full h-full select-none" 
              viewBox={`0 0 160 ${height}`}
              id="bias-dna-interpolated-rendering"
            >
              <g>
                {/* 1. Strand Backbone A Left: Rendered as a completely continuous smooth overlapping spline */}
                <path
                  d={leftStrandPath}
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.45)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />

                {/* 2. Strand Backbone B Right: Smooth continuous spline */}
                <path
                  d={rightStrandPath}
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.45)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />

                {/* 3. Horizontal Connect rungs (Attributes AND dense filled cosmetic intermediates) */}
                {helixPoints.map((p) => {
                  const isAttr = p.attrIdx !== -1;
                  const isSelected = isAttr && selectedIndex === p.attrIdx;
                  const isHovered = isAttr && hoveredIdx === p.attrIdx;

                  if (isAttr && p.attribute) {
                    // Highlighted interactive rung
                    return (
                      <line
                        key={`rung-line-attr-${p.index}`}
                        x1={p.xLeft}
                        y1={p.y}
                        x2={p.xRight}
                        y2={p.y}
                        stroke={
                          isSelected 
                            ? (p.attribute.isBiased ? "#ef4444" : "#10b981") 
                            : isHovered 
                              ? "rgba(255, 255, 255, 0.85)" 
                              : "rgba(99, 102, 241, 0.35)"
                        }
                        strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.7}
                        strokeDasharray={p.attribute.isBiased ? "3 2" : undefined}
                        className="transition-colors duration-150"
                      />
                    );
                  } else {
                    // Beautiful dense cosmetic intermediate rungs connecting the backbones to complete the DNA!
                    return (
                      <line
                        key={`rung-line-cosmetic-${p.index}`}
                        x1={p.xLeft}
                        y1={p.y}
                        x2={p.xRight}
                        y2={p.y}
                        stroke="rgba(148, 163, 184, 0.16)"
                        strokeWidth={0.8}
                        strokeDasharray={p.index % 2 === 0 ? "2 2" : undefined}
                      />
                    );
                  }
                })}

                {/* 4. Left Node active circular bases */}
                {helixPoints.map((p) => {
                  const isAttr = p.attrIdx !== -1;
                  if (!isAttr || !p.attribute) return null;

                  // Scale based on sine-wave z projection for full 3D visual depth
                  const size = 6.5 + 4 * p.zLeft;
                  const opacity = 0.5 + 0.5 * ((p.zLeft + 1) / 2);
                  const isSelected = selectedIndex === p.attrIdx;
                  const isHovered = hoveredIdx === p.attrIdx;

                  return (
                    <g key={`left-node-circle-${p.index}`}>
                      <circle
                        cx={p.xLeft}
                        cy={p.y}
                        r={size + (isSelected || isHovered ? 2 : 0)}
                        fill={p.attribute.isBiased ? "#ef4444" : "#10b981"}
                        opacity={opacity}
                        className="transition-all duration-150 cursor-pointer"
                        onClick={() => setSelectedIndex(p.attrIdx)}
                        onMouseEnter={() => setHoveredIdx(p.attrIdx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                      {isSelected && (
                        <circle
                          cx={p.xLeft}
                          cy={p.y}
                          r={size + 5.5}
                          fill="none"
                          stroke={p.attribute.isBiased ? "#ef4444" : "#10b981"}
                          strokeWidth={1.5}
                          className="animate-pulse"
                        />
                      )}
                    </g>
                  );
                })}

                {/* 5. Right Node active circular bases */}
                {helixPoints.map((p) => {
                  const isAttr = p.attrIdx !== -1;
                  if (!isAttr || !p.attribute) return null;

                  const size = 6.5 + 4 * p.zRight;
                  const opacity = 0.5 + 0.5 * ((p.zRight + 1) / 2);
                  const isSelected = selectedIndex === p.attrIdx;
                  const isHovered = hoveredIdx === p.attrIdx;

                  return (
                    <g key={`right-node-circle-${p.index}`}>
                      <circle
                        cx={p.xRight}
                        cy={p.y}
                        r={size + (isSelected || isHovered ? 2 : 0)}
                        fill={p.attribute.isBiased ? "#ef4444" : "#10b981"}
                        opacity={opacity}
                        className="transition-all duration-150 cursor-pointer"
                        onClick={() => setSelectedIndex(p.attrIdx)}
                        onMouseEnter={() => setHoveredIdx(p.attrIdx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                      {isSelected && (
                        <circle
                          cx={p.xRight}
                          cy={p.y}
                          r={size + 5.5}
                          fill="none"
                          stroke={p.attribute.isBiased ? "#ef4444" : "#10b981"}
                          strokeWidth={1.5}
                          className="animate-pulse"
                        />
                      )}
                    </g>
                  );
                })}

                {/* 6. Static centered text tag bubble overlays on selection/hover */}
                {helixPoints.map((p) => {
                  const isAttr = p.attrIdx !== -1;
                  if (!isAttr || !p.attribute) return null;

                  const isSelected = selectedIndex === p.attrIdx;
                  const isHovered = hoveredIdx === p.attrIdx;
                  if (!isSelected && !isHovered) return null;

                  return (
                    <g key={`text-overlay-bubble-${p.index}`} pointerEvents="none">
                      <rect
                        x={25}
                        y={p.y - 10}
                        width={110}
                        height={18}
                        rx={4}
                        fill="#020617"
                        stroke={p.attribute.isBiased ? "#ef4444" : "#10b981"}
                        strokeWidth={1.2}
                        opacity={0.96}
                      />
                      <text
                        x={80}
                        y={p.y + 2}
                        fill="#f8fafc"
                        fontSize={8.5}
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {p.attribute.name.substring(0, 18)}{p.attribute.name.length > 18 ? '..' : ''}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div className="text-[9px] text-indigo-400 font-bold font-mono mt-2 uppercase tracking-widest text-center animate-pulse">
            Revolving Compliance Helix
          </div>
        </div>

        {/* Right Column: Attribute Diagnostic Accordion (Rigid Slider mechanics) */}
        <div className="md:col-span-7 flex flex-col justify-between min-h-[320px] h-[320px]">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <HeartCrack className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
              Attribute Diagnostic Slider Matrix
            </h4>

            {/* Stable sized accordion wrapper: limits movement and thrash loops completely */}
            <div className="space-y-2 h-[245px] overflow-y-auto pr-1 custom-scrollbar">
              {list.map((node, idx) => {
                const isSelected = selectedIndex === idx;
                const isHovered = hoveredIdx === idx;
                
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedIndex(isSelected ? null : idx)}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`border rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-900 border-indigo-500/50 shadow-lg' 
                        : isHovered 
                          ? 'bg-slate-900/40 border-slate-800' 
                          : 'bg-slate-950/30 border-slate-900'
                    }`}
                    id={`bias-dna-slider-item-${idx}`}
                  >
                    {/* Header bar row: Clicking selects the slice. pure CSS and mechanical, no thrash */}
                    <div className="p-3 flex items-center justify-between select-none">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.2 h-2.2 rounded-full shrink-0 ${
                          node.isBiased 
                            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' 
                            : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        }`} />
                        
                        <span className="text-xs font-bold text-slate-100">
                          {node.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`text-[8.5px] font-bold font-mono uppercase px-2 py-0.5 rounded-md ${
                          node.isBiased 
                            ? 'bg-red-950/40 text-red-400 border border-red-900/20' 
                            : 'bg-slate-900/50 text-slate-400 border border-slate-800/40'
                        }`}>
                          {node.isBiased ? `${node.correlation}% Bias Proxy` : 'Merit'}
                        </span>
                        
                        <motion.span 
                          animate={{ rotate: isSelected ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-slate-500 text-[9px]"
                        >
                          ▼
                        </motion.span>
                      </div>
                    </div>

                    {/* Smooth height slider: details toggle ONLY on click */}
                    <AnimatePresence initial={false}>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: "easeInOut" }}
                          className="overflow-hidden border-t border-slate-900 bg-slate-950/80"
                        >
                          <div className="p-3 text-xs text-slate-300 space-y-2 leading-relaxed">
                            <p>
                              <strong>Compliance Diagnostic:</strong> {node.description}
                            </p>
                            {node.isBiased ? (
                              <div className="space-y-1.5">
                                <p className="text-red-400 font-bold">
                                  ⚠️ PARITY DEVIATION DETECTED: This parameter leaks discriminatory demographics with a high {node.correlation}% outcome dependency skew.
                                </p>
                                <div className="flex items-start gap-1.5 text-[9.5px] bg-red-950/20 text-red-300 p-2 rounded-lg border border-red-900/10">
                                  <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                  <span>
                                    <strong>Remediation Advice:</strong> Weight suppress, generalise, or drop this column to break latent target proxy redlining.
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/15 p-2 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Measures up logically with zero demographics bias. Clean criteria.</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Footnote Info Section */}
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 text-[9px] text-slate-500 leading-relaxed flex items-start gap-2">
            <BadgeInfo className="w-4 h-4 text-[#535dff] shrink-0 mt-0.5" />
            <span>
              The double-helix revolves continuously. Highlight segments or click any list attribute above to diagnose. Collapse details by tapping the active item.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
