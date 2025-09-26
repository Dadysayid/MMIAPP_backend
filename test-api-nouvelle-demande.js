const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testApiNouvelleDemande() {
  try {
    console.log('🧪 Test de l\'API /api/nouvelle-demande...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Simuler la création d'une référence
    console.log('📋 1. Test de génération de référence...');
    try {
      const today = new Date();
      const dateStr = today.getFullYear().toString() + 
                     (today.getMonth() + 1).toString().padStart(2, '0') + 
                     today.getDate().toString().padStart(2, '0');
      
      console.log(`   📅 Date du jour: ${dateStr}`);
      
      // Chercher la dernière référence du jour
      const [lastRef] = await conn.execute(`
        SELECT reference 
        FROM demandes 
        WHERE reference LIKE ? 
        ORDER BY reference DESC 
        LIMIT 1
      `, [`${dateStr}-%`]);
      
      if (lastRef.length > 0) {
        console.log(`   🔍 Dernière référence trouvée: ${lastRef[0].reference}`);
        
        // Extraire le numéro de séquence
        const sequencePart = lastRef[0].reference.substring(9);
        const nextSequence = parseInt(sequencePart) + 1;
        const newReference = `${dateStr}-${nextSequence.toString().padStart(4, '0')}`;
        
        console.log(`   ✨ Nouvelle référence générée: ${newReference}`);
      } else {
        console.log(`   ✨ Première référence du jour: ${dateStr}-0001`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur génération référence: ${error.message}`);
    }
    
    // 2. Tester l'insertion d'une demande
    console.log('\n📝 2. Test d\'insertion de demande...');
    try {
      // Vérifier qu'il y a au moins un utilisateur
      const [users] = await conn.execute('SELECT id, role_id FROM utilisateurs LIMIT 1');
      
      if (users.length > 0) {
        const testUser = users[0];
        console.log(`   👤 Utilisateur test trouvé: ID ${testUser.id}, Rôle ${testUser.role_id}`);
        
        // Tester l'insertion
        const testData = {
          type: 'test',
          adresse: 'adresse test',
          description: 'description test'
        };
        
        const [insertResult] = await conn.execute(`
          INSERT INTO demandes (utilisateur_id, type, reference, statut, donnees)
          VALUES (?, ?, ?, ?, ?)
        `, [testUser.id, 'test', 'TEST-001', 'EN_ATTENTE', JSON.stringify(testData)]);
        
        console.log(`   ✅ Insertion test réussie: ID ${insertResult.insertId}`);
        
        // Nettoyer le test
        await conn.execute('DELETE FROM demandes WHERE id = ?', [insertResult.insertId]);
        console.log(`   🧹 Test nettoyé`);
        
      } else {
        console.log(`   ❌ Aucun utilisateur trouvé pour le test`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur insertion test: ${error.message}`);
      console.log(`   💡 Cette erreur peut expliquer l'erreur 500 !`);
    }
    
    // 3. Vérifier les contraintes
    console.log('\n🔍 3. Vérification des contraintes...');
    try {
      const [constraints] = await conn.execute(`
        SELECT 
          CONSTRAINT_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = 'gestion_autorisations' 
        AND TABLE_NAME = 'demandes'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      if (constraints.length > 0) {
        console.log(`   ✅ Contraintes trouvées: ${constraints.length}`);
        constraints.forEach(constraint => {
          console.log(`      - ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
        });
      } else {
        console.log(`   ⚠️ Aucune contrainte trouvée`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur vérification contraintes: ${error.message}`);
    }
    
    await conn.end();
    
    console.log('\n✅ Test terminé !');
    console.log('💡 Si des erreurs apparaissent, elles expliquent l\'erreur 500');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testApiNouvelleDemande();



