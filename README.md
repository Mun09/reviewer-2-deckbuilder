# REVIEWER 2 — The Peer Review Deckbuilder

> **"Every single boss attack must cite a real sentence from your manuscript. If the quote cannot be verified in the source text, the attack is discarded and regenerated."**

**REVIEWER 2** is an academic dark-fantasy roguelike deckbuilding game powered by Gemini's **1M-Token Context Window** and a strict **Anti-Hallucination Citation Verification Loop**. Upload any research paper PDF or public GitHub repository and defend your scholarship against the ruthless Chief Inquisitor of the Second Desk.

---

## Key Features

1. **1M-Context Full Manuscript & Repository Ingestion**
   - **PDF Upload**: Extracts the full text and section structure of your research paper directly in the browser.
   - **GitHub Repository Ingestion**: Recursively fetches source code, READMEs, and documentation from any public GitHub repository into a unified 1M-context corpus.
   - **Curated Preset Papers**: Jump straight into battle with *FlashRAG-Agent (NeurIPS)*, *ChronoLoRA-1M (ICLR)*, or *GameEngine-3D (Systems)*.

2. **1M-Context Citation Verification Loop (Zero Hallucinations)**
   - Reviewer 2 generates ruthless methodological, statistical, and baseline critiques.
   - Every candidate attack **must** include a `verbatimQuote` copied character-for-character from your document.
   - Our multi-stage **Citation Verifier** (`EXACT_SUBSTRING` & `NORMALIZED_VERBATIM`) cross-checks every quote against the source manuscript. Any hallucinated or paraphrased quote is automatically rejected and regenerated.

3. **Interactive Drag-to-Cite Manuscript Drawer & Freeform Natural Language Rebuttals**
   - Open your full manuscript at any time, highlight any sentence, equation, or table description with your mouse, and attach it as **Grounded Rebuttal Evidence**.
   - Play **Grad Student Tactical Cards** (*Advisor Intervention*, *Appendix 40-Page Drop*, *Reviewer 1 Endorsement*, *Statistical p-Value Shield*, *Triple Shot IV*) to buff your Rebuttal Power and shatter Reviewer 2's Logic Barrier.
   - Write freeform natural language rebuttals evaluated live by Gemini (Ranks **S / A / B / C / F**), triggering **Three.js 3D Critical Rebuttal Cutscenes**.

---

## Quick Start

### Web Development & Production Build

```bash
npm install
npm run dev      # Starts local dev server at http://localhost:5173
npm run build    # Builds production bundle to dist/
```

### Windows Standalone Executable (`Reviewer2.exe`)

```powershell
npm run build:exe
```

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Three.js (WebGL 3D Cutscenes & Shaders), Lucide Icons
- **AI & Grounding**: Google Gemini (`gemini-2.5-flash` / 1M Context Window) + Deterministic Verbatim Substring Citation Verifier
- **Document Parsing**: `pdfjs-dist` & GitHub REST Tree/Raw Ingestion API
