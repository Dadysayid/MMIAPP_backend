const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function addAutorisationPdfColumn() {
  try {
    console.log('🔧 Ajout de la colonne autorisation_pdf à la table demandes...');
  
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion à la base de données réussie');
    
    // Vérifier si la colonne existe déjà
    const [columns] = await conn.execute('DESCRIBE demandes');
    const columnExists = columns.some(col => col.Field === 'autorisation_pdf');
    
    if (columnExists) {
      console.log('ℹ️ La colonne autorisation_pdf existe déjà');
    } else {
      // Ajouter la colonne
      await conn.execute(`
        ALTER TABLE demandes 
        ADD COLUMN autorisation_pdf VARCHAR(500) NULL 
        COMMENT 'Chemin vers le fichier PDF d\'autorisation généré'
      `);
      console.log('✅ Colonne autorisation_pdf ajoutée avec succès');
    }
    
    // Afficher la structure de la table
    const [newColumns] = await conn.execute('DESCRIBE demandes');
    console.log('📋 Structure de la table demandes:');
    newColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    await conn.end();
    console.log('✅ Script terminé avec succès');
    
  } catch (err) {
    console.error('❌ Erreur lors de l\'ajout de la colonne:', err);
    process.exit(1);
  }
}

// Exécuter le script
addAutorisationPdfColumn(); 
 