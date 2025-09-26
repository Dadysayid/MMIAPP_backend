const mysql = require("mysql2/promise")

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
}

async function creerBaseDonnees() {
  try {
    console.log("🚀 Création de la base de données...\n")

    // 1. Connexion sans base de données
    const conn = await mysql.createConnection(dbConfig)

    // 2. Créer la base de données
    console.log("📊 1. Création de la base gestion_autorisation...")
    await conn.query(
      "CREATE DATABASE IF NOT EXISTS `gestion_autorisation` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
    )
    console.log("   ✅ Base de données créée !")

    // 3. Utiliser la base de données
   await conn.changeUser({ database: 'gestion_autorisation' });
    console.log("   ✅ Base de données sélectionnée !")

    // 4. Créer la table utilisateurs
    console.log("\n👥 2. Création de la table utilisateurs...")
    await conn.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role_id INT NOT NULL,
        nom_responsable VARCHAR(100),
        prenom_responsable VARCHAR(100),
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("   ✅ Table utilisateurs créée !")

    // 5. Créer la table demandes
    console.log("\n📋 3. Création de la table demandes...")
    await conn.query(`
      CREATE TABLE IF NOT EXISTS demandes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        type VARCHAR(100) NOT NULL,
        reference VARCHAR(50) UNIQUE NOT NULL,
        statut ENUM('EN_ATTENTE', 'EN_COURS_DDPI', 'VALIDEE_DDPI', 'TRANSMISE_A_DGI', 'EN_COURS_DGI', 'VALIDEE_DGI', 'TRANSMISE_AU_MINISTRE', 'EN_ATTENTE_SIGNATURE_MINISTRE', 'AUTORISATION_SIGNEE', 'CLOTUREE') DEFAULT 'EN_ATTENTE',
        donnees JSON,
        fichier_accuse LONGBLOB,
        fichier_autorisation LONGBLOB,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
      )
    `)
    console.log("   ✅ Table demandes créée !")

    // 6. Créer la table suivi_demandes
    console.log("\n📝 4. Création de la table suivi_demandes...")
    await conn.query(`
      CREATE TABLE IF NOT EXISTS suivi_demandes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        demande_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        utilisateur_id INT,
        details TEXT,
        date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (demande_id) REFERENCES demandes(id),
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
      )
    `)
    console.log("   ✅ Table suivi_demandes créée !")

    // 7. Créer la table notifications
    console.log("\n🔔 5. Création de la table notifications...")
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        message TEXT NOT NULL,
        lu BOOLEAN DEFAULT FALSE,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
      )
    `)
    console.log("   ✅ Table notifications créée !")

    // 8. Créer la table archive_demandes
    console.log("\n📦 6. Création de la table archive_demandes...")
    await conn.query(`
      CREATE TABLE IF NOT EXISTS archive_demandes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        demande_id INT NOT NULL,
        reference VARCHAR(50) NOT NULL,
        type VARCHAR(100) NOT NULL,
        nom_responsable VARCHAR(100) NOT NULL,
        prenom_responsable VARCHAR(100) NOT NULL,
        statut VARCHAR(50) NOT NULL,
        donnees JSON,
        fichier_autorisation LONGBLOB,
        date_archivage TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("   ✅ Table archive_demandes créée !")

    // 9. Créer la table signatures_ministre
    console.log("\n✍️ 7. Création de la table signatures_ministre...")
    await conn.query(`
      CREATE TABLE IF NOT EXISTS signatures_ministre (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        fichier_signature VARCHAR(255) NOT NULL,
        type_signature ENUM('UPLOAD', 'ELECTRONIQUE') DEFAULT 'UPLOAD',
        statut ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
      )
    `)
    console.log("   ✅ Table signatures_ministre créée !")

    // 10. Insérer des utilisateurs de test
    console.log("\n👤 8. Création des utilisateurs de test...")

    // Super Admin
    await conn.query(`
      INSERT IGNORE INTO utilisateurs (nom, prenom, email, password, role_id, nom_responsable, prenom_responsable)
      VALUES ('Admin', 'Super', 'admin@seccentral.com', '$2b$10$rQJ8N5mK9vL2xY7zA1bC3dE4fG6hI8jK0lM1nO2pQ3rS4tU5vW6xY7zA8', 1, 'Admin', 'Super')
    `)

    // Secrétaire Général
    await conn.query(`
      INSERT IGNORE INTO utilisateurs (nom, prenom, email, password, role_id, nom_responsable, prenom_responsable)
      VALUES ('Secretaire', 'General', 'secretaire@seccentral.com', '$2b$10$rQJ8N5mK9vL2xY7zA1bC3dE4fG6hI8jK0lM1nO2pQ3rS4tU5vW6xY7zA8', 2, 'Secretaire', 'General')
    `)

    // DDPI
    await conn.query(`
      INSERT IGNORE INTO utilisateurs (nom, prenom, email, password, role_id, nom_responsable, prenom_responsable)
      VALUES ('DDPI', 'User', 'ddpi@seccentral.com', '$2b$10$rQJ8N5mK9vL2xY7zA1bC3dE4fG6hI8jK0lM1nO2pQ3rS4tU5vW6xY7zA8', 3, 'DDPI', 'User')
    `)

    // DGI
    await conn.query(`
      INSERT IGNORE INTO utilisateurs (nom, prenom, email, password, role_id, nom_responsable, prenom_responsable)
      VALUES ('DGI', 'User', 'dgi@seccentral.com', '$2b$10$rQJ8N5mK9vL2xY7zA1bC3dE4fG6hI8jK0lM1nO2pQ3rS4tU5vW6xY7zA8', 4, 'DGI', 'User')
    `)

    // Ministre
    await conn.query(`
      INSERT IGNORE INTO utilisateurs (nom, prenom, email, password, role_id, nom_responsable, prenom_responsable)
      VALUES ('Ministre', 'User', 'ministre@seccentral.com', '$2b$10$rQJ8N5mK9vL2xY7zA1bC3dE4fG6hI8jK0lM1nO2pQ3rS4tU5vW6xY7zA8', 5, 'Ministre', 'User')
    `)

    // Demandeur
    await conn.query(`
      INSERT IGNORE INTO utilisateurs (nom, prenom, email, password, role_id, nom_responsable, prenom_responsable)
      VALUES ('Demandeur', 'Test', 'demandeur@test.com', '$2b$10$rQJ8N5mK9vL2xY7zA1bC3dE4fG6hI8jK0lM1nO2pQ3rS4tU5vW6xY7zA8', 6, 'Demandeur', 'Test')
    `)

    console.log("   ✅ Utilisateurs de test créés !")

    await conn.end()

    console.log("\n🎉 Base de données créée avec succès !")
    console.log("💡 Vous pouvez maintenant démarrer le serveur :")
    console.log("   node server.js")
  } catch (error) {
    console.error("❌ Erreur lors de la création:", error.message)
  }
}

creerBaseDonnees()
