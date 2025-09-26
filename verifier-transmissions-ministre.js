const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function verifierTransmissionsMinistre() {
  try {
    console.log('🔍 Vérification des transmissions DGI → Ministre...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Dossiers transmis au Ministre par la DGI
    console.log('📤 1. Dossiers transmis au Ministre par la DGI :');
    const [transmissionsMinistre] = await conn.execute(`
      SELECT 
        d.id,
        d.reference,
        d.type,
        d.statut,
        d.created_at,
        d.updated_at,
        CONCAT(u.prenom_responsable, ' ', u.nom_responsable) AS demandeur,
        JSON_UNQUOTE(JSON_EXTRACT(d.donnees, '$.commentaire_dgi_transmission_ministre')) AS commentaire_transmission
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.statut = 'TRANSMISE_AU_MINISTRE'
      ORDER BY d.updated_at DESC
    `);
    
    if (transmissionsMinistre.length === 0) {
      console.log('   ❌ Aucun dossier transmis au Ministre trouvé');
    } else {
      console.log(`   ✅ ${transmissionsMinistre.length} dossier(s) transmis au Ministre :`);
      transmissionsMinistre.forEach(d => {
        console.log(`      📋 ${d.reference} - ${d.type} - ${d.demandeur}`);
        console.log(`         📅 Transmis le: ${d.updated_at}`);
        console.log(`         💬 Commentaire: ${d.commentaire_transmission || 'Aucun'}`);
      });
    }
    
    // 2. Historique des transmissions DGI → Ministre
    console.log('\n📝 2. Historique des transmissions DGI → Ministre :');
    const [historiqueTransmissions] = await conn.execute(`
      SELECT 
        sd.demande_id,
        d.reference,
        sd.action,
        sd.message,
        sd.date_action,
        CONCAT(u.prenom_responsable, ' ', u.nom_responsable) AS agent_dgi
      FROM suivi_demandes sd
      JOIN demandes d ON sd.demande_id = d.id
      JOIN utilisateurs u ON sd.utilisateur_id = u.id
      WHERE sd.action = 'TRANSMISSION_MINISTRE'
      ORDER BY sd.date_action DESC
    `);
    
    if (historiqueTransmissions.length === 0) {
      console.log('   ❌ Aucun historique de transmission au Ministre trouvé');
    } else {
      console.log(`   ✅ ${historiqueTransmissions.length} action(s) de transmission au Ministre :`);
      historiqueTransmissions.forEach(h => {
        console.log(`      📋 ${h.reference} - ${h.action} par ${h.agent_dgi}`);
        console.log(`         📅 ${h.date_action} - ${h.message}`);
      });
    }
    
    // 3. Dossiers en attente de signature par le Ministre
    console.log('\n⏳ 3. Dossiers en attente de signature par le Ministre :');
    const [enAttenteSignature] = await conn.execute(`
      SELECT 
        d.id,
        d.reference,
        d.type,
        d.created_at,
        d.updated_at,
        CONCAT(u.prenom_responsable, ' ', u.nom_responsable) AS demandeur,
        DATEDIFF(NOW(), d.updated_at) AS jours_attente
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.statut = 'TRANSMISE_AU_MINISTRE'
      ORDER BY d.updated_at ASC
    `);
    
    if (enAttenteSignature.length === 0) {
      console.log('   ❌ Aucun dossier en attente de signature');
    } else {
      console.log(`   ⏳ ${enAttenteSignature.length} dossier(s) en attente de signature :`);
      enAttenteSignature.forEach(d => {
        const statutAttente = d.jours_attente > 7 ? '🔴 URGENT' : d.jours_attente > 3 ? '🟡 ATTENTION' : '🟢 NORMAL';
        console.log(`      ${statutAttente} ${d.reference} - ${d.type} - ${d.demandeur}`);
        console.log(`         📅 En attente depuis ${d.jours_attente} jour(s) (transmis le ${d.updated_at})`);
      });
    }
    
    // 4. Notifications envoyées au Ministre
    console.log('\n🔔 4. Notifications envoyées au Ministre :');
    const [notificationsMinistre] = await conn.execute(`
      SELECT 
        n.id,
        n.type,
        n.message,
        n.lu,
        n.created_at,
        CONCAT(u.prenom_responsable, ' ', u.nom_responsable) AS destinataire
      FROM notifications n
      JOIN utilisateurs u ON n.utilisateur_id = u.id
      WHERE n.type = 'NOUVELLE_DEMANDE_MINISTRE'
      ORDER BY n.created_at DESC
      LIMIT 10
    `);
    
    if (notificationsMinistre.length === 0) {
      console.log('   ❌ Aucune notification au Ministre trouvée');
    } else {
      console.log(`   🔔 ${notificationsMinistre.length} notification(s) au Ministre :`);
      notificationsMinistre.forEach(n => {
        const statutLu = n.lu ? '✅ Lu' : '❌ Non lu';
        console.log(`      ${statutLu} ${n.message}`);
        console.log(`         📅 ${n.created_at} - Destinataire: ${n.destinataire}`);
      });
    }
    
    // 5. Utilisateurs Ministre disponibles
    console.log('\n👑 5. Utilisateurs Ministre disponibles :');
    const [utilisateursMinistre] = await conn.execute(`
      SELECT 
        id,
        nom_responsable,
        prenom_responsable,
        email,
        role_id
      FROM utilisateurs
      WHERE role_id = 7
      ORDER BY id
    `);
    
    if (utilisateursMinistre.length === 0) {
      console.log('   ❌ Aucun utilisateur Ministre trouvé (role_id = 7)');
      console.log('   💡 Vérifiez que le rôle Ministre est bien configuré');
    } else {
      console.log(`   👑 ${utilisateursMinistre.length} utilisateur(s) Ministre :`);
      utilisateursMinistre.forEach(u => {
        console.log(`      👤 ID: ${u.id} - ${u.prenom_responsable} ${u.nom_responsable} - ${u.email}`);
      });
    }
    
    // 6. Résumé des actions possibles
    console.log('\n🎯 6. Actions possibles pour le Ministre :');
    if (transmissionsMinistre.length > 0) {
      console.log('   ✅ Le Ministre peut signer et envoyer les autorisations');
      console.log('   🔗 Endpoint: POST /api/ministre/demandes/:id/signer-et-envoyer');
      console.log('   📋 Actions disponibles:');
      console.log('      - Signer l\'autorisation');
      console.log('      - Envoyer automatiquement au demandeur');
      console.log('      - Archiver le dossier');
      console.log('      - Clôturer la demande');
    } else {
      console.log('   ❌ Aucun dossier à traiter par le Ministre');
    }
    
    await conn.end();
    
    console.log('\n✅ Vérification terminée !');
    
    if (transmissionsMinistre.length === 0) {
      console.log('\n💡 Pour transmettre un dossier au Ministre :');
      console.log('   1. Connectez-vous en tant que DGI');
      console.log('   2. Sélectionnez une demande au statut VALIDEE_DGI, TRANSMISE_A_DGI, ou EN_COURS_DGI');
      console.log('   3. Cliquez sur "Transmettre au Ministre"');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

verifierTransmissionsMinistre();



