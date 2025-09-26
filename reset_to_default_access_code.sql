-- Script pour réinitialiser le code d'accès à sa valeur par défaut
-- Utile en cas de problème ou pour remettre le système en état initial

USE gestion_autorisation;

-- Vérifier que la table existe
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'gestion_autorisation' 
    AND table_name = 'admin_access_codes'
);

-- Si la table n'existe pas, afficher un message d'erreur
SELECT IF(@table_exists = 0, 
    'ERREUR: Table admin_access_codes n\'existe pas. Exécutez d\'abord create_admin_access_code_table.sql',
    'Table admin_access_codes trouvée. Procéder à la réinitialisation...'
) as message;

-- Procéder seulement si la table existe
SET @proceed = IF(@table_exists = 1, 1, 0);

-- Désactiver tous les codes existants
SET @update_query = IF(@proceed = 1, 
    'UPDATE admin_access_codes SET is_active = FALSE',
    'SELECT "Opération annulée - table inexistante" as message'
);

PREPARE stmt FROM @update_query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insérer le code d'accès par défaut
SET @insert_query = IF(@proceed = 1, 
    'INSERT INTO admin_access_codes (access_code, created_by, is_active) VALUES (\'Adm1n!@\', 1, TRUE) ON DUPLICATE KEY UPDATE access_code = \'Adm1n!@\', is_active = TRUE, updated_at = CURRENT_TIMESTAMP',
    'SELECT "Opération annulée - table inexistante" as message'
);

PREPARE stmt FROM @insert_query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Vérifier la réinitialisation
SELECT 
    IF(@proceed = 1, 
        'Code d\'accès réinitialisé avec succès à Adm1n!@',
        'Réinitialisation annulée - table inexistante'
    ) as message;

-- Afficher le code actuel
SELECT 
    id,
    access_code,
    created_by,
    created_at,
    updated_at,
    is_active
FROM admin_access_codes 
WHERE is_active = TRUE;

-- Afficher l'historique des codes
SELECT 
    'Historique des codes d\'accès' as titre,
    id,
    access_code,
    created_by,
    created_at,
    updated_at,
    is_active
FROM admin_access_codes 
ORDER BY created_at DESC;



