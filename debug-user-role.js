const mysql = require('mysql2/promise');

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function debugUserRole() {
  let connection;
  
  try {
    console.log('🔍 [DEBUG] Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ [DEBUG] Connexion réussie');
    
    // Vérifier la structure de la table utilisateurs
    console.log('\n📋 [DEBUG] Structure de la table utilisateurs:');
    const [columns] = await connection.execute('DESCRIBE utilisateurs');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.Default ? `DEFAULT: ${col.Default}` : ''}`);
    });
    
    // Vérifier les utilisateurs et leurs rôles
    console.log('\n👥 [DEBUG] Utilisateurs et leurs rôles:');
    const [users] = await connection.execute(`
      SELECT 
        id, 
        nom, 
        prenom, 
        email, 
        role_id,
        CASE 
          WHEN role_id IS NULL THEN 'NULL (Demandeur)'
          WHEN role_id = 0 THEN '0 (Demandeur)'
          WHEN role_id = 1 THEN '1 (SuperAdmin)'
          WHEN role_id = 2 THEN '2 (Secrétaire Central)'
          WHEN role_id = 3 THEN '3 (Secrétaire Général)'
          WHEN role_id = 5 THEN '5 (DDPI)'
          WHEN role_id = 6 THEN '6 (DGI)'
          WHEN role_id = 7 THEN '7 (Commission)'
          WHEN role_id = 8 THEN '8 (Comité)'
          WHEN role_id = 9 THEN '9 (Ministre)'
          WHEN role_id = 11 THEN '11 (DRMNE)'
          WHEN role_id = 12 THEN '12 (Secrétaire DGI)'
          ELSE CONCAT(role_id, ' (Rôle inconnu)')
        END as role_description
      FROM utilisateurs 
      ORDER BY role_id, nom
    `);
    
    users.forEach(user => {
      console.log(`  - ID: ${user.id} | Nom: ${user.nom} ${user.prenom} | Email: ${user.email} | Rôle: ${user.role_description}`);
    });
    
    // Compter les utilisateurs par rôle
    console.log('\n📊 [DEBUG] Statistiques par rôle:');
    const [roleStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN role_id IS NULL THEN 'NULL (Demandeur)'
          WHEN role_id = 0 THEN '0 (Demandeur)'
          WHEN role_id = 1 THEN '1 (SuperAdmin)'
          WHEN role_id = 2 THEN '2 (Secrétaire Central)'
          WHEN role_id = 3 THEN '3 (Secrétaire Général)'
          WHEN role_id = 5 THEN '5 (DDPI)'
          WHEN role_id = 6 THEN '6 (DGI)'
          WHEN role_id = 7 THEN '7 (Commission)'
          WHEN role_id = 8 THEN '8 (Comité)'
          WHEN role_id = 9 THEN '9 (Ministre)'
          WHEN role_id = 11 THEN '11 (DRMNE)'
          WHEN role_id = 12 THEN '12 (Secrétaire DGI)'
          ELSE CONCAT(role_id, ' (Rôle inconnu)')
        END as role_description,
        COUNT(*) as count
      FROM utilisateurs 
      GROUP BY role_id 
      ORDER BY role_id
    `);
    
    roleStats.forEach(stat => {
      console.log(`  - ${stat.role_description}: ${stat.count} utilisateur(s)`);
    });
    
    // Vérifier les utilisateurs qui pourraient être des demandeurs
    console.log('\n👤 [DEBUG] Utilisateurs potentiellement demandeurs:');
    const [demandeurs] = await connection.execute(`
      SELECT 
        id, 
        nom, 
        prenom, 
        email, 
        role_id,
        CASE 
          WHEN role_id IS NULL THEN 'NULL (Demandeur)'
          WHEN role_id = 0 THEN '0 (Demandeur)'
          ELSE CONCAT(role_id, ' (Rôle défini)')
        END as status
      FROM utilisateurs 
      WHERE role_id IS NULL OR role_id = 0 OR role_id NOT IN (1, 2, 3, 5, 6, 7, 8, 9, 11, 12)
      ORDER BY role_id, nom
    `);
    
    if (demandeurs.length === 0) {
      console.log('  - Aucun utilisateur demandeur trouvé');
    } else {
      demandeurs.forEach(user => {
        console.log(`  - ID: ${user.id} | Nom: ${user.nom} ${user.prenom} | Email: ${user.email} | Status: ${user.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erreur:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 [DEBUG] Connexion fermée');
    }
  }
}

// Exécuter le diagnostic
debugUserRole();



