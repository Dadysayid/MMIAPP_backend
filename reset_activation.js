const mysql = require('mysql2/promise');
const crypto = require('crypto');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisation'
};

async function resetActivationToken(email) {
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier si l'utilisateur existe
    const [users] = await conn.execute('SELECT id, nom, prenom FROM utilisateurs WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log('❌ Utilisateur non trouvé avec cet email');
      await conn.end();
      return;
    }
    
    const user = users[0];
    console.log(`👤 Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);
    
    // Générer un nouveau token d'activation
    const newToken = crypto.randomBytes(32).toString('hex');
    
    // Mettre à jour le token d'activation
    await conn.execute(
      'UPDATE utilisateurs SET activation_token = ?, statut = "EN_ATTENTE", email_verifie = 0 WHERE id = ?',
      [newToken, user.id]
    );
    
    console.log(`✅ Nouveau token d'activation généré: ${newToken}`);
    console.log(`🔗 Nouveau lien d'activation: http://localhost:3000/activation/${newToken}`);
    
    await conn.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Utilisation: node reset_activation.js email@example.com
const email = process.argv[2];
if (!email) {
  console.log('💡 Usage: node reset_activation.js email@example.com');
  process.exit(1);
}

resetActivationToken(email);
