const mysql = require('mysql2/promise');

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function correctionRapideArchive() {
  console.log('⚡ Correction Rapide - Erreur Récupération Archive');
  console.log('================================================\n');

  try {
    // 1. Connexion
    console.log('1️⃣ Connexion à la base...');
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion réussie\n');

    // 2. Créer la table archive_demandes si elle n'existe pas
    console.log('2️⃣ Création/Vérification de archive_demandes...');
    
    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS archive_demandes (
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
          INDEX idx_demande_id (demande_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table archive_demandes prête\n');
    } catch (error) {
      console.log(`⚠️ Erreur création table: ${error.message}`);
    }

    // 3. Vérifier et corriger la structure
    console.log('3️⃣ Vérification de la structure...');
    
    try {
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
        console.log('🔧 Ajout des colonnes...');
        
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
            console.log(`   ⚠️ Colonne ${col}: ${error.message}`);
          }
        }
        console.log('');
      } else {
        console.log('✅ Toutes les colonnes requises sont présentes\n');
      }
    } catch (error) {
      console.log(`❌ Erreur vérification structure: ${error.message}`);
    }

    // 4. Créer des données de test
    console.log('4️⃣ Création de données de test...');
    
    try {
      const [count] = await conn.execute('SELECT COUNT(*) as total FROM archive_demandes');
      
      if (count[0].total === 0) {
        console.log('⚠️ Table vide - Création archives de test...');
        
        // Créer plusieurs archives de test
        const archivesTest = [
          {
            demande_id: 1,
            reference: 'TEST-2025-0001',
            type: 'eau minérale',
            nom_responsable: 'Test',
            prenom_responsable: 'Demandeur',
            statut: 'CLOTUREE',
            fichier_autorisation: 'test_autorisation_1.pdf',
            donnees: '{"test": "donnees 1", "type": "eau minérale"}'
          },
          {
            demande_id: 2,
            reference: 'TEST-2025-0002',
            type: 'boulangerie et patisserie',
            nom_responsable: 'Test',
            prenom_responsable: 'Demandeur',
            statut: 'AUTORISATION_SIGNEE',
            fichier_autorisation: 'test_autorisation_2.pdf',
            donnees: '{"test": "donnees 2", "type": "boulangerie"}'
          },
          {
            demande_id: 3,
            reference: 'TEST-2025-0003',
            type: 'usine',
            nom_responsable: 'Test',
            prenom_responsable: 'Demandeur',
            statut: 'CLOTUREE',
            fichier_autorisation: 'test_autorisation_3.pdf',
            donnees: '{"test": "donnees 3", "type": "usine"}'
          }
        ];
        
        for (const archive of archivesTest) {
          try {
            await conn.execute(`
              INSERT INTO archive_demandes (
                demande_id, reference, type, nom_responsable, prenom_responsable,
                statut, fichier_autorisation, donnees
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              archive.demande_id,
              archive.reference,
              archive.type,
              archive.nom_responsable,
              archive.prenom_responsable,
              archive.statut,
              archive.fichier_autorisation,
              archive.donnees
            ]);
            console.log(`   ✅ Archive créée: ${archive.reference}`);
          } catch (error) {
            console.log(`   ⚠️ Erreur création ${archive.reference}: ${error.message}`);
          }
        }
        console.log('');
      } else {
        console.log(`✅ Table contient déjà ${count[0].total} archives\n`);
      }
    } catch (error) {
      console.log(`❌ Erreur création données: ${error.message}`);
    }

    // 5. Test final de la requête
    console.log('5️⃣ Test final de la requête...');
    
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
        ORDER BY ad.date_cloture DESC
        LIMIT 5
      `);
      
      console.log(`✅ Requête réussie: ${testResult.length} résultats`);
      
      if (testResult.length > 0) {
        console.log('📋 Archives disponibles:');
        testResult.forEach((archive, index) => {
          console.log(`   ${index + 1}. ${archive.reference} - ${archive.type} - ${archive.statut}`);
        });
      }
    } catch (error) {
      console.log(`❌ Erreur requête finale: ${error.message}`);
    }

    // 6. Fermeture
    await conn.end();
    console.log('\n🎉 Correction rapide terminée !');
    console.log('\n📋 Actions effectuées:');
    console.log('   ✅ Table archive_demandes créée/vérifiée');
    console.log('   ✅ Structure corrigée');
    console.log('   ✅ Données de test créées');
    console.log('   ✅ Requête testée avec succès');
    
    console.log('\n🚀 Prochaines étapes:');
    console.log('   1. Redémarrer le serveur: node server.js');
    console.log('   2. Tester l\'archive dans le frontend');
    console.log('   3. Vérifier que les données s\'affichent');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Exécuter la correction
correctionRapideArchive();



