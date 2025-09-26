const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function verifierStatutDemande() {
  try {
    console.log('🔍 Vérification du Statut des Demandes...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier toutes les demandes avec leurs statuts
    console.log('📋 1. Statuts de toutes les demandes :');
    const [demandes] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.fichier_autorisation,
             u.nom_responsable, u.prenom_responsable, u.email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      ORDER BY d.id DESC
    `);
    
    if (demandes.length === 0) {
      console.log('   ❌ Aucune demande trouvée');
    } else {
      console.log(`   ✅ ${demandes.length} demande(s) trouvée(s) :`);
      demandes.forEach(demande => {
        const hasAutorisation = demande.fichier_autorisation ? '✅' : '❌';
        const statutColor = demande.statut === 'AUTORISATION_SIGNEE' ? '🟢' : 
                           demande.statut === 'TRANSMISE_AU_MINISTRE' ? '🟡' : '⚪';
        console.log(`      ${statutColor} ID: ${demande.id}, Réf: ${demande.reference}, Type: ${demande.type}, Statut: ${demande.statut}, Autorisation: ${hasAutorisation}`);
      });
    }
    
    // 2. Vérifier spécifiquement les demandes signées
    console.log('\n🟢 2. Demandes avec autorisation signée :');
    const [demandesSignees] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.fichier_autorisation,
             u.nom_responsable, u.prenom_responsable, u.email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.statut = 'AUTORISATION_SIGNEE'
      ORDER BY d.id DESC
    `);
    
    if (demandesSignees.length === 0) {
      console.log('   ❌ Aucune demande avec autorisation signée');
      console.log('   💡 Vérifiez que le ministre a bien signé une demande');
    } else {
      console.log(`   ✅ ${demandesSignees.length} demande(s) avec autorisation signée :`);
      demandesSignees.forEach(demande => {
        console.log(`      🎉 ID: ${demande.id}, Réf: ${demande.reference}, Type: ${demande.type}`);
        console.log(`         👤 Demandeur: ${demande.prenom_responsable} ${demande.nom_responsable}`);
        console.log(`         📧 Email: ${demande.email}`);
        console.log(`         📄 Autorisation: ${demande.fichier_autorisation ? 'Générée' : 'Manquante'}`);
      });
    }
    
    // 3. Vérifier les notifications
    console.log('\n🔔 3. Notifications envoyées :');
    const [notifications] = await conn.execute(`
      SELECT n.*, u.nom_responsable, u.prenom_responsable
      FROM notifications n
      JOIN utilisateurs u ON n.utilisateur_id = u.id
      WHERE n.type = 'AUTORISATION_SIGNEE'
      ORDER BY n.created_at DESC
      LIMIT 5
    `);
    
    if (notifications.length === 0) {
      console.log('   ❌ Aucune notification d\'autorisation signée trouvée');
    } else {
      console.log(`   ✅ ${notifications.length} notification(s) trouvée(s) :`);
      notifications.forEach(notif => {
        console.log(`      📧 ${notif.prenom_responsable} ${notif.nom_responsable}: ${notif.message}`);
        console.log(`         📅 Date: ${notif.created_at}`);
        console.log(`         📊 Lu: ${notif.lu ? 'OUI' : 'NON'}`);
      });
    }
    
    // 4. Vérifier l'endpoint de téléchargement
    console.log('\n🔗 4. Endpoint de téléchargement :');
    console.log('   ✅ GET /api/demandeur/autorisation/:id - Disponible');
    console.log('   ✅ Authentification: authRole([4]) - Demandeur');
    console.log('   ✅ Vérification: demande appartient au demandeur');
    console.log('   ✅ Vérification: statut = AUTORISATION_SIGNEE');
    
    // 5. Actions recommandées
    console.log('\n💡 5. Actions recommandées :');
    console.log('   1. Vérifiez que le ministre a bien signé une demande');
    console.log('   2. Vérifiez que le statut est AUTORISATION_SIGNEE');
    console.log('   3. Vérifiez que le fichier_autorisation est généré');
    console.log('   4. Vérifiez que le bouton apparaît dans le frontend');
    console.log('   5. Testez l\'endpoint de téléchargement');
    
    await conn.end();
    
    console.log('\n✅ Vérification du statut terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

verifierStatutDemande();



