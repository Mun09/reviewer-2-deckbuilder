import {
  BossAttackIntent,
  DocumentSource,
  LoadedEvidence,
  RebuttalEvaluationResult,
  VerificationAttempt,
  WeaknessCategory,
} from '../types/game';
import {
  mineGroundedSentencesFromDocument,
  verifyQuoteInDocument,
} from './citationVerifier';

export interface GeneratedAttackBatch {
  verifiedIntents: BossAttackIntent[];
  verificationAuditLog: VerificationAttempt[];
  usedLiveApi: boolean;
}

interface RawCandidateCritique {
  title: string;
  koreanTitle: string;
  reviewerDialogue: string;
  verbatimQuote: string;
  weaknessCategory: WeaknessCategory;
  acceptedCategories?: WeaknessCategory[];
  damage: number;
  startingBossBlock?: number;
  counterHint: string;
}

const ALLIED_CATEGORY: Record<WeaknessCategory, WeaknessCategory> = {
  BASELINE: 'REPRODUCIBILITY',
  ABLATION: 'STATISTICS',
  STATISTICS: 'ABLATION',
  SCOPE: 'NOVELTY',
  REPRODUCIBILITY: 'BASELINE',
  NOVELTY: 'SCOPE',
};

export const DEFAULT_GEMINI_API_KEY =
  (import.meta as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY || '';

const cachedBatchByDocId = new Map<string, GeneratedAttackBatch>();

async function callArgonOrGeminiJson(
  prompt: string,
  apiKey: string,
  temperature = 0.35
): Promise<string | null> {
  const modelsToTry = [
    'models/gemini-2.5-flash',
    'models/gemini-flash-latest',
    'models/gemini-2.0-flash',
  ];

  for (const modelName of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) continue;
      const data = await response.json();
      const parts: Array<{ text?: string; thought?: boolean }> =
        data?.candidates?.[0]?.content?.parts || [];
      const textPart =
        parts.find((p) => typeof p.text === 'string' && !p.thought) ||
        parts[parts.length - 1];
      if (textPart?.text) {
        return textPart.text
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
      }
    } catch {
      // Try next model in fallback chain
    }
  }
  return null;
}

export async function generateVerifiedBossAttacks(
  doc: DocumentSource,
  apiKey?: string
): Promise<GeneratedAttackBatch> {
  const cached = cachedBatchByDocId.get(doc.id);
  if (cached && cached.verifiedIntents.length >= 4) {
    return cached;
  }

  const auditLog: VerificationAttempt[] = [];
  const verifiedIntents: BossAttackIntent[] = [];
  let usedLiveApi = false;

  const cleanKey = (
    apiKey ||
    localStorage.getItem('REVIEWER2_GEMINI_KEY') ||
    DEFAULT_GEMINI_API_KEY
  ).trim();

  if (cleanKey.length > 10) {
    try {
      const prompt = `You are "Reviewer 2", the ruthless peer reviewer boss in an academic deckbuilding game.
Read the entire manuscript / repository corpus below and generate 7 sharp Reviewer 2 attacks in English.
CRITICAL RULE (VERIFICATION LOOP):
Every single attack MUST include "verbatimQuote", which MUST be an EXACT character-for-character substring copied directly from the provided document text. Do NOT paraphrase or invent quotes.

Return ONLY valid JSON array of objects with fields:
- "title": string (Short English attack title)
- "koreanTitle": string (Same English attack title)
- "reviewerDialogue": string (Cynical, sharp English Reviewer 2 critique, e.g. "Why does Table 3 only compare against two baselines?!")
- "verbatimQuote": string (EXACT verbatim substring copied directly from the document)
- "weaknessCategory": one of ["BASELINE", "ABLATION", "STATISTICS", "SCOPE", "REPRODUCIBILITY", "NOVELTY"]
- "damage": number between 22 and 32
- "counterHint": string (English hint on how to counter this critique)

DOCUMENT CORPUS:
${doc.fullText.slice(0, 450000)}`;

      const textOut = await callArgonOrGeminiJson(prompt, cleanKey, 0.35);
      if (textOut) {
        const parsed: RawCandidateCritique[] = JSON.parse(textOut);
        if (Array.isArray(parsed) && parsed.length > 0) {
          usedLiveApi = true;
          let discardedBefore = 0;

          parsed.forEach((cand, idx) => {
            const check = verifyQuoteInDocument(cand.verbatimQuote || '', doc);
            auditLog.push({
              id: `audit_live_${idx}_${Date.now()}`,
              roundNumber: idx + 1,
              candidateAttackTitle: cand.title || cand.koreanTitle,
              candidateDialogue: cand.reviewerDialogue,
              candidateQuote: cand.verbatimQuote,
              verified: check.verified,
              matchType: check.matchType,
              matchScore: check.matchScore,
              matchedLocation: check.matchedLocation,
              matchedCharIndex: check.matchedCharIndex,
              surroundingContext: check.surroundingContext,
              statusMessage: check.statusMessage,
            });

            if (check.verified) {
              const cat = cand.weaknessCategory || 'BASELINE';
              const cleanTitle = cand.title || cand.koreanTitle || 'Peer Review Critique';
              verifiedIntents.push({
                id: `intent_live_${idx}_${Date.now()}`,
                title: cleanTitle,
                koreanTitle: cleanTitle,
                reviewerDialogue: cand.reviewerDialogue,
                verbatimQuote: check.canonicalQuote,
                quoteLocation: check.matchedLocation,
                weaknessCategory: cat,
                acceptedCategories: [cat, ALLIED_CATEGORY[cat]],
                damage: Math.min(34, Math.max(20, Number(cand.damage) || 24)),
                startingBossBlock: 22 + (idx % 3) * 4,
                debuffType: idx % 2 === 1 ? 'IMPOSTOR_SYNDROME' : undefined,
                debuffAmount: idx % 2 === 1 ? 1 : undefined,
                counterHint:
                  cand.counterHint ||
                  `Cite [${cat}] or [${ALLIED_CATEGORY[cat]}] evidence from your manuscript to shatter the Logic Barrier!`,
                verification: {
                  verified: true,
                  matchType:
                    check.matchType === 'HALLUCINATION_REJECTED'
                      ? 'NORMALIZED_VERBATIM'
                      : check.matchType,
                  matchScore: check.matchScore,
                  charOffset: check.matchedCharIndex,
                  discardedCountBeforeValid: discardedBefore,
                },
              });
              discardedBefore = 0;
            } else {
              discardedBefore++;
            }
          });
        }
      }
    } catch {
      // Fallback to local grounded extraction + verification loop below
    }
  }

  const presetCandidates = getGroundedAndHallucinatedCandidatesForDoc(doc);
  let discardedCountBeforeValid = 0;

  presetCandidates.forEach((cand, idx) => {
    const check = verifyQuoteInDocument(cand.verbatimQuote, doc);
    auditLog.push({
      id: `audit_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      roundNumber: auditLog.length + 1,
      candidateAttackTitle: cand.title,
      candidateDialogue: cand.reviewerDialogue,
      candidateQuote: cand.verbatimQuote,
      verified: check.verified,
      matchType: check.matchType,
      matchScore: check.matchScore,
      matchedLocation: check.matchedLocation,
      matchedCharIndex: check.matchedCharIndex,
      surroundingContext: check.surroundingContext,
      statusMessage: check.statusMessage,
    });

    if (!check.verified) {
      discardedCountBeforeValid++;
      return;
    }

    const alreadyHasQuote = verifiedIntents.some(
      (existing) => existing.verbatimQuote === check.canonicalQuote
    );
    if (alreadyHasQuote) {
      return;
    }

    const cat = cand.weaknessCategory;
    verifiedIntents.push({
      id: `intent_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      title: cand.title,
      koreanTitle: cand.title,
      reviewerDialogue: cand.reviewerDialogue,
      verbatimQuote: check.canonicalQuote,
      quoteLocation: check.matchedLocation,
      weaknessCategory: cat,
      acceptedCategories: cand.acceptedCategories || [cat, ALLIED_CATEGORY[cat]],
      damage: cand.damage,
      startingBossBlock: cand.startingBossBlock || 22,
      debuffType: idx % 2 === 1 ? 'RED_INK_BLEED' : undefined,
      debuffAmount: 1,
      counterHint: cand.counterHint,
      verification: {
        verified: true,
        matchType:
          check.matchType === 'HALLUCINATION_REJECTED'
            ? 'NORMALIZED_VERBATIM'
            : check.matchType,
        matchScore: check.matchScore,
        charOffset: check.matchedCharIndex,
        discardedCountBeforeValid,
      },
    });
    discardedCountBeforeValid = 0;
  });

  const finalBatch: GeneratedAttackBatch = {
    verifiedIntents,
    verificationAuditLog: auditLog,
    usedLiveApi,
  };
  cachedBatchByDocId.set(doc.id, finalBatch);
  return finalBatch;
}

function getGroundedAndHallucinatedCandidatesForDoc(
  doc: DocumentSource
): RawCandidateCritique[] {
  if (doc.id === 'preset_flashrag') {
    return [
      {
        title: 'Fabricated Zero-Shot ImageNet Claim (Hallucination Candidate)',
        koreanTitle: 'Fabricated Zero-Shot ImageNet Claim (Blocked by Verifier)',
        reviewerDialogue:
          '"The authors claim in Section 6 that they evaluated a ResNet-50 vision backbone on ImageNet, yet the numbers look suspicious!"',
        verbatimQuote:
          'We evaluate FlashRAG-Agent on ImageNet-1K visual classification using a ResNet-50 backbone.',
        weaknessCategory: 'BASELINE',
        damage: 24,
        counterHint: 'Automatically discarded by the Citation Verification Loop as an ungrounded hallucination.',
      },
      {
        title: 'Table 3 Baseline Scarcity Critique',
        koreanTitle: 'Table 3 Baseline Scarcity Critique',
        reviewerDialogue:
          '"Why does Table 3 only compare against two baselines?! You only tested against BM25 and DPR and dare claim state-of-the-art?!"',
        verbatimQuote:
          'In Table 3, we compare FlashRAG-Agent against two standard retrieval baselines: BM25 and Dense Passage Retrieval (DPR).',
        weaknessCategory: 'BASELINE',
        acceptedCategories: ['BASELINE', 'REPRODUCIBILITY'],
        damage: 24,
        startingBossBlock: 22,
        counterHint:
          'Drag and cite [BASELINE] or [REPRODUCIBILITY] evidence (such as Appendix C.2 ColBERTv2 comparisons) or submit a direct rebuttal!',
      },
      {
        title: 'Arbitrary Speculative Threshold (tau = 0.72)',
        koreanTitle: 'Arbitrary Speculative Threshold (tau = 0.72)',
        reviewerDialogue:
          '"Look at tau = 0.72 in Equation (4)! Isn\'t this a cherry-picked magic number overfitted to a single development split?!"',
        verbatimQuote:
          'Equation (4) defines the speculative acceptance threshold tau = 0.72, which was empirically tuned on the NaturalQuestions development split.',
        weaknessCategory: 'ABLATION',
        acceptedCategories: ['ABLATION', 'STATISTICS'],
        damage: 26,
        startingBossBlock: 25,
        counterHint:
          'Cite [ABLATION] or [STATISTICS] evidence (Table 4 multi-seed ablation & exact HNSW fallback) to break the Logic Barrier!',
      },
      {
        title: 'Unverified Training Cost Claim (Hallucination Candidate)',
        koreanTitle: 'Unverified 512x H100 Training Cost Claim',
        reviewerDialogue: '"This model requires 512 H100 GPUs for a full month just to train the draft head!"',
        verbatimQuote:
          'Training the draft head required 512 NVIDIA H100 GPUs over 30 days of continuous pretraining.',
        weaknessCategory: 'REPRODUCIBILITY',
        damage: 26,
        counterHint: 'Immediately rejected by the Citation Verification Loop because it does not exist in the manuscript.',
      },
      {
        title: 'Stationary Query Embedding Assumption Flaw',
        koreanTitle: 'Stationary Query Embedding Assumption Flaw',
        reviewerDialogue:
          '"Assuming stationary query embeddings across a multi-hop reasoning trajectory is completely unrealistic! What happens when the query drifts?!"',
        verbatimQuote:
          'However, our speculative prefetch cache assumes stationary query embeddings within a single reasoning trajectory.',
        weaknessCategory: 'SCOPE',
        acceptedCategories: ['SCOPE', 'NOVELTY'],
        damage: 25,
        startingBossBlock: 24,
        counterHint:
          'Cite [SCOPE] evidence or explain the cosine-drift flush and exact HNSW search fallback in your rebuttal!',
      },
      {
        title: 'Limited Corpus Scale (21M Passages Only)',
        koreanTitle: 'Limited Corpus Scale (21M Passages Only)',
        reviewerDialogue:
          '"You only evaluated on 21 million English Wikipedia passages and claim production readiness for web-scale retrieval?!"',
        verbatimQuote:
          'A current limitation is that our evaluation focuses on English Wikipedia corpora up to 21 million passages; scaling to web-scale trillion-token dynamic indices remains future work.',
        weaknessCategory: 'STATISTICS',
        acceptedCategories: ['STATISTICS', 'ABLATION'],
        damage: 28,
        startingBossBlock: 26,
        counterHint:
          'Cite [STATISTICS] or [ABLATION] evidence to shatter the Reviewer\'s Logic Barrier!',
      },
    ];
  }

  const mined = mineGroundedSentencesFromDocument(doc);
  const candidates: RawCandidateCritique[] = [
    {
      title: 'Ungrounded Hallucination Critique (Auto-Filtered)',
      koreanTitle: 'Ungrounded Hallucination Critique (Auto-Filtered)',
      reviewerDialogue:
        '"The authors explicitly admit in the text that they only tested on a single hand-picked toy example!"',
      verbatimQuote:
        'We only evaluated our entire framework on a single hand-picked toy example without any baseline.',
      weaknessCategory: 'BASELINE',
      damage: 22,
      counterHint: 'Automatically discarded by the Verification Loop after cross-checking the manuscript.',
    },
  ];

  mined.slice(0, 6).forEach((item, idx) => {
    candidates.push({
      title: item.suggestedAttackTitle,
      koreanTitle: item.suggestedAttackTitle,
      reviewerDialogue: item.suggestedReviewerDialogue,
      verbatimQuote: item.quote,
      weaknessCategory: item.category,
      acceptedCategories: [item.category, ALLIED_CATEGORY[item.category]],
      damage: 23 + (idx % 4) * 2,
      startingBossBlock: 20 + (idx % 3) * 4,
      counterHint: `Cite [${item.category}] or [${ALLIED_CATEGORY[item.category]}] evidence from the paper to break the Logic Barrier!`,
    });
  });

  return candidates;
}

export async function evaluateFreeformRebuttal(params: {
  rebuttalText: string;
  currentAttack: BossAttackIntent;
  loadedEvidence: LoadedEvidence | null;
  doc: DocumentSource;
  baseCardDamage: number;
  apiKey?: string;
}): Promise<RebuttalEvaluationResult> {
  const { rebuttalText, currentAttack, loadedEvidence, doc, baseCardDamage, apiKey } = params;
  const trimmed = rebuttalText.trim();
  const cleanKey = (
    apiKey ||
    localStorage.getItem('REVIEWER2_GEMINI_KEY') ||
    DEFAULT_GEMINI_API_KEY
  ).trim();

  // Check for lazy / meaningless input first
  if (trimmed.length < 15) {
    return {
      rank: 'F',
      score: 12,
      damageMultiplier: 0,
      finalDamage: 0,
      blockAwarded: 0,
      selfPenaltyDamage: 10,
      logicFeedback:
        'Dismissed! Your response is far too brief and lacks empirical grounding. Reviewer 2 tears your rebuttal apart and inflicts -10 Sanity penalty damage.',
      reviewerReaction:
        '"Are you mocking this Tribunal?! A one-line hand-wave with zero empirical evidence—Strong Reject!!"',
      matchedKeywords: ['Lack of Rigor (Counter-Penalty)'],
      usedLoadedEvidence: false,
    };
  }

  if (cleanKey.length > 10) {
    try {
      const prompt = `You are the Chief Program Chair judging an author's rebuttal in the deckbuilding game "Reviewer 2".
Paper Title: ${doc.title}
Reviewer 2's Attack: ${currentAttack.reviewerDialogue}
Reviewer 2's Cited Quote from Paper: "${currentAttack.verbatimQuote}" (${currentAttack.quoteLocation})
Weakness Category: ${currentAttack.weaknessCategory}

Author's Natural Language Rebuttal:
"${trimmed}"

Be strict! If the author's rebuttal is irrelevant, rude, or lacks concrete logic/evidence, give rank "F" with damageMultiplier 0 and selfPenaltyDamage 10.
Return ONLY valid JSON with:
- "rank": one of ["S", "A", "B", "C", "F"]
- "score": integer 0 to 100
- "damageMultiplier": number between 0 and 2.5
- "blockAwarded": integer between 0 and 20
- "selfPenaltyDamage": integer (10 if rank is F, otherwise 0)
- "logicFeedback": string (Concise English evaluation from the Program Chair)
- "reviewerReaction": string (In-character English reaction from Reviewer 2)
- "matchedKeywords": array of strings (English)`;

      const textOut = await callArgonOrGeminiJson(prompt, cleanKey, 0.25);
      if (textOut) {
        const parsed = JSON.parse(textOut);
        if (parsed.rank && typeof parsed.damageMultiplier === 'number') {
          const mult = Math.min(2.5, Math.max(0, parsed.damageMultiplier));
          return {
            rank: parsed.rank,
            score: parsed.score ?? 80,
            damageMultiplier: mult,
            finalDamage: Math.round(baseCardDamage * mult),
            blockAwarded: parsed.blockAwarded ?? 12,
            selfPenaltyDamage:
              parsed.selfPenaltyDamage ?? (parsed.rank === 'F' ? 10 : 0),
            logicFeedback: parsed.logicFeedback,
            reviewerReaction: parsed.reviewerReaction,
            matchedKeywords: parsed.matchedKeywords || ['Manuscript Evidence Cited'],
            usedLoadedEvidence: Boolean(loadedEvidence),
          };
        }
      }
    } catch {
      // Fallback below
    }
  }

  let score = 38;
  const matchedKeywords: string[] = [];

  if (trimmed.length >= 40) score += 14;
  if (trimmed.length >= 80) score += 10;

  const patterns: Array<{ label: string; regex: RegExp; pts: number }> = [
    {
      label: 'Specific Table / Appendix / Section Citation',
      regex: /(table\s*\d+|appendix|section|\bc\.2\b|\bb\.2\b|equation|eq\.)/i,
      pts: 18,
    },
    {
      label: 'Quantitative Metrics & Statistical Significance (p-value / % / Seeds)',
      regex: /(\d+(\.\d+)?%|\bp\s*[<>=]|0\.00\d|seed|std|variance|speedup|ms|bleu|accuracy|throughput|2\.1x|2\.81x)/i,
      pts: 18,
    },
    {
      label: 'Core Technical Defense (Baseline / Ablation / Fallback)',
      regex: /(baseline|colbert|splade|dpr|bm25|ablation|scope|future work|memory|trade-off|hnsw|fallback|cosine|drift)/i,
      pts: 14,
    },
  ];

  for (const p of patterns) {
    if (p.regex.test(trimmed)) {
      score += p.pts;
      matchedKeywords.push(p.label);
    }
  }

  if (loadedEvidence?.matchedBossWeakness) {
    score += 10;
    matchedKeywords.push(`Attached Evidence Synergy (${loadedEvidence.location})`);
  }

  score = Math.min(100, Math.max(15, score));

  if (matchedKeywords.length === 0 && score < 55) {
    return {
      rank: 'F',
      score,
      damageMultiplier: 0,
      finalDamage: 0,
      blockAwarded: 0,
      selfPenaltyDamage: 10,
      logicFeedback:
        'Vague hand-waving with zero reference to specific tables, appendices, or quantitative metrics! Reviewer 2 counter-attacks for -10 Sanity.',
      reviewerReaction:
        '"You expect me to accept empty rhetoric without citing a single table or p-value?! Rebuttal rejected! (-10 Sanity)"',
      matchedKeywords: ['Missing Empirical Evidence (Rejected)'],
      usedLoadedEvidence: false,
    };
  }

  if (score >= 85) {
    return {
      rank: 'S',
      score,
      damageMultiplier: 2.3,
      finalDamage: Math.round(baseCardDamage * 2.3),
      blockAwarded: 16,
      selfPenaltyDamage: 0,
      logicFeedback:
        'Flawless rebuttal! By pinpointing exact tables, appendix experiments, and statistical significance bounds, you completely dismantled Reviewer 2’s critique.',
      reviewerReaction:
        '"Gah...! It was already proven in Appendix C.2 and the 5-seed bootstrap test?! Fine, I withdraw this objection...!"',
      matchedKeywords,
      usedLoadedEvidence: Boolean(loadedEvidence),
    };
  }
  if (score >= 68) {
    return {
      rank: 'A',
      score,
      damageMultiplier: 1.75,
      finalDamage: Math.round(baseCardDamage * 1.75),
      blockAwarded: 12,
      selfPenaltyDamage: 0,
      logicFeedback:
        'Highly persuasive academic rebuttal! Your empirical justification shattered Reviewer 2’s skepticism and dealt heavy damage.',
      reviewerReaction:
        '"Hmph... given those quantitative bounds, I shall concede this point for now!"',
      matchedKeywords,
      usedLoadedEvidence: Boolean(loadedEvidence),
    };
  }
  return {
    rank: 'B',
    score,
    damageMultiplier: 1.25,
    finalDamage: Math.round(baseCardDamage * 1.25),
    blockAwarded: 8,
    selfPenaltyDamage: 0,
    logicFeedback:
      'Solid defensive reasoning. Cite specific Table numbers, Appendix sections, or p-values to trigger an S-Rank critical rebuttal.',
    reviewerReaction:
      '"Make sure you clarify that explicitly in the camera-ready revision!"',
    matchedKeywords,
    usedLoadedEvidence: Boolean(loadedEvidence),
  };
}

export async function generateVerifiedBossAttack(
  doc: DocumentSource,
  usedQuotes: string[],
  apiKey?: string
): Promise<{ attack: BossAttackIntent; attempts: VerificationAttempt[] }> {
  const batch = await generateVerifiedBossAttacks(doc, apiKey);
  const nextIntent =
    batch.verifiedIntents.find(
      (item) => !usedQuotes.includes(item.verbatimQuote) && !usedQuotes.includes(item.id)
    ) || batch.verifiedIntents[usedQuotes.length % batch.verifiedIntents.length];

  // Return 1 discarded hallucination attempt (if any) + the verified attempt for this round
  const rejectedSample = batch.verificationAuditLog.find((a) => !a.verified);
  const verifiedEntry = batch.verificationAuditLog.find(
    (a) => a.verified && a.candidateQuote === nextIntent.verbatimQuote
  );

  const attempts: VerificationAttempt[] = [];
  if (rejectedSample && usedQuotes.length < 2) {
    attempts.push(rejectedSample);
  }
  if (verifiedEntry) {
    attempts.push(verifiedEntry);
  }

  return { attack: nextIntent, attempts };
}

