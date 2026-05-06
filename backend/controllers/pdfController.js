const { PDFDocument } = require('pdf-lib');
const Document = require('../models/Document');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sanitizeFileName } = require('../utils/validation');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function sanitizeStorageName(value = '') {
  return sanitizeFileName(value, 'file.pdf');
}

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error('[PDF] Failed to remove temp file:', error.message);
  }
}

function isPdfUpload(file) {
  return file?.mimetype === 'application/pdf'
    && path.extname(file.originalname || '').toLowerCase() === '.pdf';
}

// Helper: fetch PDF buffer from URL
async function fetchPdfBuffer(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(response.data);
}

// Helper: upload result to Supabase and save to MongoDB
async function uploadResult(buffer, originalName, userId, operation) {
  const fileName = `${userId}_${Date.now()}_${operation}_${sanitizeStorageName(originalName)}`;
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(fileName, buffer, { contentType: 'application/pdf' });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  const document = new Document({
    userId,
    originalName: `${operation}_${originalName}`,
    filename: `${operation}_${originalName}`,
    mimeType: 'application/pdf',
    size: buffer.length,
    url: urlData.publicUrl,
    storagePath: fileName,
    operation,
  });

  await document.save();
  return document;
}

// Compress PDF — reduces by removing metadata and optimizing
exports.compress = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (!isPdfUpload(req.file)) {
      safeUnlink(req.file.path);
      return res.status(400).json({ message: 'Only PDF files are supported for this operation' });
    }

    const inputBuffer = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });

    // Remove metadata to reduce size
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('DocFlow');
    pdfDoc.setCreator('DocFlow');

    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const compressedBuffer = Buffer.from(compressedBytes);
    const document = await uploadResult(compressedBuffer, req.file.originalname, req.userId, 'compress');

    // Clean up temp file
    safeUnlink(req.file.path);

    const savings = ((1 - compressedBuffer.length / inputBuffer.length) * 100).toFixed(1);

    res.json({
      message: 'PDF compressed successfully',
      document,
      originalSize: inputBuffer.length,
      compressedSize: compressedBuffer.length,
      savings: `${savings}%`,
    });
  } catch (err) {
    safeUnlink(req.file?.path);
    res.status(500).json({ message: 'Compression failed' });
  }
};

// Merge multiple PDFs
exports.merge = async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ message: 'Please upload at least 2 PDF files' });
    }
    if (!req.files.every(isPdfUpload)) {
      req.files.forEach((file) => safeUnlink(file.path));
      return res.status(400).json({ message: 'Only PDF files are supported for this operation' });
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const fileBuffer = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    const mergedBuffer = Buffer.from(mergedBytes);
    const document = await uploadResult(mergedBuffer, 'merged.pdf', req.userId, 'merge');

    // Clean up temp files
    req.files.forEach((file) => safeUnlink(file.path));

    res.json({
      message: 'PDFs merged successfully',
      document,
      pageCount: mergedPdf.getPageCount(),
      filesCount: req.files.length,
    });
  } catch (err) {
    if (req.files) req.files.forEach((file) => safeUnlink(file.path));
    res.status(500).json({ message: 'Merge failed' });
  }
};

// Split PDF by page ranges
exports.split = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (!isPdfUpload(req.file)) {
      safeUnlink(req.file.path);
      return res.status(400).json({ message: 'Only PDF files are supported for this operation' });
    }

    const { startPage = 1, endPage } = req.body;
    const inputBuffer = fs.readFileSync(req.file.path);
    const sourcePdf = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    const start = Math.max(1, parseInt(startPage)) - 1; // 0-indexed
    const end = Math.min(totalPages, parseInt(endPage || totalPages)) - 1;

    if (start > end || start >= totalPages) {
      safeUnlink(req.file.path);
      return res.status(400).json({ message: `Invalid page range. PDF has ${totalPages} pages.` });
    }

    const newPdf = await PDFDocument.create();
    const pageIndices = [];
    for (let i = start; i <= end; i++) pageIndices.push(i);
    
    const pages = await newPdf.copyPages(sourcePdf, pageIndices);
    pages.forEach((page) => newPdf.addPage(page));

    const splitBytes = await newPdf.save();
    const splitBuffer = Buffer.from(splitBytes);
    const document = await uploadResult(splitBuffer, req.file.originalname, req.userId, 'split');

    safeUnlink(req.file.path);

    res.json({
      message: 'PDF split successfully',
      document,
      originalPages: totalPages,
      extractedPages: pageIndices.length,
      range: `${start + 1}-${end + 1}`,
    });
  } catch (err) {
    safeUnlink(req.file?.path);
    res.status(500).json({ message: 'Split failed' });
  }
};
