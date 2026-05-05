const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  summarize,
  chat,
  getLogs,
  downloadSummary,
} = require('../controllers/aiController');

// GET AI Logs (read only)
router.get('/logs', auth, getLogs);

router.post('/summarize', auth, summarize);
router.post('/chat', auth, chat);

// Parameterized versions for frontend compatibility
router.post('/:id/summarize', auth, summarize);
router.post('/:id/chat', auth, chat);
router.get('/:id/summary/download', auth, downloadSummary);

module.exports = router;
