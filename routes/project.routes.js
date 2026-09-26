const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const projects = require('../controllers/project.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', projects.list);
router.get('/:id', projects.getOne);
router.post('/', projects.create);
router.patch('/:id', projects.update);
router.delete('/:id', projects.remove);
module.exports = router;
