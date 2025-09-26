const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testTransmissionDDPIDGI() {
  try {
    console.log('🧪 Test de transmission DDPI vers DGI...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier les demandes au statut VALIDEE_DDPI
    console.log('📊 1. Demandes au statut VALIDEE_DDPI (prêtes pour transmission) :');
    const [demandesValidees] = await conn.execute(`
      SELECT id, reference, type, statut, utilisateur_id, created_at, updated_at
      FROM demandes 
      WHERE statut = 'VALIDEE_DDPI'
      ORDER BY updated_at DESC
    `);
    
    if (demandesValidees.length === 0) {
      console.log('   ❌ Aucune demande VALIDEE_DDPI trouvée');
      console.log('   💡 Pour tester, vous devez d\'abord valider une demande au niveau DDPI');
    } else {
      demandesValidees.forEach(d => {
        console.log(`   ✅ ${d.reference} - ${d.type} - Utilisateur: ${d.utilisateur_id}`);
      });
    }
    
    // 2. Vérifier les demandes déjà transmises à la DGI
    console.log('\n🎯 2. Demandes déjà transmises à la DGI (statut TRANSMISE_A_DGI) :');
    const [demandesTransmises] = await conn.execute(`
      SELECT id, reference, type, statut, utilisateur_id, created_at, updated_at
      FROM demandes 
      WHERE statut = 'TRANSMISE_A_DGI'
      ORDER BY updated_at DESC
    `);
    
    if (demandesTransmises.length === 0) {
      console.log('   ❌ Aucune demande TRANSMISE_A_DGI trouvée');
    } else {
      demandesTransmises.forEach(d => {
        console.log(`   🔄 ${d.reference} - ${d.type} - Utilisateur: ${d.utilisateur_id}`);
      });
    }
    
    // 3. Vérifier les notifications DGI
    console.log('\n🔔 3. Notifications DGI récentes :');
    const [notifications] = await conn.execute(`
      SELECT n.*, u.nom_responsable, u.prenom_responsable
      FROM notifications n
      JOIN utilisateurs u ON n.utilisateur_id = u.id
      WHERE u.role_id = 6 AND n.type = 'NOUVELLE_DEMANDE_DDPI'
      ORDER BY n.created_at DESC
      LIMIT 5
    `);
    
    if (notifications.length === 0) {
      console.log('   ❌ Aucune notification DGI trouvée');
    } else {
      notifications.forEach(n => {
        console.log(`   📧 ${n.message} - ${n.created_at}`);
      });
    }
    
    // 4. Vérifier l'historique des transmissions
    console.log('\n📝 4. Historique des transmissions DDPI vers DGI :');
    const [historique] = await conn.execute(`
      SELECT h.*, d.reference, d.type
      FROM suivi_demandes h
      JOIN demandes d ON h.demande_id = d.id
      WHERE h.action = 'TRANSMISSION_DDPI' AND h.nouveau_statut = 'TRANSMISE_A_DGI'
      ORDER BY h.date_action DESC
      LIMIT 5
    `);
    
    if (historique.length === 0) {
      console.log('   ❌ Aucun historique de transmission DDPI→DGI trouvé');
    } else {
      historique.forEach(h => {
        console.log(`   📋 ${h.reference} - ${h.action} - ${h.date_action}`);
      });
    }
    
    await conn.end();
    
    console.log('\n✅ Test terminé !');
    console.log('\n💡 Pour tester la transmission :');
    console.log('   1. Connectez-vous en tant que DDPI');
    console.log('   2. Validez une demande (statut: VALIDEE_DDPI)');
    console.log('   3. Transmettez-la à la DGI');
    console.log('   4. Vérifiez que la DGI la reçoit');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testTransmissionDDPIDGI();



