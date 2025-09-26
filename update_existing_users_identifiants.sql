-- Script pour mettre à jour les utilisateurs existants avec des identifiants uniques
-- Ce script doit être exécuté après avoir ajouté la colonne identifiant_unique

USE gestion_autorisation;

-- Fonction pour générer un identifiant unique de 8 chiffres
DELIMITER //
CREATE FUNCTION generate_unique_id() RETURNS VARCHAR(8)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE new_id VARCHAR(8);
    DECLARE id_exists INT DEFAULT 1;
    
    WHILE id_exists > 0 DO
        SET new_id = LPAD(FLOOR(RAND() * 90000000) + 10000000, 8, '0');
        SELECT COUNT(*) INTO id_exists FROM utilisateurs WHERE identifiant_unique = new_id;
    END WHILE;
    
    RETURN new_id;
END //
DELIMITER ;

-- Mettre à jour tous les utilisateurs existants qui n'ont pas d'identifiant unique
UPDATE utilisateurs 
SET identifiant_unique = generate_unique_id() 
WHERE identifiant_unique IS NULL;

-- Vérifier que tous les utilisateurs ont maintenant un identifiant unique
SELECT 
    id,
    nom,
    prenom,
    email,
    identifiant_unique,
    CASE 
        WHEN identifiant_unique IS NOT NULL THEN 'OK'
        ELSE 'MANQUANT'
    END as statut_identifiant
FROM utilisateurs 
ORDER BY id;

-- Message de confirmation
SELECT 
    COUNT(*) as total_utilisateurs,
    COUNT(identifiant_unique) as avec_identifiant,
    COUNT(*) - COUNT(identifiant_unique) as sans_identifiant
FROM utilisateurs;

-- Nettoyer la fonction temporaire
DROP FUNCTION IF EXISTS generate_unique_id;



