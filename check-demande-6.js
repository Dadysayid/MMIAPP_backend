const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function checkDemande6() {
  try {
    console.log('🔍 Vérification de la demande 6...');
    
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion DB OK');
    
    // Vérifier la demande 6
    const [[demande]] = await conn.execute(
      'SELECT id, reference, statut, type, donnees FROM demandes WHERE id = 6'
    );
    console.log('📋 Demande 6:', demande);
    
    // Vérifier les avis pour la demande 6
    const [avis] = await conn.execute(
      'SELECT * FROM avis_commissions WHERE demande_id = 6'
    );
    console.log('📋 Avis pour demande 6:', avis);
    
    // Vérifier l'historique de la demande 6
    const [historique] = await conn.execute(
      'SELECT * FROM suivi_demandes WHERE demande_id = 6 ORDER BY date_action DESC'
    );
    console.log('📋 Historique demande 6:', historique);
    
    // Vérifier toutes les demandes en attente d'avis
    const [demandesEnAttente] = await conn.execute(
      'SELECT id, reference, statut FROM demandes WHERE statut = "EN_ATTENTE_AVIS_COMMISSION"'
    );
    console.log('📋 Demandes en attente d\'avis:', demandesEnAttente);
    
    await conn.end();
    console.log('✅ Vérification terminée');
    
  } catch (err) {
    console.error('❌ Erreur:', err);
  }
}

checkDemande6(); 