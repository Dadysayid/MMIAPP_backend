-- Script pour ajouter la colonne autorisation_pdf à la table demandes
-- Cette colonne stockera le chemin vers le fichier PDF d'autorisation généré

ALTER TABLE demandes 
ADD COLUMN autorisation_pdf VARCHAR(500) NULL 
COMMENT 'Chemin vers le fichier PDF d\'autorisation généré';

-- Vérifier que la colonne a été ajoutée
DESCRIBE demandes; 
 