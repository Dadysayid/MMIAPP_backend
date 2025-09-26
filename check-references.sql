-- Script pour vérifier les références des demandes et leurs accusés
-- Ce script aide à diagnostiquer les problèmes de téléchargement

-- 1. Vérifier toutes les demandes avec leurs références
SELECT 
    id,
    reference,
    type,
    statut,
    fichier_accuse,
    created_at
FROM demandes 
ORDER BY created_at DESC 
LIMIT 20;

-- 2. Vérifier les demandes qui ont des accusés
SELECT 
    id,
    reference,
    type,
    statut,
    fichier_accuse,
    created_at
FROM demandes 
WHERE fichier_accuse IS NOT NULL 
ORDER BY created_at DESC;

-- 3. Vérifier les demandes qui n'ont pas d'accusés
SELECT 
    id,
    reference,
    type,
    statut,
    fichier_accuse,
    created_at
FROM demandes 
WHERE fichier_accuse IS NULL 
ORDER BY created_at DESC;

-- 4. Compter les demandes par statut
SELECT 
    statut,
    COUNT(*) as nombre,
    COUNT(fichier_accuse) as avec_accuse
FROM demandes 
GROUP BY statut 
ORDER BY nombre DESC;

-- 5. Vérifier les références spécifiques mentionnées dans les erreurs
SELECT 
    id,
    reference,
    type,
    statut,
    fichier_accuse,
    created_at
FROM demandes 
WHERE reference IN ('20250814-0001', '20250815-0001', '20250812-0001')
ORDER BY reference;



