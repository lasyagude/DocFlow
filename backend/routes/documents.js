const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('./uploadConfig');
const {
  uploadDocument,
  getDocuments,
  searchDocuments,
  deleteDocument
} = require('../controllers/documentController');

router.post('/upload', auth, upload.single('file'), uploadDocument);
router.post('/', auth, upload.single('file'), uploadDocument);
router.post('/search', auth, searchDocuments);
router.get('/', auth, getDocuments);
router.delete('/:id', auth, deleteDocument);

module.exports = router;
