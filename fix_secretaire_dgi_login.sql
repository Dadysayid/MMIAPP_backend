-- Script pour corriger le problème de connexion Secrétaire DGI
USE gestion_autorisation;

-- 1. Vérifier si l'utilisateur existe
SELECT id, nom, prenom, email, role_id, statut, email_verifie 
FROM utilisateurs 
WHERE email = 'secretaire.dgi@mmi.gouv.mr';

-- 2. Si l'utilisateur n'existe pas, le créer
INSERT INTO utilisateurs (
    nom,
    prenom,
    email,
    mot_de_passe,
    role_id,
    statut,
    email_verifie,
    activation_token,
    created_at
) VALUES (
    'DGI',
    'Secrétaire',
    'secretaire.dgi@mmi.gouv.mr',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- SecretaireDGI2024!
    12,
    'actif',
    1,
    NULL,
    NOW()
);

-- 3. Si l'utilisateur existe mais avec un mauvais statut, le corriger
UPDATE utilisateurs 
SET statut = 'actif', email_verifie = 1 
WHERE email = 'secretaire.dgi@mmi.gouv.mr';

-- 4. Vérifier le rôle 12 existe
SELECT * FROM roles WHERE id = 12;

-- 5. Si le rôle 12 n'existe pas, le créer
INSERT INTO roles (id, nom, description) 
VALUES (12, 'Secrétaire DGI', 'Secrétaire de la Direction Générale des Impôts')
ON DUPLICATE KEY UPDATE nom = VALUES(nom), description = VALUES(description);

-- 6. Vérifier la structure finale
SELECT 
    u.id,
    u.nom,
    u.prenom,
    u.email,
    u.role_id,
    u.statut,
    u.email_verifie,
    r.nom as role_nom
FROM utilisateurs u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'secretaire.dgi@mmi.gouv.mr';






