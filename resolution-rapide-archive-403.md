# 🚨 Résolution Rapide - Erreur 403 Archive Demandes

## ❌ **Problème Identifié**
```
:4000/api/archive/demandes:1 Failed to load resource: the server responded with a status of 403 (Forbidden)
```

## 🔍 **Cause Racine**
L'endpoint `/api/archive/demandes` était configuré pour les rôles `[1, 2, 3]` uniquement :
- **1** : Super Admin
- **2** : Secrétaire Central  
- **3** : Secrétaire Général

**Mais les demandeurs ont le rôle `4`**, d'où l'erreur 403 (Forbidden).

## ✅ **Solution Appliquée**

### **1. Modification du Serveur**
```javascript
// AVANT (ligne 716)
app.get('/api/archive/demandes', authRole([1, 2, 3]), async (req, res) => {

// APRÈS
app.get('/api/archive/demandes', authRole([1, 2, 3, 4]), async (req, res) => {
```

### **2. Logique Conditionnelle Ajoutée**
```javascript
// Si c'est un demandeur (role_id = 4), filtrer par ses propres demandes
if (req.user.role_id === 4) {
  query = `
    SELECT ad.*, ad.demande_id, ad.reference, ad.type, 
           ad.nom_responsable, ad.prenom_responsable, ad.statut,
           ad.date_cloture as date_archivage, ad.fichier_autorisation, ad.donnees
    FROM archive_demandes ad
    WHERE ad.demande_id IN (
      SELECT id FROM demandes WHERE user_id = ?
    )
    ORDER BY ad.date_cloture DESC
  `;
  params = [req.user.id];
} else {
  // Pour les admins, toutes les archives
  // ... requête complète
}
```

### **3. Format de Réponse Corrigé**
```javascript
// AVANT
res.json({ archives: rows });

// APRÈS  
res.json(rows); // Retour direct du tableau
```

## 🧪 **Test de Validation**

### **Script de Test Créé**
```bash
node test-archive-demandeur.js
```

Ce script vérifie :
- ✅ Structure de la table `archive_demandes`
- ✅ Contenu des archives
- ✅ Relations `demandes` ↔ `archive_demandes`
- ✅ Requête de l'endpoint pour demandeur

## 🔄 **Actions à Effectuer**

### **1. Redémarrer le Serveur**
```bash
# Arrêter (Ctrl+C) puis redémarrer
node server.js
```

### **2. Tester l'Archive**
1. ✅ Connectez-vous en tant que demandeur
2. ✅ Accédez à `/archive-demandes`
3. ✅ Vérifiez que les statistiques s'affichent
4. ✅ Vérifiez que le tableau se charge

### **3. Vérifier les Logs**
```bash
# Dans la console du serveur, vous devriez voir :
🔄 [Archive] Consultation des demandes archivées par utilisateur X (rôle: 4)
✅ [Archive] X demandes archivées récupérées pour l'utilisateur X
```

## 📊 **Résultat Attendu**

Après correction :
- ✅ **Erreur 403** disparaît
- ✅ **Statistiques** s'affichent (même si 0)
- ✅ **Tableau** se charge (même si vide)
- ✅ **Filtres** et **recherche** fonctionnent
- ✅ **Actions** (détails, téléchargement) disponibles

## 🎯 **Cas d'Usage**

### **Pour un Demandeur**
- 🔍 **Voit uniquement** ses propres demandes archivées
- 📊 **Statistiques personnelles** (total, répartition par type)
- 📄 **Téléchargement** de ses autorisations signées

### **Pour un Admin**
- 🔍 **Voit toutes** les demandes archivées
- 📊 **Statistiques globales** du système
- 📄 **Accès complet** à toutes les archives

## 🚨 **Si le Problème Persiste**

### **1. Vérifier les Logs du Serveur**
```bash
# Regarder la console du serveur pour des erreurs
```

### **2. Vérifier la Base de Données**
```bash
# Tester la connexion et les requêtes
node test-archive-demandeur.js
```

### **3. Vérifier l'Authentification**
```bash
# S'assurer que le token JWT est valide
# Vérifier que req.user.role_id est bien défini
```

### **4. Vérifier la Table archive_demandes**
```sql
-- Vérifier que la table existe et contient des données
SHOW TABLES LIKE 'archive_demandes';
SELECT COUNT(*) FROM archive_demandes;
```

## 💡 **Prévention Future**

### **1. Tests Automatisés**
- ✅ Tester tous les endpoints avec différents rôles
- ✅ Vérifier les permissions d'accès
- ✅ Valider les formats de réponse

### **2. Documentation des Rôles**
- ✅ Maintenir une liste des rôles et permissions
- ✅ Documenter les endpoints par rôle
- ✅ Tester les accès avant déploiement

### **3. Monitoring**
- ✅ Surveiller les erreurs 403/401
- ✅ Logger les tentatives d'accès
- ✅ Alerter en cas d'anomalies

---

**🔧 Support Technique** : Si le problème persiste, vérifiez les logs du serveur et la configuration de la base de données.
**📚 Documentation** : Consultez le guide complet de l'archive pour plus de détails.



