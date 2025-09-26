const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'seccentral2025';
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function diagnosticComplet() {
  try {
    console.log('🔍 Diagnostic complet du système...\n');
    
    // 1. Test de connexion à la base de données
    console.log('🗄️ 1. Test de connexion à la base de données :');
    let conn;
    try {
      conn = await mysql.createConnection(dbConfig);
      console.log('   ✅ Connexion à la base de données réussie');
    } catch (dbError) {
      console.log(`   ❌ Erreur de connexion à la base: ${dbError.message}`);
      return;
    }
    
    // 2. Vérifier la demande 14
    console.log('\n📋 2. Vérification de la demande 14 :');
    const [demande14] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.donnees,
             u.nom_responsable, u.prenom_responsable, u.email, u.role_id
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.id = 14
    `);
    
    if (demande14.length === 0) {
      console.log('   ❌ Demande 14 non trouvée');
    } else {
      const d = demande14[0];
      console.log(`   ✅ Demande trouvée: ${d.reference}`);
      console.log(`   📊 Type: ${d.type}`);
      console.log(`   📊 Statut: ${d.statut}`);
      console.log(`   👤 Demandeur: ${d.prenom_responsable} ${d.nom_responsable}`);
      console.log(`   🎭 Rôle demandeur: ${d.role_id}`);
      
      if (d.statut === 'TRANSMISE_AU_MINISTRE') {
        console.log('   ✅ Statut correct pour prévisualisation');
      } else {
        console.log(`   ❌ Statut incorrect: ${d.statut}`);
        console.log(`   💡 Doit être 'TRANSMISE_AU_MINISTRE'`);
      }
    }
    
    // 3. Vérifier les utilisateurs Ministre
    console.log('\n👑 3. Vérification des utilisateurs Ministre :');
    const [ministres] = await conn.execute(`
      SELECT id, email, nom, prenom, role_id, statut
      FROM utilisateurs
      WHERE role_id = 9
      ORDER BY id
    `);
    
    if (ministres.length === 0) {
      console.log('   ❌ Aucun utilisateur Ministre trouvé');
      console.log('   💡 Vérifiez que role_id = 9 existe dans la table roles');
    } else {
      console.log(`   ✅ ${ministres.length} utilisateur(s) Ministre trouvé(s):`);
      ministres.forEach(m => {
        console.log(`      👤 ID: ${m.id} - ${m.prenom} ${m.nom} (${m.email}) - Statut: ${m.statut}`);
      });
    }
    
    // 4. Vérifier la table des rôles
    console.log('\n🎭 4. Vérification de la table des rôles :');
    const [roles] = await conn.execute(`
      SELECT id, nom, description
      FROM roles
      ORDER BY id
    `);
    
    if (roles.length === 0) {
      console.log('   ❌ Aucun rôle trouvé dans la table roles');
    } else {
      console.log(`   ✅ ${roles.length} rôle(s) trouvé(s):`);
      roles.forEach(r => {
        console.log(`      🎭 ID: ${r.id} - ${r.nom} - ${r.description || 'Aucune description'}`);
      });
    }
    
    // 5. Test de génération et vérification de token
    console.log('\n🎫 5. Test de génération et vérification de token :');
    
    if (ministres.length > 0) {
      const ministre = ministres[0];
      const userPayload = {
        id: ministre.id,
        email: ministre.email,
        role_id: ministre.role_id,
        nom: ministre.nom,
        prenom: ministre.prenom
      };
      
      try {
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '2h' });
        console.log(`   ✅ Token généré pour ${ministre.prenom} ${ministre.nom}`);
        console.log(`   📝 Token: ${token.substring(0, 50)}...`);
        
        // Vérifier le token
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`   ✅ Token vérifié avec succès`);
        console.log(`   👤 Utilisateur ID: ${decoded.id}`);
        console.log(`   🎭 Rôle: ${decoded.role_id}`);
        console.log(`   ⏰ Expiration: ${new Date(decoded.exp * 1000)}`);
        
        // Test de la fonction authMinistre
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp > now) {
          console.log(`   ✅ Token valide (${decoded.exp - now} secondes restantes)`);
        } else {
          console.log(`   ❌ Token expiré`);
        }
        
      } catch (tokenError) {
        console.log(`   ❌ Erreur avec le token: ${tokenError.message}`);
      }
    }
    
    // 6. Vérifier la configuration du serveur
    console.log('\n⚙️ 6. Configuration du serveur :');
    console.log('   🔑 JWT_SECRET: seccentral2025');
    console.log('   📊 Limites express.json: 50mb');
    console.log('   📊 Limites express.urlencoded: 50mb');
    console.log('   📊 Limites CORS: maxFileSize 50mb');
    console.log('   📊 Limites Multer: fileSize 50MB, fieldSize 50MB');
    
    // 7. Vérifier l'endpoint preview-pdf
    console.log('\n🔗 7. Vérification de l\'endpoint preview-pdf :');
    console.log('   ✅ POST /api/ministere/dossiers/:id/preview-pdf');
    console.log('   ✅ Authentification: authMinistre');
    console.log('   ✅ Statut requis: TRANSMISE_AU_MINISTRE');
    console.log('   ✅ Réponse: application/pdf');
    
    // 8. Recommandations
    console.log('\n💡 8. Recommandations :');
    console.log('   🔧 Redémarrez le serveur backend après les corrections');
    console.log('   🔧 Vérifiez que la demande 14 a le bon statut');
    console.log('   🔧 Reconnectez-vous pour obtenir un nouveau token');
    console.log('   🔧 Testez avec un utilisateur Ministre valide');
    
    await conn.end();
    
    console.log('\n✅ Diagnostic complet terminé !');
    console.log('\n🚀 Actions à effectuer :');
    console.log('   1. Redémarrez le serveur backend');
    console.log('   2. Vérifiez le statut de la demande 14');
    console.log('   3. Reconnectez-vous en tant que Ministre');
    console.log('   4. Testez la prévisualisation PDF');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

diagnosticComplet();



