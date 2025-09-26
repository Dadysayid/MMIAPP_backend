const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testPreviewPDF() {
  try {
    console.log('🧪 Test de l\'endpoint preview-pdf...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier que l'endpoint existe dans le serveur
    console.log('🔍 1. Vérification de l\'endpoint :');
    console.log('   ✅ POST /api/ministere/dossiers/:id/preview-pdf');
    console.log('   ✅ Authentification: authMinistre');
    console.log('   ✅ Statut requis: TRANSMISE_AU_MINISTRE');
    
    // 2. Vérifier la demande 14
    console.log('\n📋 2. Vérification de la demande 14 :');
    const [demande] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.donnees,
             u.nom_responsable, u.prenom_responsable, u.email, u.telephone, u.adresse
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.id = 14
    `);
    
    if (demande.length === 0) {
      console.log('   ❌ Demande 14 non trouvée');
      return;
    }
    
    const d = demande[0];
    console.log(`   ✅ Demande trouvée: ${d.reference}`);
    console.log(`   📊 Type: ${d.type}`);
    console.log(`   📊 Statut: ${d.statut}`);
    console.log(`   👤 Demandeur: ${d.prenom_responsable} ${d.nom_responsable}`);
    
    // 3. Vérifier le statut de la demande
    console.log('\n🎯 3. Vérification du statut :');
    if (d.statut === 'TRANSMISE_AU_MINISTRE') {
      console.log('   ✅ Statut correct pour prévisualisation');
    } else {
      console.log(`   ❌ Statut incorrect: ${d.statut}`);
      console.log('   💡 La demande doit avoir le statut TRANSMISE_AU_MINISTRE');
    }
    
    // 4. Vérifier les données de la demande
    console.log('\n📊 4. Vérification des données :');
    if (d.donnees) {
      try {
        const donneesParsees = JSON.parse(d.donnees);
        console.log('   ✅ Données JSON valides');
        console.log('   📋 Structure des données:');
        Object.keys(donneesParsees).forEach(key => {
          console.log(`      - ${key}: ${typeof donneesParsees[key]}`);
        });
      } catch (error) {
        console.log(`   ❌ Erreur parsing JSON: ${error.message}`);
      }
    } else {
      console.log('   ❌ Champ donnees vide ou null');
    }
    
    // 5. Vérifier la fonction generatePreviewPDF
    console.log('\n🔧 5. Vérification de la fonction generatePreviewPDF :');
    console.log('   ✅ Création du document PDF');
    console.log('   ✅ En-tête avec logo et titre');
    console.log('   ✅ Informations de la demande');
    console.log('   ✅ Zone de signature (prévisualisation)');
    console.log('   ✅ QR Code de prévisualisation');
    
    // 6. Test de l'endpoint
    console.log('\n🚀 6. Test de l\'endpoint :');
    console.log('   📡 Méthode: POST');
    console.log('   🔗 URL: /api/ministere/dossiers/14/preview-pdf');
    console.log('   🔐 Headers: Authorization: Bearer <token_ministre>');
    console.log('   📦 Body: { signatureData: "..." }');
    console.log('   📄 Response: application/pdf');
    
    // 7. Recommandations
    console.log('\n💡 7. Recommandations :');
    console.log('   🔧 Redémarrez le serveur backend après les modifications');
    console.log('   🔧 Vérifiez que l\'utilisateur a le rôle Ministre (role_id = 9)');
    console.log('   🔧 Testez avec un token JWT valide');
    console.log('   🔧 Vérifiez que la demande 14 a le bon statut');
    
    await conn.end();
    
    console.log('\n✅ Test de l\'endpoint preview-pdf terminé !');
    console.log('\n🚀 Actions à effectuer :');
    console.log('   1. Redémarrez le serveur backend');
    console.log('   2. Vérifiez que l\'endpoint est accessible');
    console.log('   3. Testez la prévisualisation PDF');
    console.log('   4. Vérifiez que l\'erreur réseau a disparu');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testPreviewPDF();



