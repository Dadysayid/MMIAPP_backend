-- Script pour créer la table de gestion du code d'accès administration
-- Cette table stockera le code d'accès requis pour accéder à l'espace administration

USE gestion_autorisation;

-- Créer la table admin_access_codes
CREATE TABLE IF NOT EXISTS admin_access_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    access_code VARCHAR(8) NOT NULL UNIQUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (created_by) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- Insérer un code d'accès par défaut (à modifier par le superadmin)
INSERT INTO admin_access_codes (access_code, created_by) VALUES 
('Adm1n!@', 1)  -- Code par défaut, à remplacer
ON DUPLICATE KEY UPDATE access_code = access_code;

-- Créer un index pour optimiser les recherches
CREATE INDEX idx_admin_access_codes_active ON admin_access_codes(is_active);

-- Vérifier que la table a été créée
DESCRIBE admin_access_codes;

-- Afficher le code d'accès actuel
SELECT 
    id,
    access_code,
    created_by,
    created_at,
    updated_at,
    is_active
FROM admin_access_codes 
WHERE is_active = TRUE;

-- Message de confirmation
SELECT 'Table admin_access_codes créée avec succès' as message;



