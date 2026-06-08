import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ResumeScreening from './components/ResumeScreening';
import DatasetScanner from './components/DatasetScanner';
import DecisionAudit from './components/DecisionAudit';
import Checklist, { ChecklistResult } from './components/Checklist';
import LegalDocModal from './components/LegalDocs';
import { AuthService, UserSession } from './lib/auth';
import { 
  Trash2, MessageSquare, X, Send, Database, Sparkles, 
  AlertCircle, ChevronRight, LogOut, Sun, Moon, Sparkle,
  Lock, Mail, User as UserIcon, Plus, Eye, Play, History, Loader2, PlayCircle, HelpCircle, FileText, ArrowLeft, ArrowRight
} from 'lucide-react';
import { DbService, TimelineEntry, SharedReport } from './lib/db';
import { generateContentWithFallback } from './lib/gemini';
import { HistoryRecord, ChatMessage } from './types';

export type ModuleType = 'landing' | 'resume' | 'dataset' | 'decision' | 'checklist';

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

export default function App() {
  const [currentModule, setCurrentModule] = useState<ModuleType>('landing');
  const [checklistResult, setChecklistResult] = useState<ChecklistResult | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [projectName, setProjectName] = useState('Workspace Compliance Group');
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [agreeLegal, setAgreeLegal] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Legal Modal State
  const [legalDocType, setLegalDocType] = useState<'terms' | 'privacy' | null>(null);
  
  // Timeline State
  const [timelineData, setTimelineData] = useState<Record<string, TimelineEntry[]>>({});
  const [selectedTimelineProject, setSelectedTimelineProject] = useState('Workspace Compliance Group');

  // Shareable Report state (for viewing shared report via URL)
  const [activeSharedId, setActiveSharedId] = useState<string | null>(null);
  const [sharedReport, setSharedReport] = useState<SharedReport | null>(null);
  const [loadingShared, setLoadingShared] = useState(false);

  // Onboarding Tutorial State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [autoRunCOMPAS, setAutoRunCOMPAS] = useState(false);

  // Custom Printable Export Overlay State
  const [printData, setPrintData] = useState<{
    module: string;
    score: number | string;
    findings: any;
    projectName: string;
  } | null>(null);

  // Multi-Session Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [latestAuditContext, setLatestAuditContext] = useState<any | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Initialize and check persistent properties on page load
  useEffect(() => {
    // Check Dark Mode setting
    const savedTheme = localStorage.getItem('fairaudit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    // Subscribe to Auth System State
    const unsubscribeAuth = AuthService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });

    const handleUrlLoading = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const reportId = urlParams.get('report') || window.location.hash.match(/report\/([a-zA-Z0-9]{6})/)?.[1];
      const encodedData = urlParams.get('dt');
      
      if (reportId || encodedData) {
        setLoadingShared(true);
        try {
          let report: SharedReport | null = null;
          
          if (encodedData) {
            report = DbService.decodeReportFromUrl(encodedData);
          }
          
          if (!report && reportId) {
            report = await DbService.getSharedReport(reportId);
          }
          
          if (report) {
            setSharedReport(report);
            setActiveSharedId(report.id || reportId || 'shared');
          } else {
            console.error('Shared report not found');
          }
        } catch (err) {
          console.error('Failed to load shared report', err);
        } finally {
          setLoadingShared(false);
        }
      }
    };

    handleUrlLoading();

    // Check if onboarding is completed
    const onboardingDone = localStorage.getItem('fairaudit_onboarding_done');
    if (onboardingDone !== 'true') {
      setShowOnboarding(true);
    }

    // Load audit history with key deduplication sanitizer
    const savedHistory = localStorage.getItem('auditHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          const seenHistoryIds = new Set<string>();
          let changed = false;
          const sanitized = parsed.map(item => {
            let itemId = item.id;
            if (!itemId) {
              itemId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
              changed = true;
            } else if (seenHistoryIds.has(itemId)) {
              itemId = itemId + '_' + Math.random().toString(36).substring(2, 9);
              changed = true;
            }
            seenHistoryIds.add(itemId);
            return { ...item, id: itemId };
          });
          setHistory(sanitized);
          if (changed) {
            localStorage.setItem('auditHistory', JSON.stringify(sanitized));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Load Timeline records
    refreshTimeline();

    // Load Chat Sessions with key deduplication sanitizer
    const savedSessions = localStorage.getItem('fairaudit_chat_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed)) {
          const seenMessageIds = new Set<string>();
          const seenSessionIds = new Set<string>();
          let changed = false;

          const sanitized: ChatSession[] = parsed.map(session => {
            let sId = session.id;
            if (!sId) {
              sId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
              changed = true;
            } else if (seenSessionIds.has(sId)) {
              sId = sId + '_' + Math.random().toString(36).substring(2, 9);
              changed = true;
            }
            seenSessionIds.add(sId);

            const sMessages = Array.isArray(session.messages) ? session.messages : [];
            const sanitizedMessages = sMessages.map((msg: any) => {
              let msgId = msg.id;
              if (!msgId) {
                msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                changed = true;
              } else if (seenMessageIds.has(msgId)) {
                msgId = msgId + '_' + Math.random().toString(36).substring(2, 9);
                changed = true;
              }
              seenMessageIds.add(msgId);
              return {
                ...msg,
                id: msgId
              };
            });

            return {
              ...session,
              id: sId,
              messages: sanitizedMessages
            };
          });

          setChatSessions(sanitized);
          if (sanitized.length > 0) {
            setActiveSessionId(sanitized[0].id);
          }
          if (changed) {
            localStorage.setItem('fairaudit_chat_sessions', JSON.stringify(sanitized));
          }
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // Setup initial welcome chat session
      const initialId = 'welcome_chat';
      const welcomeSession: ChatSession = {
        id: initialId,
        title: 'Algorithmic Fairness Intro',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [
          {
            id: 'welcome_m',
            sender: 'bot',
            text: "Hi there! I am your FairAudit AI companion. Ask me any questions about algorithmic bias, ethical AI design, statutory guidelines like the US EEOC or India RBI guidelines, and how to read compliance score outputs!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };
      setChatSessions([welcomeSession]);
      setActiveSessionId(initialId);
      localStorage.setItem('fairaudit_chat_sessions', JSON.stringify([welcomeSession]));
    }

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const refreshTimeline = async () => {
    const data = await DbService.getAllProjectsTimeline();
    setTimelineData(data);
    const keys = Object.keys(data);
    if (keys.length > 0 && !keys.includes(selectedTimelineProject)) {
      setSelectedTimelineProject(keys[0]);
    }
  };

  const addHistory = async (moduleName: string, score: string | number, verdict: string, details: any = null) => {
    const numericScore = typeof score === 'number' ? score : parseFloat(score) || 0;
    
    // Save locally
    const newRecord: HistoryRecord = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 11),
      projectName: projectName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      module: moduleName,
      score,
      verdict
    };
    
    const newHistory = [newRecord, ...history];
    setHistory(newHistory);
    localStorage.setItem('auditHistory', JSON.stringify(newHistory));

    // Save Timeline Entry to db (Firebase / localStorage)
    await DbService.saveTimelineEntry(projectName, numericScore, moduleName);
    await refreshTimeline();

    // Set Context for Chatbot Explainer
    const context = {
      module: moduleName,
      score,
      verdict,
      projectName,
      details
    };
    setLatestAuditContext(context);
    
    // Create or update conversational history with a dedicated notification message
    const notificationText = `I have completed an audit inside **${moduleName}** on Project **${projectName}**! The resulting bias risk score evaluates to **${score}%** with a compliance status of **${verdict}**. Let's review the statistical recommendations and correct proxy biases.`;
    
    if (activeSessionId) {
      setChatSessions(prev => {
        const updated = prev.map(session => {
          if (session.id === activeSessionId) {
            return {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: 'audit_alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
                  sender: 'bot',
                  text: notificationText,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]
            };
          }
          return session;
        });
        localStorage.setItem('fairaudit_chat_sessions', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('auditHistory');
    localStorage.removeItem('fairaudit_timeline');
    setTimelineData({});
  };

  // Onboarding Tutorial Controls
  const completeOnboarding = (startDemo = false) => {
    localStorage.setItem('fairaudit_onboarding_done', 'true');
    setShowOnboarding(false);
    if (startDemo) {
      setAutoRunCOMPAS(true);
      setCurrentModule('dataset');
    }
  };

  // Dark Mode Toggle Trigger
  const toggleDarkMode = () => {
    const target = !isDarkMode;
    setIsDarkMode(target);
    if (target) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fairaudit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fairaudit_theme', 'light');
    }
  };

  // New Chat Session Creation
  const handleNewChat = () => {
    const newId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    const newSession: ChatSession = {
      id: newId,
      title: `Audit Conversation #${chatSessions.length + 1}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [
        {
          id: 'welcome_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
          sender: 'bot',
          text: "Let's start a fresh discussion about your operational AI algorithms. How can I assist you with bias mitigation or training parity guidelines?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    const updated = [newSession, ...chatSessions];
    setChatSessions(updated);
    setActiveSessionId(newId);
    localStorage.setItem('fairaudit_chat_sessions', JSON.stringify(updated));
  };

  // Chat Message Submission Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !activeSessionId) return;

    const userMessageText = chatInput.trim();
    setChatInput('');
    
    const userMsg: ChatMessage = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
      sender: 'user',
      text: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Append User message to Active Session
    let chatSessionTitle = '';
    setChatSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === activeSessionId) {
          const isDefaultTitle = s.title.startsWith('New Chat') || s.title.startsWith('Audit Conversation');
          const newTitle = isDefaultTitle ? (userMessageText.substring(0, 24) + '...') : s.title;
          chatSessionTitle = newTitle;
          return {
            ...s,
            title: newTitle,
            messages: [...s.messages, userMsg]
          };
        }
        return s;
      });
      localStorage.setItem('fairaudit_chat_sessions', JSON.stringify(updated));
      return updated;
    });

    setChatLoading(true);

    try {
      // Find active messages to load context
      const activeSession = chatSessions.find(s => s.id === activeSessionId);
      const historyContext = activeSession 
        ? activeSession.messages.slice(-6).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n') 
        : '';
      
      const prompt = `You are FairAudit AI, an expert algorithmic fairness auditor and machine learning bias analyzer.
Review the user's active session request:
- Project Name: ${projectName}
- Current Active Workspace Section: ${currentModule}
- Recent Scanned Bias Risk Context: ${latestAuditContext ? `Module: ${latestAuditContext.module}, Score: ${latestAuditContext.score}%, Verdict: ${latestAuditContext.verdict}` : 'No active audit is run yet on this session.'}

Existing chat session logs:
${historyContext}
User asks: "${userMessageText}"

Always generate helpful, expert suggestions. Format bold parameters with standard **wildcards** to represent high risk or pass status (e.g., use **high compliance risk** or **EEOC compliant** instead of unformatted descriptions). Keep responses scannable, structurally neat, with bullet lists where appropriate, limit response to 3 concise, highly readable paragraphs. Use humble, literal terminology.`;

      const response = await generateContentWithFallback({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.25 }
      });

      const assistantMsg: ChatMessage = {
        id: 'bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
        sender: 'bot',
        text: response?.text || "I was unable to analyze that query. Please query the audit report again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatSessions(prev => {
        const updated = prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, assistantMsg]
            };
          }
          return s;
        });
        localStorage.setItem('fairaudit_chat_sessions', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error('Chat failed:', err);
      const errorMsg: ChatMessage = {
        id: 'error_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
        sender: 'bot',
        text: "I encountered a high-traffic connection error. Please verify your system parameters or send your message again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatSessions(prev => {
        const updated = prev.map(s => {
          if (s.id === activeSessionId) {
            return { ...s, messages: [...s.messages, errorMsg] };
          }
          return s;
        });
        localStorage.setItem('fairaudit_chat_sessions', JSON.stringify(updated));
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  };

  // Auth Submit Action
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeLegal) {
      setAuthError('You must agree to the Terms and Conditions and Privacy Policy to proceed.');
      return;
    }
    if (!authEmail || !authPassword) {
      setAuthError('Please fill out all credential inputs.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'login') {
        const session = await AuthService.signInWithEmail(authEmail, authPassword);
        setCurrentUser(session);
      } else {
        const session = await AuthService.signUpWithEmail(authEmail, authPassword, authName);
        setCurrentUser(session);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign in with Google Popup helper
  const handleGoogleSignIn = async () => {
    if (!agreeLegal) {
      setAuthError('You must agree to the Terms and Conditions and Privacy Policy to proceed.');
      return;
    }
    setAuthError(null);
    try {
      const session = await AuthService.signInWithGoogle();
      setCurrentUser(session);
    } catch (err: any) {
      setAuthError(err.message || 'Google Auth connection failed.');
    }
  };

  // Sign in as Guest helper
  const handleGuestSignIn = async () => {
    if (!agreeLegal) {
      setAuthError('You must agree to the Terms and Conditions and Privacy Policy to proceed.');
      return;
    }
    setAuthError(null);
    try {
      const session = await AuthService.signInGuest();
      setCurrentUser(session);
    } catch (err: any) {
      setAuthError(err.message || 'Guest session initialization failed.');
    }
  };

  // Logout Trigger
  const handleLogout = async () => {
    await AuthService.signOut();
    setCurrentUser(null);
  };

  // PDF printer trigger helper
  const handlePrintExport = (moduleName: string, score: number | string, findings: any) => {
    setPrintData({
      module: moduleName,
      score,
      findings,
      projectName
    });
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Render Formatted Message Markdown helper to display styled items instead of clear text
  const renderMessageBubbleText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-[13px] font-medium font-sans">
        {lines.map((line, lIdx) => {
          // Handle standard bullet points list
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const content = line.trim().substring(2);
            return (
              <div key={lIdx} className="flex gap-2 pl-3 items-start my-0.5">
                <span className="text-indigo-500 mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="flex-1 text-slate-705 dark:text-slate-300">{renderFormattedLine(content)}</span>
              </div>
            );
          }
          // Handle numbered bullet point list
          const numberedMatch = line.trim().match(/^(\d+)\.\s(.*)/);
          if (numberedMatch) {
            const num = numberedMatch[1];
            const content = numberedMatch[2];
            return (
              <div key={lIdx} className="flex gap-2 pl-3 items-start my-0.5">
                <span className="font-bold text-xs text-indigo-500 mt-0.5 font-mono">{num}.</span>
                <span className="flex-1 text-slate-705 dark:text-slate-300">{renderFormattedLine(content)}</span>
              </div>
            );
          }
          // Default textual paragraph line
          return (
            <p key={lIdx} className="min-h-[1em] text-slate-700 dark:text-slate-300">
              {renderFormattedLine(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderFormattedLine = (line: string) => {
    const parts = [];
    let currentIndex = 0;
    // match **bold**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;

    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > currentIndex) {
        parts.push(line.substring(currentIndex, match.index));
      }
      parts.push(
        <strong key={match.index} className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1 rounded mx-0.5 border border-slate-200/50 dark:border-slate-750">
          {match[1]}
        </strong>
      );
      currentIndex = boldRegex.lastIndex;
    }

    if (currentIndex < line.length) {
      parts.push(line.substring(currentIndex));
    }

    return parts.length > 0 ? parts : line;
  };

  // Custom Chart Drawer for Project Timeline
  const renderTimelineChart = () => {
    const entries = timelineData[selectedTimelineProject] || [];
    if (entries.length === 0) {
      return (
        <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
          No historical scanning trends logged for this project yet. Write any audit report with this Project Name to trace its improvements.
        </div>
      );
    }

    const width = 600;
    const height = 220;
    const padding = 35;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = 100;
    const points = entries.map((entry, idx) => {
      const x = padding + (idx / Math.max(1, entries.length - 1)) * chartWidth;
      const scoreNum = Number(entry.biasScore) || 0;
      const y = padding + chartHeight - (scoreNum / maxVal) * chartHeight;
      return { x, y, score: scoreNum, date: entry.date, module: entry.module };
    });

    const pathD = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    return (
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full overflow-x-auto min-w-0">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto text-slate-100 dark:text-slate-900 overflow-visible font-sans max-w-2xl mx-auto">
            {[0, 30, 40, 70, 100].map((level, idx) => {
              const y = padding + chartHeight - (level / maxVal) * chartHeight;
              let lineStyle = 'stroke-slate-100 dark:stroke-slate-800';
              if (level === 40) lineStyle = 'stroke-yellow-250/30';
              if (level === 70) lineStyle = 'stroke-red-250/30';
              return (
                <g key={idx}>
                  <line x1={padding} y1={y} x2={width - padding} y2={y} className={`${lineStyle} stroke-dashed`} strokeWidth="1" />
                  <text x={padding - 8} y={y + 4} className="text-[10px] font-bold fill-slate-400 dark:fill-slate-550 text-right font-mono" textAnchor="end">{level}</text>
                </g>
              );
            })}

            {points.length > 0 && (
              <path
                d={`${pathD} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`}
                fill="url(#trendGrad)"
                opacity="0.15"
              />
            )}

            {points.length > 0 && (
              <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {points.map((p, idx) => {
              const color = p.score > 70 ? '#ef4444' : p.score >= 40 ? '#eab308' : '#22c55e';
              return (
                <g key={idx} className="group cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="6" fill="#ffffff" stroke={color} strokeWidth="2.5" />
                  <circle cx={p.x} cy={p.y} r="10" fill="transparent" className="hover:fill-[#6366f1]/5" />
                  <text x={p.x} y={p.y - 12} className="text-[10px] font-extrabold fill-slate-800 dark:fill-slate-205 text-anchor shadow-sm opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 px-1 font-mono" textAnchor="middle">
                    {p.score}%
                  </text>
                  <text x={p.x} y={height - 10} className="text-[9px] font-bold fill-slate-450 dark:fill-slate-500 font-mono" textAnchor="middle">
                    {p.date}
                  </text>
                </g>
              );
            })}

            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="w-full md:w-56 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 justify-between self-stretch">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Trend Insights</h4>
            <div className="mt-2 text-2xl font-black text-slate-800 dark:text-white font-mono">
              {entries.length} audits
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              Historical scoring tracks regression risks and improvements of project algorithms.
            </p>
          </div>
          <div className="border-t border-slate-205 dark:border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Latest Status</span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                entries[entries.length - 1]?.biasScore > 70 ? 'bg-red-500' :
                entries[entries.length - 1]?.biasScore >= 40 ? 'bg-yellow-500' :
                'bg-green-500'
              }`} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                {entries[entries.length - 1] ? `Score ${entries[entries.length - 1].biasScore}%` : 'No data'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If a shared public report is accessed cleanly
  if (loadingShared) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Retrieving Shared FairAudit Report Card...</h3>
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Downloading encrypted findings safely from secure database.</p>
      </div>
    );
  }

  if (activeSharedId && sharedReport) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col gap-6 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 dark:bg-slate-100 rounded-xl flex items-center justify-center">
                <Sparkles className="text-white dark:text-slate-900 w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">FairAudit AI Certificate</h1>
                <p className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest">{sharedReport.module} Audit Report</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                setActiveSharedId(null);
                setSharedReport(null);
              }}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-905 dark:hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Platform
            </button>
          </div>

          <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-black text-indigo-400 tracking-widest block mb-1">Authenticated Verification</span>
              <h2 className="text-2xl font-bold font-sans">Verified AI Integrity Report Card</h2>
              <p className="text-slate-300 dark:text-slate-400 text-sm font-medium mt-1">This specific AI system was analyzed on our certified platform.</p>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">Verified ID: #{sharedReport.id} • Posted: {sharedReport.timestamp}</p>
            </div>
            <div className="w-24 h-24 rounded-full border-4 border-slate-800 bg-slate-900 flex flex-col justify-center items-center text-center">
              <span className={`text-3xl font-black font-mono ${sharedReport.biasScore > 70 ? 'text-red-400' : sharedReport.biasScore >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                {sharedReport.biasScore}
              </span>
              <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 mt-0.5">Bias Risk</span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 dark:border-slate-800 pb-2">Findings Context</h3>
              <p className="text-slate-650 dark:text-slate-300 text-sm font-medium leading-relaxed">{sharedReport.findings?.explanation || 'No plain-language summary was provided.'}</p>
            </div>

            {sharedReport.findings?.flagged_columns && sharedReport.findings.flagged_columns.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-2">Flagged Attributes</h3>
                <div className="flex flex-wrap gap-2">
                  {sharedReport.findings.flagged_columns.map((col: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-semibold">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sharedReport.findings?.recommendations && sharedReport.findings.recommendations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-3">Certified Actions</h3>
                <ol className="space-y-2">
                  {sharedReport.findings.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs font-medium text-slate-705 dark:text-slate-300 flex gap-2">
                      <span className="w-5 h-5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center font-bold flex-shrink-0 font-mono">{idx+1}</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <p className="text-[11px] text-center text-slate-400 dark:text-slate-550 font-medium italic mt-4 border-t border-slate-50 dark:border-slate-800 pt-4">
            Generated by FairAudit AI Regulatory Suite. Persistent cloud-backed system audits.
          </p>
        </div>
      </div>
    );
  }

  // --- RENDERING OF DUAL-PANE SECURE LOGIN PAGE GATE ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden w-full relative">
        
        {/* Left Side: Product Art/Banner Panel */}
        <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] border-r border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-650 rounded-xl flex items-center justify-center">
              <Sparkles className="text-white w-5.5 h-5.5" />
            </div>
            <span className="text-lg font-black font-display tracking-tight text-white">FairAudit AI</span>
          </div>

          <div className="space-y-6 max-w-lg z-10">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block">
              GDPR & EU AI ACT COMPLIANCE
            </span>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-none text-white font-display">
              Catch AI bias before it harms real people.
            </h1>
            <p className="text-sm lg:text-base text-slate-400 font-medium leading-relaxed">
              Our automated regulatory algorithms isolate proxy demographics, audit CV resume pipelines, and trace weight risk distributions safely.
            </p>
            <div className="space-y-3 pt-4 border-t border-slate-805">
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-350">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Durable Firebase cloud backends & auth gates
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-350">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Pre-loaded COMPAS and Adult Income templates
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-350">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                Instant certified PDF compliance downloads
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            © 2026 FairAudit AI System. All regulatory guidelines preserved.
          </div>
          
          {/* Decorative background grid pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        {/* Right Side: Credentials Container */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 z-10 bg-white dark:bg-slate-905 w-full">
          <div className="max-w-md w-full mx-auto space-y-8">
            
            {/* Header branding for mobile screen view */}
            <div className="md:hidden flex flex-col items-center mb-6">
              <div className="w-12 h-12 bg-indigo-650 rounded-2xl flex items-center justify-center mb-3">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-black font-display tracking-tight text-slate-800 dark:text-white">FairAudit AI</span>
            </div>

            <div className="text-center md:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
                {authMode === 'login' ? 'Sign in to Console' : 'Register Auditor Account'}
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                {authMode === 'login' ? "New to FairAudit? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  {authMode === 'login' ? 'Create an account' : 'Sign in here'}
                </button>
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-8 space-y-4">
              {authMode === 'signup' && (
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <UserIcon className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Auditor Full Name"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-700 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition-all"
                  />
                </div>
              )}

              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-700 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition-all"
                />
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-700 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition-all"
                />
              </div>

              {/* Checkbox for Terms and Policy */}
              <div className="flex items-start gap-2.5 py-1 text-left">
                <input
                  id="agree-legal"
                  type="checkbox"
                  checked={agreeLegal}
                  onChange={(e) => setAgreeLegal(e.target.checked)}
                  className="mt-0.5 rounded border-slate-200 dark:border-slate-850 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 w-4.5 h-4.5 flex-shrink-0"
                />
                <label htmlFor="agree-legal" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-normal select-none cursor-pointer">
                  I agree to the <button type="button" onClick={() => setLegalDocType('terms')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer">Terms & Conditions</button> and <button type="button" onClick={() => setLegalDocType('privacy')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer">Privacy Policy</button>.
                </label>
              </div>

              {authError && (
                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3.5 rounded-xl border border-red-100 dark:border-red-950/40 text-[11px] sm:text-xs font-bold leading-normal flex items-center gap-1.5">
                  <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-705 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    Authenticating credentials...
                  </>
                ) : (
                  <>
                    {authMode === 'login' ? 'Proceed with Login' : 'Complete Registration'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Or connect via single sign-on</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.12-3.12C17.43 1.68 14.9 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.81 2.96c.9-2.7 3.42-4.42 6.69-4.42z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.45c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.38-4.87 3.38-8.5z"/>
                  <path fill="#FBBC05" d="M5.31 14.54c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.5 7.22C.54 9.15 0 11.3 0 13.5s.54 4.35 1.5 6.28l3.81-2.96z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.51 1.18-4.3 1.18-3.27 0-5.79-1.72-6.69-4.42l-3.81 2.96C3.39 20.35 7.35 23 12 23z"/>
                </svg>
                Continue using Google
              </button>

              <button
                type="button"
                onClick={handleGuestSignIn}
                className="w-full py-3 bg-indigo-50/50 hover:bg-indigo-100/50 dark:bg-slate-900/60 dark:hover:bg-slate-850 text-indigo-700 dark:text-indigo-400 font-bold text-xs sm:text-sm rounded-xl border border-indigo-100/30 dark:border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <UserIcon className="w-4 h-4 text-indigo-650 dark:text-indigo-400" />
                Access Dashboard as Guest
              </button>
            </div>

            {/* Legal compliance links footer */}
            <div className="text-center pt-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider space-x-2">
                <button 
                  type="button" 
                  onClick={() => setLegalDocType('terms')} 
                  className="hover:text-indigo-650 cursor-pointer transition-colors"
                >
                  Terms and Conditions
                </button>
                <span>•</span>
                <button 
                  type="button" 
                  onClick={() => setLegalDocType('privacy')} 
                  className="hover:text-indigo-650 cursor-pointer transition-colors"
                >
                  Privacy Policy
                </button>
              </p>
            </div>

          </div>
        </div>
        
        {/* Toggleable Legal modals */}
        <LegalDocModal type={legalDocType} onClose={() => setLegalDocType(null)} />
      </div>
    );
  }

  // --- RENDERING OF FULL-DASHBOARD APPLICATION FRAME ---
  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 print:p-0 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 ${isDarkMode ? 'dark' : ''} flex flex-col relative w-full overflow-x-hidden`}>
      
      {/* Dynamic printable overlay target */}
      {printData && (
        <div className="hidden print:block max-w-4xl mx-auto p-12 bg-white text-black font-sans print-block min-h-screen">
          <div className="border-4 border-double border-slate-900 p-8 rounded-2xl text-center relative">
            <div className="absolute top-4 right-4 text-[9px] font-mono border border-black px-2 py-0.5 rounded">
              FORMAL AUDIT RECOGNITION
            </div>
            
            <h1 className="text-3xl font-extrabold uppercase tracking-tight font-display text-slate-900 mb-1">FairAudit AI Certified Ledger</h1>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Security & Decisive Parity Audit Clearance Document</p>
            
            <div className="my-8 flex justify-center">
              <div className="border-2 border-slate-900 p-6 rounded-full w-28 h-28 flex flex-col items-center justify-center">
                <span className="text-4xl font-black font-mono">{printData.score}</span>
                <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5 text-slate-550">Bias Risk Level</span>
              </div>
            </div>

            <div className="text-left space-y-4 max-w-xl mx-auto border-t border-slate-200 pt-6">
              <p className="border-b border-slate-100 pb-2 text-sm flex justify-between">
                <strong>Project Compliance Track:</strong> <span>{printData.projectName}</span>
              </p>
              <p className="border-b border-slate-100 pb-2 text-sm flex justify-between">
                <strong>Target Audit Module:</strong> <span>{printData.module}</span>
              </p>
              <p className="border-b border-slate-100 pb-2 text-sm flex justify-between">
                <strong>Time Statement:</strong> <span>{new Date().toLocaleString()}</span>
              </p>
              
              <div className="pt-2">
                <strong className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Technical Findings Context</strong>
                <p className="text-slate-700 text-sm font-semibold leading-relaxed">
                  {printData.findings?.explanation || 'Statistical variables checked. Recommended algorithmic alignment rules applied successfully.'}
                </p>
              </div>

              {printData.findings?.flagged_columns && printData.findings.flagged_columns.length > 0 && (
                <div className="pt-2">
                  <strong className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1">Checked Flagged Proxy Attributes</strong>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {printData.findings.flagged_columns.map((c: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 border border-slate-300 text-xs font-bold font-mono rounded bg-slate-50">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {printData.findings?.recommendations && printData.findings.recommendations.length > 0 && (
                <div className="pt-2">
                  <strong className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1">Corrective Compliance Actions</strong>
                  <ul className="list-decimal pl-5 space-y-1.5 mt-2 text-xs font-semibold text-slate-650">
                    {printData.findings.recommendations.map((r: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-12 pt-8 border-t border-slate-300 flex flex-col sm:flex-row justify-between text-[11px] font-mono text-slate-400 gap-2">
              <span>Assessed Framework: FairAudit AI Automated Compliance Hub</span>
              <span>Verification Hash: {(Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9)).toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary user interface hidden entirely during print to prevent trailing pages or double renders */}
      <div className="print:hidden flex flex-col flex-1 w-full relative">

      {/* Primary Landing / Top Header Dashboard Config Bar */}
      <div className="max-w-7xl mx-auto w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-8 flex flex-col lg:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-650 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <SparklingIcon className="w-5.25 h-5.25 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#6366f1] uppercase block leading-none">Enterprise Suite</span>
              <h1 className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight leading-snug font-display">FairAudit AI Hub</h1>
            </div>
          </div>

          {/* Quick theme status, user sign-out and theme triggers */}
          <div className="flex items-center gap-2 lg:hidden">
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-550 dark:text-slate-300 transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100/60 transition-colors cursor-pointer"
              title="Log out session"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Desktop control tray inputs and user stats */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap hidden sm:inline">Project Track</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="E.g. Workspace Recruitment Group"
              className="w-full sm:w-64 bg-slate-50 dark:bg-slate-910 border border-slate-201 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-350 font-bold focus:ring-2 focus:ring-slate-300 outline-none transition-all dark:bg-slate-850"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end sm:justify-start">
            <button 
              onClick={() => {
                setOnboardingStep(1);
                setShowOnboarding(true);
              }}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              title="Launch onboarding tutorial wizard"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Desktop Only header controls */}
            <div className="hidden lg:flex items-center gap-2">
              <button 
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-755 text-slate-550 dark:text-slate-300 transition-colors cursor-pointer"
                title="Toggle visual theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] overflow-hidden">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="text-left leading-none max-w-24 overflow-hidden text-ellipsis">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block font-mono">Auditor</span>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 truncate block">{currentUser.displayName}</span>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100/60 dark:hover:bg-red-950/40 transition-colors cursor-pointer border border-red-100 dark:border-red-900/30"
                title="Sign out of Auditing System"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 print:hidden">
        {currentModule === 'landing' && (
          <LandingPage onSelectModule={setCurrentModule} />
        )}
        {currentModule === 'resume' && (
          <ResumeScreening 
            onBack={() => setCurrentModule('landing')} 
            onAuditComplete={(score, verdict) => { addHistory('Hiring / Recruitment', score, verdict); }}
            onPrintExport={(score, findings) => handlePrintExport('Hiring / Recruitment', score, findings)}
          />
        )}
        {currentModule === 'dataset' && (
          <DatasetScanner 
            onBack={() => setCurrentModule('landing')} 
            onAuditComplete={(score, verdict, details) => { addHistory('Dataset Scanner', score, verdict, details); }}
            autoLoadCOMPAS={autoRunCOMPAS}
            onConsumeCOMPASReset={() => setAutoRunCOMPAS(false)}
            onPrintExport={(score, findings) => handlePrintExport('Dataset Scanner', score, findings)}
          />
        )}
        {currentModule === 'decision' && (
          <DecisionAudit 
            onBack={() => setCurrentModule('landing')} 
            checklistResult={checklistResult}
            onAuditComplete={(score, verdict, details) => { addHistory('Decision Auditor', score, verdict, details); }}
            onPrintExport={(score, findings) => handlePrintExport('Decision Auditor', score, findings)}
          />
        )}
        {currentModule === 'checklist' && (
          <Checklist 
            onBack={() => setCurrentModule('landing')} 
            onChecklistComplete={(result) => {
              setChecklistResult(result);
              addHistory('Checklist Tracker', 'N/A', result.readiness, result);
            }}
          />
        )}
      </div>

      {/* FEATURE 5 — Timeline Visualizer Dashboard (Rendered under history list) */}
      <div className="mt-16 max-w-7xl mx-auto w-full print:hidden">
        {Object.keys(timelineData).length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 mb-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 font-display">
                  <Database className="w-5 h-5 text-indigo-500" />
                  Bias timeline Tracker
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Track bias scores of operational groups across cycles</p>
              </div>

              <select
                value={selectedTimelineProject}
                onChange={(e) => setSelectedTimelineProject(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none w-56 appearance-none shadow-sm cursor-pointer"
              >
                {Object.keys(timelineData).map((proj, idx) => (
                  <option key={idx} value={proj}>{proj}</option>
                ))}
              </select>
            </div>

            {renderTimelineChart()}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Audit History Log</h2>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors flex items-center gap-2 bg-red-50 hover:bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Wipe Audit logs
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-550 bg-slate-50/50 dark:bg-slate-850/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p>No historic audits conducted on this session workspace yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-4">Project Name</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-650 dark:text-indigo-400">{item.projectName}</td>
                      <td className="px-6 py-4 font-medium text-slate-400 dark:text-slate-500">{item.time}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{item.module}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white font-mono">{item.score}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black leading-5 uppercase ${
                          item.verdict === 'FAIR' || item.verdict === 'READY' || item.verdict === 'COMPLETED' ? 'bg-green-105 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-400 border border-green-100 dark:border-green-900/30' :
                          item.verdict === 'HIGH RISK' || item.verdict === 'NOT READY' || item.verdict === 'BIASED' || item.verdict === 'POTENTIALLY BIASED' ? 'bg-red-105 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30' :
                          'bg-yellow-105 bg-yellow-50 text-yellow-850 dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-905/30'
                        }`}>
                          {item.verdict}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <p className="text-[10px] text-center text-slate-450 mt-6 font-medium italic">
            Note: Audits are dynamically synced and backed up client and cloud.
          </p>
        </div>

        {/* Global legal disclaimer footer links */}
        <footer className="text-center pt-8 pb-12 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest space-x-2 border-t border-slate-100 dark:border-slate-850">
          <button type="button" onClick={() => setLegalDocType('terms')} className="hover:text-indigo-600 transition-colors cursor-pointer">Terms & Conditions</button>
          <span>•</span>
          <button type="button" onClick={() => setLegalDocType('privacy')} className="hover:text-indigo-600 transition-colors cursor-pointer">Privacy Policy</button>
        </footer>
      </div>

      {/* Toggled Footer legal modals */}
      <LegalDocModal type={legalDocType} onClose={() => setLegalDocType(null)} />

      {/* MULTI-SESSION COMPREHENSIVE AI COMPANION SYSTEM */}
      <>
        {/* Floating Bubble Trigger: ALWAYS visible in all pages to satisfy requirement */}
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all z-40 cursor-pointer border border-indigo-400 print:hidden"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
          </span>
        </button>

        {/* Sliding Chat Drawer */}
        <div className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white dark:bg-slate-905 shadow-2x border-l border-slate-150 dark:border-slate-800 transform transition-transform duration-300 flex flex-row overflow-hidden print:hidden z-[90] ${chatOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'}`}>
          
          {/* SESSIONS COLLAPSIBLE BACKBOARD */}
          <div className={`absolute inset-y-0 left-0 w-[190px] bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-3.5 space-y-4 flex flex-col text-left z-30 transition-transform duration-300 shadow-xl ${showSessionsList ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">Conversations</span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleNewChat}
                  className="p-1 rounded bg-indigo-600 hover:bg-indigo-705 text-white transition-all cursor-pointer"
                  title="Create a new fresh chat session"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setShowSessionsList(false)}
                  className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  title="Hide List"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
              {chatSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setShowSessionsList(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold leading-normal group block transition-all cursor-pointer ${
                    activeSessionId === session.id 
                      ? 'bg-indigo-600 text-white shadow-sm font-bold' 
                      : 'bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="truncate font-bold max-w-full leading-5 flex items-center gap-1">
                    <Sparkle className={`w-3 h-3 flex-shrink-0 ${activeSessionId === session.id ? 'text-white' : 'text-indigo-500'}`} />
                    <span className="truncate">{session.title}</span>
                  </div>
                  <div className={`text-[8px] mt-1 font-mono font-bold block ${activeSessionId === session.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                    Active: {session.timestamp}
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={() => {
                handleNewChat();
                setShowSessionsList(false);
              }}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Session
            </button>
          </div>

          {/* ACTIVE DISCUSSION BOARD */}
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 relative">
            <header className="p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0 z-10">
              <div className="flex items-center gap-2 text-left">
                {/* Slidable history button connector */}
                <button 
                  onClick={() => setShowSessionsList(!showSessionsList)}
                  className={`p-1.5 rounded-lg hover:bg-indigo-850 transition-all flex items-center gap-1 border cursor-pointer ${showSessionsList ? 'bg-indigo-600 text-white border-indigo-400' : 'border-slate-800 bg-slate-950/40 text-slate-450'}`}
                  title="Toggle Conversations Drawer"
                >
                  <History className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-black tracking-wide hidden sm:inline">History</span>
                </button>
                <Sparkles className="text-indigo-400 w-5 h-5 animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight leading-none text-white font-display">Ask FairAudit AI</h3>
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Dual-Parity Assistant</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setChatOpen(false);
                  setShowSessionsList(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-450 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Mobile Chat Session Control Header (Visible only on mobile screen widths) */}
            <div className="sm:hidden flex items-center justify-between p-2 px-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <select
                value={activeSessionId || ''}
                onChange={(e) => setActiveSessionId(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-1.5 rounded-lg text-slate-700 dark:text-slate-300 outline-none w-48 cursor-pointer"
              >
                {chatSessions.map((session) => (
                  <option key={session.id} value={session.id}>{session.title}</option>
                ))}
              </select>

              <button
                onClick={handleNewChat}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-705 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 p-3 flex flex-col gap-1 text-[10px] text-slate-500 font-bold text-left flex-shrink-0">
              <div>Active Scope: <span className="text-slate-800 dark:text-slate-300">{projectName}</span></div>
              <div>Audit Module: <span className="text-slate-850 dark:text-indigo-400">{currentModule.toUpperCase()} checks</span></div>
            </div>

            {/* Chat Messages flow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-left bg-slate-50/40 dark:bg-slate-910/20">
              {chatSessions.find(s => s.id === activeSessionId)?.messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl p-3.5 text-slate-800 dark:text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] border transition-colors ${
                    m.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-700 font-semibold' 
                      : 'bg-white dark:bg-black border-slate-200/70 dark:border-slate-800/80 rounded-tl-none'
                  }`}>
                    {m.sender === 'user' ? (
                      <p className="text-xs sm:text-[13px] leading-relaxed font-semibold">{m.text}</p>
                    ) : (
                      renderMessageBubbleText(m.text)
                    )}
                    <div className={`text-[8.5px] mt-2 text-right opacity-50 font-mono font-bold ${m.sender === 'user' ? 'text-indigo-150' : 'text-slate-450 dark:text-slate-500'}`}>{m.timestamp}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 bg-white dark:bg-black border border-slate-150 dark:border-slate-800 text-slate-500 text-xs font-bold rounded-2xl px-4 py-3 rounded-tl-none">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    Assistant is audit-checking findings...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Field form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800 flex items-center gap-2 flex-shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask e.g. 'What is disparate impact ratio threshold?'"
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 dark:text-white font-semibold transition-shadow"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading || !activeSessionId}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>

        </div>
      </>

      {/* Onboarding Tutorial Modal Layout */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-2xl relative flex flex-col gap-6">
            
            {/* Progress Bar Dots */}
            <div className="flex items-center justify-between w-full border-b border-slate-50 dark:border-slate-800 pb-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#6366f1] flex items-center gap-1 font-display">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                FairAudit AI Tutorial
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((step) => (
                  <span 
                    key={step} 
                    className={`h-2 rounded-full transition-all duration-300 ${onboardingStep === step ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} 
                  />
                ))}
              </div>
            </div>

            {/* STEP 1: Conceptual */}
            {onboardingStep === 1 && (
              <div className="flex flex-col gap-4 text-left">
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">What is AI Bias?</h3>
                <p className="text-slate-650 dark:text-slate-300 text-sm font-medium leading-relaxed">
                  AI systems learn from historic real-world data, which often contains systemic inequalities. If left unchecked, these machine learning algorithms reproduce and amplify discrimination in hiring, loans, and justice. FairAudit AI intercepts this bias, scanning your models, datasets, and decisions to guarantee legal and ethical compliance.
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 flex gap-3 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400 mt-2">
                  <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  We audit across three modular pillars: CV resume screenings, whole training datasets, and background decision patterns.
                </div>
              </div>
            )}

            {/* STEP 2: Demo COMPAS */}
            {onboardingStep === 2 && (
              <div className="flex flex-col gap-4 text-left">
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">Real-World Case Study Audit</h3>
                <p className="text-slate-650 dark:text-slate-300 text-sm font-medium leading-relaxed">
                  Let's see FairAudit AI in action. Famous scoring algorithms like COMPAS (criminal recidivism classification) have displayed deep racial disparities under disparate impact tests in the wild.
                </p>
                <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 text-xs font-semibold text-indigo-700 dark:text-indigo-300 leading-relaxed max-h-32 overflow-y-auto">
                  <strong>Exposed Scandal:</strong>
                  <br />
                  COMPAS was twice as likely to falsely flag Black defendants as high risk than white candidates, violating standard civil legal parity and demographics.
                </div>
                <button
                  type="button"
                  onClick={() => completeOnboarding(true)}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl py-3.5 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  Analyze COMPAS Dataset instantly ⚡
                </button>
              </div>
            )}

            {/* STEP 3: Own Datasets Guidance */}
            {onboardingStep === 3 && (
              <div className="flex flex-col gap-4 text-left">
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tracking-tight font-display">Try Your Own Data Flow</h3>
                <p className="text-slate-650 dark:text-slate-300 text-sm font-medium leading-relaxed">
                  Great! You witnessed how COMPAS fails mathematical parity tests. Now it's your turn. Upload your own CSV datasets or paste mock decisions to audit legal compliance across banking, hiring, healthcare, or criminal justice.
                </p>
                <button
                  type="button"
                  onClick={() => completeOnboarding(false)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  Upload Your Audit Data Now
                </button>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4 mt-2">
              <button
                onClick={() => completeOnboarding(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Skip Tutorial
              </button>
              
              {onboardingStep < 3 ? (
                <button
                  onClick={() => setOnboardingStep(onboardingStep + 1)}
                  className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-750 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-bold transition-colors cursor-pointer animate-pulse"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  onClick={() => completeOnboarding(false)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Get Started
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      </div>
    </div>
  );
}

// Helpers for Lucide custom items
function SparklingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z" />
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" />
    </svg>
  );
}
