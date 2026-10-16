import React, { useEffect, useRef, useState } from 'react';
import { DocumentSource, WeaknessCategory } from '../types/game';
import { BookOpen, CheckCircle2, FileText, Pin, Sparkles, X } from 'lucide-react';

interface ManuscriptDrawerProps {
  isOpen: boolean;
  doc: DocumentSource;
  highlightedQuote: string;
  currentlyAttachedQuote?: string;
  onAttachDraggedQuote: (params: {
    quote: string;
    location: string;
    sectionHeading: string;
    inferredCategories: WeaknessCategory[];
  }) => void;
  onClose: () => void;
}

function inferCategoriesFromDraggedText(
  text: string,
  heading: string
): WeaknessCategory[] {
  const combined = `${heading} ${text}`.toLowerCase();
  const cats = new Set<WeaknessCategory>();

  if (/(baseline|compare|comparison|sota|bm25|dpr|colbert|table\s*3)/i.test(combined)) {
    cats.add('BASELINE');
  }
  if (/(ablation|tau|threshold|module|without|w\/o|table\s*4)/i.test(combined)) {
    cats.add('ABLATION');
  }
  if (/(p\s*[<>=]|0\.00|seed|std|variance|significant|t-test)/i.test(combined)) {
    cats.add('STATISTICS');
  }
  if (/(limitation|future work|scope|stationary|fallback|hnsw|assumption)/i.test(combined)) {
    cats.add('SCOPE');
  }
  if (/(reproduc|anonymous|github|docker|gpu|a100|hyperparameter|appendix)/i.test(combined)) {
    cats.add('REPRODUCIBILITY');
  }
  if (/(novel|architecture|propose|framework|contribution)/i.test(combined)) {
    cats.add('NOVELTY');
  }

  if (cats.size === 0) {
    cats.add('BASELINE');
    cats.add('ABLATION');
    cats.add('STATISTICS');
  }

  return Array.from(cats);
}

export const ManuscriptDrawer: React.FC<ManuscriptDrawerProps> = ({
  isOpen,
  doc,
  highlightedQuote,
  currentlyAttachedQuote,
  onAttachDraggedQuote,
  onClose,
}) => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedHeading, setSelectedHeading] = useState<string>('');
  const [floatingBtnPos, setFloatingBtnPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedText('');
      setFloatingBtnPos(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTextSelection = (
    sectionHeading: string,
    pageOrFile: string
  ) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      return;
    }

    const rawText = sel.toString().trim().replace(/\s+/g, ' ');
    if (rawText.length < 5) {
      return;
    }

    setSelectedText(rawText);
    setSelectedLocation(pageOrFile);
    setSelectedHeading(sectionHeading);

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const relX = Math.min(
          Math.max(90, rect.left - containerRect.left + rect.width / 2),
          containerRect.width - 110
        );
        const relY = Math.max(60, rect.top - containerRect.top - 12);
        setFloatingBtnPos({ x: relX, y: relY });
      }
    } catch {
      setFloatingBtnPos(null);
    }
  };

  const handleConfirmAttach = () => {
    if (!selectedText) return;
    const inferredCategories = inferCategoriesFromDraggedText(
      selectedText,
      selectedHeading
    );
    onAttachDraggedQuote({
      quote: selectedText,
      location: selectedLocation || 'Manuscript Excerpt',
      sectionHeading: selectedHeading || 'Manuscript Body',
      inferredCategories,
    });
    window.getSelection()?.removeAllRanges();
    setSelectedText('');
    setFloatingBtnPos(null);
    onClose();
  };

  const renderHighlightedContent = (content: string) => {
    const cleanQuote = highlightedQuote.trim();
    if (!cleanQuote || cleanQuote.length < 10) return content;

    const idx = content.indexOf(cleanQuote);
    if (idx === -1) return content;

    const before = content.slice(0, idx);
    const match = content.slice(idx, idx + cleanQuote.length);
    const after = content.slice(idx + cleanQuote.length);

    return (
      <>
        {before}
        <mark className="bg-[#593a10] text-[#ffe7a3] border-b-2 border-[#e0b86c] px-1 rounded font-bold">
          {match}
        </mark>
        {after}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm select-none">
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl bg-[#120e0b] border-l-2 border-[#9a7640] h-full flex flex-col text-[#e8dcc8] shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#8a6d3b]/40 flex items-center justify-between bg-[#1a1410] shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#d4a857]" />
            <div>
              <h3 className="font-serif text-base font-bold text-[#f2dfb3]">
                Manuscript Inspector &amp; Drag-to-Cite Extractor
              </h3>
              <p className="text-xs font-serif text-[#c8b493]">
                Highlight or drag any sentence, equation, or table metric with your mouse to attach it as rebuttal evidence.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-[#261e18] hover:bg-[#362b22] border border-[#6e552c] text-[#d4c3a3] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instruction & Currently Highlighted Quote Banner */}
        <div className="px-4 py-2.5 bg-[#1c150e] border-b border-[#8a6d3b]/40 text-xs font-serif space-y-1 shrink-0">
          {highlightedQuote && (
            <div className="text-[#f0dca8] flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-[#d4a857] shrink-0 mt-0.5" />
              <div>
                <strong>Passage Targeted by Reviewer 2:</strong> &ldquo;{highlightedQuote}&rdquo;
              </div>
            </div>
          )}
          {currentlyAttachedQuote && (
            <div className="text-[#b8e0b8] flex items-start gap-2 leading-relaxed">
              <Pin className="w-3.5 h-3.5 text-[#7ec472] shrink-0 mt-0.5" />
              <div>
                <strong>Currently Attached Rebuttal Reference:</strong> &ldquo;{currentlyAttachedQuote}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* Floating Quick-Attach Button right near the dragged selection */}
        {selectedText && floatingBtnPos && (
          <div
            style={{
              left: `${floatingBtnPos.x}px`,
              top: `${floatingBtnPos.y}px`,
            }}
            className="absolute z-50 -translate-x-1/2 -translate-y-full pointer-events-auto"
          >
            <button
              type="button"
              onClick={handleConfirmAttach}
              className="px-3.5 py-1.5 rounded bg-gradient-to-b from-[#d4a857] to-[#9a6b24] hover:from-[#e6bc6a] hover:to-[#b37d2b] border-2 border-[#fff3d1] text-[#171006] font-serif font-bold text-xs flex items-center gap-1.5 shadow-[0_8px_25px_rgba(0,0,0,0.95)] cursor-pointer whitespace-nowrap"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>Attach Passage as Evidence</span>
            </button>
          </div>
        )}

        {/* Selectable Manuscript Sections Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 select-text">
          {doc.sections.map((sec) => {
            const hasQuote =
              highlightedQuote.length >= 10 &&
              sec.content.includes(highlightedQuote.trim());
            return (
              <div
                key={sec.id}
                onMouseUp={() => handleTextSelection(sec.heading, sec.pageOrFile)}
                onKeyUp={() => handleTextSelection(sec.heading, sec.pageOrFile)}
                className={`rounded p-4 border transition ${
                  hasQuote
                    ? 'bg-[#1f1710] border-[#d4a857] shadow-[0_0_20px_rgba(212,168,87,0.18)]'
                    : 'bg-[#17120e] border-[#4a3923] hover:border-[#6e552c]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#8a6d3b]/25 select-none">
                  <span className="text-sm font-serif font-bold text-[#e8c67a] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#c89d54]" />
                    {sec.heading}
                  </span>
                  <span className="text-xs font-mono text-[#c4b08b] px-2 py-0.5 rounded bg-[#0c0907] border border-[#4a3923]">
                    {sec.pageOrFile}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-[#dfd1b8] leading-relaxed whitespace-pre-wrap font-serif cursor-text selection:bg-[#b8862d] selection:text-black">
                  {renderHighlightedContent(sec.content)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Dragged Selection Bar */}
        <div className="p-3.5 bg-[#1a130e] border-t-2 border-[#9a7640] shrink-0">
          {selectedText ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-serif text-[#f5ead6] bg-[#0e0b08] border border-[#6e552c] rounded p-2.5 leading-relaxed">
                <span className="text-[#d4a857] font-bold mr-1.5">
                  [{selectedLocation}] Selected Passage:
                </span>
                &ldquo;{selectedText}&rdquo;
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.getSelection()?.removeAllRanges();
                    setSelectedText('');
                    setFloatingBtnPos(null);
                  }}
                  className="px-3 py-1.5 rounded bg-[#261e18] hover:bg-[#362b22] border border-[#6e552c] text-xs font-serif text-[#cbbba0] cursor-pointer"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAttach}
                  className="px-5 py-1.5 rounded bg-gradient-to-b from-[#8a5a1e] to-[#593810] hover:from-[#a36b24] hover:to-[#6e4514] border border-[#e0b86c] text-[#fff3d6] font-serif font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>Attach Selected Passage as Rebuttal Evidence</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs font-serif text-[#a8987d] flex items-center justify-center gap-2 py-1">
              <Sparkles className="w-3.5 h-3.5 text-[#c89d54]" />
              <span>
                Drag across any sentence, equation, or table description above to stage it here as citation evidence.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
