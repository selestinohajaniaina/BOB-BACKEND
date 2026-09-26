const express = require('express');
const { register, login, me, updateProfile, changePassword } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, updateProfile);
router.patch('/me/password', authenticate, changePassword);

module.exports = router;
