const axios = require('axios');

const Document = require('../models/Document');
const AILog = require('../models/AILog');
const { runInference } = require('../services/hfService');
const { getAiSettings } = require('../services/configService');
const {
  normalizeText,
  normalize,
  isMeaningfulText,
  chunkDocumentText,
  retrieveRelevantChunkMatches,
  buildDocumentRagData,
  expandQuery,
  scoreChunk,
} = require('../services/documentAiService');

const ANSWER_NOT_FOUND_MESSAGE = 'Not found in document';
const FALLBACK_STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'of', 'for', 'in',
  'by', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'be', 'has',
  'have', 'had', 'will', 'would', 'can', 'could', 'should', 'about', 'into',
  'than', 'then', 'them', 'they', 'their', 'there', 'what', 'when', 'where',
  'who', 'whom', 'why', 'how', 'your',
]);

async function processDocument(doc) {
  const cachedText = normalizeText(doc.processedText || '');
  const cachedChunks = Array.isArray(doc.textChunks)
    ? doc.textChunks.map((chunk) => normalizeText(chunk)).filter(Boolean)
    : [];

  if (cachedText && cachedChunks.length > 0) {
    console.log('[AI] Using cached document chunks:', {
      documentId: doc._id?.toString(),
      textLength: cachedText.length,
      chunkCount: cachedChunks.length,
    });

    return { text: cachedText, chunks: cachedChunks };
  }

  if (cachedText) {
    const rebuiltChunks = chunkDocumentText(cachedText);

    console.log('[AI] Rebuilt cached document chunks:', {
      documentId: doc._id?.toString(),
      textLength: cachedText.length,
      chunkCount: rebuiltChunks.length,
    });

    if (rebuiltChunks.length > 0) {
      await Document.updateOne(
        { _id: doc._id, userId: doc.userId },
        {
          $set: {
            textChunks: rebuiltChunks,
            'textExtraction.status': 'success',
            'textExtraction.updatedAt': new Date(),
          },
        }
      );
    }

    return { text: cachedText, chunks: rebuiltChunks };
  }

  if (cachedChunks.length > 0) {
    const rebuiltText = normalizeText(cachedChunks.join('\n\n'));

    console.log('[AI] Rebuilt cached document text:', {
      documentId: doc._id?.toString(),
      textLength: rebuiltText.length,
      chunkCount: cachedChunks.length,
    });

    if (rebuiltText) {
      await Document.updateOne(
        { _id: doc._id, userId: doc.userId },
        {
          $set: {
            processedText: rebuiltText,
            'textExtraction.status': 'success',
            'textExtraction.updatedAt': new Date(),
          },
        }
      );
    }

    return { text: rebuiltText, chunks: cachedChunks };
  }

  const { buffer } = await downloadDocumentBuffer(doc);
  const ragData = await buildDocumentRagData(buffer, {
    mimeType: doc.mimeType,
    originalName: doc.originalName || doc.filename,
    documentId: doc._id?.toString(),
  });

  await Document.updateOne(
    { _id: doc._id, userId: doc.userId },
    {
      $set: {
        processedText: ragData.processedText,
        textChunks: ragData.textChunks,
        textExtraction: ragData.textExtraction,
      },
    }
  );

  console.log('[AI] Document processed:', {
    documentId: doc._id?.toString(),
    textLength: ragData.processedText.length,
    chunkCount: ragData.textChunks.length,
    fromCache: false,
  });

  return {
    text: ragData.processedText,
    chunks: ragData.textChunks,
  };
}

async function getDocumentForUser(req) {
  const documentId = req.params.id || req.body.documentId;
  if (!documentId) {
    return null;
  }

  return Document.findOne({ _id: documentId, userId: req.userId });
}

async function downloadDocumentBuffer(doc) {
  const response = await axios.get(doc.url, {
    responseType: 'arraybuffer',
    timeout: 120000,
  });

  return {
    buffer: Buffer.from(response.data),
    contentType: doc.mimeType || response.headers['content-type'] || '',
  };
}

async function recordFeatureUsage(userId, documentId, feature, inputData, outputData, status = 'success') {
  try {
    await Document.updateOne(
      { _id: documentId, userId },
      {
        $push: {
          aiFeatures: {
            feature,
            usedAt: new Date(),
          },
        },
      }
    );

    await AILog.create({
      userId,
      documentId,
      feature,
      inputData: typeof inputData === 'string' ? inputData.slice(0, 2500) : '',
      outputData: typeof outputData === 'string' ? outputData.slice(0, 2500) : '',
      status,
    });
  } catch (error) {
    console.error('[AI] Failed to record feature usage:', error.message);
  }
}

async function runPrompt(prompt) {
  const result = normalizeText(await runInference(prompt));

  if (!result || result === 'No response') {
    throw new Error('Empty response from AI service');
  }

  return result;
}

function cleanAiOutput(value) {
  return normalizeText(value || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[•·?]\s*/g, '• ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isUsableAiOutput(value, minLength = 20) {
  return cleanAiOutput(value).length >= minLength;
}

function buildSummaryFallback(chunks) {
  const selectedChunks = chunks.slice(0, 5);

  const cleanText = (value) => normalizeText(value)
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/[^\w\s.,!?-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const mostlyNumbers = (value) => {
    const compact = value.replace(/\s+/g, '');
    if (!compact) {
      return true;
    }

    const numericChars = (compact.match(/[0-9]/g) || []).length;
    return numericChars / compact.length > 0.5;
  };

  const formatSentence = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const capped = trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}...` : trimmed;
    return capped.charAt(0).toUpperCase() + capped.slice(1);
  };

  const sentences = [];

  for (const chunk of selectedChunks) {
    const cleanedChunk = cleanText(chunk);
    const parts = cleanedChunk
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    for (const sentence of parts) {
      if (sentence.length <= 40) {
        continue;
      }

      if (sentence.includes('http') || sentence.includes('@')) {
        continue;
      }

      if (mostlyNumbers(sentence)) {
        continue;
      }

      const formatted = formatSentence(sentence);
      if (formatted) {
        sentences.push(formatted);
      }

      if (sentences.length >= 5) {
        break;
      }
    }

    if (sentences.length >= 5) {
      break;
    }
  }

  const summarySentences = sentences.slice(0, 5);
  if (summarySentences.length === 0) {
    return 'No meaningful text found in document';
  }

  return cleanAiOutput(summarySentences.map((sentence) => `• ${sentence}`).join('\n'));
}

function parseStructuredSummary(responseText) {
  const cleaned = cleanAiOutput(responseText);
  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);

  const bulletLines = lines.filter((line) => /^[-*•]/.test(line));
  const keyPoints = bulletLines
    .map((line) => `• ${line.replace(/^[-*•]\s*/, '').trim()}`)
    .join('\n')
    .trim();

  const summaryLines = lines.filter((line) => !/^[-*•]/.test(line));
  const shortSummary = cleanAiOutput(summaryLines.join('\n')).trim();

  return {
    keyPoints,
    shortSummary,
  };
}

function formatStructuredSummary(summary) {
  return cleanAiOutput(
    [summary.keyPoints, summary.shortSummary]
      .filter(Boolean)
      .join('\n\n')
  );
}

async function generateSummaryRAG(documentId, chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    const fallbackText = buildSummaryFallback([]);
    return {
      text: fallbackText,
      source: 'fallback',
      structured: {
        keyPoints: '',
        shortSummary: fallbackText,
      },
    };
  }

  const normalizedChunks = chunks
    .map((chunk) => normalizeText(chunk))
    .filter(Boolean);

  if (normalizedChunks.length === 0) {
    const fallbackText = buildSummaryFallback([]);
    return {
      text: fallbackText,
      source: 'fallback',
      structured: {
        keyPoints: '',
        shortSummary: fallbackText,
      },
    };
  }

  const aiSettings = await getAiSettings();
  if (!aiSettings.aiEnabled || aiSettings.fallbackOnly) {
    const fallbackText = buildSummaryFallback(normalizedChunks);
    return {
      text: fallbackText,
      source: 'fallback',
      structured: {
        keyPoints: '',
        shortSummary: fallbackText,
      },
    };
  }

  try {
    console.log('[Summarize] Using RAG summary:', {
      documentId,
      chunkCount: normalizedChunks.length,
    });

    const query = 'main topics, key points, important information in this document';
    const topK = 10;
    const retrievedChunks = retrieveRelevantChunkMatches(normalizedChunks, query, topK);
    const context = retrievedChunks
      .map((c) => c?.text || c?.chunk || '')
      .filter(Boolean)
      .join('\n\n');

    if (!context.trim()) {
      const fallbackText = buildSummaryFallback(normalizedChunks);
      return {
        text: fallbackText,
        source: 'fallback',
        structured: {
          keyPoints: '',
          shortSummary: fallbackText,
        },
      };
    }

    const prompt = `You are analyzing a document.

Based ONLY on the provided context:

1. List key points (bullet format)
2. Write a short 3–4 line summary

Rules:
- Focus only on important information
- Do NOT repeat points
- Do NOT add outside knowledge
- Keep it clear and concise

CONTEXT:
${context}`;

    const response = cleanAiOutput(await runPrompt(prompt));
    if (!response || response.length < 30) {
      const fallbackText = buildSummaryFallback(retrievedChunks.map((item) => item.chunk));
      return {
        text: fallbackText,
        source: 'fallback',
        structured: {
          keyPoints: '',
          shortSummary: fallbackText,
        },
      };
    }

    const structured = parseStructuredSummary(response);
    const text = formatStructuredSummary(structured) || response;

    return {
      text,
      source: 'ai',
      structured: {
        keyPoints: structured.keyPoints,
        shortSummary: structured.shortSummary,
      },
    };
  } catch (error) {
    console.error('[Summarize RAG Fallback]:', error.message);
    const fallbackText = buildSummaryFallback(normalizedChunks);
    return {
      text: fallbackText,
      source: 'fallback',
      structured: {
        keyPoints: '',
        shortSummary: fallbackText,
      },
    };
  }
}

function buildChatFallback(chunks, question) {
  const normalizeForMatch = (value) => value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanForOutput = (value) => normalizeText(value)
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '')
    .replace(/\b(?:linkedin|github|portfolio)\b:?/gi, '')
    .replace(/^[A-Z][A-Z\s]{5,}$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  const trimChunk = (value, maxLength = 140) => (
    value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value
  );

  const highlightKeywords = (value, words) => {
    let highlighted = value;

    for (const word of words) {
      const pattern = new RegExp(`\\b(${word})\\b`, 'gi');
      highlighted = highlighted.replace(pattern, '**$1**');
    }

    return highlighted;
  };

  const scoreTextAgainstWords = (value, words) => {
    const normalizedValue = normalizeForMatch(value);
    const valueWords = new Set(normalizedValue.split(' ').filter(Boolean));
    let score = 0;

    for (const word of words) {
      if (valueWords.has(word)) {
        score += 2;
        continue;
      }

      const hasPartialMatch = Array.from(valueWords).some((valueWord) =>
        valueWord.includes(word) || word.includes(valueWord)
      );

      if (hasPartialMatch) {
        score += 1;
      }
    }

    return score;
  };

  const dedupeRepeatedWords = (value) => value
    .replace(/\b(\w+)(\s+\1\b)+/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const extractBestSentence = (value, words) => {
    const cleaned = dedupeRepeatedWords(cleanForOutput(value));
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (sentences.length === 0) {
      return trimChunk(cleaned || ANSWER_NOT_FOUND_MESSAGE, 200);
    }

    const rankedSentences = sentences
      .map((sentence, index) => ({
        sentence,
        index,
        score: scoreTextAgainstWords(sentence, words),
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index);

    return trimChunk(highlightKeywords(dedupeRepeatedWords(rankedSentences[0].sentence), words), 150);
  };

  const questionWords = expandQuery(
    normalize(question)
      .split(' ')
      .filter((word) => word.length > 2 && !FALLBACK_STOPWORDS.has(word))
  );

  console.log('Question words:', questionWords);

  const scoredChunks = chunks
    .map((chunk, index) => ({
      chunk,
      index,
      score: Math.max(scoreTextAgainstWords(chunk, questionWords), scoreChunk(chunk, questionWords)),
    }))
    .sort((a, b) => b.score - a.score);

  const bestScore = scoredChunks[0]?.score || 0;
  console.log('Best score:', bestScore);

  if (bestScore === 0) {
    const bestChunk = cleanForOutput(scoredChunks[0]?.chunk || chunks[0] || '');
    return {
      text: bestChunk
        ? `No exact match found. Showing closest relevant content:\n\n${trimChunk(bestChunk, 220)}`
        : ANSWER_NOT_FOUND_MESSAGE,
      chunkIndex: scoredChunks[0]?.index ?? 0,
    };
  }

  const topChunks = scoredChunks
    .filter((item) => item.score > 0)
    .slice(0, 2)
    .map((item) => cleanForOutput(item.chunk))
    .filter(Boolean);

  const collectedSentences = [];
  const seenSentences = new Set();

  for (const chunk of topChunks) {
    const sentences = dedupeRepeatedWords(chunk)
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      const normalizedSentence = sentence.toLowerCase();
      if (sentence.length < 20) {
        continue;
      }

      if (seenSentences.has(normalizedSentence)) {
        continue;
      }

      seenSentences.add(normalizedSentence);
      collectedSentences.push(sentence);
    }
  }

  if (collectedSentences.length === 0) {
    return {
      text: 'Relevant information not found in document.',
      chunkIndex: scoredChunks[0]?.index ?? null,
    };
  }

  const answerLine = extractBestSentence(collectedSentences.join(' '), questionWords);
  const supportingLines = collectedSentences
    .slice(0, 2)
    .map((sentence) => trimChunk(highlightKeywords(dedupeRepeatedWords(sentence), questionWords), 150))
    .filter(Boolean);

  if (!answerLine && supportingLines.length === 0) {
    return {
      text: 'Relevant information not found in document.',
      chunkIndex: scoredChunks[0]?.index ?? null,
    };
  }

  return {
    text: cleanAiOutput(`Answer:\n${answerLine}\n\nContext:\n${supportingLines.map((line) => `• ${line}`).join('\n')}`),
    chunkIndex: scoredChunks[0]?.index ?? null,
  };
}

async function answerDocumentQuestion(chunks, question) {
  const relevantMatches = retrieveRelevantChunkMatches(chunks, question);
  const relevantChunks = relevantMatches.map((item) => item.chunk);
  const bestMatch = relevantMatches[0];

  if (relevantChunks.length === 0) {
    const fallback = buildChatFallback(chunks, question);
    return {
      text: fallback.text,
      source: 'fallback',
      chunkIndex: typeof fallback.chunkIndex === 'number' ? fallback.chunkIndex + 1 : null,
    };
  }

  const aiSettings = await getAiSettings();
  if (!aiSettings.aiEnabled || aiSettings.fallbackOnly) {
    const fallback = buildChatFallback(chunks, question);
    return {
      text: fallback.text,
      source: 'fallback',
      chunkIndex: typeof fallback.chunkIndex === 'number' ? fallback.chunkIndex + 1 : null,
    };
  }

  try {
    console.log('Using AI');
    const context = relevantChunks.join('\n\n');
    const answer = await runPrompt(
      `Answer the question ONLY using the text below.\nIf the answer is not clearly present, say "Not found in document".\nUse clean wording and no extra filler.\n\nText:\n${context}\n\nQuestion:\n${question}\n`
    );

    const cleanedAnswer = cleanAiOutput(answer);
    if (!isUsableAiOutput(cleanedAnswer)) {
      const fallback = buildChatFallback(chunks, question);
      return {
        text: fallback.text,
        source: 'fallback',
        chunkIndex: typeof fallback.chunkIndex === 'number' ? fallback.chunkIndex + 1 : null,
      };
    }

    return {
      text: cleanedAnswer,
      source: 'ai',
      chunkIndex: bestMatch ? bestMatch.index + 1 : null,
    };
  } catch (error) {
    console.error('[Chat AI Fallback]:', error.message);
    console.log('Using fallback');
    const fallback = buildChatFallback(chunks, question);
    return {
      text: fallback.text,
      source: 'fallback',
      chunkIndex: typeof fallback.chunkIndex === 'number' ? fallback.chunkIndex + 1 : null,
    };
  }
}

exports.getLogs = async (req, res) => {
  try {
    const logs = await AILog.find({ userId: req.userId })
      .populate('documentId', 'originalName filename')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch AI logs.',
      error: error.message,
    });
  }
};

exports.summarize = async (req, res) => {
  try {
    const doc = await getDocumentForUser(req);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const { text } = await processDocument(doc);
    const normalizedText = normalizeText(text);

    console.log('OCR TEXT:', text);
    console.log('NORMALIZED TEXT:', normalizedText);
    console.log('IS MEANINGFUL:', isMeaningfulText(normalizedText));

    if (!normalizedText || !isMeaningfulText(normalizedText)) {
      return res.json({
        success: true,
        summary: 'No meaningful text found in document',
      });
    }

    const chunks = chunkDocumentText(normalizedText);
    if (chunks.length === 0) {
      return res.json({
        success: true,
        summary: 'No meaningful text found in document',
      });
    }

    const summaryResult = await generateSummaryRAG(doc._id, chunks);
    await recordFeatureUsage(req.userId, doc._id, 'summarize', normalizedText, summaryResult.text);
    await Document.updateOne(
      { _id: doc._id, userId: req.userId },
      {
        $set: {
          latestSummary: {
            text: summaryResult.text,
            source: summaryResult.source,
            updatedAt: new Date(),
          },
        },
      }
    );

    return res.json({
      success: true,
      summary: summaryResult.text,
      structuredSummary: summaryResult.structured,
    });
  } catch (error) {
    console.error('[Summarize Error]:', error.message, error.stack);
    return res.json({
      success: true,
      summary: 'No meaningful text found in document',
    });
  }
};

exports.chat = async (req, res) => {
  try {
    const doc = await getDocumentForUser(req);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const question = normalizeText(req.body.question || req.body.message || '');
    if (!question) {
      return res.status(400).json({ success: false, message: 'A question is required.' });
    }

    const { text, chunks } = await processDocument(doc);
    if (!text || chunks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No readable text was found in this document, even after OCR fallback. Please upload a clearer document.',
      });
    }

    const answerResult = await answerDocumentQuestion(chunks, question);

    await recordFeatureUsage(req.userId, doc._id, 'chat', question, answerResult.text);
    await Document.updateOne(
      { _id: doc._id, userId: req.userId },
      {
        $push: {
          chatHistory: {
            question,
            answer: answerResult.text,
            source: answerResult.source,
            chunkIndex: answerResult.chunkIndex,
            timestamp: new Date(),
          },
        },
      }
    );

    return res.json({
      success: true,
      answer: answerResult.text,
      source: answerResult.source,
      chunkIndex: answerResult.chunkIndex,
    });
  } catch (error) {
    console.error('[Chat Error]:', error.message, error.stack);
    return res.json({
      success: true,
      answer: ANSWER_NOT_FOUND_MESSAGE,
      source: 'fallback',
      chunkIndex: null,
    });
  }
};

exports.downloadSummary = async (req, res) => {
  try {
    const doc = await getDocumentForUser(req);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const summaryText = normalizeText(doc.latestSummary?.text || '');
    if (!summaryText) {
      return res.status(404).json({
        success: false,
        message: 'No stored summary found for this document.',
      });
    }

    const baseName = (doc.originalName || doc.filename || 'document')
      .replace(/\.[^.]+$/, '')
      .replace(/[^\w.-]+/g, '_');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}_summary.txt"`);
    return res.send(summaryText);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to download summary.',
      error: error.message,
    });
  }
};
