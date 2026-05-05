const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getStats,
  getUsers,
  toggleUser,
  deleteUser,
  getAllDocuments,
  adminDeleteDocument,
  handleAdminAiQuery,
  getAiFeatureToggle,
  updateAiFeatureToggle,
} = require('../controllers/adminController');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

router.get('/stats', auth, adminOnly, getStats);
router.get('/users', auth, adminOnly, getUsers);
router.patch('/users/:id/toggle', auth, adminOnly, toggleUser);
router.delete('/users/:id', auth, adminOnly, deleteUser);
router.get('/documents', auth, adminOnly, getAllDocuments);
router.delete('/documents/:id', auth, adminOnly, adminDeleteDocument);
router.get('/ai-settings', auth, adminOnly, getAiFeatureToggle);
router.patch('/ai-settings', auth, adminOnly, updateAiFeatureToggle);
router.post('/query', handleAdminAiQuery);
router.post('/ai-query', auth, adminOnly, handleAdminAiQuery);

module.exports = router;
