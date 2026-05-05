const mongoose = require('mongoose');

const adminQueryLogSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true,
  },
  response: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.AdminQueryLog || mongoose.model('AdminQueryLog', adminQueryLogSchema);
