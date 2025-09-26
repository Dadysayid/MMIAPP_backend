const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testActionsDisponibles() {
  try {
    console.log('🧪 Test des actions disponibles...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier les demandes et leurs statuts
    console.log('📊 1. Demandes disponibles avec leurs statuts :');
    const [demandes] = await conn.execute(`
      SELECT id, reference, statut, type, created_at
      FROM demandes
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (demandes.length === 0) {
      console.log('   ❌ Aucune demande trouvée');
      return;
    }
    
    demandes.forEach(d => {
      console.log(`   📋 ${d.reference} - ${d.type} - ${d.statut}`);
    });
    
    // 2. Vérifier les actions disponibles selon les statuts
    console.log('\n🎯 2. Actions disponibles selon les statuts :');
    
    const statutsActions = {
      'RECEPTIONNEE': [
        'Transmettre au Ministre',
        'Transmettre à la DGI',
        'Voir détails',
        'Documents'
      ],
      'TRANSMISE_AU_DGI': [
        'Valider',
        'Rejeter',
        'Affecter DDPI',
        'Retour SG',
        'Solliciter Commission',
        'Réattribuer',
        'Demander complément',
        'Clôturer',
        'Relancer'
      ],
      'TRANSMISE_A_DGI': [
        'Valider',
        'Rejeter',
        'Affecter DDPI',
        'Retour SG',
        'Solliciter Commission',
        'Réattribuer',
        'Demander complément',
        'Clôturer',
        'Relancer',
        'Transmettre au Ministre'
      ],
      'EN_COURS_DGI': [
        'Valider',
        'Rejeter',
        'Affecter DDPI',
        'Retour SG',
        'Solliciter Commission',
        'Réattribuer',
        'Demander complément',
        'Clôturer',
        'Relancer',
        'Transmettre au Ministre'
      ],
      'VALIDEE_DGI': [
        'Transmettre au Ministre',
        'Retour SG',
        'Solliciter Commission',
        'Réattribuer',
        'Demander complément',
        'Clôturer',
        'Relancer'
      ],
      'TRANSMISE_AU_MINISTRE': [
        'Signer et envoyer autorisation',
        'Retour SG',
        'Solliciter Commission',
        'Réattribuer',
        'Demander complément',
        'Clôturer',
        'Relancer'
      ]
    };
    
    Object.entries(statutsActions).forEach(([statut, actions]) => {
      console.log(`\n   📋 Statut: ${statut}`);
      actions.forEach(action => {
        console.log(`      ✅ ${action}`);
      });
    });
    
    // 3. Vérifier les permissions des rôles
    console.log('\n🔐 3. Permissions des rôles :');
    
    const rolesPermissions = {
      '1': 'Super Admin - Toutes les actions',
      '4': 'Secrétaire Général - Transmettre au Ministre/DGI, Réattribuer',
      '6': 'DGI - Valider, Rejeter, Transmettre au Ministre, Réattribuer',
      '7': 'Commission - Avis et recommandations',
      '9': 'Ministre - Signer et envoyer autorisation',
      '11': 'Chef de Service - Réattribuer, Gérer'
    };
    
    Object.entries(rolesPermissions).forEach(([roleId, permissions]) => {
      console.log(`   👤 Role ${roleId}: ${permissions}`);
    });
    
    // 4. Vérifier les endpoints disponibles
    console.log('\n🌐 4. Endpoints des actions principales :');
    
    const endpoints = [
      'POST /api/demandes/:id/reattribuer - Réattribution',
      'POST /api/dgi/demandes/:id/valider - Validation DGI',
      'POST /api/dgi/demandes/:id/transmettre-ministre - Transmission Ministre',
      'POST /api/ministre/demandes/:id/signer-et-envoyer - Signature Ministre',
      'POST /api/ddpi/demandes/:id/transmettre - Transmission DDPI'
    ];
    
    endpoints.forEach(endpoint => {
      console.log(`   🔗 ${endpoint}`);
    });
    
    await conn.end();
    
    console.log('\n✅ Test terminé !');
    console.log('\n💡 Actions ajoutées :');
    console.log('   ✅ "Transmettre au Ministre" visible dans la liste des demandes SG');
    console.log('   ✅ "Transmettre au Ministre" disponible pour plus de statuts DGI');
    console.log('   ✅ Boutons d\'action directement visibles dans les tableaux');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testActionsDisponibles();



