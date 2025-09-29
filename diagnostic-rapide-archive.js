const mysql = require("mysql2/promise");

// Configuration de la base de données
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "gestion_autorisations",
};

async function diagnosticRapideArchive() {
  console.log("🔍 Diagnostic Rapide - Erreur Récupération Archive");
  console.log("==================================================\n");

  try {
    // 1. Connexion rapide
    console.log("1️⃣ Connexion à la base...");
    const conn = await mysql.createConnection(dbConfig);
    console.log("✅ Connexion réussie\n");

    // 2. Vérification rapide de la table archive_demandes
    console.log("2️⃣ Vérification de archive_demandes...");

    try {
      const [tables] = await conn.execute(
        'SHOW TABLES LIKE "archive_demandes"'
      );
      if (tables.length === 0) {
        console.log("❌ Table archive_demandes N'EXISTE PAS !");
        console.log("🔧 Création immédiate...");

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
            autorisation_signee_par INT
          )
        `);
        console.log("✅ Table créée\n");
      } else {
        console.log("✅ Table archive_demandes existe\n");
      }
    } catch (error) {
      console.log(`❌ Erreur création table: ${error.message}\n`);
    }

    // 3. Vérification du contenu
    console.log("3️⃣ Contenu de archive_demandes...");
    try {
      const [count] = await conn.execute(
        "SELECT COUNT(*) as total FROM archive_demandes"
      );
      console.log(`📊 Total: ${count[0].total} archives`);

      if (count[0].total === 0) {
        console.log("⚠️ Table vide - Création archive de test...");
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
    } catch (error) {
      console.log(`❌ Erreur contenu: ${error.message}\n`);
    }

    // 4. Test de la requête exacte de l'endpoint
    console.log("4️⃣ Test de la requête de l'endpoint...");

    try {
      // Simuler la requête pour un demandeur (user_id = 1)
      const [testResult] = await conn.execute(
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
        [1]
      );

      console.log(`✅ Requête réussie: ${testResult.length} résultats`);

      if (testResult.length > 0) {
        console.log("📋 Première archive:");
        const first = testResult[0];
        console.log(`   - ID: ${first.id}`);
        console.log(`   - Référence: ${first.reference}`);
        console.log(`   - Type: ${first.type}`);
        console.log(
          `   - Responsable: ${first.prenom_responsable} ${first.nom_responsable}`
        );
        console.log(`   - Statut: ${first.statut}`);
        console.log(`   - Date: ${first.date_archivage}`);
        console.log(
          `   - Autorisation: ${first.fichier_autorisation ? "Oui" : "Non"}`
        );
      }
    } catch (error) {
      console.log(`❌ Erreur requête: ${error.message}`);

      // Diagnostic détaillé de l'erreur
      if (error.message.includes("Unknown column")) {
        console.log("🔍 Problème: Colonne manquante dans archive_demandes");
        console.log("🔧 Solution: Vérifier la structure de la table");
      } else if (error.message.includes("Table")) {
        console.log("🔍 Problème: Table manquante ou inaccessible");
        console.log("🔧 Solution: Créer la table archive_demandes");
      } else if (error.message.includes("demandes")) {
        console.log("🔍 Problème: Table demandes inaccessible");
        console.log("🔧 Solution: Vérifier la table demandes");
      }
    }

    // 5. Vérification des tables liées
    console.log("\n5️⃣ Vérification des tables liées...");

    try {
      const [demandesCount] = await conn.execute(
        "SELECT COUNT(*) as total FROM demandes"
      );
      console.log(`📊 Table demandes: ${demandesCount[0].total} demandes`);

      const [usersCount] = await conn.execute(
        "SELECT COUNT(*) as total FROM utilisateurs"
      );
      console.log(`👥 Table utilisateurs: ${usersCount[0].total} utilisateurs`);

      // Vérifier un utilisateur demandeur
      const [demandeurs] = await conn.execute(
        "SELECT id, email, role_id FROM utilisateurs WHERE role_id = 4 LIMIT 1"
      );
      if (demandeurs.length > 0) {
        console.log(
          `✅ Demandeur trouvé: ID=${demandeurs[0].id}, Email=${demandeurs[0].email}`
        );
      } else {
        console.log("⚠️ Aucun utilisateur avec role_id = 4 trouvé");
      }
    } catch (error) {
      console.log(`❌ Erreur tables liées: ${error.message}`);
    }

    // 6. Fermeture
    await conn.end();
    console.log("\n✅ Diagnostic terminé");

    // Recommandations
    console.log("\n📋 Recommandations:");
    if (count && count[0].total === 0) {
      console.log("   🔧 Créer des archives de test");
    }
    console.log("   🔧 Vérifier la structure de archive_demandes");
    console.log("   🔧 Tester l'endpoint après correction");
  } catch (error) {
    console.error("❌ Erreur générale:", error.message);
  }
}

// Exécuter le diagnostic
diagnosticRapideArchive();
