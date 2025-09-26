const jwt = require('jsonwebtoken');

const JWT_SECRET = 'seccentral2025'; // Remplace par ta vraie clé secrète

const userPayload = {
  id: 10,
  email: 'seccentral@mmi.gov.mr',
  role_id: 2,
  nom: 'Sec',
  prenom: 'Central',
  statut: 'ACTIF',
  email_verifie: 1 // Assure-toi que l’email est vérifié
};

function generateToken() {
  return jwt.sign(userPayload, JWT_SECRET, { expiresIn: '2h' });
}

const token = generateToken();
console.log('Token JWT généré :\n', token);
