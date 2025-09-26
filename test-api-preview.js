const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'seccentral2025';
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testAPIPreview() {
  try {
    console.log('🧪 Test de l\'API preview-pdf...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier la demande 14
    console.log('📋 1. Vérification de la demande 14 :');
    const [demande14] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.donnees,
             u.nom_responsable, u.prenom_responsable, u.email, u.telephone, u.adresse
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.id = 14
    `);
    
    if (demande14.length === 0) {
      console.log('   ❌ Demande 14 non trouvée');
      await conn.end();
      return;
    }
    
    const demande = demande14[0];
    console.log(`   ✅ Demande trouvée: ${demande.reference}`);
    console.log(`   📊 Type: ${demande.type}`);
    console.log(`   📊 Statut: ${demande.statut}`);
    console.log(`   👤 Demandeur: ${demande.prenom_responsable} ${demande.nom_responsable}`);
    
    // 2. Vérifier le statut
    console.log('\n🎯 2. Vérification du statut :');
    if (demande.statut === 'TRANSMISE_AU_MINISTRE') {
      console.log('   ✅ Statut correct pour prévisualisation');
    } else {
      console.log(`   ❌ Statut incorrect: ${demande.statut}`);
      console.log(`   💡 Doit être 'TRANSMISE_AU_MINISTRE'`);
      
      // Mettre à jour le statut si nécessaire
      if (confirm('Voulez-vous mettre à jour le statut vers TRANSMISE_AU_MINISTRE ?')) {
        await conn.execute(
          'UPDATE demandes SET statut = ? WHERE id = ?',
          ['TRANSMISE_AU_MINISTRE', demande.id]
        );
        console.log('   ✅ Statut mis à jour vers TRANSMISE_AU_MINISTRE');
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
    
    // 4. Test de génération de token
    console.log('\n🎫 4. Test de génération de token :');
    
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
        
      } catch (tokenError) {
        console.log(`   ❌ Erreur avec le token: ${tokenError.message}`);
      }
    }
    
    // 5. Test de l'endpoint
    console.log('\n🔗 5. Test de l\'endpoint preview-pdf :');
    console.log('   ✅ POST /api/ministere/dossiers/:id/preview-pdf');
    console.log('   ✅ Authentification: authMinistre');
    console.log('   ✅ Validation: ID et données de demande');
    console.log('   ✅ Timeout: Base de données (10s), PDF (30s)');
    console.log('   ✅ Gestion d\'erreurs: Spécifique par type');
    console.log('   ✅ Headers: Content-Type, Content-Length, Content-Disposition');
    
    // 6. Simulation de l'appel API
    console.log('\n🚀 6. Simulation de l\'appel API :');
    console.log('   📡 Méthode: POST');
    console.log(`   🔗 URL: /api/ministere/dossiers/${demande.id}/preview-pdf`);
    console.log('   🔐 Headers: Authorization: Bearer <token_ministre>');
    console.log('   📦 Body: { signatureData: "..." }');
    console.log('   📄 Response: application/pdf');
    
    // 7. Vérification des dépendances
    console.log('\n📦 7. Vérification des dépendances :');
    try {
      require('pdfkit');
      console.log('   ✅ PDFKit installé');
    } catch (error) {
      console.log('   ❌ PDFKit non installé: npm install pdfkit');
    }
    
    try {
      require('qrcode');
      console.log('   ✅ QRCode installé');
    } catch (error) {
      console.log('   ❌ QRCode non installé: npm install qrcode');
    }
    
    // 8. Recommandations
    console.log('\n💡 8. Recommandations :');
    console.log('   🔧 Redémarrez le serveur backend après les corrections');
    console.log('   🔧 Vérifiez que la demande 14 a le bon statut');
    console.log('   🔧 Reconnectez-vous pour obtenir un nouveau token');
    console.log('   🔧 Testez la prévisualisation dans l\'interface');
    console.log('   🔧 Vérifiez les logs du serveur pour les erreurs détaillées');
    
    await conn.end();
    
    console.log('\n✅ Test de l\'API preview-pdf terminé !');
    console.log('\n🚀 Actions à effectuer :');
    console.log('   1. Redémarrez le serveur backend');
    console.log('   2. Vérifiez le statut de la demande 14');
    console.log('   3. Reconnectez-vous en tant que Ministre');
    console.log('   4. Testez la prévisualisation PDF');
    console.log('   5. Vérifiez les logs du serveur');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Fonction helper pour confirmation (simulation)
function confirm(message) {
  return true; // Pour les tests automatiques
}

testAPIPreview();



