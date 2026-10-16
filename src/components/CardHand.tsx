import React, { useState } from 'react';
import {
  LoadedEvidence,
  PlayableCard,
} from '../types/game';
import {
  BookMarked,
  CheckCircle2,
  Feather,
  Loader2,
  Send,
  Swords,
  X,
} from 'lucide-react';

interface CardHandProps {
  hand: PlayableCard[];
  energy: number;
  maxEnergy: number;
  loadedEvidence: LoadedEvidence | null;
  rebuttalPowerMultiplier: number;
  drawPileCount: number;
  discardPileCount: number;
  exhaustPileCount: number;
  isTurnBusy: boolean;
  isSubmittingRebuttal: boolean;
  onPlayCard: (card: PlayableCard) => void;
  onOpenManuscriptForDrag: () => void;
  onClearEvidence: () => void;
  onSubmitInlineRebuttal: (text: string) => void;
  onOpenExpandedRebuttal: (initialText?: string) => void;
  onEndTurn: () => void;
}

export const CardHand: React.FC<CardHandProps> = ({
  hand,
  energy,
  maxEnergy,
  loadedEvidence,
  rebuttalPowerMultiplier,
  drawPileCount,
  discardPileCount,
  exhaustPileCount,
  isTurnBusy,
  isSubmittingRebuttal,
  onPlayCard,
  onOpenManuscriptForDrag,
  onClearEvidence,
  onSubmitInlineRebuttal,
  onOpenExpandedRebuttal,
  onEndTurn,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [inlineText, setInlineText] = useState('');

  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inlineText.trim().length === 0 || isTurnBusy || isSubmittingRebuttal) {
      return;
    }
    onSubmitInlineRebuttal(inlineText);
    setInlineText('');
  };

  const getFrameStyle = (card: PlayableCard) => {
    switch (card.shortTypeLabel) {
      case 'POLITICS':
        return {
          outerBg: 'from-[#2e2212] via-[#1c150c] to-[#110d08]',
          border: 'border-[#d4a857]',
          headerBg: 'from-[#5e4219] via-[#3d2a0f] to-[#261a09]',
          badgeBg: 'bg-[#382710] text-[#f5d996] border-[#c89d54]',
        };
      case 'EVENT':
        return {
          outerBg: 'from-[#2e1616] via-[#1c0e0e] to-[#110808]',
          border: 'border-[#b85848]',
          headerBg: 'from-[#5c1f1f] via-[#3d1414] to-[#260c0c]',
          badgeBg: 'bg-[#381414] text-[#f0b6b6] border-[#a84848]',
        };
      case 'SURVIVAL':
        return {
          outerBg: 'from-[#14291d] via-[#0e1c14] to-[#08110c]',
          border: 'border-[#5a9e72]',
          headerBg: 'from-[#1d472f] via-[#143321] to-[#0c2115]',
          badgeBg: 'bg-[#123020] text-[#b4e8c5] border-[#4d8c63]',
        };
      case 'DEFENSE':
        return {
          outerBg: 'from-[#162230] via-[#0f1721] to-[#090e14]',
          border: 'border-[#5c85ad]',
          headerBg: 'from-[#1f3752] via-[#152638] to-[#0e1926]',
          badgeBg: 'bg-[#14273b] text-[#bad6f0] border-[#4d759c]',
        };
      case 'CURSE':
        return {
          outerBg: 'from-[#240d14] via-[#17080d] to-[#0c0407]',
          border: 'border-[#8c2d46]',
          headerBg: 'from-[#421220] via-[#2b0b15] to-[#1a060c]',
          badgeBg: 'bg-[#2e0b16] text-[#e69eb0] border-[#782238]',
        };
      default:
        return {
          outerBg: 'from-[#261d2e] via-[#18121f] to-[#0e0b12]',
          border: 'border-[#9673b8]',
          headerBg: 'from-[#412c54] via-[#2b1d38] to-[#1b1224]',
          badgeBg: 'bg-[#2a1b38] text-[#dec5f5] border-[#825ea6]',
        };
    }
  };

  return (
    <div className="relative w-full h-[262px] shrink-0 select-none bg-gradient-to-t from-[#0d0a08] via-[#110d0a]/95 to-transparent border-t border-[#54432b]/60 flex flex-col justify-between pt-2 pb-2.5 px-4 md:px-6 z-30 pointer-events-none">
      {/* Top Bar of HUD: Natural Language Rebuttal Desk + Drag-from-Paper Reference Status */}
      <div className="mx-auto w-full max-w-5xl pointer-events-auto relative">
        <form
          onSubmit={handleInlineSubmit}
          className="bg-gradient-to-b from-[#1c1611]/98 to-[#120e0a]/98 border-2 border-[#a88444] rounded-lg px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.95)] flex flex-col gap-1.5"
        >
          {/* Status Strip: Drag-to-Reference Trigger + Canonical Attached Reference Display */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-serif">
            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
              <button
                type="button"
                onClick={onOpenManuscriptForDrag}
                className="px-2.5 py-0.5 rounded bg-[#291f14] hover:bg-[#3b2c1d] border border-[#c89d54] text-[#fff1d0] font-bold flex items-center gap-1.5 cursor-pointer transition shrink-0 shadow-sm"
              >
                <BookMarked className="w-3.5 h-3.5 text-[#f0c869]" />
                <span>Drag Manuscript to Cite</span>
              </button>

              {loadedEvidence ? (
                <div
                  className="px-2.5 py-0.5 rounded bg-[#162415] border border-[#5a8c52] text-[#d4f0cc] flex items-center gap-1.5 min-w-0 max-w-xl"
                  title={`[${loadedEvidence.location}] "${loadedEvidence.quote}"`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#7ec472] shrink-0" />
                  <span className="truncate">
                    <strong>[{loadedEvidence.location}]</strong> &ldquo;{loadedEvidence.quote}&rdquo;
                  </span>
                  <button
                    type="button"
                    onClick={onClearEvidence}
                    className="ml-1 text-[#a3cfa0] hover:text-white cursor-pointer shrink-0"
                    title="Clear attached reference"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[#a89578] truncate">
                  Click the button above and drag any sentence or table in the manuscript to attach it as rebuttal evidence.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {rebuttalPowerMultiplier > 1 && (
                <span className="px-2 py-0.5 rounded bg-[#3b2310] border border-[#e09b45] text-[#ffd899] font-bold">
                  Rebuttal Power {rebuttalPowerMultiplier.toFixed(1)}x Boosted
                </span>
              )}
              <button
                type="button"
                onClick={() => onOpenExpandedRebuttal(inlineText)}
                className="px-2 py-0.5 rounded bg-[#211913] hover:bg-[#2e231b] border border-[#6e552c] text-[#d4b886] text-[11px] font-bold cursor-pointer"
              >
                Draft Templates / Expand
              </button>
            </div>
          </div>

          {/* Direct Natural Language Input Row */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#e8c67a] shrink-0">
              <Feather className="w-4 h-4 text-[#d4a857]" />
              <span>Natural Rebuttal:</span>
            </div>
            <input
              type="text"
              value={inlineText}
              onChange={(e) => setInlineText(e.target.value)}
              disabled={isTurnBusy || isSubmittingRebuttal}
              placeholder="Write your logical counter-argument to dismantle Reviewer 2's critique... (Attaching a dragged manuscript quote boosts critical hit chance)"
              className="flex-1 px-3 py-1 rounded bg-[#090706] border border-[#6e552c] focus:border-[#d4a857] focus:outline-none text-xs md:text-sm font-serif text-[#f5ead6] placeholder-[#6e604b]"
            />
            <button
              type="submit"
              disabled={
                isTurnBusy ||
                isSubmittingRebuttal ||
                inlineText.trim().length === 0
              }
              className="px-3.5 py-1 rounded bg-gradient-to-b from-[#8a2424] to-[#521212] hover:from-[#a32c2c] hover:to-[#691717] disabled:opacity-40 border border-[#e09252] text-[#fff3d6] font-serif font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
            >
              {isSubmittingRebuttal ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Judging...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Rebuttal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Row: Energy Orb + Grad Student Event Card Hand + End Turn */}
      <div className="relative flex items-end justify-between w-full max-w-[1540px] mx-auto mt-1">
        {/* Left HUD: Energy Orb & Draw Pile */}
        <div className="flex items-end gap-3 pointer-events-auto shrink-0">
          <div className="relative w-[70px] h-[70px] rounded-full bg-gradient-to-b from-[#3d2914] via-[#21150a] to-[#0e0904] border-[3px] border-[#c89d54] shadow-[0_8px_24px_rgba(0,0,0,0.95)] flex flex-col items-center justify-center">
            <div className="font-cinzel text-xl font-black text-[#fff3d1] leading-none">
              {energy}/{maxEnergy}
            </div>
            <div className="text-[10px] font-serif font-bold text-[#d4b475] mt-0.5">
              ENERGY
            </div>
          </div>

          <div className="w-15 h-17 px-2 rounded bg-gradient-to-b from-[#1f1914] to-[#0e0b09] border-2 border-[#7a6038] flex flex-col items-center justify-center shadow-xl">
            <div className="font-cinzel text-base font-black text-[#e6d5b8]">
              {drawPileCount}
            </div>
            <div className="text-[10px] font-serif text-[#a89476]">Draw</div>
          </div>
        </div>

        {/* Center: Grad Student Event & Gimmick Cards (Compact, zero overflow) */}
        <div className="flex items-end justify-center px-2 pointer-events-auto">
          {hand.map((card, idx) => {
            const canAfford = energy >= card.cost && !isTurnBusy;
            const isHovered = hoveredId === card.instanceId;
            const style = getFrameStyle(card);

            const mid = (hand.length - 1) / 2;
            const offset = idx - mid;
            const rotateDeg = isHovered ? 0 : offset * 2.2;
            const translateY = isHovered ? -18 : Math.abs(offset) * 3;

            return (
              <div
                key={card.instanceId}
                onMouseEnter={() => setHoveredId(card.instanceId)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  if (canAfford) onPlayCard(card);
                }}
                style={{
                  transform: `translateY(${translateY}px) rotate(${rotateDeg}deg) scale(${
                    isHovered ? 1.1 : 1
                  })`,
                  marginLeft: idx === 0 ? '0px' : '-10px',
                  zIndex: isHovered ? 50 : 10 + idx,
                }}
                className={`relative w-[138px] h-[168px] rounded-[9px] bg-gradient-to-b ${
                  style.outerBg
                } border-2 ${style.border} p-1.5 flex flex-col justify-between overflow-hidden transition-all duration-150 shadow-[0_10px_24px_rgba(0,0,0,0.95)] ${
                  canAfford
                    ? 'cursor-pointer hover:brightness-110'
                    : 'opacity-50 grayscale-[45%] cursor-not-allowed'
                }`}
              >
                {/* Cost Gem */}
                <div className="flex items-center justify-start shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-cinzel font-black text-[11px] border shadow-md ${
                      canAfford
                        ? 'bg-gradient-to-b from-[#f0c869] to-[#9e6b1b] text-[#140d04] border-[#fff1c2]'
                        : 'bg-[#1c1815] text-[#786c5e] border-[#4a4035]'
                    }`}
                  >
                    {card.cost}
                  </div>
                </div>

                {/* Card Title Banner */}
                <div
                  className={`w-full rounded bg-gradient-to-r ${style.headerBg} border border-[#b89758]/50 px-1 py-0.5 text-center shrink-0`}
                >
                  <div className="text-[11px] font-serif font-bold text-[#f7ecd5] leading-tight whitespace-nowrap">
                    {card.koreanName}
                  </div>
                </div>

                {/* Illustration Window */}
                <div className="relative w-full h-[54px] rounded overflow-hidden border border-[#5e4b2b] bg-[#080706] shrink-0">
                  <img
                    src={card.artwork}
                    alt={card.koreanName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.85)]" />
                </div>

                {/* Crisp 2-Line Description Box (Never overflows) */}
                <div className="w-full h-[46px] rounded bg-[#120e0b] border border-[#524024] px-1.5 py-1 flex items-center justify-center text-center shrink-0 overflow-hidden">
                  <p className="text-[10px] font-serif text-[#e8dcc8] leading-[1.3] whitespace-pre-line">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right HUD: Discard Pile & End Turn Button */}
        <div className="flex items-end gap-3 pointer-events-auto shrink-0">
          <div className="w-15 h-17 px-2 rounded bg-gradient-to-b from-[#1f1914] to-[#0e0b09] border-2 border-[#7a6038] flex flex-col items-center justify-center shadow-xl">
            <div className="font-cinzel text-base font-black text-[#e6d5b8]">
              {discardPileCount}
            </div>
            <div className="text-[10px] font-serif text-[#a89476]">Discard</div>
            {exhaustPileCount > 0 && (
              <div className="text-[9px] font-serif text-[#c97a63]">
                Exhaust {exhaustPileCount}
              </div>
            )}
          </div>

          <button
            onClick={onEndTurn}
            disabled={isTurnBusy || isSubmittingRebuttal}
            className="h-12 px-5 rounded bg-gradient-to-b from-[#7a2020] via-[#541313] to-[#360a0a] hover:from-[#962828] hover:to-[#4a1010] disabled:opacity-45 border-2 border-[#c89d54] text-[#f7e8c8] font-serif font-bold text-sm tracking-wider shadow-[0_8px_24px_rgba(0,0,0,0.95)] flex items-center gap-2 cursor-pointer transition active:scale-95"
          >
            <Swords className="w-4 h-4 text-[#e8c174]" />
            <span>End Turn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
