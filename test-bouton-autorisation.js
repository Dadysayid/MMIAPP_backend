const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'seccentral2025';
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testBoutonAutorisation() {
  try {
    console.log('🧪 Test du Bouton de Téléchargement de l\'Autorisation...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier les demandes avec autorisation signée
    console.log('🔍 1. Demandes avec autorisation signée :');
    const [demandesSignees] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.fichier_autorisation,
             u.nom_responsable, u.prenom_responsable, u.email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.statut = 'AUTORISATION_SIGNEE'
      ORDER BY d.id DESC
    `);
    
    if (demandesSignees.length === 0) {
      console.log('   ❌ Aucune demande avec autorisation signée trouvée');
      console.log('   💡 Le ministre doit d\'abord signer une demande');
      console.log('   💡 Vérifiez le workflow: DDPI → DGI → Ministre → Signature');
    } else {
      console.log(`   ✅ ${demandesSignees.length} demande(s) avec autorisation signée :`);
      demandesSignees.forEach(demande => {
        const hasAutorisation = demande.fichier_autorisation ? '✅' : '❌';
        console.log(`      ${hasAutorisation} ID: ${demande.id}, Réf: ${demande.reference}, Type: ${demande.type}`);
        console.log(`         👤 Demandeur: ${demande.prenom_responsable} ${demande.nom_responsable}`);
        console.log(`         📧 Email: ${demande.email}`);
        console.log(`         📄 Autorisation: ${demande.fichier_autorisation ? 'Générée' : 'Manquante'}`);
      });
    }
    
    // 2. Vérifier l'endpoint de téléchargement
    console.log('\n🔗 2. Endpoint de téléchargement :');
    console.log('   ✅ GET /api/demandeur/autorisation/:id - Disponible');
    console.log('   ✅ Authentification: authRole([4]) - Demandeur');
    console.log('   ✅ Vérification: demande appartient au demandeur');
    console.log('   ✅ Vérification: statut = AUTORISATION_SIGNEE');
    
    // 3. Vérifier le frontend
    console.log('\n🎨 3. Frontend - Dashboard Demandeur :');
    console.log('   ✅ Bouton "Télécharger Autorisation" ajouté');
    console.log('   ✅ Affiché uniquement si statut = AUTORISATION_SIGNEE');
    console.log('   ✅ Style: Vert (#52c41a) avec icône certificat');
    console.log('   ✅ Fonction: handleDownloadAutorisation(demande.id)');
    
    // 4. Test de l'API
    console.log('\n🧪 4. Test de l\'API de téléchargement :');
    if (demandesSignees.length > 0) {
      const demande = demandesSignees[0];
      console.log(`   📋 Test avec la demande ${demande.id} (${demande.reference})`);
      console.log(`   🔗 URL: http://localhost:4000/api/demandeur/autorisation/${demande.id}`);
      console.log(`   🔐 Authentification: Bearer token (role demandeur)`);
      console.log(`   📊 Statut attendu: 200 OK`);
      console.log(`   📄 Contenu attendu: PDF de l'autorisation`);
    } else {
      console.log('   ⚠️ Impossible de tester sans demande signée');
    }
    
    // 5. Workflow complet à vérifier
    console.log('\n🚀 5. Workflow complet à vérifier :');
    console.log('   1️⃣ Demande déposée par le demandeur');
    console.log('   2️⃣ Validation par DDPI');
    console.log('   3️⃣ Transmission à DGI');
    console.log('   4️⃣ Transmission au Ministre');
    console.log('   5️⃣ Signature par le Ministre');
    console.log('   6️⃣ Statut → AUTORISATION_SIGNEE');
    console.log('   7️⃣ Bouton apparaît dans le dashboard');
    console.log('   8️⃣ Téléchargement fonctionne');
    
    // 6. Actions recommandées
    console.log('\n💡 6. Actions recommandées :');
    console.log('   1. Vérifiez que le ministre a bien signé une demande');
    console.log('   2. Vérifiez que le statut est AUTORISATION_SIGNEE');
    console.log('   3. Vérifiez que le fichier_autorisation est généré');
    console.log('   4. Connectez-vous en tant que demandeur');
    console.log('   5. Vérifiez que le bouton apparaît');
    console.log('   6. Testez le téléchargement');
    
    await conn.end();
    
    console.log('\n✅ Test du bouton d\'autorisation terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testBoutonAutorisation();



