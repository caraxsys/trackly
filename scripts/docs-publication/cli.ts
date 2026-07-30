import { createHash } from 'node:crypto';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';
import { parse } from 'yaml';

type Command =
  'publish' | 'validate' | 'clean' | 'diagrams' | 'pdf' | 'docx' | 'api-pdf';

interface Figure {
  id: string;
  source_document: string;
  source_block_index: number;
  mermaid_type: string;
  chapter: number;
  caption: string;
}

interface Screenshot {
  id: string;
  path: string;
  chapter: number;
  caption: string;
  intended_width: string;
  alt: string;
}

interface ArtifactResult {
  technicalPdf: {
    path: string;
    size: number;
    pages: number;
    bookmarks: number;
    links: number;
    images: number;
    termPages: Record<string, number>;
  };
  technicalDocx: {
    path: string;
    size: number;
    headings: number;
    captions: number;
    media: number;
  };
  apiPdf: {
    path: string;
    size: number;
    pages: number;
    bookmarks: number;
    links: number;
    images: number;
    termPages: Record<string, number>;
  };
}

const ROOT = resolve(import.meta.dirname, '../..');
const PUBLICATION = join(ROOT, 'docs', 'publication');
const BUILD = join(ROOT, '.build', 'docs');
const GENERATED = join(BUILD, 'generated');
const FIGURES = join(BUILD, 'figures');
const ASSETS = join(BUILD, 'assets', 'screenshots');
const STYLES = join(BUILD, 'styles');
const TEMPLATES = join(BUILD, 'templates');
const PREVIEW = join(BUILD, 'preview');
const QA = join(BUILD, 'qa');
const DELIVERABLES = join(ROOT, 'deliverables');
const TECHNICAL_PDF = join(DELIVERABLES, 'Trackly Technical Documentation.pdf');
const TECHNICAL_DOCX = join(
  DELIVERABLES,
  'Trackly Technical Documentation.docx',
);
const API_PDF = join(DELIVERABLES, 'Trackly API Documentation.pdf');
const REPORT = join(DELIVERABLES, 'publication-report.md');
const CHECKSUMS = join(DELIVERABLES, 'checksums.txt');
const PANDOC_VERSION = '3.9.0.2';
const PANDOC_FALLBACK = join(
  ROOT,
  '.build',
  'tooling',
  `pandoc-${PANDOC_VERSION}`,
  'pandoc.exe',
);

function fail(message: string): never {
  throw new Error(`[docs:publish] ${message}`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function run(executable: string, args: string[], label: string): string {
  const result = spawnSync(executable, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    shell: executable.toLowerCase().endsWith('.cmd'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    fail(`${label} failed.${detail ? `\n${detail}` : ''}`);
  }
  return result.stdout.trim();
}

function commandVersion(executable: string, args: string[]): string {
  const result = spawnSync(executable, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: executable.toLowerCase().endsWith('.cmd'),
  });
  if (result.status !== 0)
    fail(`Version check for ${basename(executable)} failed.`);
  return [result.stdout, result.stderr]
    .filter(Boolean)
    .join('\n')
    .trim()
    .split(/\r?\n/, 1)[0]
    .trim();
}

async function resolvePandoc(): Promise<string> {
  const configured = process.env.PANDOC_PATH;
  const candidates = [configured, PANDOC_FALLBACK, 'pandoc'].filter(
    (value): value is string => Boolean(value),
  );
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], {
      cwd: ROOT,
      encoding: 'utf8',
      shell: candidate === 'pandoc',
    });
    if (result.status === 0) {
      const version = result.stdout.match(/pandoc\s+([0-9.]+)/)?.[1];
      if (version !== PANDOC_VERSION) {
        fail(
          `Pandoc ${PANDOC_VERSION} is required for reproducible output; found ${version ?? 'unknown'}. ` +
            'Install the supported Windows release or set PANDOC_PATH.',
        );
      }
      return candidate;
    }
  }
  fail(
    `Pandoc ${PANDOC_VERSION} was not found. Install the official Windows ZIP/MSI, ` +
      'ensure pandoc.exe is on PATH (validate with "pandoc --version"), or set PANDOC_PATH.',
  );
}

function resolvePython(): string {
  const configured = process.env.DOCS_PYTHON;
  const bundled = join(
    homedir(),
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'python',
    'python.exe',
  );
  for (const candidate of [configured, bundled, 'python'].filter(
    (value): value is string => Boolean(value),
  )) {
    const result = spawnSync(
      candidate,
      ['-c', 'import docx,pypdf; print("ok")'],
      {
        encoding: 'utf8',
        shell: candidate === 'python',
      },
    );
    if (result.status === 0) return candidate;
  }
  fail(
    'Python with python-docx and pypdf is required. Install Python 3.11+ and run ' +
      '"python -m pip install python-docx pypdf", or set DOCS_PYTHON.',
  );
}

function resolvePoppler(): { pdftoppm: string; pdfinfo: string } {
  const base = join(
    homedir(),
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'native',
    'poppler',
    'Library',
    'bin',
  );
  const pdftoppm = process.env.PDFTOPPM_PATH ?? join(base, 'pdftoppm.exe');
  const pdfinfo = process.env.PDFINFO_PATH ?? join(base, 'pdfinfo.exe');
  for (const [name, path] of Object.entries({ pdftoppm, pdfinfo })) {
    const result = spawnSync(path, ['-v'], { encoding: 'utf8' });
    if (result.status !== 0) {
      fail(
        `${name} was not found. Install Poppler, add its bin directory to PATH, ` +
          `or set ${name === 'pdftoppm' ? 'PDFTOPPM_PATH' : 'PDFINFO_PATH'}.`,
      );
    }
  }
  return { pdftoppm, pdfinfo };
}

async function prerequisites(): Promise<{
  pandoc: string;
  python: string;
  pdftoppm: string;
  pdfinfo: string;
}> {
  const pandoc = await resolvePandoc();
  const python = resolvePython();
  const { pdftoppm, pdfinfo } = resolvePoppler();
  const mmdc = join(ROOT, 'node_modules', '.bin', 'mmdc.CMD');
  if (!(await exists(mmdc))) {
    fail(
      'Mermaid CLI is missing. Run "corepack pnpm install --frozen-lockfile".',
    );
  }
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
  } catch (error) {
    fail(
      `Chromium is unavailable: ${String(error)}. Run "corepack pnpm exec playwright install chromium".`,
    );
  }
  return { pandoc, python, pdftoppm, pdfinfo };
}

async function readYaml<T>(path: string): Promise<T> {
  return parse(await readFile(path, 'utf8')) as T;
}

function mermaidBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```mermaid\s*\r?\n([\s\S]*?)```/g)].map(
    (match) => match[1].trim(),
  );
}

function markdownLinks(markdown: string): string[] {
  return [...markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map((match) =>
    match[1].split(/\s+["']/)[0].replace(/^<|>$/g, ''),
  );
}

async function loadManifests(): Promise<{
  figures: Figure[];
  screenshots: Screenshot[];
}> {
  const figureManifest = await readYaml<{ figures: Figure[] }>(
    join(PUBLICATION, 'figure-manifest.yaml'),
  );
  const screenshotManifest = await readYaml<{ screenshots: Screenshot[] }>(
    join(PUBLICATION, 'screenshot-manifest.yaml'),
  );
  return {
    figures: figureManifest.figures,
    screenshots: screenshotManifest.screenshots,
  };
}

async function validateSources(): Promise<void> {
  const required = [
    'book.md',
    'metadata.yaml',
    'figure-manifest.yaml',
    'screenshot-manifest.yaml',
    'styles/publication.css',
    'styles/syntax-theme.css',
    'templates/cover.html',
    'templates/chapter-divider.html',
  ];
  for (const path of required) {
    if (!(await exists(join(PUBLICATION, path))))
      fail(`Required source is missing: ${path}`);
  }

  const bookPath = join(PUBLICATION, 'book.md');
  const book = await readFile(bookPath, 'utf8');
  const { figures, screenshots } = await loadManifests();
  if (figures.length !== 8)
    fail(
      `Figure manifest must contain exactly 8 entries; found ${figures.length}.`,
    );
  if (mermaidBlocks(book).length !== 8) {
    fail(
      `Publication manuscript must contain exactly 8 Mermaid blocks; found ${mermaidBlocks(book).length}.`,
    );
  }
  if (new Set(figures.map((figure) => figure.id)).size !== figures.length) {
    fail('Figure manifest contains duplicate IDs.');
  }
  if (
    new Set(screenshots.map((screenshot) => screenshot.id)).size !==
    screenshots.length
  ) {
    fail('Screenshot manifest contains duplicate IDs.');
  }

  for (const figure of figures) {
    const source = resolve(PUBLICATION, figure.source_document);
    if (!(await exists(source)))
      fail(
        `Figure source is missing for ${figure.id}: ${figure.source_document}`,
      );
    const blocks = mermaidBlocks(await readFile(source, 'utf8'));
    const block = blocks[figure.source_block_index];
    if (!block) {
      fail(
        `Mermaid block ${figure.source_block_index} was not found for ${figure.id} in ${figure.source_document}.`,
      );
    }
    if (!block.trimStart().startsWith(figure.mermaid_type)) {
      fail(
        `Mermaid type mismatch for ${figure.id}: expected ${figure.mermaid_type}, ` +
          `found ${block.trimStart().split(/\s/, 1)[0]}.`,
      );
    }
  }

  for (const screenshot of screenshots) {
    const source = resolve(PUBLICATION, screenshot.path);
    if (!(await exists(source))) {
      fail(`Screenshot is missing for ${screenshot.id}: ${screenshot.path}`);
    }
    if (!screenshot.alt.trim() || !screenshot.caption.trim()) {
      fail(`Screenshot ${screenshot.id} requires alt text and a caption.`);
    }
    if (book.split(screenshot.path).length - 1 !== 1) {
      fail(
        `Screenshot ${screenshot.id} must appear exactly once in the manuscript.`,
      );
    }
  }

  const explicitIds = [...book.matchAll(/\{#([A-Za-z0-9_-]+)[^}]*\}/g)].map(
    (match) => match[1],
  );
  if (new Set(explicitIds).size !== explicitIds.length)
    fail('Publication chapter IDs are not unique.');
  const fenceCount = (book.match(/^```/gm) ?? []).length;
  if (fenceCount % 2 !== 0) fail('Publication Markdown fences are unbalanced.');
  if (/(\bTODO\b|\bTBD\b|\[\[.+?\]\]|publication-placeholder)/i.test(book)) {
    fail('Publication manuscript contains a placeholder marker.');
  }
  if (/[A-Za-z]:\\/.test(book) || /file:\/\/\/[A-Za-z]:\//i.test(book)) {
    fail('Publication manuscript contains an unsupported absolute local path.');
  }

  for (const link of markdownLinks(book)) {
    if (/^(#|https?:|mailto:|data:)/i.test(link)) continue;
    const pathOnly = decodeURIComponent(link.split('#')[0]);
    if (!pathOnly || pathOnly.startsWith('.build/')) continue;
    if (!(await exists(resolve(dirname(bookPath), pathOnly)))) {
      fail(`Publication link target does not exist: ${link}`);
    }
  }
}

async function clean(): Promise<void> {
  await rm(BUILD, { recursive: true, force: true });
  for (const path of [
    TECHNICAL_PDF,
    TECHNICAL_DOCX,
    API_PDF,
    REPORT,
    CHECKSUMS,
  ]) {
    await rm(path, { force: true });
  }
}

async function initializeBuild(): Promise<void> {
  for (const path of [
    GENERATED,
    FIGURES,
    ASSETS,
    STYLES,
    TEMPLATES,
    PREVIEW,
    QA,
    DELIVERABLES,
  ]) {
    await mkdir(path, { recursive: true });
  }
  await copyFile(
    join(PUBLICATION, 'styles', 'publication.css'),
    join(STYLES, 'publication.css'),
  );
  await copyFile(
    join(PUBLICATION, 'styles', 'syntax-theme.css'),
    join(STYLES, 'syntax-theme.css'),
  );
  await copyFile(
    join(PUBLICATION, 'templates', 'cover.html'),
    join(TEMPLATES, 'cover.html'),
  );
}

async function renderDiagrams(): Promise<void> {
  await validateSources();
  await mkdir(FIGURES, { recursive: true });
  const { figures } = await loadManifests();
  const mermaidConfig = join(BUILD, 'mermaid-config.json');
  const puppeteerConfig = join(BUILD, 'puppeteer-config.json');
  await writeFile(
    mermaidConfig,
    `${JSON.stringify(
      {
        theme: 'neutral',
        fontFamily: 'Arial, Segoe UI, sans-serif',
        flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: true },
        sequence: {
          useMaxWidth: true,
          wrap: true,
          diagramMarginX: 24,
          diagramMarginY: 24,
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    puppeteerConfig,
    `${JSON.stringify(
      {
        headless: true,
        executablePath: chromium.executablePath(),
        args: ['--no-sandbox'],
      },
      null,
      2,
    )}\n`,
  );
  const mmdc = join(ROOT, 'node_modules', '.bin', 'mmdc.CMD');
  for (const figure of figures) {
    const source = resolve(PUBLICATION, figure.source_document);
    const block = mermaidBlocks(await readFile(source, 'utf8'))[
      figure.source_block_index
    ];
    if (!block) fail(`Mermaid source disappeared for ${figure.id}.`);
    const input = join(FIGURES, `${figure.id}.mmd`);
    const output = join(FIGURES, `${figure.id}.svg`);
    await writeFile(input, `${block}\n`);
    run(
      mmdc,
      [
        '--input',
        input,
        '--output',
        output,
        '--backgroundColor',
        'transparent',
        '--theme',
        'neutral',
        '--width',
        '1400',
        '--configFile',
        mermaidConfig,
        '--puppeteerConfigFile',
        puppeteerConfig,
      ],
      `Rendering Mermaid figure ${figure.id}`,
    );
    const svg = await readFile(output, 'utf8');
    if (svg.length < 200 || !/<svg[\s>]/i.test(svg) || !/<\/svg>/i.test(svg)) {
      fail(`Rendered SVG is empty or malformed: ${figure.id}`);
    }
  }
}

function screenshotFigure(screenshot: Screenshot): string {
  return `![${screenshot.caption}](../assets/screenshots/${screenshot.id}.png){#figure-${screenshot.id} width=${screenshot.intended_width} fig-alt="${screenshot.alt.replaceAll('"', "'")}"}`;
}

async function prepareMarkdown(): Promise<void> {
  const { figures, screenshots } = await loadManifests();
  let book = await readFile(join(PUBLICATION, 'book.md'), 'utf8');
  const sourceBlocks = mermaidBlocks(book);
  if (sourceBlocks.length !== figures.length) {
    fail('The manuscript Mermaid count changed after source validation.');
  }
  let diagramIndex = 0;
  book = book.replace(/```mermaid\s*\r?\n[\s\S]*?```/g, () => {
    const figure = figures[diagramIndex++];
    return `![${figure.caption}](../figures/${figure.id}.svg){#figure-${figure.id} width=100%}`;
  });
  for (const figure of figures) {
    book = book.replaceAll(`\n\n_${figure.caption}_`, '');
  }
  book = book.replace(
    /<!-- publication:prepend templates\/cover\.html -->\s*/g,
    '',
  );
  book = book.replace(
    /# Table of Contents \{\.unnumbered\}\s+[\s\S]*?(?=^# Part I)/m,
    '',
  );
  const publicationLinks: Record<string, string> = {
    '../05-reference/api-reference.md': '#chapter-api-reference',
    '../05-reference/database-schema.md': '#chapter-database-reference',
    '../05-reference/decision-log.md': '#chapter-decision-log',
    '../05-reference/faq.md': '#chapter-faq',
    '../05-reference/glossary.md': '#chapter-glossary',
    '../05-reference/troubleshooting.md': '#chapter-troubleshooting',
    './README.md': '#appendix-maintenance',
    './publication-plan.md': '#appendix-maintenance',
  };
  for (const [source, target] of Object.entries(publicationLinks)) {
    book = book.replaceAll(`](${source})`, `](${target})`);
  }

  for (const screenshot of screenshots) {
    const source = resolve(PUBLICATION, screenshot.path);
    await copyFile(source, join(ASSETS, `${screenshot.id}.png`));
    const escapedPath = screenshot.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const figurePattern = new RegExp(
      `<div class="figure [^"]+">\\s*<img src="${escapedPath}"[\\s\\S]*?<\\/div>`,
    );
    if (!figurePattern.test(book)) {
      fail(
        `Screenshot ${screenshot.id} could not be located in the manuscript.`,
      );
    }
    book = book.replace(figurePattern, screenshotFigure(screenshot));
  }

  if (mermaidBlocks(book).length !== 0)
    fail('Raw Mermaid remained in generated manuscript.');
  await writeFile(join(GENERATED, 'book.md'), book);

  let apiSource = await readFile(
    join(ROOT, 'docs', '05-reference', 'api-reference.md'),
    'utf8',
  );
  apiSource = apiSource.replace(
    /```mermaid\s*\r?\n[\s\S]*?```/g,
    [
      '> **Authentication sequence:** The client signs in through `/api/auth/*`,',
      '> receives a database-backed session cookie, and sends that cookie to',
      '> `/api/v1/*`. Better Auth resolves the session before Trackly returns a',
      '> user-scoped response.',
    ].join('\n'),
  );
  if (/```mermaid/.test(apiSource))
    fail('Raw Mermaid remained in generated API source.');
  await writeFile(join(GENERATED, 'api-reference.md'), apiSource);
  await writeFile(
    join(TEMPLATES, 'api-cover.html'),
    (await readFile(join(TEMPLATES, 'cover.html'), 'utf8'))
      .replace('Technical Documentation', 'API Documentation')
      .replace(
        'Architecture, Development, Features, and Operations',
        'Complete HTTP Contract Reference',
      ),
  );
}

async function pandocHtml(
  pandoc: string,
  input: string,
  output: string,
  title: string,
  cover: string,
): Promise<void> {
  run(
    pandoc,
    [
      input,
      '--from=markdown+raw_html+fenced_divs+link_attributes',
      '--to=html5',
      '--standalone',
      '--toc',
      '--toc-depth=3',
      '--number-sections',
      '--metadata',
      `title=${title}`,
      '--metadata',
      'author=Fahmy Akhmad Firdaus',
      '--metadata',
      'date=2026',
      '--metadata',
      'lang=en-US',
      '--css=../styles/publication.css',
      '--css=../styles/syntax-theme.css',
      `--include-before-body=${cover}`,
      `--output=${output}`,
    ],
    `Pandoc HTML conversion for ${title}`,
  );
}

async function htmlToPdf(
  html: string,
  output: string,
  title: string,
): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print', colorScheme: 'light' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = Array.from(document.images);
      await Promise.all(
        images.map(
          (image) =>
            image.complete ||
            new Promise<void>((resolveImage, rejectImage) => {
              image.addEventListener('load', () => resolveImage(), {
                once: true,
              });
              image.addEventListener(
                'error',
                () => rejectImage(new Error(image.src)),
                {
                  once: true,
                },
              );
            }),
        ),
      );
    });
    await page.pdf({
      path: output,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate:
        '<div style="font:8px Arial;color:#625d6f;width:100%;padding:0 18mm;">' +
        `${title.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</div>`,
      footerTemplate:
        '<div style="font:8px Arial;color:#625d6f;width:100%;padding:0 18mm;text-align:right;">' +
        '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: { top: '20mm', right: '18mm', bottom: '22mm', left: '18mm' },
      tagged: true,
      outline: true,
    });
  } finally {
    await browser.close();
  }
}

async function buildTechnicalPdf(pandoc: string): Promise<void> {
  const html = join(GENERATED, 'technical-documentation.html');
  await pandocHtml(
    pandoc,
    join(GENERATED, 'book.md'),
    html,
    'Trackly Technical Documentation',
    join(TEMPLATES, 'cover.html'),
  );
  await htmlToPdf(html, TECHNICAL_PDF, 'Trackly Technical Documentation');
}

async function buildApiPdf(pandoc: string): Promise<void> {
  const html = join(GENERATED, 'api-documentation.html');
  await pandocHtml(
    pandoc,
    join(GENERATED, 'api-reference.md'),
    html,
    'Trackly API Documentation',
    join(TEMPLATES, 'api-cover.html'),
  );
  await htmlToPdf(html, API_PDF, 'Trackly API Documentation');
}

async function buildDocx(pandoc: string, python: string): Promise<void> {
  const reference = join(BUILD, 'reference.docx');
  run(
    python,
    [
      join(ROOT, 'scripts', 'docs-publication', 'create_reference_docx.py'),
      reference,
    ],
    'Generating the DOCX reference document',
  );
  run(
    pandoc,
    [
      join(GENERATED, 'book.md'),
      '--from=markdown+raw_html+fenced_divs+link_attributes',
      '--to=docx',
      '--standalone',
      '--toc',
      '--toc-depth=3',
      '--number-sections',
      `--resource-path=${GENERATED}`,
      `--reference-doc=${reference}`,
      `--lua-filter=${join(ROOT, 'scripts', 'docs-publication', 'page-breaks.lua')}`,
      '--metadata',
      'title=Trackly Technical Documentation',
      '--metadata',
      'subtitle=Architecture, Development, Features, and Operations',
      '--metadata',
      'author=Fahmy Akhmad Firdaus',
      '--metadata',
      'date=2026',
      `--output=${TECHNICAL_DOCX}`,
    ],
    'Pandoc DOCX conversion',
  );
}

async function artifactValidation(python: string): Promise<ArtifactResult> {
  const output = run(
    python,
    [
      join(ROOT, 'scripts', 'docs-publication', 'validate_artifacts.py'),
      TECHNICAL_PDF,
      TECHNICAL_DOCX,
      API_PDF,
    ],
    'Generated artifact validation',
  );
  return JSON.parse(output) as ArtifactResult;
}

function previewPage(
  pdftoppm: string,
  pdf: string,
  page: number,
  outputName: string,
): void {
  const prefix = join(PREVIEW, outputName);
  run(
    pdftoppm,
    [
      '-f',
      String(page),
      '-l',
      String(page),
      '-png',
      '-r',
      '130',
      '-singlefile',
      pdf,
      prefix,
    ],
    `Rendering preview ${outputName}`,
  );
}

async function renderPreviews(
  result: ArtifactResult,
  pdftoppm: string,
): Promise<void> {
  await rm(PREVIEW, { recursive: true, force: true });
  await mkdir(PREVIEW, { recursive: true });
  const bookPages = result.technicalPdf.termPages;
  const selections: Array<[string, number]> = [
    ['cover', 1],
    ['table-of-contents', 2],
    ['architecture', bookPages['System Architecture'] ?? 5],
    ['screenshot-feature', bookPages['Today Dashboard'] ?? 15],
    ['diagram-heavy', bookPages['Reminders and Web Push'] ?? 25],
    ['glossary', bookPages.Glossary ?? result.technicalPdf.pages],
  ];
  for (const [name, page] of selections)
    previewPage(pdftoppm, TECHNICAL_PDF, page, name);
  previewPage(
    pdftoppm,
    API_PDF,
    result.apiPdf.termPages.Authentication ?? 3,
    'api-code-table',
  );
}

async function sha256(path: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(await readFile(path));
  return hash.digest('hex');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

async function writeReport(
  result: ArtifactResult,
  versions: Record<string, string>,
  warnings: string[],
): Promise<void> {
  const { figures, screenshots } = await loadManifests();
  const timestamp = new Date().toISOString();
  const rows = [
    [
      'Trackly Technical Documentation.pdf',
      result.technicalPdf.size,
      `${result.technicalPdf.pages}`,
    ],
    ['Trackly Technical Documentation.docx', result.technicalDocx.size, 'n/a'],
    [
      'Trackly API Documentation.pdf',
      result.apiPdf.size,
      `${result.apiPdf.pages}`,
    ],
  ];
  const report = `# Trackly Publication Report

## Generation

- **Timestamp:** ${timestamp}
- **Input manuscript:** \`docs/publication/book.md\`
- **Reproducibility command:** \`pnpm docs:publish\`
- **Checksum algorithm:** SHA-256

## Tool Versions

${Object.entries(versions)
  .map(([name, version]) => `- **${name}:** ${version}`)
  .join('\n')}

## Deliverables

| Artifact | Size | Pages |
| --- | ---: | ---: |
${rows.map(([name, size, pages]) => `| ${name} | ${formatBytes(Number(size))} | ${pages} |`).join('\n')}

## Publication Assets

- **Screenshots embedded:** ${screenshots.length}
- **Mermaid diagrams rendered:** ${figures.length}
- **DOCX embedded media:** ${result.technicalDocx.media}
- **Technical PDF bookmarks:** ${result.technicalPdf.bookmarks}
- **Technical PDF links:** ${result.technicalPdf.links}
- **API PDF bookmarks:** ${result.apiPdf.bookmarks}
- **API PDF links:** ${result.apiPdf.links}

## Validation Results

- Source and manifest validation: passed
- Eight selected Mermaid sources rendered to non-empty SVG: passed
- PDF signature, metadata, page count, content, links, and bookmarks: passed
- DOCX ZIP structure, relationships, headings, captions, and media: passed
- Raw Mermaid and absolute repository path checks: passed
- Representative PDF raster previews: generated under \`.build/docs/preview/\`

## Warnings and Known Limitations

${warnings.length > 0 ? warnings.map((warning) => `- ${warning}`).join('\n') : '- None.'}

## Reproducibility

Install the pinned JavaScript dependencies with \`corepack pnpm install --frozen-lockfile\`,
install Pandoc ${PANDOC_VERSION}, Python 3.11+ with \`python-docx\` and \`pypdf\`,
Poppler, and the Playwright Chromium browser. Then run \`pnpm docs:publish\`.
The command does not start Trackly services, connect to PostgreSQL, or regenerate screenshots.
`;
  await writeFile(REPORT, report);
}

async function writeChecksums(): Promise<void> {
  const paths = [TECHNICAL_PDF, TECHNICAL_DOCX, API_PDF, REPORT];
  const lines = [];
  for (const path of paths)
    lines.push(`${await sha256(path)}  ${basename(path)}`);
  await writeFile(CHECKSUMS, `${lines.join('\n')}\n`);
}

async function validateChecksums(): Promise<void> {
  if (!(await exists(CHECKSUMS))) return;
  const lines = (await readFile(CHECKSUMS, 'utf8')).trim().split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([0-9a-f]{64})[ ]{2}(.+)$/);
    if (!match) fail(`Malformed checksum line: ${line}`);
    const path = join(DELIVERABLES, match[2]);
    if ((await sha256(path)) !== match[1])
      fail(`Checksum mismatch: ${match[2]}`);
  }
}

async function publish(): Promise<void> {
  console.log('[1/14] Validating prerequisites');
  const tools = await prerequisites();
  console.log('[2/14] Cleaning controlled outputs');
  await clean();
  console.log('[3/14] Validating publication source and manifests');
  await validateSources();
  console.log('[4/14] Initializing controlled build directories');
  await initializeBuild();
  console.log('[5/14] Rendering eight Mermaid diagrams');
  await renderDiagrams();
  console.log('[6/14] Preparing generated publication Markdown and assets');
  await prepareMarkdown();
  console.log('[7/14] Generating technical PDF');
  await buildTechnicalPdf(tools.pandoc);
  console.log('[8/14] Generating technical DOCX');
  await buildDocx(tools.pandoc, tools.python);
  console.log('[9/14] Generating standalone API PDF');
  await buildApiPdf(tools.pandoc);
  console.log('[10/14] Validating generated artifacts');
  const result = await artifactValidation(tools.python);
  console.log('[11/14] Rendering representative PDF previews');
  await renderPreviews(result, tools.pdftoppm);
  console.log('[12/14] Writing publication report');
  const versions = {
    Node: process.version,
    pnpm: commandVersion('corepack.cmd', ['pnpm', '--version']),
    Pandoc: commandVersion(tools.pandoc, ['--version']),
    Mermaid: commandVersion(join(ROOT, 'node_modules', '.bin', 'mmdc.CMD'), [
      '--version',
    ]),
    Chromium: chromium.name(),
    Python: commandVersion(tools.python, ['--version']),
    Poppler: commandVersion(tools.pdfinfo, ['-v']),
  };
  const warnings = [
    'DOCX structural validation passed, but page rasterization requires LibreOffice/soffice and is not part of the portable baseline.',
    'Word may prompt to update the generated table of contents after pagination changes.',
  ];
  await writeReport(result, versions, warnings);
  run(
    join(ROOT, 'node_modules', '.bin', 'prettier.CMD'),
    ['--write', REPORT],
    'Formatting the publication report',
  );
  console.log('[13/14] Writing and verifying SHA-256 checksums');
  await writeChecksums();
  await validateChecksums();
  console.log('[14/14] Publication completed successfully');
}

async function validateCommand(): Promise<void> {
  const tools = await prerequisites();
  await validateSources();
  const result = await artifactValidation(tools.python);
  await renderPreviews(result, tools.pdftoppm);
  await validateChecksums();
  console.log(JSON.stringify(result, null, 2));
}

async function ensurePrepared(): Promise<ReturnType<typeof prerequisites>> {
  const tools = await prerequisites();
  await validateSources();
  await initializeBuild();
  if (!(await exists(join(FIGURES, 'system-context.svg'))))
    await renderDiagrams();
  await prepareMarkdown();
  return tools;
}

async function main(): Promise<void> {
  const command = (process.argv[2] ?? 'publish') as Command;
  if (command === 'publish') return publish();
  if (command === 'clean') {
    await clean();
    console.log('Controlled publication outputs removed.');
    return;
  }
  if (command === 'validate') return validateCommand();
  const tools = await ensurePrepared();
  if (command === 'diagrams') return renderDiagrams();
  if (command === 'pdf') return buildTechnicalPdf(tools.pandoc);
  if (command === 'docx') return buildDocx(tools.pandoc, tools.python);
  if (command === 'api-pdf') return buildApiPdf(tools.pandoc);
  fail(`Unknown command ${command}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
