const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const XLSX = require('xlsx');
const PptxParser = require('node-pptx-parser').default;

const CHUNK_SIZE = Number(process.env.AI_CHUNK_SIZE || 800);
const CHUNK_OVERLAP = Number(process.env.AI_CHUNK_OVERLAP || 100);
const MAX_RETRIEVED_CHUNKS = Number(process.env.AI_MAX_RETRIEVED_CHUNKS || 2);
const OCR_MAX_PAGES = Number(process.env.OCR_MAX_PAGES || 5);
const OCR_SCALE = Number(process.env.OCR_SCALE || 2);
const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.xlsx', '.pptx']);

function normalizeText(value) {
  return typeof value === 'string'
    ? value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
    : '';
}

function normalize(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const numberMap = {
  '1': ['one', 'i'],
  '2': ['two', 'ii'],
  '3': ['three', 'iii'],
  '4': ['four', 'iv'],
  '5': ['five', 'v'],
  '6': ['six', 'vi'],
};

function isMeaningfulText(text) {
  const normalized = normalizeText(text || '');

  if (!normalized || normalized.length < 50) {
    return false;
  }

  const totalChars = normalized.length;
  const alphaChars = (normalized.match(/[A-Za-z]/g) || []).length;
  const symbolChars = (normalized.match(/[^A-Za-z0-9\s.,!?'"():;\-]/g) || []).length;
  const words = normalized.match(/\b[a-zA-Z]{2,}\b/g) || [];

  const alphaRatio = alphaChars / totalChars;
  const symbolRatio = symbolChars / totalChars;
  const lowerText = normalized.toLowerCase();
  const repeatedNoise = /(.)\1{5,}/g;
  const repeatedRuns = normalized.match(repeatedNoise) || [];
  const repeatedRunChars = repeatedRuns.reduce((total, run) => total + run.length, 0);

  if (alphaRatio < 0.5) return false;
  if (symbolRatio > 0.2) return false;
  if (words.length < 10) return false;
  if (repeatedRunChars / totalChars > 0.15) return false;

  const uiKeywordMatches = lowerText.match(
    /\b(react|localhost|http|https|api|server|error|unavailable|dashboard|upload|download|button|click|select|file|document|assistant|summarize|chat|settings)\b/g
  ) || [];

  if (uiKeywordMatches.length > 12 && uiKeywordMatches.length / words.length > 0.08) {
    return false;
  }

  const uiPatternMatches = lowerText.match(
    /\b(react app|localhost|click here|select document|upload file|download file|api error|server error)\b/g
  ) || [];

  if (uiPatternMatches.length > 0) {
    return false;
  }

  const shortWords = words.filter((word) => word.length <= 3);
  if (words.length > 30 && shortWords.length / words.length > 0.75) {
    return false;
  }

  const uiFragmentMatches = lowerText.match(
    /\b(menu|home|login|signup|search|settings|submit|cancel|next|back|close|download|upload|dashboard|username|password)\b/g
  ) || [];

  if (uiFragmentMatches.length > Math.floor(words.length * 0.5)) {
    return false;
  }

  const sentences = normalized
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const validSentences = sentences.filter((sentence) => {
    const sentenceWords = sentence.match(/\b[a-zA-Z]{2,}\b/g) || [];
    return sentenceWords.length >= 3;
  });

  if (validSentences.length < 1) {
    return false;
  }

  const averageSentenceLength = validSentences.reduce((total, sentence) => {
    const sentenceWords = sentence.match(/\b[a-zA-Z]{2,}\b/g) || [];
    return total + sentenceWords.length;
  }, 0) / validSentences.length;

  if (averageSentenceLength < 5) {
    return false;
  }

  return true;
}

function chunkDocumentText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);
    if (end < normalized.length) {
      const lastBoundary = normalized.lastIndexOf('\n', end);
      const lastSpace = normalized.lastIndexOf(' ', end);
      const boundary = Math.max(lastBoundary, lastSpace);
      if (boundary > start + Math.floor(chunkSize * 0.6)) {
        end = boundary;
      }
    }

    const content = normalized.slice(start, end).trim();
    if (content) {
      chunks.push(content);
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

function getFileExtension(fileName = '') {
  return path.extname(fileName || '').toLowerCase();
}

function detectDocumentType(options = {}) {
  const mimeType = (options.mimeType || '').toLowerCase();
  const extension = getFileExtension(options.originalName);

  if (mimeType.includes('pdf') || extension === '.pdf') {
    return 'pdf';
  }

  if (
    mimeType.includes('wordprocessingml.document') ||
    extension === '.docx'
  ) {
    return 'docx';
  }

  if (mimeType.startsWith('text/') || extension === '.txt') {
    return 'txt';
  }

  if (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg' ||
    mimeType === 'image/png' ||
    extension === '.jpg' ||
    extension === '.jpeg' ||
    extension === '.png'
  ) {
    return 'image';
  }

  if (
    mimeType.includes('spreadsheetml.sheet') ||
    mimeType.includes('application/vnd.ms-excel') ||
    extension === '.xlsx'
  ) {
    return 'xlsx';
  }

  if (
    mimeType.includes('presentationml.presentation') ||
    extension === '.pptx'
  ) {
    return 'pptx';
  }

  return 'unknown';
}

function isSupportedDocumentType(options = {}) {
  const extension = getFileExtension(options.originalName);
  return SUPPORTED_EXTENSIONS.has(extension) || detectDocumentType(options) !== 'unknown';
}

function tokenizeQuestion(question) {
  const ignoredWords = new Set([
    'what', 'when', 'where', 'which', 'about', 'from', 'with', 'that', 'this',
    'does', 'have', 'into', 'your', 'their', 'there', 'them', 'then', 'than',
  ]);

  return Array.from(
    new Set(
      (question.toLowerCase().match(/[a-z0-9]{3,}/g) || [])
        .filter((word) => !ignoredWords.has(word))
    )
  );
}

function expandQuery(words = []) {
  const expanded = [...words];

  for (const word of words) {
    if (numberMap[word]) {
      expanded.push(...numberMap[word]);
      continue;
    }

    for (const [digit, variants] of Object.entries(numberMap)) {
      if (variants.includes(word)) {
        expanded.push(digit, ...variants);
      }
    }
  }

  return Array.from(new Set(expanded.filter(Boolean)));
}

function scoreChunk(chunk, queryWords = []) {
  const text = normalize(chunk);
  if (!text || queryWords.length === 0) {
    return 0;
  }

  const words = text.split(' ').filter(Boolean);
  let score = 0;

  for (const word of queryWords) {
    if (!word) {
      continue;
    }

    if (text.includes(word)) {
      score += 2;
    }

    if (words.some((item) => item.startsWith(word))) {
      score += 1;
    }
  }

  return score;
}

function retrieveRelevantChunks(chunks, question, limit = MAX_RETRIEVED_CHUNKS) {
  return retrieveRelevantChunkMatches(chunks, question, limit).map((item) => item.chunk);
}

function retrieveRelevantChunkMatches(chunks, question, limit = MAX_RETRIEVED_CHUNKS) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const baseWords = tokenizeQuestion(normalize(question));
  const queryWords = expandQuery(baseWords);
  if (queryWords.length === 0) {
    return chunks.slice(0, limit).map((chunk, index) => ({
      chunk,
      index,
      score: 0,
    }));
  }

  const ranked = chunks
    .map((chunk, index) => {
      return {
        chunk,
        index,
        score: scoreChunk(chunk, queryWords),
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const positiveMatches = ranked.filter((item) => item.score > 0).slice(0, limit);
  return positiveMatches.length > 0 ? positiveMatches : ranked.slice(0, 1);
}

async function extractTextWithOCR(imageBuffer, context = {}) {
  const result = await Tesseract.recognize(imageBuffer, 'eng');
  const text = normalizeText(result.data?.text || '');

  console.log('[AI] OCR text length:', {
    documentId: context.documentId,
    page: context.page,
    length: text.length,
  });

  return text;
}

async function extractPdfTextWithOCR(buffer, context = {}) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const pagesToProcess = Math.min(pdf.numPages, OCR_MAX_PAGES);
  const texts = [];

  console.log('[AI] OCR fallback enabled for PDF:', {
    documentId: context.documentId,
    pagesToProcess,
    totalPages: pdf.numPages,
  });

  for (let pageNumber = 1; pageNumber <= pagesToProcess; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: OCR_SCALE });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const canvasContext = canvas.getContext('2d');

    await page.render({ canvasContext, viewport }).promise;

    const pageText = await extractTextWithOCR(canvas.toBuffer('image/png'), {
      documentId: context.documentId,
      page: pageNumber,
    });

    if (pageText) {
      texts.push(pageText);
    }
  }

  return normalizeText(texts.join('\n\n'));
}

async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeText(result.value || '');
}

function extractTextFromTxt(filePath) {
  return normalizeText(fs.readFileSync(filePath, 'utf8'));
}

function extractTextFromWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetTexts = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    });

    const rowText = rows
      .map((row) => row.map((cell) => String(cell || '').trim()).filter(Boolean).join(' | '))
      .filter(Boolean)
      .join('\n');

    return rowText ? `Sheet: ${sheetName}\n${rowText}` : '';
  }).filter(Boolean);

  return normalizeText(sheetTexts.join('\n\n'));
}

async function extractTextFromPptx(buffer) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docflow-pptx-'));
  const tempFilePath = path.join(tempDir, `upload-${Date.now()}.pptx`);

  try {
    fs.writeFileSync(tempFilePath, buffer);
    const parser = new PptxParser(tempFilePath);
    const slides = await parser.extractText();

    const slideTexts = slides.map((slide, index) => {
      const text = normalizeText((slide.text || []).join('\n'));
      return text ? `Slide ${index + 1}\n${text}` : '';
    }).filter(Boolean);

    return normalizeText(slideTexts.join('\n\n'));
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  }
}

async function extractTextFromBuffer(buffer, options = {}) {
  const documentType = detectDocumentType(options);

  if (documentType === 'pdf') {
    const parsed = await pdfParse(buffer);
    const pdfText = normalizeText(parsed.text || '');

    console.log('[AI] pdf-parse text length:', {
      documentId: options.documentId,
      length: pdfText.length,
    });

    if (pdfText) {
      return { text: pdfText, usedOcr: false };
    }

    return {
      text: await extractPdfTextWithOCR(buffer, options),
      usedOcr: true,
    };
  }

  if (documentType === 'docx') {
    return {
      text: await extractTextFromDocx(buffer),
      usedOcr: false,
    };
  }

  if (documentType === 'txt') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docflow-txt-'));
    const tempFilePath = path.join(tempDir, `upload-${Date.now()}.txt`);

    try {
      fs.writeFileSync(tempFilePath, buffer);
      return {
        text: extractTextFromTxt(tempFilePath),
        usedOcr: false,
      };
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    }
  }

  if (documentType === 'image') {
    return {
      text: await extractTextWithOCR(buffer, options),
      usedOcr: true,
    };
  }

  if (documentType === 'xlsx') {
    return {
      text: extractTextFromWorkbook(buffer),
      usedOcr: false,
    };
  }

  if (documentType === 'pptx') {
    return {
      text: await extractTextFromPptx(buffer),
      usedOcr: false,
    };
  }

  return {
    text: normalizeText(buffer.toString('utf8')),
    usedOcr: false,
  };
}

async function buildDocumentRagData(buffer, options = {}) {
  const { text, usedOcr } = await extractTextFromBuffer(buffer, options);
  const chunks = chunkDocumentText(text);

  return {
    processedText: text,
    textChunks: chunks,
    textExtraction: {
      status: text ? 'success' : 'failed',
      usedOcr,
      updatedAt: new Date(),
    },
  };
}

module.exports = {
  normalizeText,
  isMeaningfulText,
  chunkDocumentText,
  retrieveRelevantChunks,
  retrieveRelevantChunkMatches,
  buildDocumentRagData,
  extractTextFromBuffer,
  detectDocumentType,
  isSupportedDocumentType,
  normalize,
  expandQuery,
  scoreChunk,
};
