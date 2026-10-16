import {
  DocumentSource,
  PlayableCard,
  Relic,
  WeaknessCategory,
} from '../types/game';
import { mineGroundedSentencesFromDocument } from '../services/citationVerifier';

export const INITIAL_RELICS: Relic[] = [
  {
    id: 'relic_cracked_coffee',
    name: 'Cracked Espresso Mug',
    koreanName: 'Cracked Espresso Mug',
    icon: 'I',
    counter: 3,
    description: 'Gain 3 base Energy at the start of each turn.',
  },
  {
    id: 'relic_arxiv_seal',
    name: 'Wax Seal of the Archive',
    koreanName: 'Wax Seal of the Archive',
    icon: 'II',
    description: 'Citing a passage from your manuscript that matches Reviewer 2’s critique shatters their Logic Barrier.',
  },
  {
    id: 'relic_crumpled_hoodie',
    name: 'Stained Lab Coat',
    koreanName: 'Stained Lab Coat',
    icon: 'III',
    counter: 6,
    description: 'Start each peer review defense with 6 Block.',
  },
];

export const PRESET_DOCUMENTS: DocumentSource[] = [
  {
    id: 'preset_flashrag',
    title: 'FlashRAG-Agent: Sub-Millisecond Retrieval-Augmented Reasoning',
    subtitle: 'NeurIPS Submission #4821',
    sourceType: 'PRESET',
    authors: 'J. Kim, S. Park, H. Lee',
    venue: 'NeurIPS',
    tokenEstimate: 14820,
    sections: [
      {
        id: 'sec-1',
        heading: '1. Abstract & Introduction',
        pageOrFile: 'Page 1',
        content: `Retrieval-Augmented Generation (RAG) suffers from severe tail-latency bottlenecks during multi-hop reasoning. We propose FlashRAG-Agent, a speculative graph-prefetching architecture that overlaps token generation with asynchronous vector retrieval. Across four open-domain QA benchmarks, FlashRAG-Agent reduces end-to-end p99 latency by 64.2% while improving exact-match accuracy by 4.8 points over standard sequential pipelines. However, our speculative prefetch cache assumes stationary query embeddings within a single reasoning trajectory.`,
      },
      {
        id: 'sec-2',
        heading: '3. Speculative Graph-Prefetching Architecture',
        pageOrFile: 'Page 3',
        content: `Unlike conventional iterative RAG which blocks LLM decoding at every retrieval step, FlashRAG-Agent predicts top-k semantic lookahead anchors using a lightweight 18M-parameter draft head. Equation (4) defines the speculative acceptance threshold tau = 0.72, which was empirically tuned on the NaturalQuestions development split. If the cosine drift exceeds tau, the speculative cache is flushed and falls back to exact HNSW search.`,
      },
      {
        id: 'sec-3',
        heading: '4.2 Main Evaluation & Table 3 Baseline Comparison',
        pageOrFile: 'Page 6 (Table 3)',
        content: `In Table 3, we compare FlashRAG-Agent against two standard retrieval baselines: BM25 and Dense Passage Retrieval (DPR). On HotpotQA, BM25 achieves 52.4 EM at 840ms latency, DPR achieves 61.8 EM at 690ms latency, and FlashRAG-Agent achieves 67.9 EM at 245ms latency. Due to GPU memory constraints on our single-node A100 testbed, late-interaction models such as ColBERTv2 and SPLADE++ were omitted from Table 3 and deferred to Appendix C.2.`,
      },
      {
        id: 'sec-4',
        heading: '4.3 Component Ablation & Statistical Significance',
        pageOrFile: 'Page 7 (Table 4)',
        content: `Table 4 reports our component ablation study on HotpotQA and TriviaQA across 5 random seeds (mean ± std: 67.9 ± 0.31 EM, p < 0.002 via paired bootstrap test). Removing the speculative lookahead head drops speedup from 2.81x to 1.15x, while removing asynchronous KV-cache stitching degrades Exact Match by 3.9 points. Furthermore, Appendix C.2 provides supplemental comparisons against ColBERTv2 and Contriever-MSMARCO, confirming FlashRAG-Agent maintains a 2.1x throughput advantage.`,
      },
      {
        id: 'sec-5',
        heading: '5. Limitations & Reproducibility Statement',
        pageOrFile: 'Page 9',
        content: `All source code, Dockerfiles, and pre-built FAISS/HNSW indices are released anonymously in the supplementary repository. A current limitation is that our evaluation focuses on English Wikipedia corpora up to 21 million passages; scaling to web-scale trillion-token dynamic indices remains future work.`,
      },
    ],
    fullText: '',
  },
  {
    id: 'preset_transformer',
    title: 'Attention Is All You Need',
    subtitle: 'Vaswani et al.',
    sourceType: 'PRESET',
    authors: 'A. Vaswani et al.',
    venue: 'NeurIPS',
    tokenEstimate: 11640,
    sections: [
      {
        id: 'tr-1',
        heading: '1. Abstract & Introduction',
        pageOrFile: 'Page 1-2',
        content: `The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.`,
      },
      {
        id: 'tr-2',
        heading: '3.2 Scaled Dot-Product and Multi-Head Attention',
        pageOrFile: 'Page 4',
        content: `We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients. To counteract this effect, we scale the dot products by 1/sqrt(d_k). Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. In this work we employ h = 8 parallel attention layers, or heads, with d_k = d_v = d_model / h = 64.`,
      },
      {
        id: 'tr-3',
        heading: '4. Why Self-Attention & Table 1 Complexity',
        pageOrFile: 'Page 6 (Table 1)',
        content: `As noted in Table 1, a self-attention layer connects all positions with a constant number of sequentially executed operations, whereas a recurrent layer requires O(n) sequential operations. Self-attention layers are faster than recurrent layers when the sequence length n is smaller than the representation dimensionality d. To improve computational performance for tasks involving very long sequences, self-attention could be restricted to considering only a neighborhood of size r in the input sequence.`,
      },
      {
        id: 'tr-4',
        heading: '6.1 Machine Translation & Table 2 / Table 3 Results',
        pageOrFile: 'Page 8 (Table 2 & Table 3)',
        content: `On the WMT 2014 English-to-German translation task, the big transformer model (Transformer (big) in Table 2) outperforms the best previously reported models (including ensembles) by more than 2.0 BLEU, establishing a new state-of-the-art BLEU score of 28.4. We trained our models on one machine with 8 NVIDIA P100 GPUs for 3.5 days. In Table 3 rows (A), we vary the number of attention heads and the attention key and value dimensions, observing that single-head attention is 0.9 BLEU worse than the best setting.`,
      },
    ],
    fullText: '',
  },
  {
    id: 'preset_github_rl',
    title: 'github.com/arcane-lab/neuro-spire-rl',
    subtitle: 'GitHub Repository',
    sourceType: 'GITHUB',
    repoUrl: 'https://github.com/arcane-lab/neuro-spire-rl',
    fileCount: 42,
    authors: 'Arcane-Lab Contributors',
    venue: 'GitHub',
    tokenEstimate: 38900,
    sections: [
      {
        id: 'gh-1',
        heading: 'README.md (Project Overview & Table 3 Benchmarks)',
        pageOrFile: 'README.md#L1-L88',
        content: `NeuroSpire-RL is a hierarchical reinforcement learning agent for rogue-like deckbuilding games. In Table 3 of our benchmark suite, we evaluate NeuroSpire-RL against two baseline agents: RandomHeuristicBot and GreedyDamageBot across Ascension Level 1. NeuroSpire-RL achieves a 71.5% win rate over 200 evaluation episodes. Evaluation on higher Ascension levels (Level 10-20) and Monte Carlo Tree Search (MCTS) baselines is currently disabled due to simulation step timeouts.`,
      },
      {
        id: 'gh-2',
        heading: 'src/rl/reward_shaper.py (Reward Function Implementation)',
        pageOrFile: 'src/rl/reward_shaper.py#L14-L72',
        content: `def compute_step_reward(state, next_state, action):
    # Dense reward shaping with manually tuned coefficients
    hp_delta = (next_state.player_hp - state.player_hp) * 0.35
    boss_dmg = (state.boss_hp - next_state.boss_hp) * 1.20
    if action.is_synergy_card and state.evidence_loaded:
        boss_dmg *= 2.0  # Hardcoded synergy bonus multiplier
    return boss_dmg + hp_delta - 0.05`,
      },
      {
        id: 'gh-3',
        heading: 'benchmarks/ablation_results.md (Ablation & Statistical Tests)',
        pageOrFile: 'benchmarks/ablation_results.md#L1-L64',
        content: `We conducted a 5-seed ablation study (seeds 42, 101, 202, 303, 404) comparing Full NeuroSpire-RL (71.5 ± 1.8% win rate) against No-Deck-Transformer (54.2 ± 2.4% win rate) and Unshaped-Sparse-Reward (38.0 ± 3.1% win rate). Paired t-test confirms statistical significance with p = 0.0004. Furthermore, Appendix Table B2 includes an additional comparison against AlphaZero-MCTS (63.0% win rate at 14x higher inference cost).`,
      },
    ],
    fullText: '',
  },
];

PRESET_DOCUMENTS.forEach((doc) => {
  doc.fullText = doc.sections
    .map((s) => `[${s.heading} - ${s.pageOrFile}]\n${s.content}`)
    .join('\n\n');
});

export const CORE_TACTIC_CARDS: Omit<PlayableCard, 'instanceId'>[] = [
  {
    id: 'event_advisor_summon',
    name: 'Advisor Intervention',
    koreanName: 'Advisor Intervention',
    category: 'TACTIC_SKILL',
    rarity: 'RARE',
    shortTypeLabel: 'POLITICS',
    cost: 1,
    artwork: '/assets/card_reviewer1.png',
    rebuttalMultiplierBuff: 2.0,
    blockGain: 6,
    description: '2.0x Rebuttal Power this turn.\nGain +6 Block.',
  },
  {
    id: 'event_appendix_drop',
    name: 'Appendix 40-Page Drop',
    koreanName: 'Appendix 40-Page Drop',
    category: 'TACTIC_ATTACK',
    rarity: 'RARE',
    shortTypeLabel: 'EVENT',
    cost: 1,
    artwork: '/assets/card_appendix.png',
    shatterBossBlock: true,
    rebuttalDamage: 10,
    description: 'Shatter all Reviewer Block.\nDeal 10 Rebuttal Damage.',
  },
  {
    id: 'event_triple_espresso',
    name: 'Triple Shot IV',
    koreanName: 'Triple Shot IV',
    category: 'TACTIC_SKILL',
    rarity: 'UNCOMMON',
    shortTypeLabel: 'SURVIVAL',
    cost: 0,
    artwork: '/assets/card_evidence.png',
    healSanity: 10,
    energyGain: 1,
    drawCards: 1,
    exhaustOnPlay: true,
    description: 'Heal +10 Sanity, +1 Energy.\nDraw 1 card. (Exhaust)',
  },
  {
    id: 'event_reviewer1_praise',
    name: 'Reviewer 1 Endorsement',
    koreanName: 'Reviewer 1 Endorsement',
    category: 'TACTIC_DEFENSE',
    rarity: 'UNCOMMON',
    shortTypeLabel: 'POLITICS',
    cost: 1,
    artwork: '/assets/card_ablation.png',
    blockGain: 18,
    healSanity: 4,
    description: '"A groundbreaking paper!"\nGain +18 Block, +4 Sanity.',
  },
  {
    id: 'event_coauthor_sos',
    name: 'Co-Author Emergency Call',
    koreanName: 'Co-Author Emergency Call',
    category: 'TACTIC_SKILL',
    rarity: 'UNCOMMON',
    shortTypeLabel: 'EVENT',
    cost: 1,
    artwork: '/assets/card_evidence.png',
    autoAttachBestEvidence: true,
    blockGain: 10,
    drawCards: 1,
    description: 'Auto-cite best paper quote.\nGain +10 Block, draw 1 card.',
  },
  {
    id: 'event_deadline_extension',
    name: 'Deadline Extension',
    koreanName: 'Deadline Extension',
    category: 'TACTIC_DEFENSE',
    rarity: 'UNCOMMON',
    shortTypeLabel: 'TACTIC',
    cost: 1,
    artwork: '/assets/card_scope.png',
    reduceBossAttackFlat: 10,
    blockGain: 8,
    description: 'Reviewer Attack -10 this turn.\nGain +8 Block.',
  },
  {
    id: 'event_overleaf_madness',
    name: 'All-Nighter Frenzy',
    koreanName: 'All-Nighter Frenzy',
    category: 'TACTIC_SKILL',
    rarity: 'RARE',
    shortTypeLabel: 'TACTIC',
    cost: 0,
    artwork: '/assets/card_rebuttal.png',
    selfSanityCost: 6,
    rebuttalMultiplierBuff: 1.5,
    drawCards: 2,
    description: 'Lose 6 Sanity. 1.5x Rebuttal.\nDraw 2 cards.',
  },
  {
    id: 'event_future_work_shield',
    name: 'Future Work Deflection',
    koreanName: 'Future Work Deflection',
    category: 'TACTIC_DEFENSE',
    rarity: 'STARTER',
    shortTypeLabel: 'DEFENSE',
    cost: 1,
    artwork: '/assets/card_scope.png',
    blockGain: 14,
    drawCards: 1,
    description: 'Gain +14 Block.\nDraw 1 card.',
  },
];

export function createRedInkCurseCard(): PlayableCard {
  return {
    id: 'curse_red_ink',
    instanceId: `curse_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: 'Red Ink Trauma',
    koreanName: 'Red Ink Trauma',
    category: 'CURSE',
    rarity: 'CURSE',
    shortTypeLabel: 'CURSE',
    cost: 1,
    artwork: '/assets/card_rebuttal.png',
    exhaustOnPlay: true,
    endTurnSanityPenalty: 5,
    description: 'Unplayed: -5 Sanity at turn end.\nPlay (1 Energy) to Exhaust.',
  };
}

const EVIDENCE_TITLE_EN: Record<WeaknessCategory, string> = {
  BASELINE: 'Baseline Comparison Log',
  ABLATION: 'Ablation Study Log',
  STATISTICS: 'Statistical Significance Log',
  SCOPE: 'Scope & Boundary Log',
  REPRODUCIBILITY: 'Reproducibility & Code Log',
  NOVELTY: 'Architecture & Novelty Log',
};

export function extractManuscriptSnippetsForAttachment(
  doc: DocumentSource
): Array<{
  id: string;
  label: string;
  quote: string;
  location: string;
  categories: WeaknessCategory[];
}> {
  const mined = mineGroundedSentencesFromDocument(doc);
  const allCategories: WeaknessCategory[] = [
    'BASELINE',
    'ABLATION',
    'STATISTICS',
    'SCOPE',
    'REPRODUCIBILITY',
  ];

  const secondaryCat: Record<WeaknessCategory, WeaknessCategory> = {
    BASELINE: 'REPRODUCIBILITY',
    ABLATION: 'STATISTICS',
    STATISTICS: 'ABLATION',
    SCOPE: 'NOVELTY',
    REPRODUCIBILITY: 'BASELINE',
    NOVELTY: 'SCOPE',
  };

  return allCategories.map((cat, idx) => {
    const matchedMined =
      mined.find((m) => m.category === cat) || mined[idx % mined.length];
    return {
      id: `snippet_${cat}_${idx}`,
      label: EVIDENCE_TITLE_EN[cat],
      quote: matchedMined?.quote || doc.fullText.slice(0, 140),
      location: matchedMined?.location || 'Section 4',
      categories: [cat, secondaryCat[cat]],
    };
  });
}

export function buildDeckForDocument(_doc: DocumentSource): PlayableCard[] {
  const deck: PlayableCard[] = [];

  CORE_TACTIC_CARDS.forEach((c, idx) => {
    deck.push({
      ...c,
      instanceId: `evcard_${idx}_1_${Math.random().toString(36).slice(2, 7)}`,
    });
  });

  // Add second copies of key strategic event cards for a 12-card deck
  [
    CORE_TACTIC_CARDS[0], // Advisor Intervention
    CORE_TACTIC_CARDS[1], // Appendix 40-Page Drop
    CORE_TACTIC_CARDS[3], // Reviewer 1 Endorsement
    CORE_TACTIC_CARDS[4], // Co-Author Emergency Call
  ].forEach((c, idx) => {
    deck.push({
      ...c,
      instanceId: `evcard_dup_${idx}_${Math.random().toString(36).slice(2, 7)}`,
    });
  });

  return shuffleCards(deck);
}

export function shuffleCards<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
