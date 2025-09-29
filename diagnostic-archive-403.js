const mysql = require("mysql2/promise");

// Configuration de la base de données
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "gestion_autorisations",
};

async function diagnosticArchive403() {
  console.log("🚨 Diagnostic Erreur 403 Archive - URGENT");
  console.log("==========================================\n");

  try {
    // 1. Test de connexion
    console.log("1️⃣ Test de connexion à la base...");
    const conn = await mysql.createConnection(dbConfig);
    console.log("✅ Connexion réussie\n");

    // 2. Vérifier si la table archive_demandes existe
    console.log("2️⃣ Vérification de la table archive_demandes...");
    const [tables] = await conn.execute('SHOW TABLES LIKE "archive_demandes"');

    if (tables.length === 0) {
      console.log("❌ Table archive_demandes N'EXISTE PAS !");
      console.log("🔧 Création de la table...");

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
          INDEX idx_demande_id (demande_id),
          INDEX idx_user_id (demande_id)
        )
      `);
      console.log("✅ Table archive_demandes créée\n");
    } else {
      console.log("✅ Table archive_demandes existe\n");
    }

    // 3. Vérifier le contenu de la table
    console.log("3️⃣ Contenu de archive_demandes...");
    const [count] = await conn.execute(
      "SELECT COUNT(*) as total FROM archive_demandes"
    );
    console.log(`📊 Total des archives: ${count[0].total}`);

    if (count[0].total === 0) {
      console.log(
        "⚠️ Aucune archive trouvée - Création d'une archive de test..."
      );

      // Insérer une archive de test
      await conn.execute(`
        INSERT INTO archive_demandes (
          demande_id, reference, type, nom_responsable, prenom_responsable, 
          statut, fichier_autorisation, donnees
        ) VALUES (
          1, 'TEST-2025-0001', 'eau minérale', 'Test', 'Demandeur',
          'CLOTUREE', 'test_autorisation.pdf', '{"test": "donnees"}'
        )
      `);
      console.log("✅ Archive de test créée\n");
    }

    // 4. Vérifier la table demandes
    console.log("4️⃣ Vérification de la table demandes...");
    const [demandesCount] = await conn.execute(
      "SELECT COUNT(*) as total FROM demandes"
    );
    console.log(`📊 Total des demandes: ${demandesCount[0].total}`);

    if (demandesCount[0].total > 0) {
      const [sampleDemandes] = await conn.execute(`
        SELECT id, user_id, reference, statut 
        FROM demandes 
        LIMIT 3
      `);

      console.log("📋 Exemples de demandes:");
      sampleDemandes.forEach((demande, index) => {
        console.log(
          `   Demande ${index + 1}: ID=${demande.id}, User=${
            demande.user_id
          }, Ref=${demande.reference}, Statut=${demande.statut}`
        );
      });
      console.log("");
    }

    // 5. Vérifier la table utilisateurs
    console.log("5️⃣ Vérification de la table utilisateurs...");
    const [usersCount] = await conn.execute(
      "SELECT COUNT(*) as total FROM utilisateurs"
    );
    console.log(`📊 Total des utilisateurs: ${usersCount[0].total}`);

    if (usersCount[0].total > 0) {
      const [sampleUsers] = await conn.execute(`
        SELECT id, email, role_id, nom_responsable, prenom_responsable
        FROM utilisateurs 
        WHERE role_id = 4
        LIMIT 3
      `);

      console.log("👥 Utilisateurs demandeurs (role_id = 4):");
      if (sampleUsers.length > 0) {
        sampleUsers.forEach((user, index) => {
          console.log(
            `   User ${index + 1}: ID=${user.id}, Email=${user.email}, Role=${
              user.role_id
            }, Nom=${user.prenom_responsable} ${user.nom_responsable}`
          );
        });
      } else {
        console.log("   ⚠️ Aucun utilisateur avec role_id = 4 trouvé");
      }
      console.log("");
    }

    // 6. Test de la requête de l'endpoint
    console.log("6️⃣ Test de la requête de l'endpoint archive/demandes...");

    // Simuler avec user_id = 1
    const testUserId = 1;

    try {
      const [testQuery] = await conn.execute(
        `
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
        WHERE ad.demande_id IN (
          SELECT id FROM demandes WHERE utilisateur_id = ?
        )
        ORDER BY ad.date_cloture DESC
      `,
        [testUserId]
      );

      console.log(
        `🔍 Résultats pour user_id ${testUserId}: ${testQuery.length} archives trouvées`
      );

      if (testQuery.length > 0) {
        console.log("📋 Première archive:");
        const first = testQuery[0];
        console.log(
          `   - ID: ${first.id}, Référence: ${first.reference}, Type: ${first.type}`
        );
      }
    } catch (queryError) {
      console.log(`❌ Erreur dans la requête: ${queryError.message}`);
    }

    // 7. Fermeture
    await conn.end();
    console.log("\n✅ Diagnostic terminé");
  } catch (error) {
    console.error("❌ Erreur lors du diagnostic:", error);
  }
}

// Exécuter le diagnostic
diagnosticArchive403();
