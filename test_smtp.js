require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('=== TEST CONFIGURATION SMTP ===');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***CONFIGURÉ***' : 'NON CONFIGURÉ');

// Test de connexion SMTP
async function testSMTP() {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'diamamoudoumoussa01@gmail.com',
        pass: process.env.SMTP_PASS || 'crqe msdc wgnb vath'
      }
    });

    console.log('\n=== TEST DE CONNEXION SMTP ===');
    const result = await transporter.verify();
    console.log('✅ Connexion SMTP réussie:', result);
    
    // Test d'envoi d'email
    console.log('\n=== TEST D\'ENVOI D\'EMAIL ===');
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER || 'diamamoudoumoussa01@gmail.com',
      to: 'test@example.com',
      subject: 'Test SMTP',
      text: 'Ceci est un test de configuration SMTP'
    });
    
    console.log('✅ Email de test envoyé:', info.messageId);
    
  } catch (error) {
    console.error('❌ Erreur SMTP:', error.message);
    console.error('Détails:', error);
  }
}

testSMTP();





