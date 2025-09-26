-- Création de la table d'archive pour les demandes clôturées
CREATE TABLE IF NOT EXISTS archive_demandes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  demande_id INT NOT NULL,
  reference VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  nom_responsable VARCHAR(100) NOT NULL,
  prenom_responsable VARCHAR(100) NOT NULL,
  statut_final VARCHAR(50) NOT NULL,
  date_cloture DATETIME NOT NULL,
  commentaire_final TEXT,
  autorisation_signee_par INT,
  donnees_originales JSON,
  fichiers_originaux JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_reference (reference),
  INDEX idx_demandeur (nom_responsable, prenom_responsable),
  INDEX idx_date_cloture (date_cloture),
  INDEX idx_type (type),
  
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (autorisation_signee_par) REFERENCES utilisateurs(id)
);

-- Ajout de commentaires pour la documentation
ALTER TABLE archive_demandes 
COMMENT = 'Archive des demandes clôturées avec autorisation signée par le Ministre';

-- Création d'une vue pour faciliter l'accès aux archives
CREATE OR REPLACE VIEW v_archive_demandes AS
SELECT 
  ad.*,
  CONCAT(ad.prenom_responsable, ' ', ad.nom_responsable) AS demandeur_complet,
  u.nom AS ministre_nom,
  u.prenom AS ministre_prenom,
  CONCAT(u.prenom, ' ', u.nom) AS ministre_complet
FROM archive_demandes ad
LEFT JOIN utilisateurs u ON ad.autorisation_signee_par = u.id
ORDER BY ad.date_cloture DESC;

-- Insertion d'un exemple de données (optionnel)
-- INSERT INTO archive_demandes (demande_id, reference, type, demandeur_nom, demandeur_prenom, statut_final, date_cloture, commentaire_final) 
-- VALUES (1, '20250101-0001', 'eaux', 'Dupont', 'Jean', 'CLOTUREE', NOW(), 'Exemple de demande archivée');
