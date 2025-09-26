-- Script pour vérifier et corriger la structure de la table notifications
-- Exécutez ce script dans votre base de données

-- 1. Vérifier si la table existe
SHOW TABLES LIKE 'notifications';

-- 2. Vérifier la structure actuelle
DESCRIBE notifications;

-- 3. Si la table n'existe pas, la créer avec la bonne structure
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  lu TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_utilisateur_id (utilisateur_id),
  INDEX idx_type (type),
  INDEX idx_lu (lu),
  INDEX idx_created_at (created_at)
);

-- 4. Si la table existe mais a des colonnes incorrectes, les supprimer
-- (Exécutez ces commandes une par une si nécessaire)

-- Supprimer la colonne demande_id si elle existe
-- ALTER TABLE notifications DROP COLUMN IF EXISTS demande_id;

-- Supprimer la colonne date_envoi si elle existe
-- ALTER TABLE notifications DROP COLUMN IF EXISTS date_envoi;

-- Supprimer la colonne statut si elle existe
-- ALTER TABLE notifications DROP COLUMN IF EXISTS statut;

-- 5. Vérifier la structure finale
DESCRIBE notifications;

-- 6. Vérifier le contenu
SELECT COUNT(*) as total_notifications FROM notifications;
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;





