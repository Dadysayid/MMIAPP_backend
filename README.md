# Backend - Plateforme de Gestion des Autorisations

## Installation

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configuration de l'environnement
Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Configuration du serveur
PORT=4000
NODE_ENV=development

# Configuration de la base de données MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=gestion_autorisations
DB_PORT=3306

# Configuration JWT
JWT_SECRET=votre_secret_jwt_tres_securise_ici
JWT_EXPIRES_IN=24h

# Configuration email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_application
EMAIL_FROM=Ministère des Mines et de l'Industrie <noreply@mmi.gov.mr>

# Configuration des uploads
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Configuration CORS
CORS_ORIGIN=http://localhost:3000

# Configuration de l'application
APP_NAME=Plateforme de Gestion des Autorisations
APP_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

### 3. Configuration de la base de données
- Créez une base de données MySQL nommée `gestion_autorisations`
- Importez le fichier SQL fourni dans le dossier `database/`

### 4. Démarrer le serveur
```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

## Structure du projet

```
backend/
├── server.js              # Point d'entrée principal
├── package.json           # Dépendances et scripts
├── .env                   # Variables d'environnement
├── uploads/               # Dossier des fichiers uploadés
│   ├── accuses/          # Accusés de réception
│   └── autorisations/    # Autorisations générées
└── database/             # Scripts de base de données
    └── schema.sql        # Structure de la base de données
```

## API Endpoints

### Authentification
- `POST /api/login` - Connexion demandeur
- `POST /api/login/admin` - Connexion administrateur
- `POST /api/register` - Inscription demandeur
- `POST /api/forgot-password` - Mot de passe oublié
- `POST /api/reset-password` - Réinitialisation mot de passe

### Demandes
- `GET /api/demandes` - Liste des demandes
- `POST /api/demandes` - Créer une demande
- `GET /api/demandes/:id` - Détails d'une demande
- `PUT /api/demandes/:id` - Modifier une demande
- `DELETE /api/demandes/:id` - Supprimer une demande

### Administration
- `GET /api/admin/stats` - Statistiques
- `GET /api/admin/users` - Liste des utilisateurs
- `POST /api/admin/users` - Créer un utilisateur
- `PUT /api/admin/users/:id` - Modifier un utilisateur

## Dépendances principales

- **Express** : Framework web
- **MySQL2** : Client MySQL
- **bcrypt** : Hashage des mots de passe
- **jsonwebtoken** : Authentification JWT
- **multer** : Upload de fichiers
- **nodemailer** : Envoi d'emails
- **pdfkit** : Génération de PDF
- **qrcode** : Génération de QR codes
- **cors** : Cross-Origin Resource Sharing

## Scripts disponibles

- `npm start` : Démarrer en mode production
- `npm run dev` : Démarrer en mode développement avec nodemon
- `npm test` : Exécuter les tests (à implémenter)

## Support

Pour toute question ou problème, contactez l'équipe technique du Ministère des Mines et de l'Industrie. 