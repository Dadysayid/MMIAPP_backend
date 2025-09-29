const mysql = require("mysql2/promise");

// Configuration de la base de données
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "gestion_autorisations",
};

async function testArchiveDemandeur() {
  console.log("🧪 Test de l'endpoint Archive pour Demandeur");
  console.log("=============================================\n");

  try {
    // 1. Connexion à la base de données
    console.log("1️⃣ Connexion à la base de données...");
    const conn = await mysql.createConnection(dbConfig);
    console.log("✅ Connexion réussie\n");

    // 2. Vérifier la structure de la table archive_demandes
    console.log("2️⃣ Vérification de la structure de archive_demandes...");
    const [columns] = await conn.execute("DESCRIBE archive_demandes");
    console.log("📋 Colonnes de archive_demandes:");
    columns.forEach((col) => {
      console.log(
        `   - ${col.Field} (${col.Type}) ${
          col.Null === "NO" ? "NOT NULL" : "NULL"
        }`
      );
    });
    console.log("");

    // 3. Vérifier le contenu de archive_demandes
    console.log("3️⃣ Contenu de archive_demandes...");
    const [archives] = await conn.execute(
      "SELECT COUNT(*) as total FROM archive_demandes"
    );
    console.log(`📊 Total des archives: ${archives[0].total}`);

    if (archives[0].total > 0) {
      const [sampleArchives] = await conn.execute(`
        SELECT 
          id, demande_id, reference, type, nom_responsable, prenom_responsable, 
          statut, date_cloture, fichier_autorisation
        FROM archive_demandes 
        LIMIT 3
      `);

      console.log("📋 Exemples d'archives:");
      sampleArchives.forEach((archive, index) => {
        console.log(`   Archive ${index + 1}:`);
        console.log(`     - ID: ${archive.id}`);
        console.log(`     - Demande ID: ${archive.demande_id}`);
        console.log(`     - Référence: ${archive.reference}`);
        console.log(`     - Type: ${archive.type}`);
        console.log(
          `     - Responsable: ${archive.prenom_responsable} ${archive.nom_responsable}`
        );
        console.log(`     - Statut: ${archive.statut}`);
        console.log(`     - Date clôture: ${archive.date_cloture}`);
        console.log(
          `     - Fichier autorisation: ${
            archive.fichier_autorisation ? "Oui" : "Non"
          }`
        );
        console.log("");
      });
    }
    console.log("");

    // 4. Vérifier la relation avec la table demandes
    console.log(
      "4️⃣ Vérification de la relation demandes -> archive_demandes..."
    );
    const [demandesWithArchive] = await conn.execute(`
      SELECT 
        d.id as demande_id,
        d.reference,
        d.utilisateur_id,
        d.statut,
        ad.id as archive_id,
        ad.date_cloture
      FROM demandes d
      LEFT JOIN archive_demandes ad ON d.id = ad.demande_id
      WHERE d.statut IN ('AUTORISATION_SIGNEE', 'CLOTUREE')
      LIMIT 5
    `);

    console.log("🔗 Demandes avec archives:");
    demandesWithArchive.forEach((demande, index) => {
      console.log(`   Demande ${index + 1}:`);
      console.log(`     - ID: ${demande.demande_id}`);
      console.log(`     - Référence: ${demande.reference}`);
      console.log(`     - User ID: ${demande.utilisateur_id}`);
      console.log(`     - Statut: ${demande.statut}`);
      console.log(`     - Archive ID: ${demande.archive_id || "Non archivée"}`);
      console.log(`     - Date clôture: ${demande.date_cloture || "N/A"}`);
      console.log("");
    });

    // 5. Test de la requête de l'endpoint pour un demandeur
    console.log("5️⃣ Test de la requête de l'endpoint archive/demandes...");

    // Simuler un user_id de demandeur (remplacez par un ID réel)
    const testUserId = 1; // À adapter selon votre base

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
      console.log("📋 Première archive trouvée:");
      const firstArchive = testQuery[0];
      console.log(`   - ID: ${firstArchive.id}`);
      console.log(`   - Référence: ${firstArchive.reference}`);
      console.log(`   - Type: ${firstArchive.type}`);
      console.log(
        `   - Responsable: ${firstArchive.prenom_responsable} ${firstArchive.nom_responsable}`
      );
      console.log(`   - Statut: ${firstArchive.statut}`);
      console.log(`   - Date archivage: ${firstArchive.date_archivage}`);
      console.log(
        `   - Fichier autorisation: ${
          firstArchive.fichier_autorisation ? "Oui" : "Non"
        }`
      );
    }

    // 6. Fermeture de la connexion
    await conn.end();
    console.log("\n✅ Test terminé avec succès");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  }
}

// Exécuter le test
testArchiveDemandeur();
