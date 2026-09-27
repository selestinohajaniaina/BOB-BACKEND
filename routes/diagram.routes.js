const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const diagrams = require('../controllers/diagram.controller');

const router = express.Router({ mergeParams: true });
router.use(authenticate);
router.get('/', diagrams.list);
router.post('/', diagrams.create);
router.get('/:diagramId', diagrams.getOne);
router.delete('/:diagramId', diagrams.remove);
module.exports = router;
