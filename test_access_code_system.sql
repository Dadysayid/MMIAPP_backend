-- Script de test pour vérifier le système de code d'accès administrateur
-- Exécuter ce script pour tester toutes les fonctionnalités

USE gestion_autorisation;

-- =====================================================
-- 1. VÉRIFICATION DE LA STRUCTURE
-- =====================================================

SELECT '=== VÉRIFICATION DE LA STRUCTURE ===' as section;

-- Vérifier que la table existe
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Table admin_access_codes existe'
        ELSE '❌ Table admin_access_codes manquante'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'gestion_autorisation' 
AND table_name = 'admin_access_codes';

-- Vérifier la structure de la table
SELECT 
    'Structure de la table admin_access_codes' as info,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM information_schema.columns 
WHERE table_schema = 'gestion_autorisation' 
AND table_name = 'admin_access_codes'
ORDER BY ORDINAL_POSITION;

-- =====================================================
-- 2. VÉRIFICATION DES DONNÉES
-- =====================================================

SELECT '=== VÉRIFICATION DES DONNÉES ===' as section;

-- Vérifier s'il y a des codes d'accès
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✅ ', COUNT(*), ' code(s) d\'accès trouvé(s)')
        ELSE '❌ Aucun code d\'accès trouvé'
    END as status
FROM admin_access_codes;

-- Afficher le code actif
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Code d\'accès actif trouvé'
        ELSE '❌ Aucun code d\'accès actif'
    END as status,
    access_code,
    created_by,
    created_at,
    is_active
FROM admin_access_codes 
WHERE is_active = TRUE;

-- Afficher tous les codes (historique)
SELECT 
    'Historique des codes d\'accès' as info,
    id,
    access_code,
    created_by,
    created_at,
    updated_at,
    is_active
FROM admin_access_codes 
ORDER BY created_at DESC;

-- =====================================================
-- 3. VÉRIFICATION DES CONTRAINTES
-- =====================================================

SELECT '=== VÉRIFICATION DES CONTRAINTES ===' as section;

-- Vérifier qu'il n'y a qu'un seul code actif
SELECT 
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ Un seul code actif (correct)'
        WHEN COUNT(*) = 0 THEN '❌ Aucun code actif'
        ELSE CONCAT('⚠️ ', COUNT(*), ' codes actifs (problème de sécurité)')
    END as status
FROM admin_access_codes 
WHERE is_active = TRUE;

-- Vérifier l'unicité des codes
SELECT 
    'Vérification de l\'unicité des codes' as info,
    access_code,
    COUNT(*) as occurrences
FROM admin_access_codes 
GROUP BY access_code 
HAVING COUNT(*) > 1;

-- =====================================================
-- 4. VÉRIFICATION DES RELATIONS
-- =====================================================

SELECT '=== VÉRIFICATION DES RELATIONS ===' as section;

-- Vérifier que l'utilisateur créateur existe
SELECT 
    'Vérification de l\'utilisateur créateur' as info,
    aac.id,
    aac.access_code,
    aac.created_by,
    u.nom,
    u.prenom,
    u.email,
    r.nom as role
FROM admin_access_codes aac
LEFT JOIN utilisateurs u ON aac.created_by = u.id
LEFT JOIN roles r ON u.role_id = r.id
WHERE aac.is_active = TRUE;

-- =====================================================
-- 5. TEST DE VALIDATION DU CODE
-- =====================================================

SELECT '=== TEST DE VALIDATION ===' as section;

-- Simuler la vérification d'un code valide
SET @test_code = 'Adm1n!@';
SET @code_exists = (
    SELECT COUNT(*) 
    FROM admin_access_codes 
    WHERE access_code = @test_code 
    AND is_active = TRUE
);

SELECT 
    CASE 
        WHEN @code_exists > 0 THEN '✅ Code de test Adm1n!@ valide'
        ELSE '❌ Code de test Adm1n!@ invalide ou inactif'
    END as test_result,
    @test_code as code_teste,
    @code_exists as existe_en_base;

-- Simuler la vérification d'un code invalide
SET @test_code_invalid = 'INVALID';
SET @code_invalid_exists = (
    SELECT COUNT(*) 
    FROM admin_access_codes 
    WHERE access_code = @test_code_invalid 
    AND is_active = TRUE
);

SELECT 
    CASE 
        WHEN @code_invalid_exists = 0 THEN '✅ Code invalide correctement rejeté'
        ELSE '❌ Code invalide accepté (problème de sécurité)'
    END as test_result,
    @test_code_invalid as code_teste,
    @code_invalid_exists as existe_en_base;

-- =====================================================
-- 6. RÉSUMÉ DES TESTS
-- =====================================================

SELECT '=== RÉSUMÉ DES TESTS ===' as section;

-- Compter les problèmes
SET @problems = (
    SELECT COUNT(*) FROM (
        SELECT 'structure' as type, 
               CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END as problem
        FROM information_schema.tables 
        WHERE table_schema = 'gestion_autorisation' 
        AND table_name = 'admin_access_codes'
        
        UNION ALL
        
        SELECT 'data' as type,
               CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END as problem
        FROM admin_access_codes
        
        UNION ALL
        
        SELECT 'active_code' as type,
               CASE WHEN COUNT(*) != 1 THEN 1 ELSE 0 END as problem
        FROM admin_access_codes 
        WHERE is_active = TRUE
    ) as checks
);

SELECT 
    CASE 
        WHEN @problems = 0 THEN '🎉 TOUS LES TESTS SONT PASSÉS !'
        ELSE CONCAT('⚠️ ', @problems, ' problème(s) détecté(s)')
    END as final_status;

-- =====================================================
-- 7. RECOMMANDATIONS
-- =====================================================

SELECT '=== RECOMMANDATIONS ===' as section;

-- Recommandations basées sur les tests
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM admin_access_codes WHERE is_active = TRUE) = 0 
        THEN '🚨 CRITIQUE: Aucun code d\'accès actif. Exécuter insert_default_access_code.sql'
        
        WHEN (SELECT COUNT(*) FROM admin_access_codes WHERE is_active = TRUE) > 1 
        THEN '⚠️ SÉCURITÉ: Plusieurs codes actifs. Désactiver les codes en double'
        
        WHEN (SELECT COUNT(*) FROM admin_access_codes) = 0 
        THEN '📝 INFO: Aucun code en base. Initialiser avec insert_default_access_code.sql'
        
        ELSE '✅ SYSTÈME: Code d\'accès configuré correctement'
    END as recommendation;







