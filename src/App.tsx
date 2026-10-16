import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BossAttackIntent,
  CombatLogEntry,
  DocumentSource,
  FloatingCombatText,
  LoadedEvidence,
  PlayableCard,
  RebuttalEvaluationResult,
  WeaknessCategory,
} from './types/game';
import {
  PRESET_DOCUMENTS,
  buildDeckForDocument,
  createRedInkCurseCard,
  extractManuscriptSnippetsForAttachment,
} from './data/presetsAndCards';
import {
  DEFAULT_GEMINI_API_KEY,
  evaluateFreeformRebuttal,
  generateVerifiedBossAttack,
} from './services/reviewerAiEngine';
import { soundEngine } from './utils/soundEngine';
import { TitleLobbyScreen } from './components/TitleLobbyScreen';
import { ApiWaitMode, Boss3DStage } from './components/Boss3DStage';
import { CardHand } from './components/CardHand';
import { ManuscriptDrawer } from './components/ManuscriptDrawer';
import { FreeformRebuttalModal } from './components/FreeformRebuttalModal';
import { VerdictScreenModal } from './components/VerdictScreenModal';
import {
  Battle3DCutsceneModal,
  CutsceneEventData,
} from './components/Battle3DCutsceneModal';
import {
  BookOpen,
  Film,
  RotateCcw,
  ScrollText,
  Skull,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function App() {
  const [phase, setPhase] = useState<'LOBBY' | 'BATTLE' | 'VERDICT'>('LOBBY');
  const [verdictOutcome, setVerdictOutcome] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');

  const [activeDoc, setActiveDoc] = useState<DocumentSource>(PRESET_DOCUMENTS[0]);
  const [apiKey, setApiKey] = useState<string>(DEFAULT_GEMINI_API_KEY);

  // Boss State (Reviewer 2)
  const [bossHp, setBossHp] = useState<number>(170);
  const [bossMaxHp] = useState<number>(170);
  const [bossBlock, setBossBlock] = useState<number>(24);
  const [isBossLogicBroken, setIsBossLogicBroken] = useState<boolean>(false);
  const [bossEnrage, setBossEnrage] = useState<number>(0);
  const [currentAttack, setCurrentAttack] = useState<BossAttackIntent | null>(null);
  const [usedQuotes, setUsedQuotes] = useState<string[]>([]);
  const [overwhelmStacks, setOverwhelmStacks] = useState<number>(0);

  // Player State (Grad Student)
  const [playerSanity, setPlayerSanity] = useState<number>(75);
  const [playerMaxSanity] = useState<number>(75);
  const [playerBlock, setPlayerBlock] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(3);
  const [maxEnergy] = useState<number>(3);
  const [clarityStacks, setClarityStacks] = useState<number>(0);
  const [rebuttalPowerMultiplier, setRebuttalPowerMultiplier] = useState<number>(1);
  const [loadedEvidence, setLoadedEvidence] = useState<LoadedEvidence | null>(null);
  const [criticalRebuttalsCount, setCriticalRebuttalsCount] = useState<number>(0);

  // Deck / Hand / Pile State
  const [drawPile, setDrawPile] = useState<PlayableCard[]>([]);
  const [hand, setHand] = useState<PlayableCard[]>([]);
  const [discardPile, setDiscardPile] = useState<PlayableCard[]>([]);
  const [exhaustPileCount, setExhaustPileCount] = useState<number>(0);
  const [turn, setTurn] = useState<number>(1);
  const [isTurnBusy, setIsTurnBusy] = useState<boolean>(false);
  const [isSubmittingRebuttal, setIsSubmittingRebuttal] = useState<boolean>(false);
  const [isGeneratingAttack, setIsGeneratingAttack] = useState<boolean>(false);

  // Center Showcase Card & Integrated Rebuttal Feedback
  const [centerShowcaseCard, setCenterShowcaseCard] = useState<PlayableCard | null>(
    null
  );
  const [latestRebuttalFeedback, setLatestRebuttalFeedback] =
    useState<RebuttalEvaluationResult | null>(null);

  // Modals, Drawers & 3D Cinematic Cutscene
  const [isManuscriptOpen, setIsManuscriptOpen] = useState<boolean>(false);
  const [highlightedQuote, setHighlightedQuote] = useState<string | null>(null);
  const [isExpandedRebuttalOpen, setIsExpandedRebuttalOpen] = useState<boolean>(false);
  const [isCombatLogOpen, setIsCombatLogOpen] = useState<boolean>(false);
  const [activeCutscene, setActiveCutscene] = useState<CutsceneEventData | null>(null);
  const cutsceneResolverRef = useRef<(() => void) | null>(null);

  const play3DCutsceneAndWait = useCallback((data: CutsceneEventData): Promise<void> => {
    return new Promise((resolve) => {
      cutsceneResolverRef.current = resolve;
      setActiveCutscene(data);
    });
  }, []);

  const handleCompleteCutscene = useCallback(() => {
    setActiveCutscene(null);
    if (cutsceneResolverRef.current) {
      const res = cutsceneResolverRef.current;
      cutsceneResolverRef.current = null;
      res();
    }
  }, []);

  // Visual & Audio Triggers
  const [bossHitTrigger, setBossHitTrigger] = useState<number>(0);
  const [bossAttackTrigger, setBossAttackTrigger] = useState<number>(0);
  const [playerHitTrigger, setPlayerHitTrigger] = useState<number>(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingCombatText[]>([]);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const floatingIdRef = useRef(1);
  const usedQuotesRef = useRef<string[]>([]);

  const manuscriptSnippets = useMemo(
    () => extractManuscriptSnippetsForAttachment(activeDoc),
    [activeDoc]
  );

  const spawnFloatingText = useCallback(
    (
      text: string,
      target: 'BOSS' | 'PLAYER' | 'CENTER',
      color: FloatingCombatText['color'],
      subtext?: string
    ) => {
      const id = `ft-${floatingIdRef.current++}-${Date.now()}`;
      const xOffset = Math.floor((Math.random() - 0.5) * 60);
      const yOffset = Math.floor((Math.random() - 0.5) * 30);
      setFloatingTexts((prev) => [
        ...prev,
        { id, text, subtext, target, color, xOffset, yOffset },
      ]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
      }, 1350);
    },
    []
  );

  const appendLog = useCallback(
    (
      actor: CombatLogEntry['actor'],
      title: string,
      detail: string,
      quote?: string,
      isCritical?: boolean
    ) => {
      setCombatLog((prev) => [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          turn,
          actor,
          title,
          detail,
          quote,
          isCritical,
        },
        ...prev.slice(0, 35),
      ]);
    },
    [turn]
  );

  const drawCardsFromPile = useCallback(
    (
      count: number,
      currentDraw: PlayableCard[],
      currentDiscard: PlayableCard[],
      currentHand: PlayableCard[]
    ) => {
      let draw = [...currentDraw];
      let discard = [...currentDiscard];
      const nextHand = [...currentHand];

      for (let i = 0; i < count; i++) {
        if (nextHand.length >= 7) break;
        if (draw.length === 0) {
          if (discard.length === 0) break;
          draw = shuffleArray(discard);
          discard = [];
        }
        const popped = draw.shift();
        if (popped) nextHand.push(popped);
      }

      return { draw, discard, nextHand };
    },
    []
  );

  const prepareNextBossAttack = useCallback(
    async (doc: DocumentSource, currentUsedQuotes: string[], key: string) => {
      setIsGeneratingAttack(true);
      try {
        const mergedUsed = Array.from(
          new Set([...usedQuotesRef.current, ...currentUsedQuotes])
        );
        const { attack } = await generateVerifiedBossAttack(
          doc,
          mergedUsed,
          key
        );

        soundEngine.playVerifiedLock();

        setCurrentAttack(attack);
        setBossBlock(attack.startingBossBlock);
        setIsBossLogicBroken(false);
        const nextUsed = [...mergedUsed, attack.verbatimQuote, attack.id];
        usedQuotesRef.current = nextUsed;
        setUsedQuotes(nextUsed);

        appendLog(
          'REVIEWER_2',
          `Reviewer 2: ${attack.title}`,
          attack.reviewerDialogue,
          attack.verbatimQuote
        );
      } finally {
        setIsGeneratingAttack(false);
      }
    },
    [appendLog]
  );

  const handleStartBattle = async (doc: DocumentSource, userApiKey: string) => {
    setActiveDoc(doc);
    setApiKey(userApiKey);
    setBossHp(170);
    setBossBlock(24);
    setIsBossLogicBroken(false);
    setBossEnrage(0);
    setPlayerSanity(75);
    setPlayerBlock(6);
    setEnergy(3);
    setClarityStacks(0);
    setRebuttalPowerMultiplier(1);
    setOverwhelmStacks(0);
    setLoadedEvidence(null);
    setCriticalRebuttalsCount(0);
    setExhaustPileCount(0);
    setLatestRebuttalFeedback(null);
    setTurn(1);
    usedQuotesRef.current = [];
    setUsedQuotes([]);
    setCombatLog([]);

    const fullDeck = buildDeckForDocument(doc);
    const openingHand = fullDeck.slice(0, 5);
    const remainingPool = fullDeck.slice(5);

    setHand(openingHand);
    setDrawPile(remainingPool);
    setDiscardPile([]);
    setPhase('BATTLE');

    await prepareNextBossAttack(doc, [], userApiKey);
  };

  const applyDamageToBoss = useCallback(
    (rawDamage: number, currentBossBlock: number, currentBossHp: number) => {
      let remainingBlock = currentBossBlock;
      let damageToHp = rawDamage;

      if (remainingBlock > 0) {
        const absorbed = Math.min(remainingBlock, damageToHp);
        remainingBlock -= absorbed;
        damageToHp -= absorbed;
      }

      const nextHp = Math.max(0, currentBossHp - damageToHp);
      setBossBlock(remainingBlock);
      setBossHp(nextHp);
      setBossHitTrigger((c) => c + 1);

      if (nextHp <= 0) {
        soundEngine.playVictoryFanfare();
        setTimeout(() => {
          setVerdictOutcome('ACCEPT');
          setPhase('VERDICT');
        }, 650);
      }

      return { remainingBlock, damageToHp, nextHp };
    },
    []
  );

  const applyDamageToPlayer = useCallback(
    (rawDamage: number, currentBlock: number, currentSanity: number, reason: string) => {
      let nextBlock = currentBlock;
      let dmg = rawDamage;
      if (nextBlock > 0) {
        const absorbed = Math.min(nextBlock, dmg);
        nextBlock -= absorbed;
        dmg -= absorbed;
      }
      const nextSanity = Math.max(0, currentSanity - dmg);
      setPlayerBlock(nextBlock);
      setPlayerSanity(nextSanity);
      if (dmg > 0) {
        setPlayerHitTrigger((c) => c + 1);
        soundEngine.playBossAttackHit();
        spawnFloatingText(`-${dmg}`, 'PLAYER', 'CRIMSON', reason);
      } else {
        soundEngine.playShieldGain();
        spawnFloatingText('BLOCKED', 'PLAYER', 'CYAN', reason);
      }

      if (nextSanity <= 0) {
        soundEngine.playDefeatGong();
        setTimeout(() => {
          setVerdictOutcome('REJECT');
          setPhase('VERDICT');
        }, 650);
      }
      return { nextBlock, nextSanity, unblockedDamage: dmg };
    },
    [spawnFloatingText]
  );

  const triggerCardShowcase = (card: PlayableCard) => {
    setCenterShowcaseCard(card);
    setTimeout(() => {
      setCenterShowcaseCard((curr) =>
        curr?.instanceId === card.instanceId ? null : curr
      );
    }, 680);
  };

  // Attach any dragged passage from the Manuscript Drawer
  const handleAttachDraggedQuote = ({
    quote,
    location,
    inferredCategories,
  }: {
    quote: string;
    location: string;
    sectionHeading: string;
    inferredCategories: WeaknessCategory[];
  }) => {
    const matchesWeakness = Boolean(
      currentAttack &&
        inferredCategories.some((cat) =>
          currentAttack.acceptedCategories.includes(cat)
        )
    );
    const orb: LoadedEvidence = {
      cardId: `drag-${Date.now()}`,
      cardName: `${location} Dragged Citation`,
      quote,
      location,
      strongAgainst: inferredCategories,
      matchedBossWeakness: matchesWeakness,
    };
    setLoadedEvidence(orb);
    soundEngine.playVerifiedLock();
    spawnFloatingText(
      `Reference Attached (${location})`,
      'PLAYER',
      matchesWeakness ? 'GOLD' : 'CYAN',
      'Manuscript Drag Citation'
    );
  };

  // Play a Grad Student Event / Survival / Politics Card
  const handlePlayCard = (card: PlayableCard) => {
    if (isTurnBusy || energy < card.cost) return;

    soundEngine.playCardPlay();
    triggerCardShowcase(card);

    let nextEnergy = energy - card.cost + (card.energyGain || 0);
    let nextSanity = playerSanity;
    let nextBlock = playerBlock + (card.blockGain || 0);
    let nextOverwhelm = overwhelmStacks + (card.reduceBossAttackFlat || 0);
    let nextBossBlock = bossBlock;
    let nextBossHp = bossHp;
    let nextMultiplier = rebuttalPowerMultiplier;

    if (card.selfSanityCost && card.selfSanityCost > 0) {
      nextSanity = Math.max(1, nextSanity - card.selfSanityCost);
      setPlayerHitTrigger((c) => c + 1);
      spawnFloatingText(`-${card.selfSanityCost} SANITY`, 'PLAYER', 'VIOLET', card.name);
    }

    if (card.healSanity && card.healSanity > 0) {
      nextSanity = Math.min(playerMaxSanity, nextSanity + card.healSanity);
      spawnFloatingText(`+${card.healSanity} SANITY`, 'PLAYER', 'EMERALD', card.name);
    }

    if (card.blockGain && card.blockGain > 0) {
      soundEngine.playShieldGain();
      spawnFloatingText(`+${card.blockGain} BLOCK`, 'PLAYER', 'CYAN', card.name);
    }

    if (card.reduceBossAttackFlat && card.reduceBossAttackFlat > 0) {
      spawnFloatingText(
        `ATK -${card.reduceBossAttackFlat}`,
        'BOSS',
        'CYAN',
        card.name
      );
    }

    if (card.rebuttalMultiplierBuff && card.rebuttalMultiplierBuff > 1) {
      nextMultiplier = Math.max(
        nextMultiplier,
        Number((nextMultiplier * card.rebuttalMultiplierBuff).toFixed(2))
      );
      setRebuttalPowerMultiplier(nextMultiplier);
      spawnFloatingText(
        `Rebuttal Power ${nextMultiplier.toFixed(1)}x!`,
        'PLAYER',
        'GOLD',
        card.name
      );
    }

    if (card.shatterBossBlock) {
      nextBossBlock = 0;
      setBossBlock(0);
      setIsBossLogicBroken(true);
      soundEngine.playCriticalAttack();
      spawnFloatingText('SHIELD SHATTERED!', 'BOSS', 'GOLD', card.name);
      void play3DCutsceneAndWait({
        type: 'PLAYER_CRITICAL',
        title: `${card.name} — Logic Barrier Shattered!`,
        subtitle: 'CRITICAL SHIELD SHATTER // PEER REVIEW OVERRIDE',
        quoteOrDialogue: card.manuscriptQuote || card.description.replace('\n', ' '),
        damage: card.rebuttalDamage || 25,
        rank: 'S',
      });
    }

    if (card.autoAttachBestEvidence && currentAttack) {
      const bestSnippet =
        manuscriptSnippets.find((s) =>
          s.categories.some((cat) => currentAttack.acceptedCategories.includes(cat))
        ) || manuscriptSnippets[0];

      if (bestSnippet) {
        const orb: LoadedEvidence = {
          cardId: bestSnippet.id,
          cardName: bestSnippet.label,
          quote: bestSnippet.quote,
          location: bestSnippet.location,
          strongAgainst: bestSnippet.categories,
          matchedBossWeakness: true,
        };
        setLoadedEvidence(orb);
        spawnFloatingText(
          `Key Citation Attached (${bestSnippet.location})`,
          'PLAYER',
          'GOLD',
          card.name
        );
      }
    }

    if (card.rebuttalDamage && card.rebuttalDamage > 0) {
      const res = applyDamageToBoss(card.rebuttalDamage, nextBossBlock, nextBossHp);
      nextBossBlock = res.remainingBlock;
      nextBossHp = res.nextHp;
      spawnFloatingText(`-${card.rebuttalDamage}`, 'BOSS', 'CRIMSON', card.name);
    }

    appendLog('PLAYER', `Event Card Played: ${card.name}`, card.description.replace('\n', ' '));

    const remainingHand = hand.filter((c) => c.instanceId !== card.instanceId);
    let nextDiscard = discardPile;
    if (card.exhaustOnPlay) {
      setExhaustPileCount((c) => c + 1);
    } else {
      nextDiscard = [...discardPile, card];
    }

    if (card.drawCards && card.drawCards > 0) {
      const drawn = drawCardsFromPile(
        card.drawCards,
        drawPile,
        nextDiscard,
        remainingHand
      );
      setDrawPile(drawn.draw);
      setDiscardPile(drawn.discard);
      setHand(drawn.nextHand);
    } else {
      setHand(remainingHand);
      setDiscardPile(nextDiscard);
    }

    setEnergy(nextEnergy);
    setPlayerSanity(nextSanity);
    setPlayerBlock(nextBlock);
    setOverwhelmStacks(nextOverwhelm);
  };

  // Apply evaluated Natural Language Rebuttal and advance to the next Reviewer 2 question
  const applyRebuttalEvaluationResult = async (
    result: RebuttalEvaluationResult,
    submittedText: string
  ) => {
    setIsTurnBusy(true);
    try {
      let currentSanity = playerSanity;
      let currentBlock = playerBlock;
      let bossShieldFullyBroken = isBossLogicBroken;

      if (result.rank === 'F' || result.selfPenaltyDamage) {
        const pen = result.selfPenaltyDamage || 10;
        const rawIncoming = currentAttack
          ? Math.max(0, currentAttack.damage + bossEnrage - overwhelmStacks)
          : 18;

        // Play 3D Boss Ultimate Cutscene on F-rank rejection
        await play3DCutsceneAndWait({
          type: 'BOSS_ULTIMATE',
          title: currentAttack?.title || 'Reviewer 2: Summary Rejection Gavel',
          subtitle: 'BOSS ULTIMATE // REJECT WITHOUT MERCY',
          quoteOrDialogue:
            result.reviewerReaction ||
            currentAttack?.reviewerDialogue ||
            'How dare you insult the program committee with such flimsy excuses! Immediate REJECT!',
          damage: pen + rawIncoming,
          rank: 'F',
        });

        setLatestRebuttalFeedback(result);
        setTimeout(() => {
          setLatestRebuttalFeedback((curr) => (curr === result ? null : curr));
        }, 7500);

        const penRes = applyDamageToPlayer(
          pen,
          currentBlock,
          currentSanity,
          'Rejected Rebuttal Backfire'
        );
        currentBlock = penRes.nextBlock;
        currentSanity = penRes.nextSanity;
        appendLog(
          'REVIEWER_2',
          `Rebuttal Rejected (Rank F / -${pen})`,
          `"${submittedText}" — ${result.logicFeedback}`
        );
        if (currentSanity <= 0) {
          return;
        }
      } else {
        const boostedDmg =
          Math.round(result.finalDamage * rebuttalPowerMultiplier) + clarityStacks;
        const isCriticalHit =
          result.rank === 'S' ||
          result.rank === 'A' ||
          Boolean(loadedEvidence?.matchedBossWeakness);

        // Play 3D Player Critical Cutscene on S/A rank or weakness break
        if (isCriticalHit) {
          await play3DCutsceneAndWait({
            type: 'PLAYER_CRITICAL',
            title:
              result.rank === 'S'
                ? 'Flawless Refutation — Reviewer Silenced!'
                : 'Decisive Counter-Rebuttal — Logic Barrier Crushed!',
            subtitle: `CRITICAL REBUTTAL // RANK ${result.rank} VERIFIED`,
            quoteOrDialogue: submittedText,
            damage: boostedDmg,
            rank: result.rank,
          });
        }

        setLatestRebuttalFeedback(result);
        setTimeout(() => {
          setLatestRebuttalFeedback((curr) => (curr === result ? null : curr));
        }, 7500);

        soundEngine.playCriticalAttack();
        let currentBlockForBoss = bossBlock;

        if (isCriticalHit) {
          currentBlockForBoss = 0;
          bossShieldFullyBroken = true;
          setBossBlock(0);
          setIsBossLogicBroken(true);
          setCriticalRebuttalsCount((c) => c + 1);
        }

        const bossHit = applyDamageToBoss(boostedDmg, currentBlockForBoss, bossHp);
        if (bossHit.remainingBlock === 0) {
          bossShieldFullyBroken = true;
          setIsBossLogicBroken(true);
        }

        currentBlock = currentBlock + result.blockAwarded;
        setPlayerBlock(currentBlock);
        setRebuttalPowerMultiplier(1);

        spawnFloatingText(
          `-${boostedDmg}`,
          'BOSS',
          'GOLD',
          `Logical Rebuttal [Rank ${result.rank}]`
        );

        appendLog(
          'PLAYER',
          `Freeform Rebuttal Hit (Rank ${result.rank} / -${boostedDmg})`,
          `"${submittedText}" — ${result.logicFeedback}`,
          loadedEvidence?.quote || currentAttack?.verbatimQuote,
          true
        );

        if (bossHit.nextHp <= 0) {
          return;
        }
      }

      // Automatically resolve the current question and move to the next question
      await new Promise((r) => setTimeout(r, 950));

      const cursesInHand = hand.filter((c) => c.category === 'CURSE');
      for (const curse of cursesInHand) {
        const pen = curse.endTurnSanityPenalty || 5;
        const res = applyDamageToPlayer(
          pen,
          currentBlock,
          currentSanity,
          curse.name
        );
        currentBlock = res.nextBlock;
        currentSanity = res.nextSanity;
      }

      if (currentSanity <= 0) {
        return;
      }

      let unblockedDamage = 0;
      const isFullParry =
        result.rank === 'S' || result.rank === 'A' || bossShieldFullyBroken;

      if (isFullParry && result.rank !== 'F') {
        soundEngine.playShieldGain();
        spawnFloatingText(
          'REFUTED! (Attack Nullified)',
          'PLAYER',
          'EMERALD',
          'Advancing to Next Question'
        );
      } else {
        setBossAttackTrigger((c) => c + 1);
        const rawIncoming = currentAttack
          ? Math.max(0, currentAttack.damage + bossEnrage - overwhelmStacks)
          : 18;
        const incomingDmg =
          result.rank === 'F' ? rawIncoming : Math.max(4, Math.round(rawIncoming * 0.5));

        await new Promise((r) => setTimeout(r, 380));

        const hitRes = applyDamageToPlayer(
          incomingDmg,
          currentBlock,
          currentSanity,
          currentAttack?.title || 'Reviewer 2 Counterattack'
        );
        unblockedDamage = hitRes.unblockedDamage;
        if (hitRes.nextSanity <= 0) {
          return;
        }
      }

      let nextDiscardPile = [...discardPile, ...hand];
      if (
        unblockedDamage > 0 &&
        (result.rank === 'F' || currentAttack?.debuffType === 'RED_INK_BLEED')
      ) {
        const curseCard = createRedInkCurseCard();
        nextDiscardPile.push(curseCard);
        spawnFloatingText(
          '+Trauma Curse Added',
          'PLAYER',
          'VIOLET',
          'Added to Discard Pile'
        );
      }

      setTurn((t) => t + 1);
      setPlayerBlock(0);
      setEnergy(maxEnergy);
      setOverwhelmStacks(0);
      setRebuttalPowerMultiplier(1);
      setLoadedEvidence(null);

      const drawn = drawCardsFromPile(5, drawPile, nextDiscardPile, []);
      setDrawPile(drawn.draw);
      setDiscardPile(drawn.discard);
      setHand(drawn.nextHand);

      await prepareNextBossAttack(activeDoc, usedQuotesRef.current, apiKey);
    } finally {
      setIsTurnBusy(false);
    }
  };

  const handleSubmitInlineRebuttal = async (text: string) => {
    if (!currentAttack || isTurnBusy || isSubmittingRebuttal) return;
    setIsSubmittingRebuttal(true);
    let evalResult: RebuttalEvaluationResult | null = null;
    try {
      evalResult = await evaluateFreeformRebuttal({
        rebuttalText: text,
        currentAttack,
        loadedEvidence,
        doc: activeDoc,
        baseCardDamage: 28,
        apiKey,
      });
    } finally {
      setIsSubmittingRebuttal(false);
    }
    if (evalResult) {
      await applyRebuttalEvaluationResult(evalResult, text);
    }
  };

  const handleCommitModalRebuttal = (
    result: RebuttalEvaluationResult,
    submittedText: string
  ) => {
    setIsExpandedRebuttalOpen(false);
    void applyRebuttalEvaluationResult(result, submittedText);
  };

  const handleEndTurn = async () => {
    if (isTurnBusy || isSubmittingRebuttal || phase !== 'BATTLE') return;
    setIsTurnBusy(true);
    setLatestRebuttalFeedback(null);

    try {
      let currentSanity = playerSanity;
      let currentBlock = playerBlock;

      const cursesInHand = hand.filter((c) => c.category === 'CURSE');
      for (const curse of cursesInHand) {
        const pen = curse.endTurnSanityPenalty || 5;
        const res = applyDamageToPlayer(
          pen,
          currentBlock,
          currentSanity,
          curse.name
        );
        currentBlock = res.nextBlock;
        currentSanity = res.nextSanity;
        appendLog(
          'REVIEWER_2',
          `${curse.name} (-${pen})`,
          'Unplayed trauma curse in hand drained your sanity.'
        );
      }

      if (currentSanity <= 0) {
        return;
      }

      const incomingDmg = currentAttack
        ? Math.max(0, currentAttack.damage + bossEnrage - overwhelmStacks)
        : 18;

      // Play Boss 3D Ultimate Cutscene when Reviewer 2 executes a heavy/ultimate strike on unanswered turn
      if (
        incomingDmg >= 18 ||
        currentAttack?.debuffType === 'RED_INK_BLEED' ||
        currentAttack?.debuffType === 'IMPOSTOR_SYNDROME' ||
        currentAttack?.debuffType === 'DEADLINE_PANIC'
      ) {
        await play3DCutsceneAndWait({
          type: 'BOSS_ULTIMATE',
          title: currentAttack?.title || 'Reviewer 2: Red Ink Execution',
          subtitle: 'BOSS ULTIMATE // UNANSWERED CRITIQUE',
          quoteOrDialogue:
            currentAttack?.reviewerDialogue ||
            'You could not even muster a rebuttal! I shall stamp a crimson REJECT across your manuscript!',
          damage: incomingDmg,
        });
      }

      setBossAttackTrigger((c) => c + 1);
      await new Promise((r) => setTimeout(r, 380));

      const hitRes = applyDamageToPlayer(
        incomingDmg,
        currentBlock,
        currentSanity,
        currentAttack?.title || 'Reviewer 2 Attack'
      );

      if (hitRes.nextSanity <= 0) {
        return;
      }

      let nextDiscardPile = [...discardPile, ...hand];
      if (hitRes.unblockedDamage > 0 || currentAttack?.debuffType === 'RED_INK_BLEED') {
        const curseCard = createRedInkCurseCard();
        nextDiscardPile.push(curseCard);
        spawnFloatingText(
          '+Trauma Curse Added',
          'PLAYER',
          'VIOLET',
          'Added to Discard Pile'
        );
      }

      setTurn((t) => t + 1);
      setPlayerBlock(0);
      setEnergy(maxEnergy);
      setOverwhelmStacks(0);
      setRebuttalPowerMultiplier(1);
      setLoadedEvidence(null);

      const drawn = drawCardsFromPile(5, drawPile, nextDiscardPile, []);
      setDrawPile(drawn.draw);
      setDiscardPile(drawn.discard);
      setHand(drawn.nextHand);

      await prepareNextBossAttack(activeDoc, usedQuotesRef.current, apiKey);
    } finally {
      setIsTurnBusy(false);
    }
  };

  useEffect(() => {
    soundEngine.setMuted(isMuted);
  }, [isMuted]);

  if (phase === 'LOBBY') {
    return (
      <TitleLobbyScreen
        apiKey={apiKey}
        onChangeApiKey={setApiKey}
        onStartBattleWithDocument={(doc) => handleStartBattle(doc, apiKey)}
      />
    );
  }

  const reviewScore = Math.max(
    1,
    Math.min(10, Number((((bossMaxHp - bossHp) / bossMaxHp) * 9 + 1).toFixed(1)))
  );

  const apiWaitMode: ApiWaitMode = isSubmittingRebuttal
    ? 'EVALUATING_REBUTTAL'
    : isGeneratingAttack
    ? 'GENERATING_ATTACK'
    : 'IDLE';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0807] select-none flex flex-col">
      {/* Top Iron & Brass Bar (No duplicate Player HP here — Player HP is shown once under the character) */}
      <header className="relative z-40 h-11 shrink-0 w-full bg-gradient-to-b from-[#1c1713] to-[#110e0b] border-b-2 border-[#785c32] px-4 md:px-6 flex items-center justify-between shadow-[0_6px_20px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/assets/icon_reviewer2.png"
              alt="Reviewer 2 Icon"
              className="w-7 h-7 rounded object-contain"
            />
            <img
              src="/assets/logo_reviewer2.png"
              alt="REVIEWER 2"
              className="h-7 w-auto object-contain mix-blend-lighten"
            />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#14100c] border border-[#634c29] text-xs font-cinzel font-bold text-[#d4b275] shrink-0">
            <Swords className="w-3.5 h-3.5 text-[#c89d54]" />
            <span>Turn {turn}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-[#c7b8a1] truncate">
            <ScrollText className="w-3.5 h-3.5 text-[#c89d54] shrink-0" />
            <span className="truncate">{activeDoc.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() =>
              void play3DCutsceneAndWait({
                type: 'PLAYER_CRITICAL',
                title: 'Flawless Refutation — Reviewer Silenced!',
                subtitle: 'CRITICAL REBUTTAL // RANK S VERIFIED',
                quoteOrDialogue:
                  loadedEvidence?.quote ||
                  'Already rigorously proven with p < 0.001 significance in the Section 4.3 ablation table!',
                damage: 48,
                rank: 'S',
              })
            }
            className="px-2.5 py-1 rounded bg-[#2b200d] hover:bg-[#3d2d12] border border-[#d4af37] text-[#ffe28a] text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            title="Preview 3D Critical Rebuttal Cutscene"
          >
            <span>⚡ 3D Crit</span>
          </button>

          <button
            onClick={() =>
              void play3DCutsceneAndWait({
                type: 'BOSS_ULTIMATE',
                title: currentAttack?.title || 'Reviewer 2: Red Ink Execution',
                subtitle: 'BOSS ULTIMATE // REJECT WITHOUT MERCY',
                quoteOrDialogue:
                  currentAttack?.reviewerDialogue ||
                  'This manuscript is a waste of the committee’s time! Unacceptable without a complete experimental overhaul!',
                damage: 32,
                rank: 'F',
              })
            }
            className="px-2.5 py-1 rounded bg-[#2b1010] hover:bg-[#401616] border border-[#b83b3b] text-[#ff9e9e] text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            title="Preview Boss 3D Ultimate Cutscene"
          >
            <span>💀 3D Ultimate</span>
          </button>

          <button
            onClick={() => setIsManuscriptOpen(true)}
            className="px-3 py-1 rounded bg-[#241d16] hover:bg-[#33291f] border border-[#8c6d3f] text-[#f5ebd9] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#c89d54]" />
            <span>Manuscript (Drag to Cite)</span>
          </button>

          <button
            onClick={() => setIsCombatLogOpen((v) => !v)}
            className="px-3 py-1 rounded bg-[#1c1712] hover:bg-[#29221a] border border-[#54432b] text-[#d6c7b2] text-xs font-semibold cursor-pointer transition"
          >
            <span>Review Log</span>
          </button>

          <button
            onClick={() => setIsMuted((m) => !m)}
            className="p-1.5 rounded bg-[#1c1712] hover:bg-[#29221a] text-[#d6c7b2] border border-[#54432b] cursor-pointer transition"
            title="Toggle Mute"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#d96b6b]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#c89d54]" />
            )}
          </button>

          <button
            onClick={() => setPhase('LOBBY')}
            className="px-2.5 py-1 rounded bg-[#1c1712] hover:bg-[#331818] border border-[#54432b] text-[#bfb099] hover:text-[#f2c6c6] text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
            title="Return to Title Screen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Change Paper</span>
          </button>
        </div>
      </header>

      {/* Collapsible Combat Log */}
      {isCombatLogOpen && (
        <div className="absolute top-13 right-4 z-40 w-80 max-h-80 overflow-y-auto rounded-lg bg-[#14110e]/98 border-2 border-[#785c32] p-3.5 shadow-2xl">
          <div className="text-xs font-bold text-[#e6c280] mb-2.5 pb-1.5 border-b border-[#54432b] flex items-center justify-between">
            <span>Peer Review Combat Log</span>
            <button
              onClick={() => setIsCombatLogOpen(false)}
              className="text-[#a89882] hover:text-white text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="space-y-2">
            {combatLog.map((entry) => (
              <div
                key={entry.id}
                className="p-2 rounded bg-[#0c0a08] border border-[#3d3122] text-[11px]"
              >
                <div className="font-bold text-[#e6c280]">
                  [Turn {entry.turn}] {entry.title}
                </div>
                <div className="text-[#d6c7b2] mt-0.5 leading-relaxed">
                  {entry.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Battle Stage (3-Column Non-Overlapping Arena) */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden">
        <Boss3DStage
          currentAttack={currentAttack}
          bossHp={bossHp}
          bossMaxHp={bossMaxHp}
          bossBlock={bossBlock}
          isBossLogicBroken={isBossLogicBroken}
          bossEnrage={bossEnrage}
          overwhelmStacks={overwhelmStacks}
          playerSanity={playerSanity}
          playerMaxSanity={playerMaxSanity}
          playerBlock={playerBlock}
          clarityStacks={clarityStacks}
          centerShowcaseCard={centerShowcaseCard}
          latestRebuttalFeedback={latestRebuttalFeedback}
          apiWaitMode={apiWaitMode}
          bossHitTrigger={bossHitTrigger}
          bossAttackTrigger={bossAttackTrigger}
          playerHitTrigger={playerHitTrigger}
          floatingTexts={floatingTexts}
          onInspectQuoteInManuscript={(quote) => {
            setHighlightedQuote(quote);
            setIsManuscriptOpen(true);
          }}
        />
      </main>

      {/* Bottom HUD: Inline Natural Language Rebuttal Desk + Event Card Hand */}
      <CardHand
        hand={hand}
        energy={energy}
        maxEnergy={maxEnergy}
        loadedEvidence={loadedEvidence}
        rebuttalPowerMultiplier={rebuttalPowerMultiplier}
        drawPileCount={drawPile.length}
        discardPileCount={discardPile.length}
        exhaustPileCount={exhaustPileCount}
        isTurnBusy={isTurnBusy}
        isSubmittingRebuttal={isSubmittingRebuttal}
        onPlayCard={handlePlayCard}
        onOpenManuscriptForDrag={() => setIsManuscriptOpen(true)}
        onClearEvidence={() => setLoadedEvidence(null)}
        onSubmitInlineRebuttal={handleSubmitInlineRebuttal}
        onOpenExpandedRebuttal={() => setIsExpandedRebuttalOpen(true)}
        onEndTurn={handleEndTurn}
      />

      <ManuscriptDrawer
        isOpen={isManuscriptOpen}
        doc={activeDoc}
        highlightedQuote={highlightedQuote || currentAttack?.verbatimQuote || ''}
        currentlyAttachedQuote={loadedEvidence?.quote}
        onAttachDraggedQuote={handleAttachDraggedQuote}
        onClose={() => setIsManuscriptOpen(false)}
      />

      {currentAttack && (
        <FreeformRebuttalModal
          isOpen={isExpandedRebuttalOpen}
          currentAttack={currentAttack}
          loadedEvidence={loadedEvidence}
          doc={activeDoc}
          baseCardDamage={Math.round(28 * rebuttalPowerMultiplier)}
          apiKey={apiKey}
          onClose={() => setIsExpandedRebuttalOpen(false)}
          onCommitRebuttalResult={handleCommitModalRebuttal}
        />
      )}

      <VerdictScreenModal
        outcome={phase === 'VERDICT' ? verdictOutcome : null}
        reviewScore={reviewScore}
        doc={activeDoc}
        turnsTaken={turn}
        totalRebuttalDamage={bossMaxHp - bossHp}
        criticalCountersLanded={criticalRebuttalsCount}
        onRematchSameDoc={() => handleStartBattle(activeDoc, apiKey)}
        onReturnToLobby={() => setPhase('LOBBY')}
      />

      {/* Fullscreen WebGL Three.js 3D Combat Cutscene Modal */}
      <Battle3DCutsceneModal
        event={activeCutscene}
        onComplete={handleCompleteCutscene}
      />
    </div>
  );
}

export default App;
