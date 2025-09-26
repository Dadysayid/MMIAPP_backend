-- Ajout de la table des signatures du ministre
USE gestion_autorisation;

-- Table des signatures du ministre
CREATE TABLE IF NOT EXISTS signatures_ministre (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL COMMENT 'ID du ministre',
  type_signature ENUM('AUTORISATION', 'ACCUSE', 'DOCUMENT_OFFICIEL') NOT NULL DEFAULT 'AUTORISATION',
  fichier_signature VARCHAR(255) NOT NULL COMMENT 'Chemin vers le fichier de signature',
  nom_fichier_original VARCHAR(255) NOT NULL COMMENT 'Nom original du fichier',
  taille_fichier INT COMMENT 'Taille du fichier en bytes',
  mime_type VARCHAR(100) COMMENT 'Type MIME du fichier',
  statut ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') DEFAULT 'ACTIVE',
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  commentaire TEXT COMMENT 'Commentaire optionnel sur la signature',
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- Table des signatures appliquées aux documents
CREATE TABLE IF NOT EXISTS signatures_appliquees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  signature_id INT NOT NULL COMMENT 'ID de la signature utilisée',
  demande_id INT NOT NULL COMMENT 'ID de la demande signée',
  type_document ENUM('AUTORISATION', 'ACCUSE', 'DOCUMENT_OFFICIEL') NOT NULL,
  fichier_document_signee VARCHAR(255) NOT NULL COMMENT 'Chemin vers le document signé',
  date_signature DATETIME DEFAULT CURRENT_TIMESTAMP,
  utilisateur_id INT NOT NULL COMMENT 'ID du ministre qui a signé',
  FOREIGN KEY (signature_id) REFERENCES signatures_ministre(id) ON DELETE CASCADE,
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- Index pour optimiser les recherches
CREATE INDEX idx_signatures_ministre_utilisateur ON signatures_ministre(utilisateur_id);
CREATE INDEX idx_signatures_ministre_type ON signatures_ministre(type_signature);
CREATE INDEX idx_signatures_appliquees_demande ON signatures_appliquees(demande_id);
CREATE INDEX idx_signatures_appliquees_signature ON signatures_appliquees(signature_id);

-- Vérification
DESCRIBE signatures_ministre;
DESCRIBE signatures_appliquees;




