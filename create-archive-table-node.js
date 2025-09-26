// backend/create_archive_table.js
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gestion_autorisation', // ✅ singulier
    multipleStatements: true
  });

  console.log("🏗️  Vérification/ajouts sur 'archive_demandes' …");

  // 1) S'assurer qu'une table de base existe (si tu l'as déjà, rien ne change)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS archive_demandes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      demande_id INT NOT NULL,
      reference VARCHAR(50) NOT NULL,
      type VARCHAR(100) NOT NULL,
      nom_responsable VARCHAR(100) NOT NULL,
      prenom_responsable VARCHAR(100) NOT NULL,
      statut VARCHAR(50) NULL,
      donnees LONGTEXT NULL,
      fichier_autorisation LONGBLOB NULL,
      date_archivage TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2) Ajouter les colonnes manquantes (compatibles avec MariaDB/MySQL)
  await conn.query(`ALTER TABLE archive_demandes ADD COLUMN IF NOT EXISTS statut_final VARCHAR(50) NULL`);
  await conn.query(`ALTER TABLE archive_demandes ADD COLUMN IF NOT EXISTS date_cloture DATETIME NULL`);
  await conn.query(`ALTER TABLE archive_demandes ADD COLUMN IF NOT EXISTS commentaire_final TEXT NULL`);
  await conn.query(`ALTER TABLE archive_demandes ADD COLUMN IF NOT EXISTS autorisation_signee_par INT NULL`);
  await conn.query(`ALTER TABLE archive_demandes ADD COLUMN IF NOT EXISTS donnees_originales LONGTEXT NULL`);
  await conn.query(`ALTER TABLE archive_demandes ADD COLUMN IF NOT EXISTS fichiers_originaux LONGTEXT NULL`);
  await conn.query(`ALTER TABLE archive_demandes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP`);

  // 3) Index : créer seulement s'ils n'existent pas
  const [idx] = await conn.query(`SHOW INDEX FROM archive_demandes`);
  const idxNames = new Set(idx.map(r => r.Key_name));
  if (!idxNames.has('idx_reference'))   await conn.query(`CREATE INDEX idx_reference   ON archive_demandes(reference)`);
  if (!idxNames.has('idx_demandeur'))   await conn.query(`CREATE INDEX idx_demandeur   ON archive_demandes(nom_responsable, prenom_responsable)`);
  if (!idxNames.has('idx_date_cloture'))await conn.query(`CREATE INDEX idx_date_cloture ON archive_demandes(date_cloture)`);
  if (!idxNames.has('idx_type'))        await conn.query(`CREATE INDEX idx_type        ON archive_demandes(type)`);

  // 4) Clés étrangères : n'ajouter que si absentes
  const [fks] = await conn.query(`
    SELECT constraint_name
    FROM information_schema.referential_constraints
    WHERE constraint_schema = DATABASE() AND table_name='archive_demandes'
  `);
  const fkNames = new Set(fks.map(r => r.constraint_name));
  if (!fkNames.has('fk_archive_demandes_demande')) {
    await conn.query(`
      ALTER TABLE archive_demandes
      ADD CONSTRAINT fk_archive_demandes_demande
      FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE
    `);
  }
  if (!fkNames.has('fk_archive_demandes_ministre')) {
    await conn.query(`
      ALTER TABLE archive_demandes
      ADD CONSTRAINT fk_archive_demandes_ministre
      FOREIGN KEY (autorisation_signee_par) REFERENCES utilisateurs(id)
    `);
  }

  // 5) Commentaire de table (optionnel)
  await conn.query(`
    ALTER TABLE archive_demandes
    COMMENT = 'Archive des demandes clôturées avec autorisation signée par le Ministre'
  `);

  // 6) Vue : utiliser query() et recréer proprement
  await conn.query(`DROP VIEW IF EXISTS v_archive_demandes`);
  await conn.query(`
    CREATE VIEW v_archive_demandes AS
    SELECT
      ad.*,
      CONCAT(ad.prenom_responsable, ' ', ad.nom_responsable) AS demandeur_complet,
      u.nom     AS ministre_nom,
      u.prenom  AS ministre_prenom,
      CONCAT(u.prenom, ' ', u.nom) AS ministre_complet
    FROM archive_demandes ad
    LEFT JOIN utilisateurs u ON ad.autorisation_signee_par = u.id
  `);

  console.log("✅ Table 'archive_demandes' et vue 'v_archive_demandes' prêtes.");
  await conn.end();
  process.exit(0);
})().catch(e => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
