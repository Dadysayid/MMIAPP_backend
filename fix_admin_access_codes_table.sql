-- Script pour corriger la structure de la table admin_access_codes
-- Exécutez ce script si la table a les mauvais noms de colonnes

-- Supprimer la table existante si elle existe
DROP TABLE IF EXISTS admin_access_codes;

-- Recréer la table avec la bonne structure
CREATE TABLE admin_access_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insérer le code d'accès par défaut
INSERT INTO admin_access_codes (code, active) VALUES ('Adm1n!@', TRUE);

-- Vérifier que la table a été créée correctement
SELECT * FROM admin_access_codes;







