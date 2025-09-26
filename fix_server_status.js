const fs = require('fs');
const path = require('path');

// Chemin vers le fichier server.js
const serverPath = path.join(__dirname, 'server.js');

// Lire le fichier
let content = fs.readFileSync(serverPath, 'utf8');

// Remplacer toutes les occurrences de 'ACTIF' par 'actif' dans les vérifications de statut
const oldPattern = /user\.statut !== 'ACTIF'/g;
const newPattern = "user.statut !== 'actif'";

// Compter les remplacements
const matches = content.match(oldPattern);
const count = matches ? matches.length : 0;

// Effectuer le remplacement
content = content.replace(oldPattern, newPattern);

// Écrire le fichier modifié
fs.writeFileSync(serverPath, content, 'utf8');

console.log(`✅ ${count} occurrences de 'ACTIF' remplacées par 'actif' dans server.js`);
console.log('🔄 Redémarrez votre serveur pour appliquer les changements');






