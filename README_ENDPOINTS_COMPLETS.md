# Documentation Complète des Endpoints Backend

## 🎯 Vue d'ensemble
Ce document décrit tous les endpoints disponibles dans le backend pour supporter les scénarios complets de gestion des autorisations.

## 🔐 Authentification
Tous les endpoints protégés utilisent le middleware `authRole()` avec les rôles autorisés :
- `[1]` : Administrateur
- `[2]` : Secrétariat Central  
- `[3]` : Secrétariat Général
- `[4]` : Chef de Service
- `[5]` : DDPI
- `[6]` : DGI
- `[7,8]` : Commission/Comité Technique
- `[9]` : Ministère
- `[11]` : DRMNE/PMNE

## 📋 Endpoints DRMNE/PMNE

### 1. Liste des demandes PMNE
```
GET /api/drmne/demandes
Authorization: Bearer <token>
Query params: statut, page, limit, search
```
**Rôles autorisés :** DRMNE (11)
**Description :** Récupère la liste des demandes PMNE avec filtres et pagination

### 2. Détails d'une demande PMNE
```
GET /api/drmne/demandes/:id
Authorization: Bearer <token>
```
**Rôles autorisés :** DRMNE (11)
**Description :** Récupère les détails complets d'une demande PMNE

### 3. Demander un complément
```
POST /api/drmne/demandes/:id/demander-complement
Authorization: Bearer <token>
Body: { message: "Description des pièces manquantes" }
```
**Rôles autorisés :** DRMNE (11)
**Description :** Met le statut à "PIECES_MANQUANTES" et notifie le demandeur

### 4. Valider une demande PMNE
```
POST /api/drmne/demandes/:id/valider
Authorization: Bearer <token>
Body: { observations: "Commentaires de validation" }
```
**Rôles autorisés :** DRMNE (11)
**Description :** Valide la demande et la transmet pour signature

### 5. Rejeter une demande PMNE
```
POST /api/drmne/demandes/:id/rejeter
Authorization: Bearer <token>
Body: { motif: "Motif du rejet" }
```
**Rôles autorisés :** DRMNE (11)
**Description :** Rejette la demande avec motif et notifie le demandeur

### 6. Transmettre vers MMI ou DGI
```
POST /api/drmne/demandes/:id/transmettre
Authorization: Bearer <token>
Body: { cible: "MMI"|"DGI", observations: "Commentaires" }
```
**Rôles autorisés :** DRMNE (11)
**Description :** Transmet la demande vers le service ciblé

### 7. Historique d'une demande PMNE
```
GET /api/drmne/demandes/:id/historique
Authorization: Bearer <token>
```
**Rôles autorisés :** DRMNE (11)
**Description :** Récupère l'historique complet des actions sur la demande

## 🔄 Endpoints pour Variantes

### 8. Ré-attribution de dossier
```
POST /api/demandes/:id/reattribuer
Authorization: Bearer <token>
Body: { nouveau_service: "DGI"|"DDPI"|"COMMISSION"|"MINISTERE", justification: "Raison" }
```
**Rôles autorisés :** Admin (1), Chef Service (4), DGI (6), DRMNE (11)
**Description :** Ré-attribue un dossier vers un autre service

### 9. Retour à l'étape précédente
```
POST /api/demandes/:id/retour-etape-precedente
Authorization: Bearer <token>
Body: { etape_cible: "SECRETARIAT_CENTRAL"|"SECRETARIAT_GENERAL"|"DGI"|"DDPI", justification: "Raison" }
```
**Rôles autorisés :** Chef Service (4), DGI (6), DRMNE (11), Ministère (9)
**Description :** Retourne un dossier à une étape antérieure

### 10. Relance automatique
```
POST /api/demandes/:id/relancer
Authorization: Bearer <token>
Body: { type_relance: "AUTOMATIQUE"|"MANUELLE"|"URGENTE", message: "Message de relance" }
```
**Rôles autorisés :** Secrétariat Central (2), Chef Service (4), DGI (6), DRMNE (11)
**Description :** Envoie une relance au demandeur

### 11. Clôture et archivage
```
POST /api/demandes/:id/cloturer
Authorization: Bearer <token>
Body: { motif_cloture: "Raison de la clôture" }
```
**Rôles autorisés :** Admin (1), DGI (6), Ministère (9)
**Description :** Clôture et archive une demande

### 12. Historique des relances
```
GET /api/demandes/:id/relances
Authorization: Bearer <token>
```
**Rôles autorisés :** Admin (1), Secrétariat Central (2), Chef Service (4), DGI (6), DRMNE (11)
**Description :** Récupère l'historique des relances pour une demande

### 13. Demande d'avis multisectoriel
```
POST /api/demandes/:id/avis-multisectoriel
Authorization: Bearer <token>
Body: { commission_cible: "COMMISSION_MULTISECTORIELLE"|"COMITE_TECHNIQUE", motif: "Raison", delai: 30 }
```
**Rôles autorisés :** DGI (6), Commission (7,8)
**Description :** Sollicite un avis multisectoriel

## 📢 Endpoints de Notification

### 14. Envoi de notification personnalisée
```
POST /api/notifications/envoyer
Authorization: Bearer <token>
Body: { 
  destinataires: [1,2,3], 
  type: "TYPE_NOTIFICATION", 
  message: "Message", 
  donnees_supplementaires: {} 
}
```
**Rôles autorisés :** Admin (1), Secrétariat Central (2), Chef Service (4), DGI (6), DRMNE (11)
**Description :** Envoie des notifications personnalisées

### 15. Types de notifications disponibles
```
GET /api/notifications/types
Authorization: Bearer <token>
```
**Rôles autorisés :** Admin (1), Secrétariat Central (2), Chef Service (4), DGI (6), DRMNE (11)
**Description :** Liste tous les types de notifications supportés

## 🗄️ Structure de la Base de Données

### Tables principales
- `demandes` : Demandes d'autorisation
- `utilisateurs` : Utilisateurs de la plateforme
- `suivi_demandes` : Historique des actions
- `notifications` : Notifications système
- `relances` : Relances automatiques et manuelles
- `commissions_avis` : Demandes d'avis multisectoriels

### Colonnes ajoutées
- `motif_rejet` : Motif du rejet d'une demande
- `archive` : Indicateur d'archivage
- `donnees_supplementaires` : Données JSON supplémentaires
- `type_action` : Type d'action dans le suivi
- `priorite` : Priorité des notifications
- `date_expiration` : Date d'expiration des notifications

## 🚀 Utilisation des Endpoints

### Exemple : Demande de complément
```javascript
const response = await fetch('/api/drmne/demandes/123/demander-complement', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Veuillez fournir les statuts de l\'entreprise'
  })
});

const result = await response.json();
console.log(result.message); // "Complément demandé avec succès"
```

### Exemple : Ré-attribution de dossier
```javascript
const response = await fetch('/api/demandes/123/reattribuer', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    nouveau_service: 'DGI',
    justification: 'Nécessite une expertise technique spécifique'
  })
});

const result = await response.json();
console.log(result.nouveau_statut); // "TRANSMISE_AU_DGI"
```

## 📊 Codes de Statut

### Statuts principaux
- `DEPOSEE` : Demande déposée
- `TRANSMISE_AU_SG` : Transmise au Secrétariat Général
- `TRANSMISE_AU_DGI` : Transmise à la DGI
- `TRANSMISE_AU_DDPI` : Transmise à la DDPI
- `EN_COURS_DGI` : En cours d'instruction DGI
- `EN_COURS_DDPI` : En cours d'instruction DDPI
- `EN_COURS_COMMISSION` : En commission
- `EN_COURS_COMITE` : En comité technique
- `AVIS_RENDU` : Avis rendu par la commission
- `EN_ATTENTE_SIGNATURE` : En attente de signature
- `AUTORISATION_SIGNEE` : Autorisation signée
- `CLOTUREE` : Demande clôturée
- `REJETEE` : Demande rejetée
- `PIECES_MANQUANTES` : Pièces complémentaires demandées

## 🔧 Configuration

### Variables d'environnement
```env
JWT_SECRET=votre_cle_secrete
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=mot_de_passe_app
```

### Base de données
```javascript
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisation'
};
```

## 📝 Notes importantes

1. **Sécurité** : Tous les endpoints sont protégés par authentification JWT
2. **Validation** : Les données sont validées côté serveur
3. **Logs** : Toutes les actions sont enregistrées dans le suivi
4. **Notifications** : Les changements de statut déclenchent des notifications automatiques
5. **Archivage** : Les demandes clôturées sont automatiquement archivées

## 🚨 Gestion des Erreurs

### Codes d'erreur HTTP
- `400` : Données invalides ou manquantes
- `401` : Token manquant ou invalide
- `403` : Accès refusé (rôle insuffisant)
- `404` : Ressource non trouvée
- `500` : Erreur serveur interne

### Format des réponses d'erreur
```json
{
  "error": "Description de l'erreur",
  "details": "Détails supplémentaires (optionnel)"
}
```

## 🔄 Workflow des Demandes

1. **Dépôt** → `DEPOSEE`
2. **Accusé de réception** → `TRANSMISE_AU_SG`
3. **Décision de circuit** → `TRANSMISE_AU_DGI` ou `TRANSMISE_AU_DDPI`
4. **Instruction** → `EN_COURS_DGI` ou `EN_COURS_DDPI`
5. **Commission/Comité** → `EN_COURS_COMMISSION` ou `EN_COURS_COMITE`
6. **Avis rendu** → `AVIS_RENDU`
7. **Validation finale** → `EN_ATTENTE_SIGNATURE`
8. **Signature** → `AUTORISATION_SIGNEE`
9. **Clôture** → `CLOTUREE`

Ce backend supporte maintenant tous les scénarios décrits dans les TDR DGI 002/2025 avec une architecture robuste et extensible.




