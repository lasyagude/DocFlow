const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
  },
  fileType: {
    type: String,
  },
  fileExtension: {
    type: String,
    default: '',
  },
  mimeType: {
    type: String,
  },
  size: {
    type: Number,
  },
  processedText: {
    type: String,
    default: '',
  },
  textChunks: {
    type: [String],
    default: [],
  },
  textExtraction: {
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    usedOcr: {
      type: Boolean,
      default: false,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  url: {
    type: String,
    required: true
  },
  storagePath: {
    type: String,
  },
  operation: {
    type: String,
    enum: ['upload', 'compress', 'merge', 'split', 'convert', 'password-protect', 'ocr', 'summarize', 'chat', 'translate', 'compare', 'entity-extraction', 'type-detection'],
    default: 'upload'
  },
  aiFeatures: [
    {
      feature: { type: String, enum: ['summarize', 'entities', 'detect-type', 'translate', 'chat', 'fraud', 'ocr'] },
      usedAt: { type: Date, default: Date.now }
    }
  ],
  chatHistory: [
    {
      question: String,
      answer: String,
      source: String,
      chunkIndex: Number,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  latestSummary: {
    text: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      default: '',
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 24 * 60 * 60 * 1000)
  }
});

module.exports = mongoose.models.Document || mongoose.model('Document', documentSchema);
