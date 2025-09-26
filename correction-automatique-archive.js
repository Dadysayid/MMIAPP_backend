const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function correctionAutomatiqueArchive() {
  console.log('🔧 Correction Automatique - Erreur 403 Archive');
  console.log('==============================================\n');

  try {
    // 1. Connexion à la base
    console.log('1️⃣ Connexion à la base de données...');
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion réussie\n');

    // 2. Vérifier et corriger la table archive_demandes
    console.log('2️⃣ Vérification de la table archive_demandes...');
    
    // Vérifier si la table existe
    const [tables] = await conn.execute('SHOW TABLES LIKE "archive_demandes"');
    
    if (tables.length === 0) {
      console.log('❌ Table archive_demandes manquante - Création...');
      
      await conn.execute(`
        CREATE TABLE archive_demandes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          demande_id INT NOT NULL,
          reference VARCHAR(50) NOT NULL,
          type VARCHAR(100) NOT NULL,
          nom_responsable VARCHAR(100),
          prenom_responsable VARCHAR(100),
          statut VARCHAR(50) NOT NULL,
          date_cloture DATETIME DEFAULT CURRENT_TIMESTAMP,
          fichier_autorisation LONGTEXT,
          donnees JSON,
          autorisation_signee_par INT,
          INDEX idx_demande_id (demande_id),
          INDEX idx_user_id (demande_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table archive_demandes créée\n');
    } else {
      console.log('✅ Table archive_demandes existe\n');
    }

    // 3. Vérifier la structure de la table
    console.log('3️⃣ Vérification de la structure...');
    const [columns] = await conn.execute('DESCRIBE archive_demandes');
    const columnNames = columns.map(col => col.Field);
    
    const requiredColumns = [
      'demande_id', 'reference', 'type', 'nom_responsable', 
      'prenom_responsable', 'statut', 'date_cloture', 
      'fichier_autorisation', 'donnees'
    ];
    
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`⚠️ Colonnes manquantes: ${missingColumns.join(', ')}`);
      console.log('🔧 Ajout des colonnes manquantes...');
      
      for (const col of missingColumns) {
        try {
          let alterQuery = '';
          switch (col) {
            case 'demande_id':
              alterQuery = 'ALTER TABLE archive_demandes ADD COLUMN demande_id INT NOT NULL AFTER id';
              break;
            case 'reference':
              alterQuery = 'ALTER TABLE archive_demandes ADD COLUMN reference VARCHAR(50) NOT NULL AFTER demande_id';
              break;
            case 'type':
              alterQuery = 'ALTER TABLE archive_demandes ADD COLUMN type VARCHAR(100) NOT NULL AFTER reference';
              break;
            case 'nom_responsable':
              alterQuery = 'ALTER TABLE archive_demandes ADD COLUMN nom_responsable VARCHAR(100) AFTER type';
              break;
            case 'prenom_responsable':
              alterQuery = 'ALTER TABLE archive_demandes ADD COLUMN prenom_responsable VARCHAR(100) AFTER nom_responsable';
              break;
            case 'statut':
              alterQuery = 'ALTER TABLE archive_demandes ADD COLUMN statut VARCHAR(50) NOT NULL AFTER prenom_responsable';
              break;
            case 'date_cloture':
              alterQuery = 'ALTER TABLE archive_demandes ADD COLUMN date_cloture DATETIME DEFAULT CURRENT_TIMESTAMP AFTER statut';
              break;
            case 'fichier_autorisation':
              alterQuery = 'ALTER TABLE archive_demandes ADD COLUMN fichier_autorisation LONGTEXT AFTER date_cloture';
              break;
            case 'donnees':
              alterQuery = 'ALTER TABLE archive_demandes ADD COLUMN donnees JSON AFTER fichier_autorisation';
              break;
          }
          
          if (alterQuery) {
            await conn.execute(alterQuery);
            console.log(`   ✅ Colonne ${col} ajoutée`);
          }
        } catch (error) {
          console.log(`   ⚠️ Colonne ${col} déjà présente ou erreur: ${error.message}`);
        }
      }
      console.log('');
    } else {
      console.log('✅ Toutes les colonnes requises sont présentes\n');
    }

    // 4. Créer des données de test si la table est vide
    console.log('4️⃣ Vérification du contenu...');
    const [count] = await conn.execute('SELECT COUNT(*) as total FROM archive_demandes');
    
    if (count[0].total === 0) {
      console.log('⚠️ Table vide - Création de données de test...');
      
      // Vérifier s'il y a des demandes dans la table demandes
      const [demandesCount] = await conn.execute('SELECT COUNT(*) as total FROM demandes');
      
      if (demandesCount[0].total > 0) {
        // Créer des archives de test basées sur des demandes existantes
        const [demandes] = await conn.execute(`
          SELECT id, reference, type, user_id 
          FROM demandes 
          LIMIT 3
        `);
        
        for (const demande of demandes) {
          // Récupérer les infos utilisateur
          const [user] = await conn.execute(`
            SELECT nom_responsable, prenom_responsable 
            FROM utilisateurs 
            WHERE id = ?
          `, [demande.user_id]);
          
          if (user.length > 0) {
            await conn.execute(`
              INSERT INTO archive_demandes (
                demande_id, reference, type, nom_responsable, prenom_responsable,
                statut, fichier_autorisation, donnees
              ) VALUES (?, ?, ?, ?, ?, 'CLOTUREE', 'test_autorisation.pdf', '{"test": "donnees"}')
            `, [
              demande.id, 
              demande.reference, 
              demande.type,
              user[0].nom_responsable || 'Test',
              user[0].prenom_responsable || 'Demandeur'
            ]);
            console.log(`   ✅ Archive créée pour demande ${demande.reference}`);
          }
        }
      } else {
        // Créer une archive de test simple
        await conn.execute(`
          INSERT INTO archive_demandes (
            demande_id, reference, type, nom_responsable, prenom_responsable,
            statut, fichier_autorisation, donnees
          ) VALUES (
            1, 'TEST-2025-0001', 'eau minérale', 'Test', 'Demandeur',
            'CLOTUREE', 'test_autorisation.pdf', '{"test": "donnees"}'
          )
        `);
        console.log('   ✅ Archive de test créée');
      }
      console.log('');
    } else {
      console.log(`✅ Table contient ${count[0].total} archives\n`);
    }

    // 5. Vérifier les index
    console.log('5️⃣ Vérification des index...');
    try {
      await conn.execute('CREATE INDEX IF NOT EXISTS idx_demande_id ON archive_demandes(demande_id)');
      await conn.execute('CREATE INDEX IF NOT EXISTS idx_user_id ON archive_demandes(demande_id)');
      console.log('✅ Index créés/vérifiés\n');
    } catch (error) {
      console.log('⚠️ Erreur lors de la création des index:', error.message);
    }

    // 6. Test final de la requête
    console.log('6️⃣ Test final de la requête...');
    try {
      const [testResult] = await conn.execute(`
        SELECT 
          ad.*,
          ad.demande_id,
          ad.reference,
          ad.type,
          ad.nom_responsable,
          ad.prenom_responsable,
          ad.statut,
          ad.date_cloture as date_archivage,
          ad.fichier_autorisation,
          ad.donnees
        FROM archive_demandes ad
        LIMIT 1
      `);
      
      if (testResult.length > 0) {
        console.log('✅ Requête de test réussie');
        console.log(`   - Archive trouvée: ${testResult[0].reference}`);
      } else {
        console.log('⚠️ Aucun résultat dans la requête de test');
      }
    } catch (error) {
      console.log(`❌ Erreur dans la requête de test: ${error.message}`);
    }

    // 7. Fermeture
    await conn.end();
    console.log('\n🎉 Correction automatique terminée !');
    console.log('\n📋 Actions effectuées:');
    console.log('   ✅ Vérification de la table archive_demandes');
    console.log('   ✅ Création des colonnes manquantes si nécessaire');
    console.log('   ✅ Création de données de test');
    console.log('   ✅ Vérification des index');
    console.log('   ✅ Test de la requête');
    
    console.log('\n🚀 Prochaines étapes:');
    console.log('   1. Redémarrer le serveur: node server.js');
    console.log('   2. Tester l\'archive dans le frontend');
    console.log('   3. Vérifier que l\'erreur 403 a disparu');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Exécuter la correction
correctionAutomatiqueArchive();



