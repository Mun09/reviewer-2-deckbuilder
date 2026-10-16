import React, { useEffect, useRef, useState } from 'react';
import {
  BossAttackIntent,
  FloatingCombatText,
  PlayableCard,
  RebuttalEvaluationResult,
} from '../types/game';
import { BookOpen, Flame, Loader2, Shield, Swords } from 'lucide-react';

export type ApiWaitMode = 'IDLE' | 'EVALUATING_REBUTTAL' | 'GENERATING_ATTACK';

interface Boss3DStageProps {
  currentAttack: BossAttackIntent | null;
  bossHp: number;
  bossMaxHp: number;
  bossBlock: number;
  isBossLogicBroken: boolean;
  bossEnrage: number;
  overwhelmStacks: number;
  playerSanity: number;
  playerMaxSanity: number;
  playerBlock: number;
  clarityStacks: number;
  centerShowcaseCard: PlayableCard | null;
  latestRebuttalFeedback: RebuttalEvaluationResult | null;
  apiWaitMode: ApiWaitMode;
  bossHitTrigger: number;
  bossAttackTrigger: number;
  playerHitTrigger: number;
  floatingTexts: FloatingCombatText[];
  onInspectQuoteInManuscript: (quote: string) => void;
}

const REBUTTAL_WAIT_BANTER: string[] = [
  '“Hold on... I am cross-checking your rebuttal against the equations in your manuscript.”',
  '“Adjusting my spectacles... Do not rush me while I verify whether your dragged citation actually supports your claim.”',
  '“Oh, quite a lengthy response. Wait a moment while I dissect every line for logical leaps...”',
  '“One sip of espresso first... Let us see whether your defense is backed by empirical data or mere hand-waving.”',
  '“Wait right there—I am comparing the passage you cited directly against the original manuscript text...”',
];

const ATTACK_GEN_WAIT_BANTER: string[] = [
  '“Hold on... I believe I just spotted a fascinating methodological flaw on the next page.”',
  '“Let us see... There is a suspicious gap between your tables and your main text. Wait while I sharpen my red pen.”',
  '“One moment... I am scrutinizing your experimental section line by line. You will enjoy my next question.”',
  '“Wait a second—I just found a fatal claim in this paragraph that I simply cannot let slide...”',
];

/**
 * Removes solid black background from the exterior of character sprites via BFS flood-fill
 * so interior dark shadows remain intact.
 */
function useCutoutSprite(imageSrc: string): string | null {
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isCancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || 512;
        const h = img.naturalHeight || 512;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setCutoutUrl(imageSrc);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const isDarkBg = (idx: number) => {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const lum = r * 0.299 + g * 0.587 + b * 0.114;
          const maxCh = Math.max(r, g, b);
          return lum < 28 && maxCh < 38;
        };

        for (let x = 0; x < w; x++) {
          const topIdx = x;
          const botIdx = (h - 1) * w + x;
          if (isDarkBg(topIdx)) {
            visited[topIdx] = 1;
            queue[tail++] = topIdx;
          }
          if (isDarkBg(botIdx)) {
            visited[botIdx] = 1;
            queue[tail++] = botIdx;
          }
        }
        for (let y = 0; y < h; y++) {
          const leftIdx = y * w;
          const rightIdx = y * w + (w - 1);
          if (!visited[leftIdx] && isDarkBg(leftIdx)) {
            visited[leftIdx] = 1;
            queue[tail++] = leftIdx;
          }
          if (!visited[rightIdx] && isDarkBg(rightIdx)) {
            visited[rightIdx] = 1;
            queue[tail++] = rightIdx;
          }
        }

        while (head < tail) {
          const curr = queue[head++];
          const p = curr * 4;
          data[p + 3] = 0;

          const cx = curr % w;
          const cy = (curr - cx) / w;
          const neighbors = [
            cy > 0 ? curr - w : -1,
            cy < h - 1 ? curr + w : -1,
            cx > 0 ? curr - 1 : -1,
            cx < w - 1 ? curr + 1 : -1,
          ];
          for (let i = 0; i < 4; i++) {
            const n = neighbors[i];
            if (n >= 0 && !visited[n]) {
              if (isDarkBg(n)) {
                visited[n] = 1;
                queue[tail++] = n;
              } else {
                const np = n * 4;
                const lum =
                  data[np] * 0.299 + data[np + 1] * 0.587 + data[np + 2] * 0.114;
                if (lum < 50) {
                  data[np + 3] = Math.min(data[np + 3], Math.floor((lum / 50) * 255));
                }
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setCutoutUrl(canvas.toDataURL('image/png'));
      } catch {
        setCutoutUrl(imageSrc);
      }
    };
    img.onerror = () => {
      if (!isCancelled) setCutoutUrl(imageSrc);
    };
    img.src = imageSrc;
    return () => {
      isCancelled = true;
    };
  }, [imageSrc]);

  return cutoutUrl;
}

export const Boss3DStage: React.FC<Boss3DStageProps> = ({
  currentAttack,
  bossHp,
  bossMaxHp,
  bossBlock,
  bossEnrage,
  overwhelmStacks,
  playerSanity,
  playerMaxSanity,
  playerBlock,
  clarityStacks,
  centerShowcaseCard,
  latestRebuttalFeedback,
  apiWaitMode,
  bossHitTrigger,
  bossAttackTrigger,
  playerHitTrigger,
  floatingTexts,
  onInspectQuoteInManuscript,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isBossHit, setIsBossHit] = useState(false);
  const [isBossLunging, setIsBossLunging] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [banterIndex, setBanterIndex] = useState(0);

  const bossCutout = useCutoutSprite('/assets/boss_reviewer2.png');
  const playerCutout = useCutoutSprite('/assets/player_grad_student.png');

  // Cycle villain banter lines while waiting for Gemini API response
  useEffect(() => {
    if (apiWaitMode === 'IDLE') {
      setBanterIndex(0);
      return;
    }
    const lines =
      apiWaitMode === 'EVALUATING_REBUTTAL'
        ? REBUTTAL_WAIT_BANTER
        : ATTACK_GEN_WAIT_BANTER;
    setBanterIndex(Math.floor(Math.random() * lines.length));

    const interval = setInterval(() => {
      setBanterIndex((prev) => (prev + 1) % lines.length);
    }, 1250);

    return () => clearInterval(interval);
  }, [apiWaitMode]);

  useEffect(() => {
    if (bossHitTrigger > 0) {
      setIsBossHit(true);
      const t = setTimeout(() => setIsBossHit(false), 500);
      return () => clearTimeout(t);
    }
  }, [bossHitTrigger]);

  useEffect(() => {
    if (bossAttackTrigger > 0) {
      setIsBossLunging(true);
      const t = setTimeout(() => setIsBossLunging(false), 620);
      return () => clearTimeout(t);
    }
  }, [bossAttackTrigger]);

  useEffect(() => {
    if (playerHitTrigger > 0) {
      setIsPlayerHit(true);
      const t = setTimeout(() => setIsPlayerHit(false), 500);
      return () => clearTimeout(t);
    }
  }, [playerHitTrigger]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: relX * 5, y: -relY * 3 });
  };

  const bossHpPct = Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100));
  const playerHpPct = Math.max(0, Math.min(100, (playerSanity / playerMaxSanity) * 100));

  const effectiveBossDamage = currentAttack
    ? Math.max(0, currentAttack.damage + bossEnrage - overwhelmStacks)
    : 0;

  const activeBanterLines =
    apiWaitMode === 'EVALUATING_REBUTTAL'
      ? REBUTTAL_WAIT_BANTER
      : ATTACK_GEN_WAIT_BANTER;

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative w-full h-full select-none overflow-hidden flex flex-col justify-between"
    >
      {/* Full-bleed Dungeon Arena Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out pointer-events-none"
        style={{
          backgroundImage: `url('/assets/arena_bg.png')`,
          transform: `scale(1.04) translate3d(${-tilt.x * 1.1}px, ${tilt.y * 0.8}px, 0)`,
          filter: 'brightness(0.78) contrast(1.08) sepia(0.08)',
        }}
      />

      {/* Atmospheric Dark Fantasy Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(18, 15, 12, 0.05) 0%, rgba(10, 8, 7, 0.58) 74%, rgba(5, 4, 4, 0.92) 100%)',
        }}
      />

      {/* Stage Floor Grounding Shadow */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

      {/* =====================================================================
          ARCANE STRIKE VFX (When casting a Card or Rebuttal)
         ===================================================================== */}
      {(isBossHit || centerShowcaseCard) && (
        <svg
          className="absolute inset-0 w-full h-full z-25 pointer-events-none"
          viewBox="0 0 1200 600"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="glowBolt" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <polyline
            points="260,320 420,250 530,280 680,220 790,260 940,235"
            fill="none"
            stroke="#d4a359"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glowBolt)"
            opacity="0.85"
          />
          <polyline
            points="260,320 420,250 530,280 680,220 790,260 940,235"
            fill="none"
            stroke="#fff7ed"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* =====================================================================
          3-COLUMN NON-OVERLAPPING BATTLE ARENA
          Left: Grad Student (Full Sprite + HP Bar)
          Center: Reviewer 2 Speech Console & Live API Banter (Never covers Boss!)
          Right: Reviewer 2 Boss (Intent + Full Sprite + HP Bar)
         ===================================================================== */}
      <div className="relative z-20 flex-1 w-full max-w-[1480px] min-h-0 mx-auto px-4 md:px-10 py-3 grid grid-cols-[200px_minmax(0,1fr)_220px] md:grid-cols-[250px_minmax(0,1fr)_270px] lg:grid-cols-[280px_minmax(0,1fr)_300px] items-end gap-3 md:gap-6">
        {/* -----------------------------------------------------------------
            LEFT COLUMN: PLAYER CHARACTER (Exhausted Grad Student)
            Full sprite + single canonical HP bar underneath (never clipped)
           ----------------------------------------------------------------- */}
        <div className="relative flex flex-col items-center justify-end h-full min-h-0 pb-1">
          {/* Player Character Sprite */}
          <div
            className={`relative flex-1 min-h-[120px] max-h-[220px] w-full flex items-end justify-center transition-transform duration-200 ${
              isPlayerHit ? 'BossHitShake brightness-150' : 'BossIdleFloat'
            }`}
          >
            <div className="absolute bottom-1 w-36 md:w-44 h-6 bg-black/85 rounded-full blur-md pointer-events-none" />
            <img
              src={playerCutout || '/assets/player_grad_student.png'}
              alt="Grad Student"
              className="relative z-10 max-h-full w-auto object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.95)]"
            />
          </div>

          {/* Canonical Player HP + Block Bar */}
          <div className="w-full max-w-[230px] mt-2 shrink-0 flex flex-col items-center">
            <div className="relative w-full flex items-center">
              {playerBlock > 0 && (
                <div className="relative z-20 -mr-2.5 w-8 h-8 rounded bg-gradient-to-b from-[#4b728f] to-[#233849] border-2 border-[#b8d0e3] shadow-md flex items-center justify-center font-cinzel font-black text-white text-xs">
                  {playerBlock}
                </div>
              )}
              <div
                className={`relative flex-1 h-5 rounded bg-[#14110f] overflow-hidden border-2 shadow-inner ${
                  playerBlock > 0 ? 'border-[#7da2bd]' : 'border-[#6e5636]'
                }`}
              >
                <div
                  className="h-full bg-gradient-to-r from-[#691414] via-[#991b1b] to-[#b91c1c] transition-all duration-300"
                  style={{ width: `${playerHpPct}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#f5ebd9] drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                  {playerSanity} / {playerMaxSanity}
                </div>
              </div>
            </div>

            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-[11px] font-semibold text-[#d6c7b2] tracking-wide">
                Grad Student (First Author)
              </span>
              {clarityStacks > 0 && (
                <span className="text-[10px] font-bold text-[#e6dac3] bg-[#2a2219] border border-[#9a7640] px-1.5 py-0.5 rounded">
                  Focus +{clarityStacks}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            CENTER COLUMN: REVIEWER 2 SPEECH BUBBLE & LIVE API BANTER CONSOLE
            Positioned strictly between the two characters so it NEVER covers
            Reviewer 2's sprite or the Grad Student's sprite.
           ----------------------------------------------------------------- */}
        <div className="relative z-30 w-full h-full min-h-0 flex flex-col items-center justify-center pointer-events-auto py-1">
          {/* Optional Played Card Flash (Compact pill inside center column) */}
          {centerShowcaseCard && (
            <div className="mb-2 px-4 py-1.5 rounded-full bg-[#1c1713]/95 border-2 border-[#c89d54] shadow-[0_8px_24px_rgba(0,0,0,0.9)] flex items-center gap-2 animate-bounce">
              <span className="text-xs font-serif font-bold text-[#f5ebd9]">
                {centerShowcaseCard.koreanName} Activated!
              </span>
            </div>
          )}

          {/* Speech Bubble Container with Right-Pointing Tail toward Reviewer 2 */}
          <div className="relative w-full max-w-[680px] max-h-full overflow-y-auto bg-gradient-to-b from-[#1e1915]/98 to-[#120f0c]/98 border-2 border-[#9a7640] rounded-xl px-4 md:px-5 py-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.95)]">
            {/* Speech Tail pointing right toward Reviewer 2 */}
            <div
              className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[12px] border-l-[#9a7640]"
              aria-hidden="true"
            />

            {/* Corner brass rivets */}
            <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#9a7640]/70" />
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#9a7640]/70" />
            <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#9a7640]/70" />
            <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#9a7640]/70" />

            {/* STATE 1: LIVE API WAITING BANTER (Villain tells player to wait a moment while API thinks) */}
            {apiWaitMode !== 'IDLE' ? (
              <div className="space-y-2.5 py-1">
                <div className="flex items-center justify-between border-b border-[#785c32]/50 pb-1.5">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-[#e0b86c] animate-spin" />
                    <span className="text-xs font-serif font-bold text-[#e6c280]">
                      {apiWaitMode === 'EVALUATING_REBUTTAL'
                        ? 'Reviewer 2 is cross-examining your rebuttal and cited reference...'
                        : 'Reviewer 2 is scanning your manuscript for the next vulnerability...'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#b8a382] animate-pulse">
                    INQUISITION ACTIVE
                  </span>
                </div>

                {/* Live Cycling Villain Banter Quote */}
                <p className="text-sm md:text-[15px] font-serif font-bold text-[#fff1d6] leading-relaxed italic">
                  {activeBanterLines[banterIndex % activeBanterLines.length]}
                </p>

                {/* Keep current attack quote visible in dim reference box during rebuttal evaluation */}
                {currentAttack && apiWaitMode === 'EVALUATING_REBUTTAL' && (
                  <div className="bg-[#0d0b09]/90 border-l-2 border-[#785c32] px-3 py-1.5 rounded-r text-[11px] font-serif text-[#b8a993]">
                    <span className="text-[#c89d54] font-bold mr-1.5">
                      [Disputed Passage: {currentAttack.quoteLocation}]
                    </span>
                    &ldquo;{currentAttack.verbatimQuote}&rdquo;
                  </div>
                )}
              </div>
            ) : !currentAttack ? (
              <p className="text-sm text-[#e7dac4] font-serif italic leading-relaxed">
                &ldquo;Let us see... Allow me to cross-examine the equations and empirical tables in your submitted manuscript one by one.&rdquo;
              </p>
            ) : (
              <div className="space-y-2.5">
                {/* Optional: Latest Rebuttal Judgment Integrated Inside Console (No overlapping floating banners!) */}
                {latestRebuttalFeedback && (
                  <div
                    className={`rounded-lg border px-3 py-2 flex items-start gap-2.5 ${
                      latestRebuttalFeedback.rank === 'F'
                        ? 'bg-[#2b1010]/95 border-[#c94a4a]'
                        : 'bg-[#261b0e]/95 border-[#e0b86c]'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded border shrink-0 font-cinzel font-black text-base flex items-center justify-center ${
                        latestRebuttalFeedback.rank === 'F'
                          ? 'bg-[#3b1212] border-[#e05252] text-[#ffd4d4]'
                          : 'bg-[#362612] border-[#f0c869] text-[#fff1c2]'
                      }`}
                    >
                      {latestRebuttalFeedback.rank}
                    </div>
                    <div className="flex-1 min-w-0 text-xs font-serif">
                      <div className="font-bold text-[#f5e3be] leading-snug">
                        Tribunal Ruling ({latestRebuttalFeedback.score} pts):{' '}
                        {latestRebuttalFeedback.logicFeedback}
                      </div>
                      <div className="text-[#e6b8b8] italic mt-0.5 leading-snug">
                        {latestRebuttalFeedback.reviewerReaction}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviewer 2 Critique Header & Full Dialogue */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-serif font-bold text-[#e05252] tracking-wide">
                      ◆ Reviewer 2&apos;s Critique: {currentAttack.koreanTitle}
                    </span>
                  </div>
                  <p className="text-[13.5px] md:text-[15px] font-bold text-[#f5ebd9] leading-relaxed">
                    {currentAttack.reviewerDialogue}
                  </p>
                </div>

                {/* Full Verbatim Quote from Paper — Clickable to open Manuscript & Drag Reference */}
                <div
                  onClick={() => onInspectQuoteInManuscript(currentAttack.verbatimQuote)}
                  className="group bg-[#0e0c0a]/95 hover:bg-[#1a1510] border-l-[3px] border-[#c89d54] rounded-r px-3.5 py-2 transition cursor-pointer"
                  title="Click to open full manuscript and drag any passage to attach as evidence"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-[#c89d54] tracking-wide">
                      Verbatim Quote — {currentAttack.quoteLocation}
                    </span>
                    <span className="text-[10px] text-[#d4b886] group-hover:text-[#fff2d6] flex items-center gap-1 transition font-serif font-semibold">
                      <BookOpen className="w-3 h-3 text-[#e0b86c]" />
                      Open Manuscript / Drag to Cite
                    </span>
                  </div>
                  <p className="text-xs md:text-[13px] text-[#d8cbb5] italic leading-relaxed font-serif">
                    &ldquo;{currentAttack.verbatimQuote}&rdquo;
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* -----------------------------------------------------------------
            RIGHT COLUMN: BOSS CHARACTER (Reviewer 2 + Intent + HP Bar)
            Completely unobstructed by the center speech bubble; bottom never clipped
           ----------------------------------------------------------------- */}
        <div className="relative flex flex-col items-center justify-end h-full min-h-0 pb-1">
          {/* Boss Attack Intent Badge Above Reviewer 2 */}
          {currentAttack && (
            <div
              className="mb-1 shrink-0 flex items-center gap-1.5 px-3.5 py-1 rounded bg-[#1f1212]/95 border-2 border-[#a83232] shadow-[0_6px_18px_rgba(0,0,0,0.9)]"
              title={currentAttack.title}
            >
              <Swords className="w-4 h-4 text-[#e05252]" />
              <span className="font-cinzel font-black text-base text-[#f5ebd9]">
                {effectiveBossDamage}
              </span>
            </div>
          )}

          {/* Reviewer 2 Cutout Character Sprite */}
          <div
            className={`relative flex-1 min-h-[130px] max-h-[235px] w-full flex items-end justify-center transition-transform duration-200 ${
              isBossHit
                ? 'BossHitShake brightness-150'
                : isBossLunging
                ? '-translate-x-12 scale-105'
                : 'BossIdleFloat'
            }`}
          >
            <div className="absolute bottom-1 w-40 md:w-48 h-7 bg-black/85 rounded-full blur-md pointer-events-none" />
            <img
              src={bossCutout || '/assets/boss_reviewer2.png'}
              alt="Reviewer 2"
              className="relative z-10 max-h-full w-auto object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.95)]"
            />
          </div>

          {/* Canonical Boss HP + Block Bar */}
          <div className="w-full max-w-[250px] mt-2 shrink-0 flex flex-col items-center">
            <div className="relative w-full flex items-center">
              {bossBlock > 0 && (
                <div className="relative z-20 -mr-2.5 w-8 h-8 rounded bg-gradient-to-b from-[#8c6b38] to-[#4a3619] border-2 border-[#e0c28c] shadow-md flex items-center justify-center font-cinzel font-black text-[#f5ebd9] text-xs">
                  {bossBlock}
                </div>
              )}

              <div
                className={`relative flex-1 h-5 rounded bg-[#14110f] overflow-hidden border-2 shadow-inner ${
                  bossBlock > 0 ? 'border-[#b89352]' : 'border-[#7c2d2d]'
                }`}
              >
                <div
                  className="h-full bg-gradient-to-r from-[#5c1111] via-[#8c1919] to-[#b32424] transition-all duration-300"
                  style={{ width: `${bossHpPct}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#f5ebd9] drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                  {bossHp} / {bossMaxHp}
                </div>
              </div>
            </div>

            {/* Boss Name & Minimal Buff/Debuff Numerals */}
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-[11px] font-semibold text-[#d6c7b2] tracking-wide">
                Reviewer 2
              </span>

              {bossEnrage > 0 && (
                <span className="text-[10px] font-bold text-[#f2a6a6] bg-[#2b1212] border border-[#8c2d2d] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 text-[#e05252]" />+{bossEnrage}
                </span>
              )}

              {overwhelmStacks > 0 && (
                <span className="text-[10px] font-bold text-[#b8d0e3] bg-[#16222c] border border-[#4b728f] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5 text-[#7da2bd]" />-{overwhelmStacks}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          FLOATING COMBAT NUMBERS OVERLAY
         ===================================================================== */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {floatingTexts.map((ft) => {
          const colorMap = {
            GOLD: 'text-[#f2c97d] drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]',
            CRIMSON: 'text-[#e05252] drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]',
            CYAN: 'text-[#9ec5e0] drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]',
            EMERALD: 'text-[#a3d9b1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]',
            VIOLET: 'text-[#d4b2d8] drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]',
          };
          const basePos =
            ft.target === 'BOSS'
              ? { left: '84%', top: '42%' }
              : ft.target === 'PLAYER'
              ? { left: '16%', top: '42%' }
              : { left: '50%', top: '38%' };

          return (
            <div
              key={ft.id}
              className="FloatingDamagePop absolute -translate-x-1/2 text-center"
              style={{
                left: `calc(${basePos.left} + ${ft.xOffset}px)`,
                top: `calc(${basePos.top} + ${ft.yOffset}px)`,
              }}
            >
              <div
                className={`font-cinzel font-black text-2xl md:text-3xl tracking-tight ${
                  colorMap[ft.color]
                }`}
              >
                {ft.text}
              </div>
              {ft.subtext && (
                <div className="text-[11px] font-semibold text-[#e6dac3] bg-[#14110e]/95 px-2.5 py-0.5 rounded border border-[#785c32]/60 mt-0.5 shadow-lg">
                  {ft.subtext}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
