const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function diagnosticTransmissionMinistre() {
  try {
    console.log('🔍 Diagnostic des transmissions DGI → Ministre...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier TOUS les statuts des demandes
    console.log('📊 1. Tous les statuts des demandes dans le système :');
    const [tousStatuts] = await conn.execute(`
      SELECT statut, COUNT(*) as count
      FROM demandes
      GROUP BY statut
      ORDER BY count DESC
    `);
    
    tousStatuts.forEach(s => {
      console.log(`   📋 ${s.statut}: ${s.count} demandes`);
    });
    
    // 2. Vérifier les demandes avec statuts similaires
    console.log('\n🔍 2. Demandes avec statuts similaires à "TRANSMISE_AU_MINISTRE" :');
    const [statutsSimilaires] = await conn.execute(`
      SELECT id, reference, type, statut, updated_at
      FROM demandes
      WHERE statut LIKE '%MINISTRE%' OR statut LIKE '%TRANSMISE%'
      ORDER BY updated_at DESC
    `);
    
    if (statutsSimilaires.length === 0) {
      console.log('   ❌ Aucune demande avec un statut contenant "MINISTRE" ou "TRANSMISE"');
    } else {
      console.log(`   ✅ ${statutsSimilaires.length} demande(s) trouvée(s) :`);
      statutsSimilaires.forEach(d => {
        console.log(`      📋 ${d.reference} - ${d.type} - ${d.statut} - ${d.updated_at}`);
      });
    }
    
    // 3. Vérifier l'historique des transmissions
    console.log('\n📝 3. Historique des actions de transmission :');
    const [historiqueTransmissions] = await conn.execute(`
      SELECT 
        sd.demande_id,
        d.reference,
        sd.action,
        sd.message,
        sd.date_action,
        d.statut as statut_actuel
      FROM suivi_demandes sd
      JOIN demandes d ON sd.demande_id = d.id
      WHERE sd.action LIKE '%TRANSMISSION%' OR sd.action LIKE '%MINISTRE%'
      ORDER BY sd.date_action DESC
      LIMIT 10
    `);
    
    if (historiqueTransmissions.length === 0) {
      console.log('   ❌ Aucun historique de transmission trouvé');
    } else {
      console.log(`   ✅ ${historiqueTransmissions.length} action(s) de transmission :`);
      historiqueTransmissions.forEach(h => {
        console.log(`      📋 ${h.reference} - ${h.action} - ${h.message}`);
        console.log(`         📅 ${h.date_action} - Statut actuel: ${h.statut_actuel}`);
      });
    }
    
    // 4. Vérifier l'endpoint exact du Ministre
    console.log('\n🎯 4. Test de l\'endpoint exact du Ministre :');
    try {
      // Simuler la requête exacte de l'endpoint /api/ministere/dossiers
      const [dossiersMinistre] = await conn.execute(`
        SELECT d.id, d.reference, u.nom AS demandeur_nom, u.prenom AS demandeur_prenom, d.statut, d.created_at, d.type, d.donnees
        FROM demandes d
        JOIN utilisateurs u ON d.utilisateur_id = u.id
        WHERE d.statut = 'EN_ATTENTE_SIGNATURE_MINISTRE'
        ORDER BY d.created_at DESC LIMIT 50
      `);
      
      console.log(`   📋 Endpoint /api/ministere/dossiers : ${dossiersMinistre.length} dossiers trouvés`);
      
      if (dossiersMinistre.length === 0) {
        console.log('   ⚠️ Aucun dossier avec statut "EN_ATTENTE_SIGNATURE_MINISTRE"');
        
        // Vérifier s'il y a des dossiers avec d'autres statuts
        const [autresStatuts] = await conn.execute(`
          SELECT d.id, d.reference, d.statut, d.type
          FROM demandes d
          WHERE d.statut IN ('TRANSMISE_AU_MINISTRE', 'EN_COURS_MINISTRE', 'VALIDEE_MINISTRE')
          ORDER BY d.updated_at DESC
        `);
        
        if (autresStatuts.length > 0) {
          console.log('   💡 Mais il y a des dossiers avec d\'autres statuts Ministre :');
          autresStatuts.forEach(d => {
            console.log(`      📋 ${d.reference} - ${d.type} - ${d.statut}`);
          });
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur lors du test de l'endpoint: ${error.message}`);
    }
    
    // 5. Vérifier les notifications au Ministre
    console.log('\n🔔 5. Notifications envoyées au Ministre :');
    const [notificationsMinistre] = await conn.execute(`
      SELECT 
        n.id,
        n.type,
        n.message,
        n.lu,
        n.created_at
      FROM notifications n
      WHERE n.type LIKE '%MINISTRE%'
      ORDER BY n.created_at DESC
      LIMIT 5
    `);
    
    if (notificationsMinistre.length === 0) {
      console.log('   ❌ Aucune notification au Ministre trouvée');
    } else {
      console.log(`   🔔 ${notificationsMinistre.length} notification(s) au Ministre :`);
      notificationsMinistre.forEach(n => {
        const statutLu = n.lu ? '✅ Lu' : '❌ Non lu';
        console.log(`      ${statutLu} ${n.type}: ${n.message}`);
        console.log(`         📅 ${n.created_at}`);
      });
    }
    
    await conn.end();
    
    console.log('\n✅ Diagnostic terminé !');
    console.log('\n💡 Problèmes possibles identifiés :');
    console.log('   1. Le statut n\'est pas "EN_ATTENTE_SIGNATURE_MINISTRE"');
    console.log('   2. L\'endpoint cherche le mauvais statut');
    console.log('   3. La transmission n\'a pas été enregistrée correctement');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

diagnosticTransmissionMinistre();



