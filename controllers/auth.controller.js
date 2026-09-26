const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UniqueConstraintError } = require('sequelize');
const User = require('../models/User');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

async function register(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Le nom, l’email et le mot de passe sont obligatoires' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: 'Adresse email invalide' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Un compte existe déjà avec cette adresse email' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: passwordHash });

    return res.status(201).json({ message: 'Compte créé avec succès', user: publicUser(user) });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({ message: 'Un compte existe déjà avec cette adresse email' });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'L’email et le mot de passe sont obligatoires' });
    }

    const user = await User.scope('withPassword').findOne({ where: { email } });
    const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !passwordMatches) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });

    return res.json({ message: 'Connexion réussie', token, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.auth.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, me };
