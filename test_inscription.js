const mysql = require('mysql2/promise');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisation'
};

function generateUniqueId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function testInscription() {
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Données de test
    const testUser = {
      nom: 'Test',
      prenom: 'User',
      email: 'test@example.com',
      mot_de_passe: 'password123',
      nif: '12345678',
      telephone: '12345678',
      adresse: 'Test Address'
    };
    
    // Vérifier si l'email existe déjà
    const [exists] = await conn.execute('SELECT id FROM utilisateurs WHERE email = ?', [testUser.email]);
    if (exists.length > 0) {
      console.log('❌ Email de test existe déjà, suppression...');
      await conn.execute('DELETE FROM utilisateurs WHERE email = ?', [testUser.email]);
    }
    
    // Générer un identifiant unique
    let uniqueId;
    let idExists = true;
    while (idExists) {
      uniqueId = generateUniqueId();
      const [idCheck] = await conn.execute('SELECT id FROM utilisateurs WHERE identifiant_unique = ?', [uniqueId]);
      idExists = idCheck.length > 0;
    }
    
    // Générer le hash du mot de passe
    const hash = await bcrypt.hash(testUser.mot_de_passe, 10);
    const activationToken = crypto.randomBytes(32).toString('hex');
    
    console.log('🔑 Token d\'activation généré:', activationToken);
    console.log('🆔 Identifiant unique généré:', uniqueId);
    
    // Insérer l'utilisateur
    await conn.execute(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, nif, telephone, adresse, role_id, statut, email_verifie, activation_token, identifiant_unique, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 10, 'EN_ATTENTE', 0, ?, ?, NOW())`,
      [testUser.nom, testUser.prenom, testUser.email, hash, testUser.nif, testUser.telephone, testUser.adresse, activationToken, uniqueId]
    );
    
    console.log('✅ Utilisateur de test créé avec succès');
    console.log('🔗 Lien d\'activation: http://localhost:3000/activation/' + activationToken);
    console.log('📧 Email: ' + testUser.email);
    console.log('🆔 Identifiant: ' + uniqueId);
    console.log('🔑 Mot de passe: ' + testUser.mot_de_passe);
    
    await conn.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testInscription();
