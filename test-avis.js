const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testAvis() {
  try {
    console.log('🔍 Test de diagnostic avis commission...');
    
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion DB OK');
    
    // Test 1: Vérifier les tables
    const [tables] = await conn.execute('SHOW TABLES');
    console.log('📋 Tables disponibles:', tables.map(t => Object.values(t)[0]));
    
    // Test 2: Vérifier la table avis_commissions
    try {
      const [columns] = await conn.execute('DESCRIBE avis_commissions');
      console.log('✅ Table avis_commissions existe');
      console.log('📋 Colonnes:', columns.map(c => c.Field));
    } catch (err) {
      console.log('❌ Table avis_commissions n\'existe pas:', err.message);
      
      // Créer la table
      await conn.execute(`
        CREATE TABLE avis_commissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          demande_id INT NOT NULL,
          commission_id INT NOT NULL,
          membre_rapporteur_id INT,
          type_avis ENUM('EN_ATTENTE', 'FAVORABLE', 'DEFAVORABLE', 'RESERVE', 'AJOURNE') DEFAULT 'EN_ATTENTE',
          observations TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_demande_id (demande_id)
        )
      `);
      console.log('✅ Table avis_commissions créée');
    }
    
    // Test 3: Vérifier les demandes
    const [demandes] = await conn.execute('SELECT id, reference, statut FROM demandes LIMIT 5');
    console.log('📋 Demandes:', demandes);
    
    // Test 4: Vérifier les demandes en attente d'avis
    const [demandesEnAttente] = await conn.execute(
      'SELECT id, reference, statut FROM demandes WHERE statut = "EN_ATTENTE_AVIS_COMMISSION"'
    );
    console.log('📋 Demandes en attente d\'avis:', demandesEnAttente);
    
    await conn.end();
    
    console.log('✅ Test terminé avec succès');
    
  } catch (err) {
    console.error('❌ Erreur test:', err);
  }
}

testAvis(); 