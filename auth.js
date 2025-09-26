const jwt = require('jsonwebtoken');

const JWT_SECRET = 'seccentral2025'; // Ta clé secrète, à garder confidentielle

// Fonction pour générer un token JWT à partir d'un utilisateur
function generateToken(userPayload) {
  // Par exemple userPayload = { id, email, role_id, nom, prenom, statut, email_verifie }
  return jwt.sign(userPayload, JWT_SECRET, { expiresIn: '2h' });
}

// Middleware d'authentification JWT pour protéger les routes
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // On attache les infos utilisateur à la requête
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

module.exports = {
  generateToken,
  authMiddleware,
};
