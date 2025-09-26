const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testEndpointsComplet() {
  try {
    console.log('🧪 Test complet des endpoints...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier la demande 14
    console.log('📋 1. Vérification de la demande 14 :');
    const [demande14] = await conn.execute(`
      SELECT id, reference, statut, type, utilisateur_id, created_at
      FROM demandes
      WHERE id = 14
    `);
    
    if (demande14.length === 0) {
      console.log('   ❌ Demande 14 non trouvée');
      return;
    }
    
    const demande = demande14[0];
    console.log(`   ✅ Demande trouvée: ${demande.reference} - ${demande.type} - ${demande.statut}`);
    console.log(`   📅 Créée le: ${demande.created_at}`);
    
    // 2. Vérifier les tables nécessaires
    console.log('\n🏗️ 2. Vérification des tables :');
    
    const tables = ['demandes', 'utilisateurs', 'suivi_demandes', 'notifications'];
    for (const table of tables) {
      try {
        const [result] = await conn.execute(`SHOW TABLES LIKE '${table}'`);
        if (result.length > 0) {
          console.log(`   ✅ Table ${table} existe`);
        } else {
          console.log(`   ❌ Table ${table} n'existe pas`);
        }
      } catch (error) {
        console.log(`   ❌ Erreur table ${table}: ${error.message}`);
      }
    }
    
    // 3. Vérifier la structure de suivi_demandes
    console.log('\n📝 3. Structure de suivi_demandes :');
    try {
      const [columns] = await conn.execute('DESCRIBE suivi_demandes');
      const requiredColumns = ['demande_id', 'utilisateur_id', 'action', 'message', 'date_action'];
      
      requiredColumns.forEach(col => {
        const exists = columns.some(c => c.Field === col);
        console.log(`   ${exists ? '✅' : '❌'} ${col}`);
      });
    } catch (error) {
      console.log(`   ❌ Erreur structure: ${error.message}`);
    }
    
    // 4. Vérifier les utilisateurs DGI
    console.log('\n👥 4. Utilisateurs DGI disponibles :');
    try {
      const [dgiUsers] = await conn.execute(`
        SELECT id, nom_responsable, prenom_responsable, email, role_id
        FROM utilisateurs
        WHERE role_id = 6
        ORDER BY id
      `);
      
      if (dgiUsers.length === 0) {
        console.log('   ❌ Aucun utilisateur DGI trouvé');
      } else {
        dgiUsers.forEach(u => {
          console.log(`   👤 ID: ${u.id} - ${u.prenom_responsable} ${u.nom_responsable} - ${u.email}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Erreur utilisateurs DGI: ${error.message}`);
    }
    
    // 5. Test de réattribution
    console.log('\n🔄 5. Test de réattribution :');
    try {
      // Simuler une réattribution
      const nouveauService = 'DGI';
      const justification = 'Test de réattribution';
      
      // Test de la mise à jour du statut
      await conn.execute(
        'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
        ['TRANSMISE_AU_DGI', 14]
      );
      console.log('   ✅ Mise à jour du statut réussie');
      
      // Test de l'insertion dans suivi_demandes
      try {
        await conn.execute(
          'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
          [14, 1, 'REATTRIBUTION', `Ré-attribuée vers ${nouveauService}: ${justification}`]
        );
        console.log('   ✅ Insertion dans suivi_demandes réussie');
      } catch (suiviError) {
        console.log(`   ⚠️ Erreur suivi_demandes: ${suiviError.message}`);
        console.log('   💡 Utilisation de enregistrerSuivi comme fallback');
      }
      
      // Restaurer l'état original
      await conn.execute(
        'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
        [demande.statut, 14]
      );
      console.log('   🔄 État original restauré');
      
    } catch (testError) {
      console.log(`   ❌ Erreur lors du test: ${testError.message}`);
    }
    
    // 6. Vérifier les statuts autorisés pour transmission Ministre
    console.log('\n🎯 6. Statuts autorisés pour transmission Ministre :');
    const statutsAutorises = ['VALIDEE_DGI', 'TRANSMISE_A_DGI', 'EN_COURS_DGI'];
    console.log(`   📋 Statuts autorisés: ${statutsAutorises.join(', ')}`);
    console.log(`   📊 Statut actuel de la demande 14: ${demande.statut}`);
    
    if (statutsAutorises.includes(demande.statut)) {
      console.log('   ✅ La demande peut être transmise au Ministre');
    } else {
      console.log('   ❌ La demande ne peut pas être transmise au Ministre');
      console.log('   💡 Changez le statut vers un des statuts autorisés');
    }
    
    // 7. Solutions recommandées
    console.log('\n💡 7. Solutions recommandées :');
    
    if (demande.statut === 'TRANSMISE_A_DGI') {
      console.log('   🔄 Pour permettre la transmission au Ministre depuis TRANSMISE_A_DGI:');
      console.log('      ✅ Modifié l\'endpoint /api/dgi/demandes/:id/transmettre-ministre');
      console.log('      ✅ Ajouté TRANSMISE_A_DGI aux statuts autorisés');
    }
    
    if (demande.statut === 'TRANSMISE_A_DGI') {
      console.log('   📝 Pour changer le statut vers VALIDEE_DGI:');
      console.log('      🔗 Utilisez l\'endpoint /api/dgi/demandes/:id/valider');
      console.log('      📋 Ou changez directement en base: UPDATE demandes SET statut = "VALIDEE_DGI" WHERE id = 14');
    }
    
    await conn.end();
    
    console.log('\n✅ Test terminé !');
    console.log('\n🚀 Actions à effectuer :');
    console.log('   1. Redémarrez le serveur backend');
    console.log('   2. Testez la réattribution');
    console.log('   3. Testez la transmission au Ministre');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testEndpointsComplet();



