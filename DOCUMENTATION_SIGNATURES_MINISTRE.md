# 📝 Gestion des Signatures du Ministre - Documentation

## 🎯 **Objectif**
Permettre au ministre de uploader et gérer ses signatures numériques pour les différents types de documents dans le workflow.

## 🗄️ **Structure de la Base de Données**

### **Table 1: `signatures_ministre`**
```sql
CREATE TABLE signatures_ministre (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL COMMENT 'ID du ministre',
  type_signature ENUM('AUTORISATION', 'ACCUSE', 'DOCUMENT_OFFICIEL') NOT NULL DEFAULT 'AUTORISATION',
  fichier_signature VARCHAR(255) NOT NULL COMMENT 'Chemin vers le fichier de signature',
  nom_fichier_original VARCHAR(255) NOT NULL COMMENT 'Nom original du fichier',
  taille_fichier INT COMMENT 'Taille du fichier en bytes',
  mime_type VARCHAR(100) COMMENT 'Type MIME du fichier',
  statut ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') DEFAULT 'ACTIVE',
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  commentaire TEXT COMMENT 'Commentaire optionnel sur la signature',
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);
```

### **Table 2: `signatures_appliquees`**
```sql
CREATE TABLE signatures_appliquees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  signature_id INT NOT NULL COMMENT 'ID de la signature utilisée',
  demande_id INT NOT NULL COMMENT 'ID de la demande signée',
  type_document ENUM('AUTORISATION', 'ACCUSE', 'DOCUMENT_OFFICIEL') NOT NULL,
  fichier_document_signee VARCHAR(255) NOT NULL COMMENT 'Chemin vers le document signé',
  date_signature DATETIME DEFAULT CURRENT_TIMESTAMP,
  utilisateur_id INT NOT NULL COMMENT 'ID du ministre qui a signé',
  FOREIGN KEY (signature_id) REFERENCES signatures_ministre(id) ON DELETE CASCADE,
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);
```

## 🔌 **Endpoints API**

### **1. Upload d'une Signature**
```http
POST /api/ministere/signatures/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- signature: File (PNG, JPG, JPEG, GIF, SVG, PDF)
- type_signature: string (AUTORISATION, ACCUSE, DOCUMENT_OFFICIEL)
- commentaire: string (optionnel)
```

**Réponse:**
```json
{
  "success": true,
  "message": "Signature uploadée avec succès",
  "signature_id": 123,
  "fichier": "signature_AUTORISATION_1234567890.png"
}
```

### **2. Lister les Signatures**
```http
GET /api/ministere/signatures
Authorization: Bearer {token}
```

**Réponse:**
```json
{
  "signatures": [
    {
      "id": 123,
      "type_signature": "AUTORISATION",
      "nom_fichier_original": "ma_signature.png",
      "taille_fichier": 1024000,
      "mime_type": "image/png",
      "statut": "ACTIVE",
      "date_creation": "2025-01-20T10:30:00Z",
      "commentaire": "Signature officielle pour autorisations"
    }
  ]
}
```

### **3. Supprimer une Signature**
```http
DELETE /api/ministere/signatures/{id}
Authorization: Bearer {token}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Signature supprimée avec succès"
}
```

### **4. Appliquer une Signature**
```http
POST /api/ministere/signatures/{id}/appliquer
Authorization: Bearer {token}

Body:
{
  "signature_id": 123,
  "demande_id": 456,
  "type_document": "AUTORISATION"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Signature appliquée avec succès",
  "signature_appliquee_id": 789
}
```

## 📁 **Structure des Fichiers**

```
uploads/
└── signatures/
    └── {user_id}/
        ├── signature_AUTORISATION_1234567890.png
        ├── signature_ACCUSE_1234567891.jpg
        └── signature_DOCUMENT_OFFICIEL_1234567892.pdf
```

## 🔐 **Sécurité et Validation**

### **Types de Fichiers Acceptés**
- **Images**: PNG, JPG, JPEG, GIF, SVG
- **Documents**: PDF
- **Taille maximale**: 10 MB par défaut

### **Authentification**
- Seuls les utilisateurs avec `role_id` correspondant au ministre peuvent accéder
- Middleware `authMinistre` requis pour tous les endpoints

### **Validation des Données**
- Vérification du type de signature
- Validation du format de fichier
- Contrôle de la taille du fichier
- Vérification de l'appartenance des signatures

## 🎨 **Interface Utilisateur**

### **Composant React: `GestionSignatures.jsx`**
- **Upload de signature** avec drag & drop
- **Liste des signatures** avec statistiques
- **Gestion des signatures** (voir, supprimer)
- **Types de signatures** (Autorisation, Accusé, Document Officiel)
- **Statuts** (Active, Inactive, Archived)

### **Fonctionnalités**
- ✅ Upload de fichiers de signature
- ✅ Gestion des types de signatures
- ✅ Commentaires sur les signatures
- ✅ Visualisation des signatures
- ✅ Suppression des signatures
- ✅ Statistiques des signatures
- ✅ Application des signatures aux documents

## 🔄 **Workflow d'Utilisation**

### **1. Upload Initial**
1. Le ministre se connecte à son dashboard
2. Accède à la section "Gestion des Signatures"
3. Upload sa signature pour chaque type de document
4. Ajoute des commentaires si nécessaire

### **2. Application des Signatures**
1. Le ministre consulte les demandes en attente de signature
2. Sélectionne une signature appropriée
3. Applique la signature au document
4. Le document est automatiquement signé et archivé

### **3. Gestion Continue**
1. Le ministre peut modifier ses signatures
2. Supprimer les anciennes signatures
3. Ajouter de nouvelles signatures
4. Consulter l'historique des signatures appliquées

## 🚀 **Avantages de la Fonctionnalité**

- **✅ Flexibilité**: Support de multiples formats de fichiers
- **✅ Sécurité**: Authentification et autorisation strictes
- **✅ Traçabilité**: Historique complet des signatures appliquées
- **✅ Organisation**: Types de signatures catégorisés
- **✅ Interface intuitive**: Dashboard moderne et responsive
- **✅ Intégration**: Parfaitement intégré au workflow existant

## 🔧 **Installation et Configuration**

### **1. Exécuter le Script SQL**
```bash
mysql -u root -p < add_signatures_table.sql
```

### **2. Vérifier les Permissions**
- Dossier `uploads/signatures/` doit être créable par l'application
- Permissions d'écriture sur le dossier uploads

### **3. Tester les Endpoints**
- Vérifier l'upload de signatures
- Tester la liste des signatures
- Valider l'application des signatures

## 📊 **Métriques et Monitoring**

### **Statistiques Disponibles**
- Nombre total de signatures par ministre
- Types de signatures les plus utilisés
- Taille moyenne des fichiers de signature
- Fréquence d'utilisation des signatures

### **Logs et Audit**
- Toutes les actions sont loggées
- Historique des modifications
- Traçabilité des signatures appliquées

## 🎯 **Prochaines Étapes**

1. **Intégration avec les PDFs**: Appliquer automatiquement les signatures aux documents générés
2. **Signature électronique**: Ajouter la validation cryptographique
3. **Templates de signature**: Créer des modèles prédéfinis
4. **Workflow automatisé**: Signature automatique selon les règles métier
5. **Notifications**: Alertes lors de l'application des signatures

---

**✅ Cette fonctionnalité permet au ministre de gérer efficacement ses signatures numériques et de les appliquer aux documents du workflow de manière sécurisée et traçable.**




