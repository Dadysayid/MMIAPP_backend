const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const JWT_SECRET = 'seccentral2025';
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testAuthentification() {
  try {
    console.log('🔐 Test de l\'authentification JWT...\n');
    
    // 1. Vérifier la cohérence des secrets JWT
    console.log('🔑 1. Vérification des secrets JWT :');
    console.log(`   ✅ JWT_SECRET: ${JWT_SECRET}`);
    console.log(`   ✅ Longueur: ${JWT_SECRET.length} caractères`);
    console.log(`   ✅ Type: ${typeof JWT_SECRET}`);
    
    // 2. Tester la génération de token
    console.log('\n🎫 2. Test de génération de token :');
    
    const userPayload = {
      id: 999,
      email: 'test@test.com',
      role_id: 9, // Ministre
      nom: 'Test',
      prenom: 'Utilisateur'
    };
    
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '2h' });
    console.log(`   ✅ Token généré: ${token.substring(0, 50)}...`);
    console.log(`   ✅ Longueur token: ${token.length} caractères`);
    
    // 3. Tester la vérification de token
    console.log('\n🔍 3. Test de vérification de token :');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`   ✅ Token vérifié avec succès`);
      console.log(`   👤 Utilisateur ID: ${decoded.id}`);
      console.log(`   🎭 Rôle: ${decoded.role_id}`);
      console.log(`   📧 Email: ${decoded.email}`);
      console.log(`   ⏰ Expiration: ${new Date(decoded.exp * 1000)}`);
      console.log(`   ⏰ Maintenant: ${new Date()}`);
      
      // Vérifier si le token est expiré
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp > now) {
        console.log(`   ✅ Token valide (${decoded.exp - now} secondes restantes)`);
      } else {
        console.log(`   ❌ Token expiré`);
      }
      
    } catch (verifyError) {
      console.log(`   ❌ Erreur vérification: ${verifyError.message}`);
    }
    
    // 4. Tester avec un token expiré
    console.log('\n⏰ 4. Test avec token expiré :');
    
    const expiredToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1s' });
    console.log(`   📝 Token expiré créé`);
    
    // Attendre 2 secondes pour que le token expire
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const decodedExpired = jwt.verify(expiredToken, JWT_SECRET);
      console.log(`   ❌ Token devrait être expiré mais est encore valide`);
    } catch (expiredError) {
      console.log(`   ✅ Token expiré correctement: ${expiredError.message}`);
    }
    
    // 5. Vérifier la base de données
    console.log('\n🗄️ 5. Vérification de la base de données :');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier les utilisateurs avec rôle Ministre
    const [ministres] = await conn.execute(`
      SELECT id, email, nom, prenom, role_id, statut
      FROM utilisateurs
      WHERE role_id = 9
      ORDER BY id
    `);
    
    if (ministres.length > 0) {
      console.log(`   ✅ ${ministres.length} utilisateur(s) Ministre trouvé(s):`);
      ministres.forEach(m => {
        console.log(`      👤 ID: ${m.id} - ${m.prenom} ${m.nom} (${m.email}) - Statut: ${m.statut}`);
      });
    } else {
      console.log(`   ❌ Aucun utilisateur Ministre trouvé`);
    }
    
    // Vérifier la demande 14
    const [demande14] = await conn.execute(`
      SELECT id, reference, type, statut
      FROM demandes
      WHERE id = 14
    `);
    
    if (demande14.length > 0) {
      const d = demande14[0];
      console.log(`   📋 Demande 14: ${d.reference} - ${d.type} - ${d.statut}`);
      
      if (d.statut === 'TRANSMISE_AU_MINISTRE') {
        console.log(`   ✅ Statut correct pour prévisualisation`);
      } else {
        console.log(`   ❌ Statut incorrect: ${d.statut}`);
        console.log(`   💡 Doit être 'TRANSMISE_AU_MINISTRE'`);
      }
    } else {
      console.log(`   ❌ Demande 14 non trouvée`);
    }
    
    await conn.end();
    
    // 6. Recommandations
    console.log('\n💡 6. Recommandations :');
    console.log('   🔧 Redémarrez le serveur backend après la correction du JWT_SECRET');
    console.log('   🔧 Vérifiez que tous les fichiers utilisent le même secret');
    console.log('   🔧 Reconnectez-vous pour obtenir un nouveau token valide');
    console.log('   🔧 Vérifiez que l\'utilisateur a le rôle Ministre (role_id = 9)');
    
    console.log('\n✅ Test d\'authentification terminé !');
    console.log('\n🚀 Actions à effectuer :');
    console.log('   1. Redémarrez le serveur backend');
    console.log('   2. Reconnectez-vous en tant que Ministre');
    console.log('   3. Testez la prévisualisation PDF');
    console.log('   4. Vérifiez que l\'erreur de token a disparu');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testAuthentification();



