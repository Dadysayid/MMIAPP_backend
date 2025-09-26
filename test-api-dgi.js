const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testAPIDGI() {
  try {
    console.log('🧪 Test de l\'API DGI...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier les demandes que la DGI devrait voir
    console.log('📊 1. Demandes visibles par la DGI :');
    const [demandesDGI] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.created_at, d.updated_at,
             u.nom_responsable, u.prenom_responsable
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.statut IN (
        'TRANSMISE_AU_DGI',     -- Nouvelles demandes du SG
        'TRANSMISE_A_DGI',      -- Demandes transmises par le DDPI
        'EN_COURS_DGI',         -- Demandes en cours de traitement
        'VALIDEE_DGI',          -- Demandes validées par DGI
        'TRANSMISE_A_DDPI',     -- Demandes affectées au DDPI (pour suivi)
        'VALIDEE_DDPI',         -- Demandes validées par DDPI (retour)
        'RETOURNEE'             -- Demandes retournées par DDPI
      )
      ORDER BY d.updated_at DESC, d.created_at DESC
      LIMIT 10
    `);
    
    if (demandesDGI.length === 0) {
      console.log('   ❌ Aucune demande visible par la DGI');
      console.log('   💡 Vérifiez que des demandes ont les statuts appropriés');
    } else {
      demandesDGI.forEach(d => {
        console.log(`   ✅ ${d.reference} - ${d.type} - ${d.statut} - ${d.prenom_responsable} ${d.nom_responsable}`);
      });
    }
    
    // 2. Vérifier les statuts disponibles
    console.log('\n🎯 2. Statuts des demandes dans le système :');
    const [statuts] = await conn.execute(`
      SELECT statut, COUNT(*) as count
      FROM demandes
      GROUP BY statut
      ORDER BY count DESC
    `);
    
    statuts.forEach(s => {
      console.log(`   📋 ${s.statut}: ${s.count} demandes`);
    });
    
    // 3. Vérifier les utilisateurs DGI
    console.log('\n👥 3. Utilisateurs DGI dans le système :');
    const [utilisateursDGI] = await conn.execute(`
      SELECT id, nom_responsable, prenom_responsable, email, role_id
      FROM utilisateurs
      WHERE role_id = 6
      ORDER BY id
    `);
    
    if (utilisateursDGI.length === 0) {
      console.log('   ❌ Aucun utilisateur DGI trouvé');
      console.log('   💡 Créez un utilisateur avec role_id = 6');
    } else {
      utilisateursDGI.forEach(u => {
        console.log(`   👤 ID: ${u.id} - ${u.prenom_responsable} ${u.nom_responsable} - ${u.email} - Role: ${u.role_id}`);
      });
    }
    
    // 4. Test de la requête exacte de l'API
    console.log('\n🔍 4. Test de la requête exacte de l\'API DGI :');
    const [testQuery] = await conn.execute(`
      SELECT d.id, d.reference, u.nom_responsable AS demandeur_nom, u.prenom_responsable AS demandeur_prenom, 
             d.statut, d.created_at, d.updated_at, d.type, d.donnees
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.statut IN (
        'TRANSMISE_AU_DGI', 'TRANSMISE_A_DGI', 'EN_COURS_DGI', 'VALIDEE_DGI',
        'TRANSMISE_A_DDPI', 'VALIDEE_DDPI', 'RETOURNEE'
      )
      ORDER BY d.updated_at DESC, d.created_at DESC 
      LIMIT 5
    `);
    
    if (testQuery.length === 0) {
      console.log('   ❌ La requête de l\'API ne retourne aucun résultat');
    } else {
      console.log(`   ✅ La requête fonctionne: ${testQuery.length} résultats`);
      testQuery.forEach(d => {
        console.log(`      ${d.reference} - ${d.demandeur_prenom} ${d.demandeur_nom} - ${d.statut}`);
      });
    }
    
    await conn.end();
    
    console.log('\n✅ Test terminé !');
    
    if (demandesDGI.length === 0) {
      console.log('\n💡 Pour résoudre le problème :');
      console.log('   1. Vérifiez que des demandes ont les statuts appropriés');
      console.log('   2. Vérifiez que l\'utilisateur DGI a le bon role_id (6)');
      console.log('   3. Redémarrez le serveur backend après les corrections');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testAPIDGI();



