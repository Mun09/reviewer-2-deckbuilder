import React, { useState } from 'react';
import {
  BossAttackIntent,
  DocumentSource,
  LoadedEvidence,
  RebuttalEvaluationResult,
} from '../types/game';
import { evaluateFreeformRebuttal } from '../services/reviewerAiEngine';
import {
  CheckCircle2,
  Feather,
  Flame,
  Loader2,
  Shield,
  Wand2,
  X,
} from 'lucide-react';

interface FreeformRebuttalModalProps {
  isOpen: boolean;
  currentAttack: BossAttackIntent;
  loadedEvidence: LoadedEvidence | null;
  doc: DocumentSource;
  baseCardDamage: number;
  apiKey: string;
  onClose: () => void;
  onCommitRebuttalResult: (result: RebuttalEvaluationResult, text: string) => void;
}

export const FreeformRebuttalModal: React.FC<FreeformRebuttalModalProps> = ({
  isOpen,
  currentAttack,
  loadedEvidence,
  doc,
  baseCardDamage,
  apiKey,
  onClose,
  onCommitRebuttalResult,
}) => {
  const [rebuttalText, setRebuttalText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<RebuttalEvaluationResult | null>(null);

  if (!isOpen) return null;

  const smartTemplates = [
    {
      badge: 'Draft I — Quantitative Experiments & Appendix Metrics',
      text: `We thank Reviewer 2 for the insightful comment. To rigorously validate the condition noted in ${currentAttack.quoteLocation}, we report 5-seed multi-run evaluations (p < 0.002) in Appendix C.2 and Table 4, demonstrating consistent throughput gains and statistical significance over all baselines.`,
    },
    {
      badge: 'Draft II — Architectural Trade-Off & Safety Fallback',
      text: `Regarding "${currentAttack.verbatimQuote}", this design choice bounds single-node memory overhead while guaranteeing sub-millisecond tail latency. Furthermore, our safety fallback mechanism preserves zero accuracy degradation whenever inputs exceed the threshold.`,
    },
    {
      badge: 'Draft III — Direct Manuscript Evidence Alignment',
      text: loadedEvidence
        ? `As explicitly documented in our manuscript (${loadedEvidence.location}): "${loadedEvidence.quote}". This empirical record directly resolves the concern, and we will highlight this analysis prominently in the camera-ready revision.`
        : `Our multi-seed variance analysis in the Experiments section and our anonymized reproducibility package directly verify generalization performance across these regimes.`,
    },
  ];

  const handleEvaluate = async () => {
    if (rebuttalText.trim().length < 5) return;
    setIsEvaluating(true);
    try {
      const res = await evaluateFreeformRebuttal({
        rebuttalText,
        currentAttack,
        loadedEvidence,
        doc,
        baseCardDamage,
        apiKey,
      });
      setEvalResult(res);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#16120e] border-2 border-[#b88f4a] rounded p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-[#e8dcc8] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#8a6d3b]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-[#261c12] border border-[#b88f4a] flex items-center justify-center">
              <Feather className="w-5 h-5 text-[#e0b86c]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#f2dfb3]">
                Author&apos;s Formal Written Rebuttal
              </h3>
              <p className="text-xs font-serif text-[#a8987d]">
                Submit a logical written response grounded in your manuscript to counter Reviewer 2&apos;s critique.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-[#241c16] hover:bg-[#332820] border border-[#6e552c] text-[#d4c3a3] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Attack & Full Verbatim Quote Summary */}
        <div className="bg-[#0e0b09] border border-[#7a2e2e] rounded p-4 mb-4 space-y-2">
          <div className="text-xs font-serif font-bold text-[#d98282]">
            Inquisition Topic: {currentAttack.koreanTitle}
          </div>
          <p className="text-sm font-serif font-bold text-[#f5ead6] leading-relaxed">
            {currentAttack.reviewerDialogue}
          </p>
          <div className="text-xs font-serif text-[#d8c39e] bg-[#17120e] border-l-2 border-[#b88f4a] pl-3 py-1.5 italic leading-relaxed">
            Verbatim Quote ({currentAttack.quoteLocation}): &ldquo;{currentAttack.verbatimQuote}&rdquo;
          </div>
          {loadedEvidence && (
            <div className="text-xs font-serif text-[#c8e0b8] bg-[#162114] border border-[#4d7545] rounded px-3 py-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#85bd7a]" />
              <span>
                Attached Manuscript Evidence: <strong>{loadedEvidence.location}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Rebuttal Drafts */}
        {!evalResult && (
          <>
            <div className="mb-3">
              <div className="text-xs font-serif font-bold text-[#d4a857] mb-2 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                <span>Select a Rebuttal Draft Template (Click to populate and customize freely):</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {smartTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRebuttalText(tpl.text)}
                    className="text-left p-3 rounded bg-[#1f1812] hover:bg-[#2b2119] border border-[#6e552c] hover:border-[#c89d54] transition cursor-pointer"
                  >
                    <div className="text-xs font-serif font-bold text-[#e6c27a] mb-1">
                      {tpl.badge}
                    </div>
                    <p className="text-xs font-serif text-[#cfc0a6] leading-relaxed">
                      {tpl.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Natural Language Textarea */}
            <div className="mb-4">
              <label className="block text-xs font-serif font-bold text-[#d4c3a3] mb-1.5">
                Author&apos;s Rebuttal Statement:
              </label>
              <textarea
                rows={4}
                value={rebuttalText}
                onChange={(e) => setRebuttalText(e.target.value)}
                placeholder="Cite your tables, appendix ablations, or architectural guarantees to dismantle Reviewer 2's critique..."
                className="w-full rounded bg-[#0a0806] border border-[#8a6d3b] focus:border-[#d4a857] focus:outline-none p-3.5 text-sm font-serif text-[#f5ead6] placeholder-[#6e604b] leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded bg-[#241c16] hover:bg-[#332820] border border-[#6e552c] text-[#cbbba0] text-xs font-serif font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEvaluate}
                disabled={isEvaluating || rebuttalText.trim().length < 5}
                className="px-6 py-2.5 rounded bg-gradient-to-b from-[#8a5a1e] to-[#593810] hover:from-[#a36b24] hover:to-[#6e4514] disabled:opacity-50 border border-[#e0b86c] text-[#fff3d6] font-serif font-bold text-sm flex items-center gap-2 shadow-lg cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Area Chair Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Feather className="w-4 h-4" />
                    <span>Submit Written Rebuttal</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Evaluation Result Display */}
        {evalResult && (
          <div className="space-y-4">
            <div
              className={`bg-[#120e0b] border-2 ${
                evalResult.rank === 'F' ? 'border-[#a83838]' : 'border-[#c89d54]'
              } rounded p-4`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded border-2 ${
                      evalResult.rank === 'F'
                        ? 'bg-[#3b1212] border-[#c94a4a] text-[#f5b8b8]'
                        : 'bg-[#2b1f11] border-[#e0b86c] text-[#f7dfb0]'
                    } font-cinzel font-black text-3xl flex items-center justify-center shadow-lg`}
                  >
                    {evalResult.rank}
                  </div>
                  <div>
                    <div className="text-xs font-serif font-bold text-[#c89d54]">
                      AREA CHAIR TRIBUNAL RULING
                    </div>
                    <div className="text-lg font-serif font-bold text-[#f5ead6]">
                      Persuasiveness {evalResult.score}/100 (Multiplier {evalResult.damageMultiplier}x)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded bg-[#2d1414] border border-[#a84444] text-[#f2c2c2] font-serif font-bold text-sm flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#e09252]" />
                    Rebuttal DMG: {evalResult.finalDamage}
                  </div>
                  {evalResult.selfPenaltyDamage ? (
                    <div className="px-3 py-1.5 rounded bg-[#381111] border border-[#c94a4a] text-[#f5b8b8] font-serif font-bold text-sm">
                      Backlash Penalty: -{evalResult.selfPenaltyDamage}
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded bg-[#14222e] border border-[#4c7ca3] text-[#c2dff5] font-serif font-bold text-sm flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#7ab3e0]" />
                      Block: +{evalResult.blockAwarded}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs md:text-sm font-serif text-[#e6d5b8] mb-3 leading-relaxed">
                <strong>Review Evaluation:</strong> {evalResult.logicFeedback}
              </p>

              <div className="bg-[#090706] border border-[#5c2828] rounded p-3 text-xs font-serif text-[#e0b4b4] italic leading-relaxed">
                <strong>Reviewer 2:</strong> {evalResult.reviewerReaction}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEvalResult(null)}
                className="px-4 py-2 rounded bg-[#241c16] hover:bg-[#332820] border border-[#6e552c] text-[#cbbba0] text-xs font-serif font-bold cursor-pointer"
              >
                Revise Draft
              </button>
              <button
                onClick={() => onCommitRebuttalResult(evalResult, rebuttalText)}
                className="px-6 py-2.5 rounded bg-gradient-to-b from-[#8a2424] to-[#521212] hover:from-[#a32c2c] hover:to-[#691717] border border-[#e09252] text-[#fff3d6] font-serif font-bold text-sm flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>
                  {evalResult.rank === 'F'
                    ? 'Accept Ruling (-10 Sanity Penalty)'
                    : `Execute Rebuttal (${evalResult.finalDamage} DMG)`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
