// Script de test pour vérifier la connexion à la base de données et la configuration SMTP
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config();

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisation'
};

async function testDatabaseConnection() {
  console.log('🔍 Test de connexion à la base de données...');
  try {
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion à la base de données réussie');
    
    // Tester une requête simple
    const [rows] = await conn.execute('SELECT 1 as test');
    console.log('✅ Requête de test réussie:', rows);
    
    // Vérifier la table utilisateurs
    const [tables] = await conn.execute('SHOW TABLES LIKE "utilisateurs"');
    if (tables.length > 0) {
      console.log('✅ Table utilisateurs trouvée');
      
      // Vérifier la structure de la table
      const [columns] = await conn.execute('DESCRIBE utilisateurs');
      console.log('✅ Structure de la table utilisateurs:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('❌ Table utilisateurs non trouvée');
    }
    
    await conn.end();
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
  }
}

async function testSMTPConfiguration() {
  console.log('\n🔍 Test de la configuration SMTP...');
  
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'test@example.com',
      pass: process.env.SMTP_PASS || 'testpassword'
    }
  };
  
  console.log('Configuration SMTP:', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    user: smtpConfig.auth.user,
    pass: smtpConfig.auth.pass ? '***' : 'Non défini'
  });
  
  try {
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Vérifier la configuration
    await transporter.verify();
    console.log('✅ Configuration SMTP valide');
    
    // Test d'envoi (optionnel)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log('📧 Test d\'envoi d\'email...');
      const info = await transporter.sendMail({
        from: smtpConfig.auth.user,
        to: smtpConfig.auth.user,
        subject: 'Test de configuration SMTP',
        text: 'Ceci est un test de configuration SMTP'
      });
      console.log('✅ Email de test envoyé:', info.messageId);
    } else {
      console.log('⚠️ Variables SMTP non configurées, test d\'envoi ignoré');
    }
  } catch (error) {
    console.error('❌ Erreur de configuration SMTP:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Démarrage des tests de configuration...\n');
  
  await testDatabaseConnection();
  await testSMTPConfiguration();
  
  console.log('\n✨ Tests terminés');
}

runTests().catch(console.error);







