const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisation'
};

async function testDownloadAccuse() {
  try {
    console.log('🔍 Test de diagnostic téléchargement accusés...');
    
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion DB OK');
    
    // Test 1: Vérifier les demandes avec accusés
    const [demandesAvecAccuses] = await conn.execute(
      'SELECT id, reference, fichier_accuse FROM demandes WHERE fichier_accuse IS NOT NULL LIMIT 5'
    );
    console.log('📋 Demandes avec accusés:', demandesAvecAccuses);
    
    // Test 2: Vérifier qu'un fichier d'accusé existe physiquement
    if (demandesAvecAccuses.length > 0) {
      const demande = demandesAvecAccuses[0];
      const filePath = path.join(__dirname, 'uploads', demande.fichier_accuse);
      console.log('📁 Chemin du fichier:', filePath);
      console.log('📁 Fichier existe:', fs.existsSync(filePath));
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log('📊 Taille du fichier:', stats.size, 'bytes');
      }
    }
    
    // Test 3: Vérifier le dossier uploads/accuses
    const accusesDir = path.join(__dirname, 'uploads', 'accuses');
    console.log('📁 Dossier accuses existe:', fs.existsSync(accusesDir));
    
    if (fs.existsSync(accusesDir)) {
      const files = fs.readdirSync(accusesDir);
      console.log('📋 Fichiers dans accuses:', files.slice(0, 5));
    }
    
    await conn.end();
    console.log('✅ Test terminé');
    
  } catch (err) {
    console.error('❌ Erreur lors du test:', err);
  }
}

// Exécuter le test
testDownloadAccuse();



