const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function verifierStructureTables() {
  try {
    console.log('🔍 Vérification de la structure des tables...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Lister toutes les tables
    console.log('📋 1. Tables existantes :');
    const [tables] = await conn.execute('SHOW TABLES');
    console.log('   ✅ Tables trouvées :');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`      - ${tableName}`);
    });
    
    // 2. Vérifier la structure de la table demandes
    console.log('\n📋 2. Structure de la table demandes :');
    try {
      const [structure] = await conn.execute('DESCRIBE demandes');
      console.log('   ✅ Colonnes de la table demandes :');
      structure.forEach(col => {
        console.log(`      - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.Key === 'PRI' ? '[PRIMARY]' : ''}`);
      });
    } catch (error) {
      console.log(`   ❌ Erreur structure demandes: ${error.message}`);
    }
    
    // 3. Vérifier la structure de la table utilisateurs
    console.log('\n👥 3. Structure de la table utilisateurs :');
    try {
      const [structureUsers] = await conn.execute('DESCRIBE utilisateurs');
      console.log('   ✅ Colonnes de la table utilisateurs :');
      structureUsers.forEach(col => {
        console.log(`      - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.Key === 'PRI' ? '[PRIMARY]' : ''}`);
      });
    } catch (error) {
      console.log(`   ❌ Erreur structure utilisateurs: ${error.message}`);
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
    
    // 5. Vérifier les contraintes
    console.log('\n🔑 5. Clés et contraintes :');
    try {
      const [keys] = await conn.execute('SHOW KEYS FROM demandes');
      console.log('   ✅ Clés de la table demandes :');
      keys.forEach(key => {
        console.log(`      - ${key.Key_name}: ${key.Column_name} (${key.Non_unique ? 'Non-unique' : 'Unique'})`);
      });
    } catch (error) {
      console.log(`   ❌ Erreur clés: ${error.message}`);
    }
    
    // 6. Test de connexion simple
    console.log('\n🧪 6. Test de connexion simple :');
    try {
      const [test] = await conn.execute('SELECT 1 as test');
      console.log(`   ✅ Connexion OK: ${test[0].test}`);
    } catch (error) {
      console.log(`   ❌ Erreur connexion: ${error.message}`);
    }
    
    await conn.end();
    
    console.log('\n✅ Vérification terminée !');
    console.log('💡 Si des tables manquent, elles doivent être créées');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    console.log('💡 Vérifiez que :');
    console.log('   - MySQL est démarré');
    console.log('   - Les identifiants sont corrects');
    console.log('   - La base gestion_autorisations existe');
  }
}

verifierStructureTables();



