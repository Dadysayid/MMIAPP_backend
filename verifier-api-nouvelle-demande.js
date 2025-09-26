const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function verifierApiNouvelleDemande() {
  try {
    console.log('🔍 Diagnostic de l\'API /api/nouvelle-demande (Erreur 500)...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier la structure de la table demandes
    console.log('📋 1. Structure de la table demandes :');
    try {
      const [structure] = await conn.execute('DESCRIBE demandes');
      console.log('   ✅ Structure de la table demandes :');
      structure.forEach(col => {
        console.log(`      - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      });
    } catch (error) {
      console.log(`   ❌ Erreur structure: ${error.message}`);
    }
    
    // 2. Vérifier la table utilisateurs
    console.log('\n👥 2. Structure de la table utilisateurs :');
    try {
      const [structureUsers] = await conn.execute('DESCRIBE utilisateurs');
      console.log('   ✅ Structure de la table utilisateurs :');
      structureUsers.forEach(col => {
        console.log(`      - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      });
    } catch (error) {
      console.log(`   ❌ Erreur structure utilisateurs: ${error.message}`);
    }
    
    // 3. Vérifier les contraintes et clés
    console.log('\n🔑 3. Clés et contraintes :');
    try {
      const [keys] = await conn.execute('SHOW KEYS FROM demandes');
      console.log('   ✅ Clés de la table demandes :');
      keys.forEach(key => {
        console.log(`      - ${key.Key_name}: ${key.Column_name} (${key.Non_unique ? 'Non-unique' : 'Unique'})`);
      });
    } catch (error) {
      console.log(`   ❌ Erreur clés: ${error.message}`);
    }
    
    // 4. Vérifier les données existantes
    console.log('\n📊 4. Données existantes :');
    try {
      const [countDemandes] = await conn.execute('SELECT COUNT(*) as total FROM demandes');
      const [countUsers] = await conn.execute('SELECT COUNT(*) as total FROM utilisateurs');
      console.log(`   📋 Demandes: ${countDemandes[0].total}`);
      console.log(`   👥 Utilisateurs: ${countUsers[0].total}`);
    } catch (error) {
      console.log(`   ❌ Erreur comptage: ${error.message}`);
    }
    
    // 5. Vérifier les logs d'erreur possibles
    console.log('\n🚨 5. Diagnostic des erreurs courantes :');
    console.log('   💡 Erreur 500 sur /api/nouvelle-demande peut être causée par :');
    console.log('      - Champs manquants dans la base de données');
    console.log('      - Contraintes non respectées');
    console.log('      - Problème de connexion à la base');
    console.log('      - Erreur dans la fonction generateReferenceMiddleware');
    
    await conn.end();
    
    console.log('\n✅ Diagnostic terminé !');
    console.log('💡 Vérifiez les logs du serveur pour plus de détails sur l\'erreur 500');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  }
}

verifierApiNouvelleDemande();



