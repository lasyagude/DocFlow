const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  feature: {
    type: String,
    enum: ['summarize', 'extract', 'detect', 'translate', 'chat', 'fraud', 'entities', 'detect-type', 'ocr'],
    required: true
  },
  inputData: {
    type: String,
    required: false
  },
  outputData: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AILog', aiLogSchema);

