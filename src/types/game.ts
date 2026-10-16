export type WeaknessCategory =
  | 'BASELINE'
  | 'ABLATION'
  | 'STATISTICS'
  | 'SCOPE'
  | 'REPRODUCIBILITY'
  | 'NOVELTY';

export interface DocumentSection {
  id: string;
  heading: string;
  pageOrFile: string;
  content: string;
}

export interface DocumentSource {
  id: string;
  title: string;
  subtitle?: string;
  sourceType: 'PDF' | 'GITHUB' | 'PRESET';
  authors: string;
  venue: string;
  fullText: string;
  sections: DocumentSection[];
  tokenEstimate: number;
  repoUrl?: string;
  fileCount?: number;
}

export interface VerificationAttempt {
  id: string;
  roundNumber: number;
  candidateAttackTitle: string;
  candidateDialogue: string;
  candidateQuote: string;
  verified: boolean;
  matchType: 'EXACT_SUBSTRING' | 'NORMALIZED_VERBATIM' | 'HALLUCINATION_REJECTED';
  matchScore: number;
  matchedLocation?: string;
  matchedCharIndex?: number;
  surroundingContext?: string;
  statusMessage: string;
}

export interface BossAttackIntent {
  id: string;
  title: string;
  koreanTitle: string;
  reviewerDialogue: string;
  verbatimQuote: string;
  quoteLocation: string;
  weaknessCategory: WeaknessCategory;
  acceptedCategories: WeaknessCategory[];
  damage: number;
  startingBossBlock: number;
  debuffType?: 'IMPOSTOR_SYNDROME' | 'DEADLINE_PANIC' | 'RED_INK_BLEED';
  debuffAmount?: number;
  counterHint: string;
  verification: {
    verified: true;
    matchType: 'EXACT_SUBSTRING' | 'NORMALIZED_VERBATIM';
    matchScore: number;
    charOffset: number;
    discardedCountBeforeValid: number;
  };
}

export type CardCategory =
  | 'EVIDENCE'
  | 'TACTIC_ATTACK'
  | 'TACTIC_DEFENSE'
  | 'TACTIC_SKILL'
  | 'FREEFORM_REBUTTAL'
  | 'CURSE';

export type CardRarity =
  | 'STARTER'
  | 'UNCOMMON'
  | 'RARE'
  | 'MANUSCRIPT_EVIDENCE'
  | 'MYTHIC_QUILL'
  | 'CURSE';

export interface PlayableCard {
  id: string;
  instanceId: string;
  name: string;
  koreanName: string;
  category: CardCategory;
  rarity: CardRarity;
  cost: number;
  artwork: string;
  rebuttalDamage?: number;
  blockGain?: number;
  drawCards?: number;
  energyGain?: number;
  selfSanityCost?: number;
  healSanity?: number;
  rebuttalMultiplierBuff?: number;
  shatterBossBlock?: boolean;
  autoAttachBestEvidence?: boolean;
  reduceBossAttackFlat?: number;
  clarityBuff?: number;
  overwhelmDebuff?: number;
  intentReductionPct?: number;
  hitsPerCardPlayed?: boolean;
  bonusIfEvidenceLoaded?: number;
  piercesLogicBarrier?: boolean;
  exhaustOnPlay?: boolean;
  endTurnSanityPenalty?: number;
  strongAgainst?: WeaknessCategory[];
  manuscriptQuote?: string;
  manuscriptLocation?: string;
  description: string;
  shortTypeLabel: string;
}

export interface LoadedEvidence {
  cardId: string;
  cardName: string;
  quote: string;
  location: string;
  strongAgainst: WeaknessCategory[];
  matchedBossWeakness: boolean;
}

export interface Relic {
  id: string;
  name: string;
  koreanName: string;
  icon: string;
  counter?: number;
  description: string;
}

export interface RebuttalEvaluationResult {
  rank: 'S' | 'A' | 'B' | 'C' | 'F';
  score: number;
  damageMultiplier: number;
  finalDamage: number;
  blockAwarded: number;
  selfPenaltyDamage?: number;
  logicFeedback: string;
  reviewerReaction: string;
  matchedKeywords: string[];
  usedLoadedEvidence: boolean;
}

export interface FloatingCombatText {
  id: string;
  text: string;
  subtext?: string;
  target: 'BOSS' | 'PLAYER' | 'CENTER';
  color: 'GOLD' | 'CRIMSON' | 'CYAN' | 'EMERALD' | 'VIOLET';
  xOffset: number;
  yOffset: number;
}

export interface CombatLogEntry {
  id: string;
  turn: number;
  actor: 'PLAYER' | 'REVIEWER_2' | 'VERIFIER_LOOP' | 'SYSTEM';
  title: string;
  detail: string;
  quote?: string;
  isCritical?: boolean;
}
