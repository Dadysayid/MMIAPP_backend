const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function debugDemandesTransmises() {
  try {
    console.log('🔍 Diagnostic des demandes transmises par le DDPI...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier toutes les demandes avec leurs statuts
    console.log('📊 1. Toutes les demandes avec leurs statuts :');
    const [allDemandes] = await conn.execute(`
      SELECT id, reference, type, statut, utilisateur_id, created_at, updated_at
      FROM demandes 
      ORDER BY updated_at DESC
    `);
    
    allDemandes.forEach(d => {
      console.log(`   ${d.reference} - ${d.type} - ${d.statut} - Utilisateur: ${d.utilisateur_id}`);
    });
    
    // 2. Vérifier les demandes transmises par le DDPI
    console.log('\n🎯 2. Demandes transmises par le DDPI :');
    const [demandesDDPI] = await conn.execute(`
      SELECT id, reference, type, statut, utilisateur_id, created_at, updated_at
      FROM demandes 
      WHERE statut IN ('VALIDEE_DDPI', 'TRANSMISE_A_DGI', 'EN_COURS_DGI')
      ORDER BY updated_at DESC
    `);
    
    if (demandesDDPI.length === 0) {
      console.log('   ❌ Aucune demande transmise par le DDPI trouvée');
    } else {
      demandesDDPI.forEach(d => {
        console.log(`   ✅ ${d.reference} - ${d.type} - ${d.statut} - Utilisateur: ${d.utilisateur_id}`);
      });
    }
    
    // 3. Vérifier l'historique des transmissions
    console.log('\n📝 3. Historique des transmissions :');
    const [historique] = await conn.execute(`
      SELECT h.*, d.reference, d.type
      FROM historique_suivi h
      JOIN demandes d ON h.demande_id = d.id
      WHERE h.action LIKE '%transmettre%' OR h.action LIKE '%transmission%'
      ORDER BY h.date_action DESC
      LIMIT 10
    `);
    
    if (historique.length === 0) {
      console.log('   ❌ Aucun historique de transmission trouvé');
    } else {
      historique.forEach(h => {
        console.log(`   📋 ${h.reference} - ${h.action} - ${h.date_action}`);
      });
    }
    
    // 4. Vérifier les utilisateurs
    console.log('\n👥 4. Utilisateurs dans le système :');
    const [utilisateurs] = await conn.execute(`
      SELECT id, nom_responsable, prenom_responsable, email, role_id
      FROM utilisateurs
      ORDER BY id
    `);
    
    utilisateurs.forEach(u => {
      console.log(`   👤 ID: ${u.id} - ${u.prenom_responsable} ${u.nom_responsable} - ${u.email} - Role: ${u.role_id}`);
    });
    
    await conn.end();
    
    console.log('\n✅ Diagnostic terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

debugDemandesTransmises();



