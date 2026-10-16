import React, { useRef, useState } from 'react';
import { DocumentSource } from '../types/game';
import { PRESET_DOCUMENTS } from '../data/presetsAndCards';
import {
  ingestGitHubRepository,
  parseUploadedPdfFile,
} from '../services/documentIngestor';
import {
  BookOpen,
  FileUp,
  Github,
  KeyRound,
  Loader2,
  Swords,
} from 'lucide-react';

interface TitleLobbyScreenProps {
  apiKey: string;
  onChangeApiKey: (key: string) => void;
  onStartBattleWithDocument: (doc: DocumentSource) => void;
}

export const TitleLobbyScreen: React.FC<TitleLobbyScreenProps> = ({
  apiKey,
  onChangeApiKey,
  onStartBattleWithDocument,
}) => {
  const [selectedTab, setSelectedTab] = useState<'PRESET' | 'PDF' | 'GITHUB'>('PRESET');
  const [githubUrl, setGithubUrl] = useState('https://github.com/karpathy/nanoGPT');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPreset = (doc: DocumentSource) => {
    setErrorMsg(null);
    setIsLoading(true);
    setLoadingStepText(`Placing "${doc.title}" onto the Peer Review Tribunal desk...`);
    setTimeout(() => {
      setIsLoading(false);
      onStartBattleWithDocument(doc);
    }, 450);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsLoading(true);
    setLoadingStepText(`Deciphering full manuscript text from "${file.name}"...`);
    try {
      const doc = await parseUploadedPdfFile(file);
      onStartBattleWithDocument(doc);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'An error occurred while parsing the PDF manuscript.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setErrorMsg(null);
    setIsLoading(true);
    setLoadingStepText(`Ingesting repository source & documentation from ${githubUrl}...`);
    try {
      const doc = await ingestGitHubRepository(githubUrl);
      onStartBattleWithDocument(doc);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Failed to load GitHub repository. Please verify that the repository is public.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-y-auto bg-[#070609] text-[#e6dac3] select-none">
      {/* Background Cathedral Artwork */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-50 pointer-events-none"
        style={{ backgroundImage: `url('/assets/arena_bg.png')` }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 25%, rgba(28, 18, 16, 0.45) 0%, rgba(10, 8, 10, 0.88) 70%, #050406 100%)',
        }}
      />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-7 flex flex-col justify-between min-h-screen">
        {/* Top Bar: Minimalist Game Crest & Discreet Settings */}
        <div className="flex items-center justify-between pb-3 border-b border-[#8a6d3b]/35">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/icon_reviewer2.png"
              alt="Reviewer 2 Crest"
              className="w-7 h-7 rounded object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
            />
            <span className="font-cinzel text-xs tracking-[0.28em] text-[#c89d54] uppercase font-bold">
              THE GRAND TRIBUNAL OF PEER REVIEW
            </span>
          </div>

          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="px-3 py-1.5 rounded bg-[#16120f] hover:bg-[#221c17] border border-[#8a6d3b]/60 text-[#d4b475] text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#c89d54]" />
            <span>{apiKey.trim().length > 10 ? 'API Key Connected' : 'API Settings'}</span>
          </button>
        </div>

        {showApiKeyInput && (
          <div className="my-3 p-3.5 rounded bg-[#14100d]/95 border border-[#8a6d3b] flex flex-col md:flex-row items-center gap-3 shadow-xl">
            <div className="text-xs text-[#cbbba0] font-serif flex-1">
              <strong className="text-[#e8c67a]">Gemini API Key:</strong> Used for live 1M-context grounded critique generation and freeform rebuttal judgment.
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onChangeApiKey(e.target.value)}
              placeholder="Enter Gemini API Key..."
              className="w-full md:w-72 px-3 py-1.5 rounded bg-[#090706] border border-[#6e552c] text-xs font-mono text-[#e8c67a] focus:outline-none focus:border-[#c89d54]"
            />
          </div>
        )}

        {/* Center Stage: Game Title & Manuscript Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-4">
          {/* Left 7 Cols: Illustrated Game Logo & Manuscript Selection */}
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-3">
              <div className="relative w-full max-w-[460px]">
                <img
                  src="/assets/logo_reviewer2.png"
                  alt="REVIEWER 2"
                  className="w-full h-auto object-contain mix-blend-lighten drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)]"
                />
              </div>
              <p className="text-sm md:text-base text-[#c4b293] font-serif leading-relaxed">
                Select a research manuscript PDF or GitHub repository to defend before the tribunal. Reviewer 2 will interrogate you by quoting verbatim passages from your text—drag evidence directly from your manuscript, play Grad Student tactical cards, and deliver sharp natural language rebuttals to win an Oral Accept.
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex gap-2 border-b border-[#8a6d3b]/40 pb-2.5">
              <button
                onClick={() => setSelectedTab('PRESET')}
                className={`px-4 py-2 rounded text-xs font-serif font-bold flex items-center gap-2 transition cursor-pointer border ${
                  selectedTab === 'PRESET'
                    ? 'bg-[#3a2614] border-[#d4a857] text-[#f7e7c4] shadow-[0_0_12px_rgba(212,168,87,0.25)]'
                    : 'bg-[#14100d]/90 border-[#5c4728] text-[#a8987d] hover:text-[#e6dac3] hover:border-[#8a6d3b]'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#d4a857]" />
                <span>Featured Manuscripts</span>
              </button>
              <button
                onClick={() => setSelectedTab('PDF')}
                className={`px-4 py-2 rounded text-xs font-serif font-bold flex items-center gap-2 transition cursor-pointer border ${
                  selectedTab === 'PDF'
                    ? 'bg-[#3a2614] border-[#d4a857] text-[#f7e7c4] shadow-[0_0_12px_rgba(212,168,87,0.25)]'
                    : 'bg-[#14100d]/90 border-[#5c4728] text-[#a8987d] hover:text-[#e6dac3] hover:border-[#8a6d3b]'
                }`}
              >
                <FileUp className="w-4 h-4 text-[#d4a857]" />
                <span>Upload Paper PDF</span>
              </button>
              <button
                onClick={() => setSelectedTab('GITHUB')}
                className={`px-4 py-2 rounded text-xs font-serif font-bold flex items-center gap-2 transition cursor-pointer border ${
                  selectedTab === 'GITHUB'
                    ? 'bg-[#3a2614] border-[#d4a857] text-[#f7e7c4] shadow-[0_0_12px_rgba(212,168,87,0.25)]'
                    : 'bg-[#14100d]/90 border-[#5c4728] text-[#a8987d] hover:text-[#e6dac3] hover:border-[#8a6d3b]'
                }`}
              >
                <Github className="w-4 h-4 text-[#d4a857]" />
                <span>Submit GitHub Repo</span>
              </button>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="p-3 rounded bg-[#2d1212] border border-[#a83838] text-[#f2b8b8] text-xs font-serif">
                {errorMsg}
              </div>
            )}

            {/* Loading Box */}
            {isLoading && (
              <div className="p-5 rounded bg-[#16120e]/95 border-2 border-[#a88444] flex items-center gap-3.5 shadow-2xl">
                <Loader2 className="w-6 h-6 text-[#d4a857] animate-spin shrink-0" />
                <div>
                  <div className="text-sm font-serif font-bold text-[#f2dfb3]">
                    Convening the Peer Review Tribunal...
                  </div>
                  <div className="text-xs text-[#b8a688] font-serif mt-0.5">{loadingStepText}</div>
                </div>
              </div>
            )}

            {/* TAB 1: PRESET PAPERS & REPOS */}
            {!isLoading && selectedTab === 'PRESET' && (
              <div className="space-y-2.5">
                {PRESET_DOCUMENTS.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectPreset(doc)}
                    className="group p-4 rounded bg-[#14100d]/95 hover:bg-[#1f1813] border-2 border-[#6e552c] hover:border-[#c89d54] transition cursor-pointer flex items-center justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#261c14] border border-[#8a6d3b]/60 text-[#d4a857] text-[10px] font-cinzel font-bold tracking-wider">
                          {doc.venue}
                        </span>
                        <span className="text-[11px] font-serif text-[#9c8b70]">
                          {doc.sections.length} Sections Indexed
                        </span>
                      </div>
                      <h3 className="text-base font-serif font-bold text-[#f2e6d0] group-hover:text-[#ffd98e] transition">
                        {doc.title}
                      </h3>
                      <p className="text-xs font-serif text-[#a8987d]">
                        {doc.authors} — <span>{doc.subtitle}</span>
                      </p>
                    </div>

                    <button className="px-4 py-2.5 rounded bg-gradient-to-b from-[#6e1d1d] to-[#421010] group-hover:from-[#872424] group-hover:to-[#571515] border border-[#c88a4b] text-[#f5e7c6] font-serif font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-lg">
                      <Swords className="w-4 h-4 text-[#e6b86a]" />
                      <span>Begin Defense</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: PDF FILE UPLOAD */}
            {!isLoading && selectedTab === 'PDF' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded bg-[#14100d]/95 hover:bg-[#1c1612] border-2 border-dashed border-[#8a6d3b] hover:border-[#d4a857] transition cursor-pointer text-center space-y-3 shadow-xl"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-[#241b13] border border-[#a88444] flex items-center justify-center mx-auto">
                  <FileUp className="w-6 h-6 text-[#d4a857]" />
                </div>
                <div className="text-base font-serif font-bold text-[#f2dfb3]">
                  Select a Research Paper PDF to Defend
                </div>
                <p className="text-xs font-serif text-[#a8987d] max-w-md mx-auto leading-relaxed">
                  Reviewer 2&apos;s verbatim critiques and your grounded evidence deck will be dynamically constructed from your uploaded PDF manuscript&apos;s full text and tables.
                </p>
              </div>
            )}

            {/* TAB 3: GITHUB REPOSITORY INGESTION */}
            {!isLoading && selectedTab === 'GITHUB' && (
              <form
                onSubmit={handleGithubSubmit}
                className="p-5 rounded bg-[#14100d]/95 border-2 border-[#6e552c] space-y-3 shadow-xl"
              >
                <div className="text-sm font-serif font-bold text-[#e6cfa3] flex items-center gap-2">
                  <Github className="w-4 h-4 text-[#d4a857]" />
                  <span>Public GitHub Repository URL to Defend</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="flex-1 px-3.5 py-2 rounded bg-[#090706] border border-[#5c4728] text-sm text-[#f2e6d0] font-mono focus:border-[#c89d54] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 rounded bg-gradient-to-b from-[#6e1d1d] to-[#421010] hover:from-[#872424] hover:to-[#571515] border border-[#c88a4b] text-[#f5e7c6] font-serif font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Swords className="w-4 h-4 text-[#e6b86a]" />
                    <span>Begin Defense</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-serif text-[#9c8b70]">
                  <span>Sample Repositories:</span>
                  {[
                    'https://github.com/karpathy/nanoGPT',
                    'https://github.com/hwchase17/langchain',
                    'https://github.com/vllm-project/vllm',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setGithubUrl(sample)}
                      className="text-[#d4a857] hover:underline font-mono cursor-pointer"
                    >
                      {sample.replace('https://github.com/', '')}
                    </button>
                  ))}
                </div>
              </form>
            )}
          </div>

          {/* Right 5 Cols: Atmospheric Portrait of Reviewer 2 */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-md rounded bg-gradient-to-b from-[#1a1310]/95 to-[#0c0908]/95 border-2 border-[#8a6d3b] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-center">
              <div className="text-[10px] font-cinzel tracking-[0.25em] text-[#a88444] uppercase mb-2">
                CHIEF INQUISITOR OF THE SECOND DESK
              </div>
              <div className="relative h-64 flex items-center justify-center mb-3 bg-[#080606] rounded border border-[#4a3720] overflow-hidden">
                <img
                  src="/assets/boss_reviewer2.png"
                  alt="Reviewer 2"
                  className="max-h-64 w-auto object-contain"
                />
              </div>

              <blockquote className="text-xs font-serif text-[#e6d5b8] italic bg-[#120d0a] rounded p-3.5 border border-[#5c4324] leading-relaxed">
                &ldquo;I have cross-examined every last equation and table in your manuscript. I shall interrogate you using your exact words—if you possess real empirical proof, cite it and prove it to my face.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#8a6d3b]/30 flex items-center justify-between text-[11px] font-cinzel tracking-wider text-[#7d6b52]">
          <span>REVIEWER 2</span>
          <span>PEER REVIEW TRIBUNAL</span>
        </div>
      </div>
    </div>
  );
};
