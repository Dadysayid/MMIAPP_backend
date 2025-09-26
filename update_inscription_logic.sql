-- Script pour documenter les modifications nécessaires côté backend
-- pour gérer la confirmation de mot de passe lors de l'inscription

USE gestion_autorisation;

-- =====================================================
-- MODIFICATIONS NÉCESSAIRES CÔTÉ BACKEND
-- =====================================================

-- 1. Vérifier que la colonne confirmation_mot_de_passe existe
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'gestion_autorisation' 
AND TABLE_NAME = 'utilisateurs' 
AND COLUMN_NAME = 'confirmation_mot_de_passe';

-- 2. Structure recommandée pour la table utilisateurs
-- La table devrait avoir ces colonnes pour la gestion des mots de passe :
/*
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- email (VARCHAR(255), UNIQUE, NOT NULL)
- mot_de_passe (VARCHAR(255), NOT NULL) - Mot de passe hashé
- confirmation_mot_de_passe (VARCHAR(255)) - Champ temporaire pour validation
- date_creation (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- statut_activation (ENUM('en_attente', 'active', 'desactive'), DEFAULT 'en_attente')
- token_activation (VARCHAR(255)) - Pour l'activation du compte
- derniere_connexion (TIMESTAMP, NULL)
*/

-- 3. Procédure recommandée pour l'inscription
/*
1. Récupérer les données du formulaire (email, mot_de_passe, confirmation_mot_de_passe)
2. Valider que mot_de_passe === confirmation_mot_de_passe
3. Hasher le mot_de_passe avec bcrypt ou argon2
4. Insérer dans la base : email, mot_de_passe_hashé, confirmation_mot_de_passe (vide après validation)
5. Générer un token d'activation
6. Envoyer un email de confirmation
*/

-- 4. Vérifier les contraintes de sécurité
-- Le champ confirmation_mot_de_passe ne doit PAS être stocké de manière permanente
-- Il sert uniquement à la validation côté client et serveur

-- 5. Nettoyer les anciennes données si nécessaire
-- UPDATE utilisateurs SET confirmation_mot_de_passe = NULL WHERE confirmation_mot_de_passe IS NOT NULL;

-- Message de fin
SELECT 'Documentation des modifications backend créée avec succès' as message;




