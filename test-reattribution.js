const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testReattribution() {
  try {
    console.log('🧪 Test de l\'endpoint de réattribution...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier que la demande 14 existe
    console.log('📋 1. Vérification de la demande 14 :');
    const [demande14] = await conn.execute(`
      SELECT id, reference, statut, type, utilisateur_id
      FROM demandes
      WHERE id = 14
    `);
    
    if (demande14.length === 0) {
      console.log('   ❌ Demande 14 non trouvée');
      return;
    }
    
    const demande = demande14[0];
    console.log(`   ✅ Demande trouvée: ${demande.reference} - ${demande.type} - ${demande.statut}`);
    
    // 2. Vérifier la structure de la table demandes
    console.log('\n🏗️ 2. Structure de la table demandes :');
    const [columns] = await conn.execute(`
      DESCRIBE demandes
    `);
    
    const hasStatut = columns.some(col => col.Field === 'statut');
    const hasUpdatedAt = columns.some(col => col.Field === 'updated_at');
    
    console.log(`   📊 Colonne 'statut': ${hasStatut ? '✅' : '❌'}`);
    console.log(`   📊 Colonne 'updated_at': ${hasUpdatedAt ? '✅' : '❌'}`);
    
    // 3. Vérifier la table suivi_demandes
    console.log('\n📝 3. Structure de la table suivi_demandes :');
    const [suiviColumns] = await conn.execute(`
      DESCRIBE suivi_demandes
    `);
    
    const hasDemandeId = suiviColumns.some(col => col.Field === 'demande_id');
    const hasUtilisateurId = suiviColumns.some(col => col.Field === 'utilisateur_id');
    const hasAction = suiviColumns.some(col => col.Field === 'action');
    const hasMessage = suiviColumns.some(col => col.Field === 'message');
    const hasDateAction = suiviColumns.some(col => col.Field === 'date_action');
    
    console.log(`   📊 Colonne 'demande_id': ${hasDemandeId ? '✅' : '❌'}`);
    console.log(`   📊 Colonne 'utilisateur_id': ${hasUtilisateurId ? '✅' : '❌'}`);
    console.log(`   📊 Colonne 'action': ${hasAction ? '✅' : '❌'}`);
    console.log(`   📊 Colonne 'message': ${hasMessage ? '✅' : '❌'}`);
    console.log(`   📊 Colonne 'date_action': ${hasDateAction ? '✅' : '❌'}`);
    
    // 4. Test de la requête de réattribution
    console.log('\n🔍 4. Test de la logique de réattribution :');
    
    // Simuler une réattribution vers DGI
    const nouveauService = 'DGI';
    const justification = 'Test de réattribution';
    
    try {
      // Test de la mise à jour du statut
      await conn.execute(
        'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
        ['TRANSMISE_AU_DGI', 14]
      );
      console.log('   ✅ Mise à jour du statut réussie');
      
      // Test de l'insertion dans suivi_demandes
      await conn.execute(
        'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
        [14, 1, 'REATTRIBUTION', `Ré-attribuée vers ${nouveauService}: ${justification}`]
      );
      console.log('   ✅ Insertion dans suivi_demandes réussie');
      
      // Vérifier le résultat
      const [demandeUpdated] = await conn.execute(
        'SELECT statut, updated_at FROM demandes WHERE id = ?',
        [14]
      );
      
      if (demandeUpdated.length > 0) {
        console.log(`   📊 Nouveau statut: ${demandeUpdated[0].statut}`);
        console.log(`   📊 Date de mise à jour: ${demandeUpdated[0].updated_at}`);
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
    
    // 5. Vérifier les permissions
    console.log('\n🔐 5. Permissions pour la réattribution :');
    console.log('   📋 Rôles autorisés: [1, 4, 6, 11]');
    console.log('   📋 1 = Super Admin');
    console.log('   📋 4 = Secrétaire Général');
    console.log('   📋 6 = DGI');
    console.log('   📋 11 = Chef de Service');
    
    await conn.end();
    
    console.log('\n✅ Test terminé !');
    console.log('\n💡 Si tout est vert, l\'endpoint devrait fonctionner.');
    console.log('   Redémarrez le serveur backend après les corrections.');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testReattribution();



