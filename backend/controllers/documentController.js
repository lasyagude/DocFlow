const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const {
  buildDocumentRagData,
  detectDocumentType,
  isSupportedDocumentType,
  normalizeText,
} = require('../services/documentAiService');
const { isValidObjectId, sanitizeFileName } = require('../utils/validation');

const SAFE_DOCUMENT_FIELDS = [
  'originalName',
  'filename',
  'fileType',
  'mimeType',
  'size',
  'url',
  'operation',
  'aiFeatures',
  'textExtraction',
  'latestSummary',
  'createdAt',
  'expiresAt',
].join(' ');

function sanitizeStorageName(value = '') {
  return sanitizeFileName(value, 'file');
}

function safeUnlink(filePath) {
  if (!filePath) {
    return;
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('[Upload] Failed to remove temp file:', error.message);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    const documentType = detectDocumentType({
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    if (!isSupportedDocumentType({
      mimeType: file.mimetype,
      originalName: file.originalname,
    })) {
      safeUnlink(file.path);
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type. Please upload PDF, DOCX, TXT, JPG, PNG, XLSX, or PPTX.',
      });
    }

    const fileName = `${req.userId}_${Date.now()}_${sanitizeStorageName(file.originalname)}`;

    const fileBuffer = fs.readFileSync(file.path);
    let ragData = {
      processedText: '',
      textChunks: [],
      textExtraction: {
        status: 'failed',
        usedOcr: false,
        updatedAt: new Date(),
      },
    };

    try {
      ragData = await buildDocumentRagData(fileBuffer, {
        mimeType: file.mimetype,
        originalName: file.originalname,
        documentId: `upload:${req.userId}`,
      });
    } catch (extractError) {
      console.error('[Upload] Document preprocessing failed:', extractError.message);
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
      });

    if (error) {
      safeUnlink(file.path);
      console.error('[Upload] Supabase upload failed:', error.message);
      return res.status(502).json({ message: 'File storage failed' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Save metadata to MongoDB
    const document = new Document({
      userId: req.userId,
      originalName: file.originalname,
      filename: file.originalname,
      fileType: documentType,
      fileExtension: path.extname(file.originalname || '').toLowerCase(),
      mimeType: file.mimetype,
      size: file.size,
      processedText: ragData.processedText,
      textChunks: ragData.textChunks,
      textExtraction: ragData.textExtraction,
      url: urlData.publicUrl,
      storagePath: fileName,
    });

    await document.save();

    // Delete temp file
    safeUnlink(file.path);

    // Log activity
    await new ActivityLog({
      userId: req.userId,
      action: 'DOCUMENT_UPLOAD',
      details: { documentId: document._id, fileName: file.originalname }
    }).save();

    const safeDocument = document.toObject();
    delete safeDocument.processedText;
    delete safeDocument.textChunks;
    delete safeDocument.chatHistory;
    delete safeDocument.storagePath;

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      fileType: documentType,
      data: safeDocument,
    });
  } catch (error) {
    safeUnlink(req.file?.path);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all documents for user
exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.userId })
      .select(SAFE_DOCUMENT_FIELDS)
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single document
exports.getDocumentById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const document = await Document.findOne({ _id: req.params.id, userId: req.userId })
      .select(SAFE_DOCUMENT_FIELDS);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    res.status(200).json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ FIX: Delete from Supabase storage too, not just MongoDB
exports.deleteDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Delete from Supabase storage
    if (document.storagePath) {
      const { error } = await supabase.storage
        .from('documents')
        .remove([document.storagePath]);
      if (error) console.error('Supabase delete error:', error.message);
    }

    // Delete from MongoDB
    await document.deleteOne();

    // Log activity
    await new ActivityLog({
      userId: req.userId,
      action: 'DOCUMENT_DELETE',
      details: { documentId: req.params.id }
    }).save();

    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.searchDocuments = async (req, res) => {
  try {
    const query = normalizeText(req.body.query || '').slice(0, 200);
    if (!query || query.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query is required.' });
    }

    const searchTerms = Array.from(
      new Set(
        query
          .toLowerCase()
          .split(/\s+/)
          .map((term) => term.trim())
          .filter((term) => term.length > 1)
      )
    );

    const documents = await Document.find({ userId: req.userId })
      .select('originalName filename processedText textChunks createdAt')
      .sort({ createdAt: -1 });

    const matches = documents
      .map((document) => {
        const chunks = Array.isArray(document.textChunks) ? document.textChunks : [];
        const matchingChunk = chunks.find((chunk) => {
          const chunkLower = chunk.toLowerCase();
          return searchTerms.some((term) => chunkLower.includes(term));
        });

        const processedText = normalizeText(document.processedText || '');
        const processedLower = processedText.toLowerCase();
        const hasProcessedMatch = searchTerms.some((term) => processedLower.includes(term));

        if (!matchingChunk && !hasProcessedMatch) {
          return null;
        }

        let snippet = matchingChunk || processedText;
        if (snippet.length > 220) {
          snippet = `${snippet.slice(0, 217).trim()}...`;
        }

        return {
          id: document._id,
          documentName: document.originalName || document.filename,
          snippet,
        };
      })
      .filter(Boolean);

    return res.json({ success: true, data: matches });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
