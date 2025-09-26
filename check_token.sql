-- Script pour vérifier le token d'activation
USE gestion_autorisation;

-- Vérifier si le token existe
SELECT 
    id,
    nom,
    prenom,
    email,
    activation_token,
    statut,
    email_verifie,
    identifiant_unique,
    created_at
FROM utilisateurs 
WHERE activation_token = 'a8d195e7af74e8e6ceb77dfe1e963f3ee8f42093c2dd0c5b51fb3bd27666ac26';

-- Vérifier tous les utilisateurs avec des tokens d'activation
SELECT 
    id,
    nom,
    prenom,
    email,
    activation_token,
    statut,
    email_verifie,
    identifiant_unique,
    created_at
FROM utilisateurs 
WHERE activation_token IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
