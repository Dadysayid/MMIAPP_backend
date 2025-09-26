-- Script pour ajouter la colonne identifiant_unique à la table utilisateurs
-- Cette colonne contiendra un identifiant unique de 8 chiffres pour chaque utilisateur

USE gestion_autorisation;

-- Ajouter la colonne identifiant_unique
ALTER TABLE utilisateurs ADD COLUMN identifiant_unique VARCHAR(8) UNIQUE;

-- Créer un index pour optimiser les recherches par identifiant
CREATE INDEX idx_identifiant_unique ON utilisateurs(identifiant_unique);

-- Vérifier que la colonne a été ajoutée
DESCRIBE utilisateurs;

-- Message de confirmation
SELECT 'Colonne identifiant_unique ajoutée avec succès' as message;
