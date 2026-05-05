const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('./uploadConfig');
const { uploadDocument, getDocumentById } = require('../controllers/documentController');
const { compress, merge, split } = require('../controllers/pdfController');

router.post('/upload', auth, upload.single('file'), uploadDocument);
router.post('/compress', auth, upload.single('file'), compress);
router.post('/merge', auth, upload.array('files', 10), merge);
router.post('/split', auth, upload.single('file'), split);
router.get('/:id', auth, getDocumentById);

module.exports = router;
