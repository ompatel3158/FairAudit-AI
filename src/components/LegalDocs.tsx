import React from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface LegalDocModalProps {
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export default function LegalDocModal({ type, onClose }: LegalDocModalProps) {
  if (!type) return null;

  const isTerms = type === 'terms';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-2xl relative flex flex-col max-h-[85vh]">
        <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-black tracking-tight">
              {isTerms ? 'Terms and Conditions' : 'Privacy Policy'}
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-155 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-xs sm:text-sm font-medium leading-relaxed space-y-4 text-slate-500 dark:text-slate-300">
          {isTerms ? (
            <>
              <p className="font-bold text-slate-700 dark:text-slate-200">
                Last Updated: June 8, 2026
              </p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2">1. Agreement to Terms</h3>
              <p>
                By accessing or using the FairAudit AI Compliance Suite, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not access or utilize the service in any capacity.
              </p>
              
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">2. Licensing and Scope</h3>
              <p>
                We grant you a limited, non-exclusive, non-transferable, revocable license to use the Platform for lawful AI auditing, compliance evaluation, and educational testing. Reselling generated reports as certified legal claims is strictly prohibited without authorized agency approval.
              </p>

              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">3. Uploaded Assets and Privacy</h3>
              <p>
                You represent and warrant that you hold all proprietary rights, licenses, or compliance permits for any CSV datasets, algorithms, or candidate resumes uploaded to FairAudit AI. You are strictly forbidden from uploading clear, non-anonymized PII datasets of unauthorized third parties.
              </p>

              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">4. Algorithmic Disclaimer</h3>
              <p>
                FairAudit AI provides objective scans, statistical proxies, compliance certificates, and LLM-assisted ethical feedback with highest fidelity. However, we do not provide certified legal counsel. Compliance scores and mitigation suggestions do not guarantee complete immunity from judicial investigation or statutory discrimination lawsuits.
              </p>

              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">5. Limitation of Liability</h3>
              <p>
                Under no circumstances shall FairAudit AI or its affiliates be liable for any indirect, incidental, consequential, special, or exemplary damages, including but not limited to loss of profits, data, goodwill, or operational penalties arising from automated deployment decisions.
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-slate-700 dark:text-slate-200">
                Last Updated: June 8, 2026
              </p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2">1. Information We Collect</h3>
              <p>
                We collect essential system telemetry, uploaded resume texts (for instant anonymization parsing), CSV dataset metadata structures (column names, statistical values, risk evaluations), and user profile details (email addresses and names supplied via Firebase or Google Sign-In) to deliver authentic compliance monitoring.
              </p>

              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">2. Data Isolation and Storage</h3>
              <p>
                All uploaded resume texts and raw CSV rows are cleared from memory immediately upon completion of active analytical cycles. Handled files are processed client-side or securely proxied to Gemini API servers without logging raw, clear textual representations. Group information mapped for sharing is stored in secure Firebase databases under strict access rules.
              </p>

              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">3. Shared Report Records</h3>
              <p>
                When you explicitly choose to create a shareable report link, specific structural data (bias scores, plain text summaries, list of flagged attributes, and audit modules) is compiled into a portable URL format or persisted securely inside public Firestore instances. These files can be viewed by anyone wielding your specific 6-character identifier.
              </p>

              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">4. Security Standards</h3>
              <p>
                We employ standard modern TLS encryption, HTTPS, zero-trust cloud configuration gates, and restricted database security rules to prevent unauthorized leaking, database scraping, or identity masquerading.
              </p>

              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">5. Your Legal Rights</h3>
              <p>
                You may update your profile displayName, purge local audit history records, clear your saved conversations, or request permanent deletion of cloud-backed shared entries at any time by contacting our system developers or resetting local platform configurations.
              </p>
            </>
          )}
        </div>

        <footer className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 flex-shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-bold rounded-2xl transition-colors cursor-pointer"
          >
            I Acknowledge
          </button>
        </footer>
      </div>
    </div>
  );
}
