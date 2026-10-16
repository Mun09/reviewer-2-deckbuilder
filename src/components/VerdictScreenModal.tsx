import React from 'react';
import { DocumentSource } from '../types/game';
import { Award, RotateCcw, ShieldAlert, Upload } from 'lucide-react';

interface VerdictScreenModalProps {
  outcome: 'ACCEPT' | 'REJECT' | null;
  reviewScore: number;
  doc: DocumentSource;
  turnsTaken: number;
  totalRebuttalDamage: number;
  criticalCountersLanded: number;
  onRematchSameDoc: () => void;
  onReturnToLobby: () => void;
}

export const VerdictScreenModal: React.FC<VerdictScreenModalProps> = ({
  outcome,
  reviewScore,
  doc,
  turnsTaken,
  totalRebuttalDamage,
  criticalCountersLanded,
  onRematchSameDoc,
  onReturnToLobby,
}) => {
  if (!outcome) return null;

  const isAccept = outcome === 'ACCEPT';
  const tierTitle =
    reviewScore >= 8.5
      ? 'ORAL ACCEPT — TOP 1% DISTINGUISHED PAPER'
      : reviewScore >= 7.0
      ? 'SPOTLIGHT ACCEPT — NOTABLE PAPER'
      : isAccept
      ? 'FINAL VERDICT: CAMERA-READY ACCEPT'
      : 'FINAL VERDICT: REJECT — DESK & TRIBUNAL REJECTION';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div
        className={`w-full max-w-2xl rounded p-7 border-2 text-center shadow-[0_25px_70px_rgba(0,0,0,0.95)] ${
          isAccept
            ? 'bg-gradient-to-b from-[#1c160e] via-[#14100b] to-[#0b0907] border-[#d4a857]'
            : 'bg-gradient-to-b from-[#241010] via-[#160b0b] to-[#0a0606] border-[#a83838]'
        }`}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 border-2 border-[#c89d54] bg-[#0e0b08]">
          {isAccept ? (
            <Award className="w-9 h-9 text-[#e8c67a]" />
          ) : (
            <ShieldAlert className="w-9 h-9 text-[#d96b6b]" />
          )}
        </div>

        <div className="text-xs font-cinzel uppercase tracking-[0.2em] text-[#c89d54] mb-1">
          {doc.venue} • OFFICIAL VERDICT
        </div>
        <h2 className="font-cinzel text-2xl md:text-3xl font-black text-[#f5ead6] mb-2">
          {tierTitle}
        </h2>
        <p className="text-sm font-serif text-[#cbbba0] mb-5 max-w-xl mx-auto leading-relaxed">
          {isAccept ? (
            <>
              Through empirical citations and razor-sharp rebuttals, you silenced every last objection from Reviewer 2 and secured an official review score of{' '}
              <strong className="text-[#e8c67a]">{reviewScore.toFixed(1)} / 10.0</strong>.
            </>
          ) : (
            <>
              Your academic sanity collapsed under Reviewer 2&apos;s relentless verbatim interrogation. Drag matching evidence passages from your manuscript before submitting your rebuttal to shatter his logic shield.
            </>
          )}
        </p>

        {/* Official Score & Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-left">
          <div className="bg-[#0e0b08] border border-[#6e552c] rounded p-3">
            <div className="text-[11px] font-serif text-[#a8987d]">Final Review Score</div>
            <div className="text-xl font-black text-[#e8c67a] font-cinzel">
              {reviewScore.toFixed(1)} / 10
            </div>
          </div>
          <div className="bg-[#0e0b08] border border-[#6e552c] rounded p-3">
            <div className="text-[11px] font-serif text-[#a8987d]">Total Rebuttal DMG</div>
            <div className="text-xl font-black text-[#e0b86c] font-cinzel">
              {totalRebuttalDamage}
            </div>
          </div>
          <div className="bg-[#0e0b08] border border-[#6e552c] rounded p-3">
            <div className="text-[11px] font-serif text-[#a8987d]">Critical Rebuttals</div>
            <div className="text-xl font-black text-[#c8e0b8] font-cinzel">
              {criticalCountersLanded}
            </div>
          </div>
          <div className="bg-[#0e0b08] border border-[#6e552c] rounded p-3">
            <div className="text-[11px] font-serif text-[#a8987d]">Rounds Elapsed</div>
            <div className="text-xl font-black text-[#d8c39e] font-cinzel">
              {turnsTaken} Turns
            </div>
          </div>
        </div>

        {/* Reviewer 2 Final Closing Quote */}
        <div className="bg-[#0a0806] border border-[#8a6d3b]/50 rounded p-4 mb-6 text-xs md:text-sm font-serif italic text-[#e6d5b8] leading-relaxed">
          {isAccept
            ? '"You answered every single critique with exact tables and appendix ablations from your manuscript... Fine. I am raising my official score to Strong Accept." — Reviewer 2'
            : '"You failed to defend the experimental design and statistical significance of your own manuscript. Revise and resubmit to next year’s conference." — Reviewer 2'}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onRematchSameDoc}
            className="px-5 py-2.5 rounded bg-[#241c16] hover:bg-[#332820] border border-[#8a6d3b] text-[#e8dcc8] font-serif font-bold text-sm flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#d4a857]" />
            <span>Re-Defend Same Paper</span>
          </button>
          <button
            onClick={onReturnToLobby}
            className="px-6 py-2.5 rounded bg-gradient-to-b from-[#7a2222] to-[#4a1212] hover:from-[#942a2a] hover:to-[#5e1717] border border-[#d4a857] text-[#fff3d6] font-serif font-bold text-sm flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#e8c67a]" />
            <span>Select Another Manuscript</span>
          </button>
        </div>
      </div>
    </div>
  );
};
