// Script de test pour vérifier la structure exacte de la table notifications
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testNotificationsStructure() {
  let conn;
  try {
    console.log('🔍 Test de la structure de la table notifications...');
    
    conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier si la table existe
    const [tables] = await conn.execute('SHOW TABLES LIKE "notifications"');
    if (tables.length === 0) {
      console.log('❌ Table notifications n\'existe pas');
      console.log('💡 Création de la table avec la bonne structure...');
      
      await conn.execute(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          utilisateur_id INT NOT NULL,
          type VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          lu TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_utilisateur_id (utilisateur_id),
          INDEX idx_type (type),
          INDEX idx_lu (lu),
          INDEX idx_created_at (created_at)
        )
      `);
      console.log('✅ Table notifications créée avec succès');
    } else {
      console.log('✅ Table notifications existe');
    }
    
    // 2. Vérifier la structure actuelle
    const [columns] = await conn.execute('DESCRIBE notifications');
    console.log('\n📋 Structure actuelle de la table notifications:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    // 3. Vérifier s'il y a des colonnes problématiques
    const problematicColumns = columns.filter(col => 
      ['demande_id', 'date_envoi', 'statut'].includes(col.Field)
    );
    
    if (problematicColumns.length > 0) {
      console.log('\n⚠️  Colonnes problématiques détectées:');
      problematicColumns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
      console.log('💡 Suppression des colonnes problématiques...');
      
      for (const col of problematicColumns) {
        try {
          await conn.execute(`ALTER TABLE notifications DROP COLUMN ${col.Field}`);
          console.log(`✅ Colonne ${col.Field} supprimée`);
        } catch (dropErr) {
          console.log(`⚠️  Impossible de supprimer ${col.Field}: ${dropErr.message}`);
        }
      }
    } else {
      console.log('\n✅ Aucune colonne problématique détectée');
    }
    
    // 4. Vérifier la structure finale
    const [finalColumns] = await conn.execute('DESCRIBE notifications');
    console.log('\n📋 Structure finale de la table notifications:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    // 5. Tester une insertion simple
    console.log('\n🧪 Test d\'insertion d\'une notification...');
    const [result] = await conn.execute(
      'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, ?, ?, ?, NOW())',
      [1, 'TEST', 'Test de notification après correction', 0]
    );
    
    if (result.insertId) {
      console.log('✅ Insertion réussie, ID:', result.insertId);
      
      // Vérifier l'insertion
      const [testRow] = await conn.execute('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
      console.log('📝 Données insérées:', testRow[0]);
      
      // Nettoyer le test
      await conn.execute('DELETE FROM notifications WHERE id = ?', [result.insertId]);
      console.log('🧹 Test nettoyé');
    }
    
    console.log('\n🎉 Test de structure terminé avec succès !');
    
  } catch (err) {
    console.error('❌ Erreur lors du test:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    if (conn) await conn.end();
  }
}

// Exécuter le test
testNotificationsStructure().then(() => {
  console.log('\n🏁 Test terminé');
  process.exit(0);
}).catch(err => {
  console.error('\n💥 Erreur fatale:', err);
  process.exit(1);
});





