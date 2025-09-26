-- Ajout des colonnes manquantes pour les nouvelles fonctionnalités
USE gestion_autorisation;

-- Table DEMANDES
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS motif_rejet TEXT COMMENT 'Motif du rejet';
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS archive BOOLEAN DEFAULT FALSE COMMENT 'Archivage';
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS donnees_supplementaires JSON COMMENT 'Données supplémentaires';

-- Table SUIVI_DEMANDES  
ALTER TABLE suivi_demandes ADD COLUMN IF NOT EXISTS donnees_supplementaires JSON COMMENT 'Données supplémentaires';
ALTER TABLE suivi_demandes ADD COLUMN IF NOT EXISTS type_action VARCHAR(50) COMMENT 'Type d''action';

-- Table NOTIFICATIONS
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS donnees_supplementaires JSON COMMENT 'Données supplémentaires';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priorite ENUM('BASSE', 'NORMALE', 'HAUTE', 'URGENTE') DEFAULT 'NORMALE';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS date_expiration DATETIME COMMENT 'Date d''expiration';

-- Table RELANCES
CREATE TABLE IF NOT EXISTS relances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  demande_id INT NOT NULL,
  type_relance ENUM('AUTOMATIQUE', 'MANUELLE', 'URGENTE') DEFAULT 'AUTOMATIQUE',
  message TEXT,
  date_relance DATETIME DEFAULT CURRENT_TIMESTAMP,
  utilisateur_id INT,
  statut ENUM('ENVOYEE', 'LUE', 'REPONDUE') DEFAULT 'ENVOYEE',
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- Table COMMISSIONS_AVIS
CREATE TABLE IF NOT EXISTS commissions_avis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  demande_id INT NOT NULL,
  commission_type ENUM('COMMISSION_MULTISECTORIELLE', 'COMITE_TECHNIQUE', 'AUTRE') NOT NULL,
  motif TEXT NOT NULL,
  delai_jours INT DEFAULT 30,
  statut ENUM('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ANNULE') DEFAULT 'EN_ATTENTE',
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  observations TEXT,
  utilisateur_creation_id INT,
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (utilisateur_creation_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- Vérification
DESCRIBE demandes;
DESCRIBE suivi_demandes;
DESCRIBE notifications;
DESCRIBE relances;
DESCRIBE commissions_avis;
