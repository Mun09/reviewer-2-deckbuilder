import { DocumentSection, DocumentSource } from '../types/game';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker using same-origin bundled Vite asset
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
} catch {
  // Fallback handled gracefully if worker fails
}

/**
 * Extracts full text & page-level sections from an uploaded PDF file
 * for 1M-context Reviewer 2 analysis and verbatim quote verification.
 */
export async function parseUploadedPdfFile(file: File): Promise<DocumentSource> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    let pdf: pdfjsLib.PDFDocumentProxy;
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      pdf = await loadingTask.promise;
    } catch {
      // Fallback: disable worker if browser restricts worker threads
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      const fallbackTask = pdfjsLib.getDocument({
        data: arrayBuffer.slice(0),
        useSystemFonts: true,
        isEvalSupported: false,
      });
      pdf = await fallbackTask.promise;
    }

    const sections: DocumentSection[] = [];
    const fullTextParts: string[] = [];

    const maxPages = Math.min(pdf.numPages, 60); // Up to 60 pages into 1M context
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const rawChunks: string[] = [];
      for (const item of textContent.items) {
        if ('str' in item) {
          rawChunks.push(item.str);
          if ('hasEOL' in item && item.hasEOL) {
            rawChunks.push('\n');
          } else {
            rawChunks.push(' ');
          }
        }
      }
      const pageText = rawChunks
        .join('')
        .replace(/-\s*\n\s*([a-z])/g, '$1') // Rejoin hyphenated PDF line wraps
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{2,}/g, '\n')
        .trim();

      if (pageText.length > 10) {
        // Detect a likely section heading on this page
        const headingMatch = pageText.match(
          /\b(\d+(?:\.\d+)?\s+[A-Z][A-Za-z0-9\s\-:]{3,42}|Abstract|Introduction|Related Work|Method|Methodology|Experiments|Evaluation|Results|Discussion|Limitations|Conclusion|References|Appendix)\b/
        );
        const heading = headingMatch ? headingMatch[0].trim() : `Manuscript Page ${pageNum}`;

        sections.push({
          id: `pdf-page-${pageNum}`,
          heading,
          pageOrFile: `Page ${pageNum} / ${pdf.numPages}`,
          content: pageText,
        });
        fullTextParts.push(`[Page ${pageNum} - ${heading}]\n${pageText}`);
      }
    }

    const fullText = fullTextParts.join('\n\n');
    if (fullText.trim().length < 20) {
      throw new Error('Could not extract text layer from the PDF (please check if it is a scanned image PDF).');
    }

    const cleanTitle = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
    return {
      id: `pdf_${Date.now()}`,
      title: cleanTitle,
      subtitle: `Uploaded PDF Manuscript (${pdf.numPages} Pages)`,
      sourceType: 'PDF',
      authors: 'Uploaded Author Manuscript',
      venue: 'PDF Direct Ingestion (1M Context Window)',
      fullText,
      sections,
      tokenEstimate: Math.round(fullText.length / 3.8),
    };
  } catch (err) {
    // Fallback raw text extraction from PDF bytes if worker is blocked offline
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawStr = decoder.decode(arrayBuffer);
    const extractedStrings = Array.from(rawStr.matchAll(/\(([^()]{15,240})\)/g))
      .map((m) => m[1].replace(/\\[nrt]/g, ' ').trim())
      .filter((s) => /[a-zA-Z]{4,}/.test(s));

    if (extractedStrings.length >= 3) {
      const content = extractedStrings.join('. ');
      return {
        id: `pdf_raw_${Date.now()}`,
        title: file.name.replace(/\.pdf$/i, ''),
        subtitle: 'Uploaded PDF Document',
        sourceType: 'PDF',
        authors: 'Author Submission',
        venue: 'Direct PDF Stream',
        fullText: content,
        sections: [
          {
            id: 'pdf-sec-1',
            heading: 'Extracted Manuscript Body',
            pageOrFile: 'Page 1+',
            content,
          },
        ],
        tokenEstimate: Math.round(content.length / 4),
      };
    }
    throw err instanceof Error ? err : new Error('An error occurred while parsing the PDF manuscript.');
  }
}

/**
 * Ingests a public GitHub repository (URL or "owner/repo") into a single 1M-context
 * structured document corpus with real file paths and verbatim code/markdown sections.
 */
export async function ingestGitHubRepository(repoInput: string): Promise<DocumentSource> {
  const cleaned = repoInput
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');

  const parts = cleaned.split('/');
  if (parts.length < 2) {
    throw new Error('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo).');
  }
  const owner = parts[0];
  const repo = parts[1];

  // 1. Fetch repository metadata
  const repoMetaResp = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoMetaResp.ok) {
    throw new Error(`Could not load GitHub repository (${owner}/${repo}) (Status ${repoMetaResp.status}).`);
  }
  const repoMeta = await repoMetaResp.json();
  const defaultBranch = repoMeta.default_branch || 'main';

  // 2. Fetch recursive git tree
  const treeResp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
  );
  if (!treeResp.ok) {
    throw new Error('Failed to fetch the GitHub repository file tree.');
  }
  const treeData = await treeResp.json();

  // Prioritize README, docs, benchmarks, evaluation scripts, and core source code
  const textExtensions = /\.(md|txt|tex|py|ts|tsx|js|rs|go|cpp|c|h|yaml|yml|toml|json)$/i;
  const ignorePaths = /(node_modules|dist|build|vendor|\.lock|package-lock|yarn\.lock|\.min\.js)/i;

  interface GitTreeNode {
    path: string;
    type: string;
    size?: number;
  }

  const candidateFiles: GitTreeNode[] = (treeData.tree || [])
    .filter(
      (node: GitTreeNode) =>
        node.type === 'blob' &&
        textExtensions.test(node.path) &&
        !ignorePaths.test(node.path) &&
        (node.size || 0) < 120000
    )
    .sort((a: GitTreeNode, b: GitTreeNode) => {
      const score = (p: string) => {
        if (/^readme/i.test(p)) return 100;
        if (/(paper|bench|eval|experiment|table|ablation|doc)/i.test(p)) return 85;
        if (/(src\/|lib\/|core\/|model|train|agent)/i.test(p)) return 65;
        return 20;
      };
      return score(b.path) - score(a.path);
    })
    .slice(0, 14); // Fetch top 14 most relevant files quickly

  const sections: DocumentSection[] = [];
  await Promise.all(
    candidateFiles.map(async (fileNode, idx) => {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${fileNode.path}`;
        const resp = await fetch(rawUrl);
        if (!resp.ok) return;
        const text = await resp.text();
        const trimmed = text.slice(0, 14000).trim();
        if (trimmed.length > 30) {
          sections.push({
            id: `gh-file-${idx}`,
            heading: fileNode.path,
            pageOrFile: `${fileNode.path} (${defaultBranch})`,
            content: trimmed,
          });
        }
      } catch {
        // Ignore individual file fetch failures
      }
    })
  );

  if (sections.length === 0) {
    throw new Error('Could not find any readable text or source code files in the repository.');
  }

  const fullText = sections
    .map((s) => `[File: ${s.heading}]\n${s.content}`)
    .join('\n\n');

  return {
    id: `gh_${owner}_${repo}_${Date.now()}`,
    title: `${owner}/${repo}`,
    subtitle: repoMeta.description || 'GitHub Repository Full-Context Analysis',
    sourceType: 'GITHUB',
    repoUrl: `https://github.com/${owner}/${repo}`,
    fileCount: candidateFiles.length,
    authors: `@${owner} & Contributors (${repoMeta.stargazers_count ?? 0} ★)`,
    venue: `GitHub (${defaultBranch} branch)`,
    fullText,
    sections,
    tokenEstimate: Math.round(fullText.length / 3.6),
  };
}
