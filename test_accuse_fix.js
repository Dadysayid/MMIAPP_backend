// Script de test pour vérifier la correction de l'accusé de réception
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testNotificationsTable() {
  let conn;
  try {
    console.log('🔍 Test de la structure de la table notifications...');
    
    conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier si la table existe
    const [tables] = await conn.execute('SHOW TABLES LIKE "notifications"');
    if (tables.length === 0) {
      console.log('❌ Table notifications n\'existe pas');
      return;
    }
    
    console.log('✅ Table notifications existe');
    
    // 2. Vérifier la structure
    const [columns] = await conn.execute('DESCRIBE notifications');
    console.log('📋 Structure de la table notifications:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    // 3. Vérifier s'il y a des colonnes problématiques
    const problematicColumns = columns.filter(col => 
      ['demande_id', 'date_envoi', 'statut'].includes(col.Field)
    );
    
    if (problematicColumns.length > 0) {
      console.log('⚠️  Colonnes problématiques détectées:');
      problematicColumns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
      console.log('💡 Exécutez le script fix_notifications_table.sql pour corriger');
    } else {
      console.log('✅ Aucune colonne problématique détectée');
    }
    
    // 4. Tester une insertion simple
    console.log('🧪 Test d\'insertion d\'une notification...');
    const [result] = await conn.execute(
      'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, ?, ?, ?, NOW())',
      [1, 'TEST', 'Test de notification', 0]
    );
    
    if (result.insertId) {
      console.log('✅ Insertion réussie, ID:', result.insertId);
      
      // Nettoyer le test
      await conn.execute('DELETE FROM notifications WHERE id = ?', [result.insertId]);
      console.log('🧹 Test nettoyé');
    }
    
  } catch (err) {
    console.error('❌ Erreur lors du test:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

// Exécuter le test
testNotificationsTable().then(() => {
  console.log('🏁 Test terminé');
  process.exit(0);
}).catch(err => {
  console.error('💥 Erreur fatale:', err);
  process.exit(1);
});





