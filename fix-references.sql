-- Script pour corriger les références des demandes
-- Ce script corrige les problèmes de séquences et de références dupliquées

-- 1. Vérifier l'état actuel des références
SELECT 
    'État actuel des références' as info,
    COUNT(*) as total_demandes,
    COUNT(DISTINCT reference) as references_uniques,
    COUNT(reference) as avec_reference,
    COUNT(*) - COUNT(reference) as sans_reference
FROM demandes;

-- 2. Identifier les références dupliquées
SELECT 
    reference,
    COUNT(*) as occurrences,
    GROUP_CONCAT(id ORDER BY id) as ids_demandes
FROM demandes 
WHERE reference IS NOT NULL
GROUP BY reference 
HAVING COUNT(*) > 1
ORDER BY reference;

-- 3. Identifier les demandes sans référence
SELECT 
    id,
    type,
    statut,
    created_at
FROM demandes 
WHERE reference IS NULL
ORDER BY created_at;

-- 4. Analyser les séquences par date
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_demandes,
    GROUP_CONCAT(reference ORDER BY reference) as references,
    MIN(CAST(SUBSTRING(reference, 9) AS UNSIGNED)) as min_seq,
    MAX(CAST(SUBSTRING(reference, 9) AS UNSIGNED)) as max_seq
FROM demandes 
WHERE reference IS NOT NULL 
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 5. CORRECTION : Générer de nouvelles références pour les demandes sans référence
-- ATTENTION: Exécuter avec précaution en production

-- Créer une table temporaire pour stocker les nouvelles références
CREATE TEMPORARY TABLE temp_references (
    id INT,
    new_reference VARCHAR(50)
);

-- Insérer les demandes sans référence avec de nouvelles références
INSERT INTO temp_references (id, new_reference)
SELECT 
    d.id,
    CONCAT(
        DATE_FORMAT(d.created_at, '%Y%m%d'),
        '-',
        LPAD(
            (SELECT COALESCE(MAX(CAST(SUBSTRING(reference, 9) AS UNSIGNED)), 0) + 1
             FROM demandes 
             WHERE DATE(created_at) = DATE(d.created_at) 
             AND reference IS NOT NULL
            ), 
            4, '0'
        )
    ) as new_reference
FROM demandes d
WHERE d.reference IS NULL;

-- Afficher les nouvelles références proposées
SELECT 
    'Nouvelles références proposées' as info,
    t.id,
    d.type,
    d.created_at,
    t.new_reference
FROM temp_references t
JOIN demandes d ON t.id = d.id
ORDER BY d.created_at;

-- 6. CORRECTION : Appliquer les nouvelles références (DÉCOMMENTEZ POUR EXÉCUTER)
-- UPDATE demandes d
-- JOIN temp_references t ON d.id = t.id
-- SET d.reference = t.new_reference;

-- 7. CORRECTION : Corriger les références dupliquées (DÉCOMMENTEZ POUR EXÉCUTER)
-- Pour chaque référence dupliquée, garder la première et corriger les autres
-- UPDATE demandes d
-- JOIN (
--     SELECT 
--         reference,
--         MIN(id) as keep_id
--     FROM demandes 
--     WHERE reference IN (
--         SELECT reference 
--         FROM demandes 
--         GROUP BY reference 
--         HAVING COUNT(*) > 1
--     )
--     GROUP BY reference
-- ) dupes ON d.reference = dupes.reference
-- SET d.reference = CONCAT(
--     DATE_FORMAT(d.created_at, '%Y%m%d'),
--     '-',
--     LPAD(d.id, 4, '0')
-- )
-- WHERE d.id != dupes.keep_id;

-- 8. Vérifier le résultat après correction
-- SELECT 
--     'État après correction' as info,
--     COUNT(*) as total_demandes,
--     COUNT(DISTINCT reference) as references_uniques,
--     COUNT(reference) as avec_reference
-- FROM demandes;

-- Nettoyer la table temporaire
DROP TEMPORARY TABLE IF EXISTS temp_references;



