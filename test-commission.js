const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testCommission() {
  try {
    console.log('🔍 Test de diagnostic commission...');
    
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion DB OK');
    
    // Test 1: Vérifier les utilisateurs commission/comité
    const [users] = await conn.execute(
      'SELECT id, email, role_id, nom, prenom, compte_active FROM utilisateurs WHERE role_id IN (7, 8)'
    );
    console.log('📋 Utilisateurs Commission/Comité:', users);
    
    // Test 2: Vérifier les demandes en attente d'avis
    const [demandes] = await conn.execute(
      'SELECT id, reference, statut, type FROM demandes WHERE statut = "EN_ATTENTE_AVIS_COMMISSION"'
    );
    console.log('📋 Demandes en attente d\'avis:', demandes);
    
    // Test 3: Vérifier la table avis_commissions
    try {
      const [avis] = await conn.execute('SELECT * FROM avis_commissions LIMIT 5');
      console.log('📋 Avis existants:', avis);
    } catch (err) {
      console.log('❌ Table avis_commissions vide ou inexistante:', err.message);
    }
    
    // Test 4: Vérifier les rôles
    const [roles] = await conn.execute('SELECT * FROM roles WHERE id IN (7, 8)');
    console.log('📋 Rôles Commission/Comité:', roles);
    
    await conn.end();
    console.log('✅ Test terminé');
    
  } catch (err) {
    console.error('❌ Erreur test:', err);
  }
}

testCommission(); 