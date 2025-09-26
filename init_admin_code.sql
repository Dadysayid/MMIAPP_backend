-- Script sécurisé pour initialiser le code d'accès administration
-- Le code par défaut est : Admin1!@ (8 caractères)

USE gestion_autorisation;

-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS admin_access_codes;

-- Créer la table admin_access_codes
CREATE TABLE admin_access_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(8) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insérer le code d'accès par défaut (NE PAS AFFICHER)
INSERT INTO admin_access_codes (code, active) VALUES ('Admin1!@', 1);

-- Vérifier que l'insertion a fonctionné (sans afficher le code)
SELECT 
  id, 
  '***' as code, 
  active, 
  created_at 
FROM admin_access_codes;

-- Message de confirmation
SELECT 'Code d\'accès administration initialisé avec succès' as message;
