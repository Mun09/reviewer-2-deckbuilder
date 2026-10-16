import React, { useState } from 'react';
import { DocumentSource, VerificationAttempt } from '../types/game';
import { verifyQuoteInDocument } from '../services/citationVerifier';
import { soundEngine } from '../utils/soundEngine';
import {
  AlertOctagon,
  CheckCircle2,
  Cpu,
  FileCheck2,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

interface VerificationLoopModalProps {
  isOpen: boolean;
  doc: DocumentSource;
  auditLog: VerificationAttempt[];
  usedLiveApi: boolean;
  onAddManualVerificationTest: (attempt: VerificationAttempt) => void;
  onClose: () => void;
}

export const VerificationLoopModal: React.FC<VerificationLoopModalProps> = ({
  isOpen,
  doc,
  auditLog,
  usedLiveApi,
  onAddManualVerificationTest,
  onClose,
}) => {
  const [testQuote, setTestQuote] = useState(
    'We evaluated our model on 10,000 quantum processors and achieved 99.99% accuracy.'
  );

  if (!isOpen) return null;

  const passedCount = auditLog.filter((a) => a.verified).length;
  const rejectedCount = auditLog.filter((a) => !a.verified).length;

  const handleRunLiveVerifierTest = (quoteToTest: string, titleLabel: string) => {
    const check = verifyQuoteInDocument(quoteToTest, doc);
    if (check.verified) {
      soundEngine.playVerifierPass();
    } else {
      soundEngine.playVerifierReject();
    }

    const newAttempt: VerificationAttempt = {
      id: `manual_test_${Date.now()}`,
      roundNumber: auditLog.length + 1,
      candidateAttackTitle: titleLabel,
      candidateDialogue: check.verified
        ? `"Critique approved: grounded verbatim in '${quoteToTest.slice(0, 45)}...' from the manuscript."`
        : `"Attempted to fabricate critique around '${quoteToTest.slice(0, 45)}...', but the Citation Verification Loop caught and discarded the hallucination!"`,
      candidateQuote: quoteToTest,
      verified: check.verified,
      matchType: check.matchType,
      matchScore: check.matchScore,
      matchedLocation: check.matchedLocation,
      matchedCharIndex: check.matchedCharIndex,
      surroundingContext: check.surroundingContext,
      statusMessage: check.statusMessage,
    };

    onAddManualVerificationTest(newAttempt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-4xl bg-[#0c101b] border-2 border-emerald-500/60 rounded-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(16,185,129,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-cinzel text-lg font-extrabold text-emerald-200">
                1M-CONTEXT CITATION VERIFICATION LOOP (ANTI-HALLUCINATION AUDITOR)
              </h3>
              <p className="text-xs text-slate-400">
                &ldquo;Every single boss attack must cite a real sentence from the manuscript. If the quote cannot be verified in the source text, the attack is discarded and regenerated.&rdquo;
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Pipeline Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 mb-5">
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3">
            <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5" /> 1. 1M Context Ingestion
            </div>
            <div className="text-xs text-slate-300">
              Loads the entire manuscript ({doc.tokenEstimate.toLocaleString()} tokens, {doc.sections.length} sections) into active memory
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3">
            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <FileCheck2 className="w-3.5 h-3.5" /> 2. Verbatim Quote Match
            </div>
            <div className="text-xs text-slate-300">
              Verifies whether candidate <code className="text-amber-200">verbatimQuote</code> exists in the source text
            </div>
          </div>
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3">
            <div className="text-[11px] font-bold text-red-300 flex items-center gap-1.5 mb-1">
              <AlertOctagon className="w-3.5 h-3.5" /> 3. Hallucination Discard
            </div>
            <div className="text-xs text-slate-300">
              Unverified critiques (<strong className="text-red-300">{rejectedCount} caught</strong>) are immediately discarded and regenerated
            </div>
          </div>
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3">
            <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 4. Grounded Attack Lock
            </div>
            <div className="text-xs text-slate-300">
              Only 100% source-verified critiques (<strong className="text-emerald-300">{passedCount} approved</strong>) enter combat
            </div>
          </div>
        </div>

        {/* Interactive Live Verification Loop Tester */}
        <div className="bg-[#080b12] border border-amber-500/40 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4" />
              Live Citation Verifier Sandbox (Test Hallucinated Quote vs. Real Manuscript Sentence)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  handleRunLiveVerifierTest(
                    'We evaluated our model on 10,000 quantum processors and achieved 99.99% accuracy.',
                    'Test: Inject Fabricated Hallucination Quote'
                  )
                }
                className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 border border-red-400/60 text-red-200 text-xs font-bold cursor-pointer"
              >
                🧪 Inject Fake Quote (Verify Rejection)
              </button>
              <button
                type="button"
                onClick={() => {
                  const realSnippet =
                    doc.sections[0]?.content.split(/(?<=[.!?])\s+/)[0] ||
                    doc.fullText.slice(0, 90);
                  handleRunLiveVerifierTest(
                    realSnippet,
                    'Test: Inject Real Manuscript Sentence'
                  );
                }}
                className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-400/60 text-emerald-200 text-xs font-bold cursor-pointer"
              >
                ✅ Inject Real Sentence (Verify Approval)
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={testQuote}
              onChange={(e) => setTestQuote(e.target.value)}
              className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 font-mono"
              placeholder="Enter a quote string to test against the manuscript..."
            />
            <button
              type="button"
              onClick={() =>
                handleRunLiveVerifierTest(testQuote, 'Manual User Quote Verification')
              }
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Run Verifier
            </button>
          </div>
        </div>

        {/* Audit Trail List */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Verification Loop Audit Log ({auditLog.length} Candidates Inspected / {usedLiveApi ? 'Gemini Live 1M Context' : '1M Grounded Verifier Engine'})
          </div>
          {auditLog.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl p-3.5 border ${
                item.verified
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-red-950/30 border-red-500/50'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  {item.verified ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[11px] font-extrabold">
                      ✅ VERIFIED &amp; APPROVED (Match {(item.matchScore * 100).toFixed(0)}%)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-red-500/25 border border-red-400 text-red-300 text-[11px] font-extrabold">
                      ❌ HALLUCINATION DISCARDED (Regenerated)
                    </span>
                  )}
                  <span className="text-xs font-bold text-white">
                    {item.candidateAttackTitle}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {item.matchedLocation || 'N/A'}
                </span>
              </div>

              <div className="text-xs font-mono bg-black/50 rounded p-2 mb-1.5 text-slate-300">
                Candidate Quote: &ldquo;{item.candidateQuote}&rdquo;
              </div>

              <div
                className={`text-xs font-semibold ${
                  item.verified ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                ↳ {item.statusMessage}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
