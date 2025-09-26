const fs = require('fs');
const path = require('path');

// Lire le fichier server.js
const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Corrections à apporter
const corrections = [
  // Ligne 316 - Supprimer registre_commerce de la destructuration
  {
    from: 'const { nom, prenom, email, mot_de_passe, registre_commerce, nif, telephone, adresse } = req.body;',
    to: 'const { nom, prenom, email, mot_de_passe, nif, telephone, adresse } = req.body;'
  },
  // Ligne 330 - Supprimer registre_commerce de l'INSERT
  {
    from: '`INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, registre_commerce, nif, telephone, adresse, role_id, statut, email_verifie, activation_token, created_at)',
    to: '`INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, nif, telephone, adresse, role_id, statut, email_verifie, activation_token, created_at)'
  },
  // Ligne 332 - Supprimer registre_commerce des paramètres
  {
    from: '[nom, prenom, email, hash, registre_commerce, nif, telephone, adresse, activationToken]',
    to: '[nom, prenom, email, hash, nif, telephone, adresse, activationToken]'
  },
  // Ligne 395 - Supprimer registre_commerce de userToSend
  {
    from: 'registre_commerce: user.registre_commerce,',
    to: ''
  },
  // Lignes avec u.registre_commerce dans les SELECT
  {
    from: 'u.nom, u.prenom, u.email, u.telephone, u.registre_commerce',
    to: 'u.nom, u.prenom, u.email, u.telephone'
  },
  {
    from: 'u.nom, u.prenom, u.email, u.telephone, u.registre_commerce, u.nif, u.adresse',
    to: 'u.nom, u.prenom, u.email, u.telephone, u.nif, u.adresse'
  },
  {
    from: 'u.nom, u.prenom, u.email, u.registre_commerce',
    to: 'u.nom, u.prenom, u.email'
  },
  // Ligne avec registre_commerce dans le mapping
  {
    from: 'registre_commerce: row.registre_commerce,',
    to: ''
  }
];

// Appliquer les corrections
corrections.forEach(correction => {
  content = content.replace(correction.from, correction.to);
});

// Écrire le fichier corrigé
fs.writeFileSync(serverPath, content, 'utf8');

console.log('✅ Toutes les références à registre_commerce ont été supprimées du fichier server.js');
