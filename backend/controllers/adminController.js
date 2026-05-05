const mongoose = require('mongoose');
const User = require('../models/User');
const Document = require('../models/Document');
const AdminQueryLog = require('../models/AdminQueryLog');
const { createClient } = require('@supabase/supabase-js');
const { getAiSettings, setAiSettings } = require('../services/configService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalDocs = await Document.countDocuments();
    const ocrUsageCount = await Document.countDocuments({ 'textExtraction.usedOcr': true });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });
    const uploadsToday = await Document.countDocuments({ createdAt: { $gte: today } });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: weekAgo } });

    // Total storage (sum of all document sizes)
    const storageResult = await Document.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    const totalStorage = storageResult[0]?.totalSize || 0;

    const uploadActivity = await Document.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // AI feature usage counts
    const aiUsage = await Document.aggregate([
      { $unwind: '$aiFeatures' },
      { $group: { _id: '$aiFeatures.feature', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const sourceUsageDocs = await Document.find(
      {},
      {
        latestSummary: 1,
        chatHistory: 1,
      }
    ).lean();

    const responseSourceUsage = sourceUsageDocs.reduce((totals, doc) => {
      const summarySource = doc.latestSummary?.source;
      if (summarySource === 'ai') totals.ai += 1;
      if (summarySource === 'fallback') totals.fallback += 1;

      for (const item of doc.chatHistory || []) {
        if (item.source === 'ai') totals.ai += 1;
        if (item.source === 'fallback') totals.fallback += 1;
      }

      return totals;
    }, { ai: 0, fallback: 0 });

    const mostActiveUsers = await Document.aggregate([
      { $group: { _id: '$userId', docCount: { $sum: 1 } } },
      { $sort: { docCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', email: '$user.email', docCount: 1 } }
    ]);

    const recentUsers = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalDocs,
        ocrUsageCount,
        responseSourceUsage,
        newUsersToday,
        uploadsToday,
        newUsersThisWeek,
        totalStorage,
        uploadActivity,
        aiUsage,
        mostActiveUsers,
        recentUsers,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.toggleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Document.deleteMany({ userId: req.params.id });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: documents });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Admin delete any document
exports.adminDeleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    // Delete from Supabase storage
    if (document.storagePath) {
      const { error } = await supabase.storage
        .from('documents')
        .remove([document.storagePath]);
      if (error) console.error('Supabase delete error:', error.message);
    }

    await document.deleteOne();
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.handleAdminAiQuery = async (req, res) => {
  try {
    console.log('Incoming query:', req.body);

    const query = req.body?.query?.toLowerCase().trim() || '';

    if (!query) {
      return res.status(400).json({ answer: 'Query is required' });
    }

    let answer = 'Sorry, I could not understand the query.';

    if (query.includes('agent')) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const count = await User.countDocuments({
        role: 'user',
        createdAt: { $gte: weekAgo },
      });
      answer = `${count} agents joined this week`;

    } else if (query.includes('user')) {
      const count = await User.countDocuments({ role: 'user' });
      answer = `Total users: ${count}`;

    } else if (query.includes('document')) {
      const count = await Document.countDocuments();
      answer = `Total documents: ${count}`;

    } else if (query.includes('ocr')) {
      const count = await Document.countDocuments({
        'textExtraction.usedOcr': true,
      });
      answer = `OCR used count: ${count}`;
    }

    try {
      await AdminQueryLog.create({
        query,
        response: answer,
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.error('LOG ERROR:', logErr);
    }

    return res.json({ answer });

  } catch (err) {
    console.error('ADMIN QUERY ERROR:', err);
    return res.json({ answer: 'System temporarily unavailable' });
  }
};

exports.getAdminMetricsSummary = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalDocuments = await Document.countDocuments();
    const ocrUsedCount = await Document.countDocuments({
      'textExtraction.usedOcr': true,
    });

    const sourceUsageDocs = await Document.find(
      {},
      {
        latestSummary: 1,
        chatHistory: 1,
      }
    ).lean();

    const usageCounts = sourceUsageDocs.reduce((totals, doc) => {
      if (doc.latestSummary?.source === 'ai') {
        totals.aiUsageCount += 1;
      }

      if (doc.latestSummary?.source === 'fallback') {
        totals.fallbackUsageCount += 1;
      }

      for (const entry of doc.chatHistory || []) {
        if (entry.source === 'ai') {
          totals.aiUsageCount += 1;
        }

        if (entry.source === 'fallback') {
          totals.fallbackUsageCount += 1;
        }
      }

      return totals;
    }, {
      aiUsageCount: 0,
      fallbackUsageCount: 0,
    });

    return res.json({
      totalUsers,
      totalDocuments,
      ocrUsedCount,
      aiUsageCount: usageCounts.aiUsageCount,
      fallbackUsageCount: usageCounts.fallbackUsageCount,
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch admin metrics summary.',
      error: err.message,
    });
  }
};

exports.getAiFeatureToggle = async (req, res) => {
  try {
    const settings = await getAiSettings();
    return res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch AI feature toggle settings.',
      error: err.message,
    });
  }
};

exports.updateAiFeatureToggle = async (req, res) => {
  try {
    const settings = await setAiSettings({
      aiEnabled: req.body.aiEnabled,
      fallbackOnly: req.body.fallbackOnly,
    });

    return res.json({
      success: true,
      message: 'AI feature toggle updated successfully.',
      data: settings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update AI feature toggle settings.',
      error: err.message,
    });
  }
};
