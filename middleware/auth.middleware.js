const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  if (!authorization) {
    return res.status(401).json({ message: 'Token d’authentification requis' });
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || extra) {
    return res.status(401).json({ message: 'Format du token invalide. Utilisez Bearer <token>' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.userId) {
      return res.status(401).json({ message: 'Token invalide ou expiré' });
    }
    req.auth = { userId: payload.userId };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}

module.exports = authenticate;
