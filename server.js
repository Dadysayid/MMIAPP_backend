// =================== IMPORTS & CONFIG ===================
const express = require('express');
const app = express();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { Parser } = require('json2csv');
require('dotenv').config();

// =================== CONFIGURATION DES LIMITES ===================
// Les limites sont maintenant configurées dans la section MIDDLEWARES

const JWT_SECRET = process.env.JWT_SECRET || 'seccentral2025';
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisation'
};

// =================== MIDDLEWARES ===================
app.use(cors({ 
  origin: 'http://localhost:3000', 
  credentials: true,
  maxFileSize: '200mb'
}));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// =================== SMTP CONFIG ===================
let transporter;
try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true pour 465, false pour les autres ports
    auth: {
      user: process.env.SMTP_USER || 'diamamoudoumoussa01@gmail.com',
      pass: process.env.SMTP_PASS || 'crqe msdc wgnb vath'
    }
  });
  
  // Vérifier la configuration SMTP
  transporter.verify(function(error, success) {
    if (error) {
      console.log('Erreur de configuration SMTP:', error);
    } else {
      console.log('Serveur SMTP prêt');
    }
  });
} catch (error) {
  console.error('Erreur lors de la création du transporteur SMTP:', error);
  transporter = null;
}

// =================== MIDDLEWARES AUTH ===================
function authRole(allowedRoles) {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' });
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (!allowedRoles.includes(payload.role_id)) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
  };
}
const adminAuth = (roleId = 1) => authRole([roleId]);
const authSecretaire = authRole([2]);
const authSecretaireGeneral = authRole([3]);
const authDDPI = authRole([5]);
const authDGI = authRole([6]);
const authCommission = authRole([7,8]);
const authMinistre = authRole([9]);
const authDRMNE = authRole([11]); // DRMNE / PMNE


// =================== MULTER SETUP ===================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const ref = req.reference || 'temp';
    const dir = path.join(__dirname, 'uploads', ref);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E12);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Configuration multer standard
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    fieldSize: 50 * 1024 * 1024, // 50MB
    files: 50, // Nombre maximum de fichiers (augmenté de 10 à 50)
    fields: 200 // Nombre maximum de champs (augmenté de 100 à 200)
  },
  fileFilter: function (req, file, cb) {
    // Accepter les images et PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez des images ou PDFs.'), false);
    }
  }
});

// Configuration multer pour demandes avec beaucoup de fichiers (eau minérale, etc.)
const uploadMultiple = multer({ 
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB par fichier
    fieldSize: 200 * 1024 * 1024, // 200MB par champ
    files: 1000, // Nombre maximum de fichiers (1000 pour volume industriel)
    fields: 2000 // Nombre maximum de champs
  },
  fileFilter: function (req, file, cb) {
    // Accepter les images, PDFs et documents
    if (file.mimetype.startsWith('image/') || 
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mintype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'text/plain' ||
        file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez des images, PDFs, documents Office, ZIP ou texte.'), false);
    }
  }
});

// Configuration multer pour demandes d'eau minérale (très volumineuses)
const uploadEauMineral = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB par fichier
    fieldSize: 500 * 1024 * 1024, // 500MB par champ
    files: 2000, // Nombre maximum de fichiers (2000 pour eau minérale)
    fields: 5000 // Nombre maximum de champs
  },
  fileFilter: function (req, file, cb) {
    // Accepter tous les types de documents professionnels
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('application/') ||
        file.mimetype.startsWith('text/') ||
        file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.mimetype === 'application/x-rar-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez des documents professionnels standard.'), false);
    }
  }
});

// =================== UTILS ===================
// === UTILITAIRES ===

// =================== GÉNÉRATION IDENTIFIANT UNIQUE ===================
function generateUniqueId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// =================== GÉNÉRATION CODE D'ACCÈS ADMINISTRATION ===================
function generateAdminAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// =================== VALIDATION CODE D'ACCÈS ADMINISTRATION ===================
function validateAdminAccessCode(code) {
  if (!code || code.length !== 8) return false;
  
  const hasUpperCase = /[A-Z]/.test(code);
  const hasLowerCase = /[a-z]/.test(code);
  const hasNumber = /[0-9]/.test(code);
  const hasSpecialChar = /[!@#$%^&*]/.test(code);
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
}

function mailActivationHTML({ nom, prenom, activationLink, identifiant }) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafb; padding:0; margin:0;">
    <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:14px;box-shadow:0 4px 24px #1e6a8e22;overflow:hidden;border:1.5px solid #e3e3e3;">
      <div style="background:linear-gradient(90deg,#7fa22b11 0%,#1e6a8e11 100%);text-align:center;">
        <img src="https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/62367925/2d3b2c5e-0b0f-4b4b-9e53-5e5f2b7f6f1d/banniere_mmi.jpg" alt="Ministère des Mines et de l'Industrie" style="width:100%;max-width:540px;display:block;margin:0 auto;">
      </div>
      <div style="padding:28px 28px 22px 28px;">
        <div style="color:#1e6a8e;font-size:1.25rem;font-weight:800;margin-bottom:18px;text-align:center;">
          Bienvenue sur la plateforme du Ministère des Mines et de l'Industrie
        </div>
        <p>Bonjour <b>${prenom} ${nom}</b>,<br><br>
        Merci pour votre inscription.<br>
        <strong>Votre identifiant de connexion :</strong> ${identifiant}<br><br>
        Pour activer votre compte et accéder à tous les services en ligne, veuillez cliquer sur le bouton ci-dessous :</p>
        <div style="text-align:center;">
          <a href="${activationLink}" style="display:inline-block;margin:22px auto 0 auto;background:linear-gradient(90deg,#1e6a8e 60%,#7fa22b 100%);color:#fff;font-weight:700;font-size:1.13rem;padding:14px 38px;border-radius:8px;text-decoration:none;box-shadow:0 2px 12px #1e6a8e22;">Activer mon compte</a>
        </div>
        <div style="border-top:1px solid #e3e3e3;margin:32px 0 18px 0;"></div>
        <p>
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
          <a href="${activationLink}">${activationLink}</a>
        </p>
        <div style="margin-top:30px;font-size:0.97rem;color:#888;text-align:center;padding-bottom:18px;">
          <b>Ministère des Mines et de l'Industrie</b><br>
          Direction Générale de l'Industrie<br>
          <span style="color:#7fa22b;">République Islamique de Mauritanie</span>
        </div>
      </div>
    </div>
  </div>
  `;
}

// =================== EMAIL D'ACTIVATION AMÉLIORÉ ===================
function mailActivationHTMLWithLoginInfo({ nom, prenom, activationLink, role, loginPage, identifiant }) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafb; padding:0; margin:0;">
    <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:14px;box-shadow:0 4px 24px #1e6a8e22;overflow:hidden;border:1.5px solid #e3e3e3;">
      <div style="background:linear-gradient(90deg,#7fa22b11 0%,#1e6a8e11 100%);text-align:center;">
        <img src="https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/62367925/2d3b2c5e-0b0f-4b4b-9e53-5e5f2b7f6f1d/banniere_mmi.jpg" alt="Ministère des Mines et de l'Industrie" style="width:100%;max-width:540px;display:block;margin:0 auto;">
      </div>
      <div style="padding:28px 28px 22px 28px;">
        <div style="color:#1e6a8e;font-size:1.25rem;font-weight:800;margin-bottom:18px;text-align:center;">
          Bienvenue sur la plateforme du Ministère des Mines et de l'Industrie
        </div>
        <p>Bonjour <b>${prenom} ${nom}</b>,<br><br>
        Votre compte a été créé avec succès par l'administrateur.<br>
        <strong>Rôle attribué :</strong> ${role}<br>
        <strong>Identifiant de connexion :</strong> ${identifiant}<br><br>
        Pour activer votre compte et accéder à votre espace de travail, veuillez cliquer sur le bouton ci-dessous :</p>
        <div style="text-align:center;">
          <a href="${activationLink}" style="display:inline-block;margin:22px auto 0 auto;background:linear-gradient(90deg,#1e6a8e 60%,#7fa22b 100%);color:#fff;font-weight:700;font-size:1.13rem;padding:14px 38px;border-radius:8px;text-decoration:none;box-shadow:0 2px 12px #1e6a8e22;">Activer mon compte</a>
        </div>
        <div style="border-top:1px solid #e3e3e3;margin:32px 0 18px 0;"></div>
        <p>
          <strong>Après activation, vous pourrez vous connecter ici :</strong><br>
          <a href="http://localhost:3000${loginPage}" style="color:#1e6a8e;text-decoration:underline;">http://localhost:3000${loginPage}</a>
        </p>
        <p>
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
          <a href="${activationLink}">${activationLink}</a>
        </p>
        <div style="margin-top:30px;font-size:0.97rem;color:#888;text-align:center;padding-bottom:18px;">
          <b>Ministère des Mines et de l'Industrie</b><br>
          Direction Générale de l'Industrie<br>
          <span style="color:#7fa22b;">République Islamique de Mauritanie</span>
        </div>
      </div>
    </div>
  </div>
  `;
}

async function enregistrerSuivi(conn, demandeId, utilisateurId, action, message, statutPrecedent, nouveauStatut, donneesSupplementaires = null) {
  await conn.execute(
    `INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, statut_precedent, nouveau_statut, donnees_supplementaires)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [demandeId, utilisateurId, action, message, statutPrecedent, nouveauStatut, donneesSupplementaires ? JSON.stringify(donneesSupplementaires) : null]
  );
}
// === Génération PDF accusé de réception (Améliorée) ===
async function generateAccusePDF(demande, user) {
  try {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const uploadsDir = path.join(__dirname, 'uploads', 'accuses');
    
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

  const fileName = `${demande.reference}_accuse.pdf`;
  const filePath = path.join(uploadsDir, fileName);

    // Vérifier si le fichier existe déjà et le supprimer
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // QR Code avec plus d'informations
  const qrData = await QRCode.toDataURL(
      `Référence: ${demande.reference}\nNom: ${user.nom} ${user.prenom}\nDate: ${new Date().toLocaleDateString()}\nMinistère: MMI\nType: ${demande.type}`
  );

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // En-tête avec logo (si disponible)
  const logoPath = path.join(__dirname, 'assets', 'logo_mmi.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.page.width / 2 - 40, 20, { width: 80 });
  }

  doc.moveDown(3);
    
    // Titre principal
  doc.fontSize(16).fillColor('#1e6a8e').font('Helvetica-Bold')
    .text("MINISTÈRE DES MINES ET DE L'INDUSTRIE", { align: 'center' });

  doc.moveDown(0.5);
    
    // Sous-titre
  doc.fontSize(13).fillColor('#444').font('Helvetica-Bold')
    .text("Direction Générale de l'Industrie", { align: 'center' });
 
  doc.moveDown(2);

    // Titre de l'accusé
    doc.fontSize(14).fillColor('#1e6a8e').font('Helvetica-Bold')
      .text("ACCUSÉ DE RÉCEPTION DE DEMANDE", { align: 'center', underline: true });
    doc.moveDown(1.5);

    // Informations principales
    const currentDate = new Date();
    
    doc.fontSize(12).fillColor('#222').font('Helvetica-Bold')
      .text("INFORMATIONS DE LA DEMANDE :")
      .moveDown(0.3);
    
    // Extraire l'adresse du siège des données fournies par le demandeur
    let adresseSiegeDemande = 'Non renseignée';
    if (demande.donnees) {
      try {
        const donnees = JSON.parse(demande.donnees);
        // Chercher l'adresse dans les données fournies par le demandeur
        adresseSiegeDemande = donnees.adresse || 
                              donnees.adresse_siege || 
                              donnees.siege || 
                              donnees.adresse_entreprise ||
                              donnees.adresse_etablissement ||
                              donnees.lieu ||
                              'Non renseignée';
      } catch (error) {
        console.log('Erreur parsing données pour adresse:', error.message);
      }
    }
    
    doc.fontSize(11).fillColor('#222').font('Helvetica')
    .text(`Référence : ${demande.reference}`)
      .text(`Type de demande : ${demande.type}`)
      .text(`Adresse du siège (fournie par le demandeur) : ${adresseSiegeDemande}`)
      .text(`Date de dépôt : ${new Date(demande.created_at).toLocaleDateString('fr-FR')}`)
      .text(`Date d'accusé : ${currentDate.toLocaleDateString('fr-FR')}`)
      .moveDown(1);

    // Informations du demandeur
    doc.fontSize(12).fillColor('#222').font('Helvetica-Bold')
      .text("INFORMATIONS DU RESPONSABLE :")
      .moveDown(0.3);
    
    doc.fontSize(11).fillColor('#222').font('Helvetica')
      .text(`Nom du responsable : ${user.nom_responsable || 'Non renseigné'}`)
      .text(`Prénom du responsable : ${user.prenom_responsable || 'Non renseigné'}`)
      .text(`Email : ${user.email}`)
      .text(`Téléphone : ${user.telephone || 'Non renseigné'}`)
      .moveDown(0.5);
    
    // Adresse du siège (extrait des informations fournies par le demandeur)
    let adresseSiegeDemandeur = 'Non renseignée';
    if (demande.donnees) {
      try {
        const donnees = JSON.parse(demande.donnees);
        // Chercher l'adresse dans les données fournies par le demandeur
        adresseSiegeDemandeur = donnees.adresse || 
                                donnees.adresse_siege || 
                                donnees.siege || 
                                donnees.adresse_entreprise ||
                                donnees.adresse_etablissement ||
                                donnees.lieu ||
                                'Non renseignée';
      } catch (error) {
        console.log('Erreur parsing données pour adresse:', error.message);
      }
    }
    
    doc.text(`Adresse du siège (fournie par le demandeur) : ${adresseSiegeDemandeur}`)
      .moveDown(1.5);

    // Message principal
  doc.fontSize(12).fillColor('#222').font('Helvetica')
      .text("Nous accusons réception de votre demande qui a été enregistrée dans nos services.", { align: 'justify' })
      .moveDown(0.5)
      .text("Votre dossier sera examiné dans les meilleurs délais conformément aux procédures en vigueur.", { align: 'justify' })
      .moveDown(0.5)
      .text("Vous serez informé(e) de l'évolution du traitement de votre demande via la plateforme MMIAPP.", { align: 'justify' })
    .moveDown(2);

    // Tampon officiel exactement comme l'image - Direction Générale de l'Industrie
    doc.moveDown(3);
    
    // Position pour centrer le tampon
    const stampWidth = 240;
    const stampHeight = 160;
    const stampX = (doc.page.width - stampWidth) / 2;
    const stampY = doc.y;
    
    // Rectangle du tampon avec coins arrondis et bordure bleue épaisse
    doc.rect(stampX, stampY, stampWidth, stampHeight)
      .lineWidth(4)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Texte "Direction Générale de l'Industrie" en haut du tampon (centré)
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("Direction Générale de l'Industrie", 
        stampX + stampWidth/2, 
        stampY + 25, 
        { align: 'center', width: stampWidth - 20 }
      );
    
    // Ligne "Arrivée. le" avec date (gauche, bien espacée)
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("Arrivée. le", stampX + 20, stampY + 60);
    
    // Ligne de soulignement bleue épaisse pour la date (étendue jusqu'au bord droit)
    doc.moveTo(stampX + 20, stampY + 80)
      .lineTo(stampX + stampWidth - 20, stampY + 80)
      .lineWidth(3)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Date de la demande (sur la ligne, centrée)
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#1e6a8e')
      .text(new Date(demande.created_at).toLocaleDateString('fr-FR'), 
        stampX + 20, stampY + 85, { width: stampWidth - 40, align: 'center' });
    
    // Ligne "N°:" avec référence (gauche, bien espacée)
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("N°:", stampX + 20, stampY + 110);
    
    // Ligne de soulignement bleue épaisse pour la référence (étendue jusqu'au bord droit)
    doc.moveTo(stampX + 20, stampY + 130)
      .lineTo(stampX + stampWidth - 20, stampY + 130)
      .lineWidth(3)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Référence de la demande (sur la ligne, centrée)
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#1e6a8e')
      .text(demande.reference, stampX + 20, stampY + 135, { width: stampWidth - 40, align: 'center' });
    
    // QR Code à droite du tampon (position ajustée)
    doc.image(qrData, stampX + stampWidth + 20, stampY, { width: 90 });
    
    doc.moveDown(4);
    
    // Signature administrative
    doc.fontSize(11).fillColor('#222').font('Helvetica')
      .text(`Fait à Nouakchott, le ${currentDate.toLocaleDateString('fr-FR')}`)
      .moveDown(1)
      .text("Pour le Ministère des Mines et de l'Industrie")
      .text("Le Secrétariat Central")
      .moveDown(3);

    // Pied de page
    doc.fontSize(9).fillColor('#888').font('Helvetica')
      .text("Ce document est généré automatiquement par la plateforme MMIAPP.", { align: 'center' })
      .text("République Islamique de Mauritanie - Ministère des Mines et de l'Industrie", { align: 'center' });

  doc.end();
    
    // Attendre que le fichier soit complètement écrit
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // Vérifier que le fichier a bien été créé
    if (!fs.existsSync(filePath)) {
      throw new Error('Le fichier PDF n\'a pas été créé');
    }
    
    console.log(`✅ PDF généré avec succès: ${filePath}`);
  return path.join('accuses', fileName);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error);
    throw new Error(`Erreur de génération PDF: ${error.message}`);
  }
}


// =================== ROUTES MINISTRE ===================
// Signature et envoi automatique au demandeur
app.post('/api/ministre/demandes/:id/signer-et-envoyer', authRole([7]), async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;

  try {
    console.log(`🔄 [Ministre] Signature et envoi automatique de la demande ${demandeId}`);
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe et est transmise au Ministre
    const [demandeResult] = await conn.execute(
      'SELECT d.*, u.email, u.nom_responsable, u.prenom_responsable FROM demandes d JOIN utilisateurs u ON d.utilisateur_id = u.id WHERE d.id = ?', 
      [demandeId]
    );
    
    if (demandeResult.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    const demande = demandeResult[0];
    if (demande.statut !== 'TRANSMISE_AU_MINISTRE') {
      await conn.end();
      return res.status(400).json({ 
        error: `Impossible de signer. Statut actuel: ${demande.statut}. Statut requis: TRANSMISE_AU_MINISTRE` 
      });
    }

    const oldStatus = demande.statut;
    const newStatus = 'AUTORISATION_SIGNEE';
    
    // 📝 GÉNÉRATION DE L'AUTORISATION OFFICIELLE SIGNÉE
    console.log(`📄 [AUTORISATION] Génération de l'autorisation officielle signée...`);
    let autorisationBuffer;
    try {
      autorisationBuffer = await generateAutorisationOfficielle(demande, req.user);
      console.log(`✅ Autorisation officielle générée: ${autorisationBuffer.length} bytes`);
    } catch (pdfError) {
      console.error(`❌ Erreur génération autorisation: ${pdfError.message}`);
      await conn.end();
      return res.status(500).json({ error: 'Erreur lors de la génération de l\'autorisation officielle' });
    }
    
    // Mettre à jour le statut et enregistrer l'autorisation
    await conn.execute(
      `UPDATE demandes SET 
         statut = ?, 
         fichier_autorisation = ?,
         donnees = JSON_SET(IFNULL(donnees, '{}'), '$.commentaire_ministre_signature', ?, '$.date_signature_ministre', NOW(), '$.signature_ministre', ?),
         updated_at = NOW() 
       WHERE id = ?`,
      [newStatus, autorisationBuffer, commentaire || 'Autorisation signée par le Ministre', req.user.id, demandeId]
    );

    // Enregistrer dans l'historique
    await enregistrerSuivi(
      conn, 
      demandeId, 
      req.user.id, 
      'SIGNATURE_MINISTRE', 
      commentaire || 'Autorisation signée par le Ministre', 
      oldStatus, 
      newStatus
    );

    // 🔔 NOTIFICATION AUTOMATIQUE AU DEMANDEUR
    await conn.execute(
      'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "AUTORISATION_SIGNEE", ?, 0, NOW())',
      [demande.utilisateur_id, `Félicitations ! Votre demande ${demande.reference} a été approuvée et signée par le Ministre. Vous pouvez maintenant télécharger votre autorisation officielle.`]
    );

    // 🔔 NOTIFICATION AU PERSONNEL ADMINISTRATIF (Archive)
    const [adminUsers] = await conn.execute('SELECT id FROM utilisateurs WHERE role_id IN (1, 2, 3)'); // Roles admin
    for (const adminUser of adminUsers) {
      await conn.execute(
        'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "DOSSIER_ARCHIVE", ?, 0, NOW())',
        [adminUser.id, `Dossier ${demande.reference} clôturé et archivé. Le demandeur ${demande.prenom_responsable} ${demande.prenom_responsable} a obtenu son autorisation.`]
      );
    }

    // 📁 CRÉATION AUTOMATIQUE DU DOSSIER D'ARCHIVE
    await conn.execute(
      `INSERT INTO archive_demandes (
        demande_id, reference, type, nom_responsable, prenom_responsable, 
        statut_final, date_cloture, commentaire_final, autorisation_signee_par,
        fichier_autorisation
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        demande.id, 
        demande.reference, 
        demande.type, 
        demande.nom_responsable, 
        demande.prenom_responsable,
        newStatus,
        commentaire || 'Autorisation signée par le Ministre',
        req.user.id,
        autorisationBuffer
      ]
    );

    // 🔄 CLÔTURE AUTOMATIQUE DE LA DEMANDE
    await conn.execute(
      `UPDATE demandes SET statut = 'CLOTUREE', updated_at = NOW() WHERE id = ?`,
      [demandeId]
    );

    // Enregistrer la clôture dans l'historique
    await enregistrerSuivi(
      conn, 
      demandeId, 
      req.user.id, 
      'CLOTURE_AUTOMATIQUE', 
      'Demande clôturée automatiquement après signature ministérielle', 
      newStatus, 
      'CLOTUREE'
    );

    console.log(`✅ [Ministre] Demande ${demande.reference} signée, autorisation générée, envoyée au demandeur et archivée avec succès`);
    
    await conn.end();
    
    res.json({ 
      success: true, 
      message: 'Autorisation officielle signée et envoyée automatiquement au demandeur. Dossier archivé et clôturé.',
      nouveau_statut: 'CLOTUREE',
      demandeur_notifie: true,
      personnel_notifie: adminUsers.length,
      archive_creee: true,
      autorisation_generee: true
    });
    
  } catch (err) {
    console.error('❌ [Ministre] Erreur lors de la signature et envoi:', err);
    res.status(500).json({ error: 'Erreur lors de la signature et envoi' });
  }
});

// =================== ROUTES DEMANDEUR ===================
// Télécharger l'autorisation officielle signée
app.get('/api/demandeur/autorisation/:id', authRole([4]), async (req, res) => {
  try {
    const { id } = req.params;
    const demandeurId = req.user.id;
    
    console.log(`🔍 [DEMANDEUR] Téléchargement autorisation pour demande ${id} par utilisateur ${demandeurId}`);
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande appartient au demandeur et est signée
    const [demandes] = await conn.execute(`
      SELECT d.*, u.nom_responsable, u.prenom_responsable, u.email, u.telephone, u.adresse
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.id = ? AND d.utilisateur_id = ? AND d.statut = 'AUTORISATION_SIGNEE'
    `, [id, demandeurId]);
    
    if (demandes.length === 0) {
      await conn.end();
      return res.status(404).json({ 
        error: 'Autorisation non trouvée ou non autorisée' 
      });
    }
    
    const demande = demandes[0];
    console.log(`✅ Autorisation trouvée: ${demande.reference}`);
    
    // Vérifier que le fichier d'autorisation existe
    if (!demande.fichier_autorisation) {
      await conn.end();
      return res.status(404).json({ 
        error: 'Fichier d\'autorisation non trouvé' 
      });
    }
    
    // Envoyer le fichier d'autorisation
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="autorisation-${demande.reference}.pdf"`);
    res.setHeader('Content-Length', demande.fichier_autorisation.length);
    
    console.log(`✅ Autorisation envoyée: ${demande.fichier_autorisation.length} bytes`);
    res.send(demande.fichier_autorisation);
    
    await conn.end();
    
  } catch (error) {
    console.error(`❌ [DEMANDEUR] Erreur téléchargement autorisation: ${error.message}`);
    res.status(500).json({ 
      error: 'Erreur lors du téléchargement de l\'autorisation' 
    });
  }
});

// =================== ROUTES ARCHIVE (Personnel Administratif + Demandeurs) ===================
// Consulter les archives des demandes clôturées
app.get('/api/archive/demandes', authRole([1, 2, 3, 4]), async (req, res) => {
  try {
    console.log(`🔄 [Archive] Consultation des demandes archivées par utilisateur ${req.user.id} (rôle: ${req.user.role_id})`);
    
    const conn = await mysql.createConnection(dbConfig);
    
    let query, params;
    
    // Si c'est un demandeur (role_id = 4), filtrer par ses propres demandes
    if (req.user.role_id === 4) {
      query = `
        SELECT 
          ad.*,
          ad.demande_id,
          ad.reference,
          ad.type,
          ad.nom_responsable,
          ad.prenom_responsable,
          ad.statut,
          ad.date_cloture as date_archivage,
          ad.fichier_autorisation,
          ad.donnees
        FROM archive_demandes ad
        WHERE ad.demande_id IN (
          SELECT id FROM demandes WHERE user_id = ?
        )
        ORDER BY ad.date_cloture DESC
      `;
      params = [req.user.id];
    } else {
      // Pour les admins, toutes les archives
      query = `
        SELECT 
          ad.*,
          ad.demande_id,
          ad.reference,
          ad.type,
          ad.nom_responsable,
          ad.prenom_responsable,
          ad.statut,
          ad.date_cloture as date_archivage,
          ad.fichier_autorisation,
          ad.donnees,
          CONCAT(ad.demandeur_prenom, ' ', ad.demandeur_nom) AS demandeur_complet,
          u.nom AS ministre_nom,
          u.prenom AS ministre_prenom,
          CONCAT(u.prenom, ' ', u.nom) AS ministre_complet
        FROM archive_demandes ad
        LEFT JOIN utilisateurs u ON ad.autorisation_signee_par = u.id
        ORDER BY ad.date_cloture DESC
        LIMIT 100
      `;
      params = [];
    }
    
    const [rows] = await conn.execute(query, params);
    await conn.end();
    
    console.log(`✅ [Archive] ${rows.length} demandes archivées récupérées pour l'utilisateur ${req.user.id}`);
    
    // Retourner directement le tableau pour le frontend
    res.json(rows);
    
  } catch (err) {
    console.error('❌ [Archive] Erreur lors de la consultation:', err);
    res.status(500).json({ error: 'Erreur lors de la consultation des archives' });
  }
});

// Recherche dans les archives
app.get('/api/archive/recherche', authRole([1, 2, 3]), async (req, res) => {
  const { reference, demandeur, type, date_debut, date_fin } = req.query;
  
  try {
    console.log(`🔍 [Archive] Recherche avec critères:`, { reference, demandeur, type, date_debut, date_fin });
    
    const conn = await mysql.createConnection(dbConfig);
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (reference) {
      whereClause += ' AND ad.reference LIKE ?';
      params.push(`%${reference}%`);
    }
    
    if (demandeur) {
      whereClause += ' AND (ad.nom_responsable LIKE ? OR ad.prenom_responsable LIKE ?)';
      params.push(`%${demandeur}%`);
      params.push(`%${demandeur}%`);
    }
    
    if (type) {
      whereClause += ' AND ad.type = ?';
      params.push(type);
    }
    
    if (date_debut) {
      whereClause += ' AND DATE(ad.date_cloture) >= ?';
      params.push(date_debut);
    }
    
    if (date_fin) {
      whereClause += ' AND DATE(ad.date_cloture) <= ?';
      params.push(date_fin);
    }
    
    const [rows] = await conn.execute(
      `SELECT 
         ad.*,
         CONCAT(ad.demandeur_prenom, ' ', ad.demandeur_nom) AS demandeur_complet,
         u.nom AS ministre_nom,
         u.prenom AS ministre_prenom,
         CONCAT(u.prenom, ' ', u.nom) AS ministre_complet
       FROM archive_demandes ad
       LEFT JOIN utilisateurs u ON ad.autorisation_signee_par = u.id
       ${whereClause}
       ORDER BY ad.date_cloture DESC`,
      params
    );
    await conn.end();
    
    console.log(`✅ [Archive] Recherche terminée: ${rows.length} résultats trouvés`);
    res.json({ archives: rows, criteres: req.query });
    
  } catch (err) {
    console.error('❌ [Archive] Erreur lors de la recherche:', err);
    res.status(500).json({ error: 'Erreur lors de la recherche dans les archives' });
  }
});

// Statistiques des archives
app.get('/api/archive/stats', authRole([1, 2, 3]), async (req, res) => {
  try {
    console.log(`📊 [Archive] Calcul des statistiques par utilisateur ${req.user.id}`);
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Total des demandes archivées
    const [totalResult] = await conn.execute('SELECT COUNT(*) as total FROM archive_demandes');
    const total = totalResult[0].total;
    
    // Par type de demande
    const [typeStats] = await conn.execute(
      'SELECT type, COUNT(*) as count FROM archive_demandes GROUP BY type ORDER BY count DESC'
    );
    
    // Par mois (derniers 12 mois)
    const [monthlyStats] = await conn.execute(`
      SELECT 
        DATE_FORMAT(date_cloture, '%Y-%m') as mois,
        COUNT(*) as count
      FROM archive_demandes 
      WHERE date_cloture >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(date_cloture, '%Y-%m')
      ORDER BY mois DESC
    `);
    
    await conn.end();
    
    const stats = {
      total,
      par_type: typeStats,
      par_mois: monthlyStats
    };
    
    console.log(`✅ [Archive] Statistiques calculées: Total: ${total}, Types: ${typeStats.length}, Mois: ${monthlyStats.length}`);
    res.json({ stats });
    
  } catch (err) {
    console.error('❌ [Archive] Erreur lors du calcul des statistiques:', err);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
});

// =================== ROUTES UTILISATEURS ===================
// ... (inscription, activation, login, forgot/reset password, mes-demandes, etc. )


// Inscription avec activation email
app.post('/api/inscription', async (req, res) => {
  const { 
    nom_entreprise, nom_responsable, prenom_responsable, email, mot_de_passe, 
    forme_juridique, forme_juridique_autre, nif, telephone, adresse_siege, 
    email_recuperation 
  } = req.body;
  
  // Validation des champs obligatoires
  if (!nom_entreprise || !nom_responsable || !prenom_responsable || !email || !mot_de_passe || !forme_juridique) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
  }
  
  // Validation de la forme juridique "AUTRES"
  if (forme_juridique === 'AUTRES' && !forme_juridique_autre) {
    return res.status(400).json({ error: "Veuillez préciser la forme juridique." });
  }
  
  // Validation du format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Format d'email invalide." });
  }
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [exists] = await conn.execute('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (exists.length > 0) {
      await conn.end();
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }
    const hash = await bcrypt.hash(mot_de_passe, 10);
    const activationToken = crypto.randomBytes(32).toString('hex');
    
    // Générer un identifiant unique
    let uniqueId;
    let idExists = true;
    while (idExists) {
      uniqueId = generateUniqueId();
      const [idCheck] = await conn.execute('SELECT id FROM utilisateurs WHERE identifiant_unique = ?', [uniqueId]);
      idExists = idCheck.length > 0;
    }
    
    // Remplacer undefined par null pour les champs optionnels
    const nifValue = nif || null;
    const telephoneValue = telephone || null;
    const adresseSiegeValue = adresse_siege || null;
    const formeJuridiqueValue = forme_juridique === 'AUTRES' ? forme_juridique_autre : forme_juridique;
    const emailRecuperationValue = email_recuperation || null;
    
    await conn.execute(
      `INSERT INTO utilisateurs (
        nom_entreprise, nom_responsable, prenom_responsable, email, mot_de_passe, 
        forme_juridique, nif, telephone, adresse_siege, email_recuperation,
        role_id, statut, email_verifie, activation_token, identifiant_unique, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, 'EN_ATTENTE', 0, ?, ?, NOW())`,
      [nom_entreprise, nom_responsable, prenom_responsable, email, hash, 
       formeJuridiqueValue, nifValue, telephoneValue, adresseSiegeValue, emailRecuperationValue,
       activationToken, uniqueId]
    );
    await conn.end();

    const activationLink = `http://localhost:3000/activation/${activationToken}`;
    
    // Envoyer l'email d'activation seulement si le transporteur SMTP est configuré
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Ministère des Mines et de l'Industrie" <${process.env.SMTP_USER || 'diamamoudoumoussa01@gmail.com'}>`,
          to: email,
          subject: "Activation de votre compte - Ministère des Mines et de l'Industrie",
          html: mailActivationHTML({ nom: nom_responsable, prenom: prenom_responsable, activationLink, identifiant: uniqueId })
        });
        console.log(`Email d'activation envoyé à ${email}`);
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email:', emailError);
        // Continuer même si l'email échoue
      }
    } else {
      console.log('Transporteur SMTP non configuré, email d\'activation non envoyé');
    }

    res.json({ 
      success: true, 
      message: "Compte créé avec succès. Vérifiez votre email pour l'activation.",
      identifiant: uniqueId,
      activationLink: activationLink
    });
  } catch (err) {
    console.error('Erreur lors de l\'inscription:', err);
    res.status(500).json({ 
      error: "Erreur serveur lors de l'inscription", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Activation compte
app.get('/api/activation/:token', async (req, res) => {
  const { token } = req.params;
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT id FROM utilisateurs WHERE activation_token = ?', [token]);
  if (rows.length === 0) {
    await conn.end();
    return res.status(400).json({ error: "Lien d'activation invalide ou expiré." });
  }
  await conn.execute('UPDATE utilisateurs SET statut="ACTIF", email_verifie=1, activation_token=NULL WHERE id=?', [rows[0].id]);
  await conn.end();
  res.json({ success: true, message: "Votre compte est maintenant activé." });
});
// Connexion demandeur
app.post('/api/login', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe) {
    return res.status(400).json({ error: "Identifiant/Email et mot de passe requis." });
  }
  try {
    const conn = await mysql.createConnection(dbConfig);
    // Permettre la connexion avec l'email ou l'identifiant unique
    const [rows] = await conn.execute('SELECT * FROM utilisateurs WHERE email = ? OR identifiant_unique = ?', [email, email]);
    await conn.end();
    if (rows.length === 0) {
      return res.status(401).json({ error: "Identifiant/Email ou mot de passe incorrect." });
    }
    const user = rows[0];
    if (!(await bcrypt.compare(mot_de_passe, user.mot_de_passe))) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }
    if (user.statut !== 'ACTIF' || user.email_verifie !== 1) {
      return res.status(403).json({ error: "Veuillez activer votre compte via l'email reçu." });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role_id: user.role_id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    const userToSend = {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      nom_responsable: user.nom_responsable,
      prenom_responsable: user.prenom_responsable,
      email: user.email,
      role_id: user.role_id,
      nif: user.nif,
      telephone: user.telephone,
      adresse: user.adresse,
      statut: user.statut,
      email_verifie: user.email_verifie,
      derniere_connexion: user.derniere_connexion,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    res.json({ token, user: userToSend });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// Mot de passe oublié
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  // Permettre la récupération avec l'email ou l'identifiant unique
  const [utilisateurs] = await conn.execute('SELECT id, nom, prenom, email FROM utilisateurs WHERE email=? OR identifiant_unique=?', [email, email]);
  if (utilisateurs.length === 0) {
    await conn.end();
    return res.status(200).json({ success: true }); // Ne jamais révéler si l'email existe ou non
  }
  const resetToken = crypto.randomBytes(32).toString('hex');
  await conn.execute('UPDATE utilisateurs SET reset_token=?, reset_token_expire=DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id=?', [resetToken, utilisateurs[0].id]);
  await conn.end();

  const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
  await transporter.sendMail({
    from: `"Ministère des Mines et de l'Industrie" <${process.env.SMTP_USER || 'diamamoudoumoussa01@gmail.com'}>`,
    to: utilisateurs[0].email,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <div style='font-family: "Segoe UI", Arial, sans-serif;'>
        <h2 style='color:#1e6a8e;'>Réinitialisation de votre mot de passe</h2>
        <p>Bonjour <b>${utilisateurs[0].prenom} ${utilisateurs[0].nom}</b>,<br>
        Pour réinitialiser votre mot de passe, cliquez sur le bouton ci-dessous :</p>
        <a href='${resetLink}' style='display:inline-block;background:#1e6a8e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:18px 0;'>Réinitialiser mon mot de passe</a>
        <p>Ce lien expirera dans 1 heure.<br>
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `
  });

  res.json({ success: true });
});

// Réinitialisation mot de passe
app.post('/api/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { nouveau_mot_de_passe } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  const [utilisateurs] = await conn.execute(
    'SELECT id FROM utilisateurs WHERE reset_token=? AND reset_token_expire > NOW()', [token]
  );
  if (utilisateurs.length === 0) {
    await conn.end();
    return res.status(400).json({ error: "Lien invalide ou expiré" });
  }
  const hash = await bcrypt.hash(nouveau_mot_de_passe, 10);
  await conn.execute(
    'UPDATE utilisateurs SET mot_de_passe=?, reset_token=NULL, reset_token_expire=NULL WHERE id=?',
    [hash, utilisateurs[0].id]
  );
  await conn.end();
  res.json({ success: true });
});

// Liste des demandes du demandeur
app.get('/api/mes-demandes', async (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: "user_id requis" });
  
  try {
    console.log(`📋 [mes-demandes] Récupération pour utilisateur ${user_id}`);
    
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT d.id, d.reference, d.type, d.created_at, d.updated_at, d.statut, 
              d.fichiers, d.fichier_accuse, d.lien_autorisation, d.motif_rejet
       FROM demandes d
       WHERE d.utilisateur_id = ?
       ORDER BY d.updated_at DESC, d.created_at DESC`,
      [user_id]
    );
    await conn.end();
    
    const demandes = rows.map(d => ({
      ...d,
      fichiers: d.fichiers ? JSON.parse(d.fichiers) : null
    }));
    
    console.log(`✅ [mes-demandes] ${demandes.length} demandes récupérées pour utilisateur ${user_id}`);
    console.log(`📊 [mes-demandes] Statuts trouvés: ${[...new Set(demandes.map(d => d.statut))].join(', ')}`);
    
    res.json(demandes);
  } catch (err) {
    console.error('❌ [mes-demandes] Erreur:', err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});
const generateReferenceMiddleware = async (req, res, next) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
    
    // Utiliser MAX() pour obtenir la plus haute séquence de la journée
    const [[result]] = await conn.execute(
      'SELECT COALESCE(MAX(CAST(SUBSTRING(reference, 9) AS UNSIGNED)), 0) + 1 AS next_seq FROM demandes WHERE reference LIKE ?',
      [`${date}-%`]
    );
    
    const nextSeq = result.next_seq;
    req.reference = `${date}-${String(nextSeq).padStart(4,'0')}`;
    
    console.log(`🔢 [generateReference] Date: ${date}, Séquence: ${nextSeq}, Référence: ${req.reference}`);
    
    await conn.end();
    next();
  } catch (err) {
    console.error('❌ [generateReference] Erreur:', err);
    res.status(500).json({ error: "Erreur lors de la génération de la référence : " + err.message });
  }
};

// =================== ROUTES DEMANDES ===================
// =================== Nouvelle demande ===================
// =================== Nouvelle demande ===================
app.post('/api/nouvelle-demande', generateReferenceMiddleware, uploadEauMineral.any(), async (req, res) => {
  try {
    const { typeDemande, utilisateur_id, ...fields } = req.body || {};
    if (!typeDemande || !utilisateur_id) {
      return res.status(400).json({ error: "Champs obligatoires manquants." });
    }
    const conn = await mysql.createConnection(dbConfig);

    // Exception : la boulangerie peut faire plusieurs demandes
    if (typeDemande !== "boulangerie") {
      const [existing] = await conn.execute(
        'SELECT id FROM demandes WHERE utilisateur_id = ? AND type = ? AND statut NOT IN ("CLOTUREE", "REJETEE")',
        [utilisateur_id, typeDemande]
      );
      if (existing.length > 0) {
        await conn.end();
        return res.status(400).json({ error: "Vous avez déjà une demande en cours pour ce type." });
      }
    }
    const reference = req.reference;
    const files = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach(f => { files[f.fieldname] = path.join(reference, f.filename); });
    }

    // Insertion initiale avec statut DEPOSEE
    const [result] = await conn.execute(
      `INSERT INTO demandes (utilisateur_id, type, statut, reference, donnees, fichiers, created_at)
       VALUES (?, ?, 'DEPOSEE', ?, ?, ?, NOW())`,
      [
        utilisateur_id,
        typeDemande,
        reference,
        JSON.stringify(fields),
        JSON.stringify(files)
      ]
    );
    const demandeId = result.insertId;

    // Notification pour le secrétariat central (optionnel)
    await conn.execute(
      'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "NOUVELLE_DEMANDE", ?, 0, NOW())',
      [utilisateur_id, `Une nouvelle demande a été déposée : ${reference}`]
    );

    await conn.end();
    res.json({ success: "Demande enregistrée !", reference });
  } catch (err) {
    console.error("Erreur /api/nouvelle-demande :", err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});
//======================SuperAdmin====================================
// Connexion SuperAdmin
app.post('/api/admin-login', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT * FROM utilisateurs WHERE email = ?', [email]);
    await conn.end();
    if (rows.length === 0) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }
    const user = rows[0];
    if (!(await bcrypt.compare(mot_de_passe, user.mot_de_passe))) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }
    if (user.role_id !== 1) {
      return res.status(403).json({ error: "Accès réservé au SuperAdmin." });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role_id: user.role_id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    const userToSend = {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role_id: user.role_id,
      statut: user.statut,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    res.json({ token, user: userToSend });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// Vérification du code d'accès admin
app.post('/api/verify-admin-code', async (req, res) => {
  const { accessCode } = req.body;
  
  if (!accessCode) {
    return res.status(400).json({ 
      success: false, 
      message: "Code d'accès requis" 
    });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Créer la table admin_access_codes si elle n'existe pas
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS admin_access_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(8) NOT NULL UNIQUE,
        description VARCHAR(255),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Vérifier s'il y a déjà des codes, sinon créer un code par défaut
    const [existingCodes] = await conn.execute('SELECT COUNT(*) as count FROM admin_access_codes');
    
    if (existingCodes[0].count === 0) {
      // Créer un code d'accès par défaut
      const defaultCode = 'ADMIN123';
      await conn.execute(
        'INSERT INTO admin_access_codes (code, description) VALUES (?, ?)',
        [defaultCode, 'Code d\'accès par défaut']
      );
      console.log('🔑 Code d\'accès admin par défaut créé:', defaultCode);
    }
    
    // Vérifier si le code existe et est actif
    const [codes] = await conn.execute(
      'SELECT * FROM admin_access_codes WHERE code = ? AND active = 1',
      [accessCode]
    );
    
    await conn.end();
    
    if (codes.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: "Code d'accès invalide ou expiré" 
      });
    }
    
    // Code valide
    res.json({ 
      success: true, 
      message: "Code d'accès vérifié avec succès",
      code: codes[0]
    });
    
  } catch (err) {
    console.error('Erreur lors de la vérification du code admin:', err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur lors de la vérification" 
    });
  }
});

// Liste des utilisateurs + stats (SuperAdmin)
app.get('/api/admin/users', adminAuth(1), async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [users] = await conn.execute('SELECT id, nom, prenom, email, role_id, statut FROM utilisateurs');
    // Statistiques
    const total = users.length;
    const actifs = users.filter(u => u.statut === 'ACTIF').length;
    const roles = {};
    users.forEach(u => {
      let roleLabel = '';
      switch (u.role_id) {
        case 1: roleLabel = 'SuperAdmin'; break;
        case 2: roleLabel = 'Secrétariat Central'; break;
        case 3: roleLabel = 'Secrétariat Général'; break;
        case 4: roleLabel = 'Chef de Service'; break;
        case 5: roleLabel = 'DDPI'; break;
        case 6: roleLabel = 'DGI'; break;
        case 7: roleLabel = 'Commission'; break;
        case 8: roleLabel = 'Comité'; break;
        case 9: roleLabel = 'MMI'; break;
        case 10: roleLabel = 'Demandeur'; break;
        default: roleLabel = 'Autre';
      }
      u.role = roleLabel;
      roles[roleLabel] = (roles[roleLabel] || 0) + 1;
    });
    await conn.end();
    res.json({ users, stats: { total, actifs, roles } });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});
//Création d'un nouvel utilisateur (SuperAdmin)
app.post('/api/admin/create-user', adminAuth(1), async (req, res) => {
  const { nom, prenom, email, role, password } = req.body;
  if (!nom || !prenom || !email || !role || !password) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }
  
  let emailSent = null;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [exists] = await conn.execute('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (exists.length > 0) {
      await conn.end();
      return res.status(400).json({ error: "Cet email existe déjà." });
    }
    
    // ✅ MAPPING CORRECT DES RÔLES
    const roleMap = {
      'SuperAdmin': 1,
      'Secrétariat Central': 2,
      'Secrétariat Général': 3,
      'Chef de Service': 4,
      'DDPI': 5,
      'DGI': 6,
      'Commission': 7,
      'Comité': 8,
      'MMI': 9,
      'Demandeur': 10,
      'PNME': 7
    };
    const role_id = roleMap[role] || 10;
    const hash = await bcrypt.hash(password, 10);
    
    // Générer un token d'activation unique
    const activationToken = crypto.randomBytes(32).toString('hex');
    
    // Générer un identifiant unique
    let uniqueId;
    let idExists = true;
    while (idExists) {
      uniqueId = generateUniqueId();
      const [idCheck] = await conn.execute('SELECT id FROM utilisateurs WHERE identifiant_unique = ?', [uniqueId]);
      idExists = idCheck.length > 0;
    }
    
    // Créer l'utilisateur avec statut EN_ATTENTE et token d'activation
    const [result] = await conn.execute(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role_id, statut, email_verifie, activation_token, identifiant_unique, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [nom, prenom, email, hash, role_id, 'EN_ATTENTE', 0, activationToken, uniqueId]
    );
    
    // Récupère le nouvel utilisateur créé
    const [rows] = await conn.execute(
      'SELECT id, nom, prenom, email, role_id, statut, created_at FROM utilisateurs WHERE id = ?', 
      [result.insertId]
    );
    
    await conn.end();
    
    // ✅ AMÉLIORATION: Email avec informations de connexion
    try {
      const activationLink = `http://localhost:3000/activation/${activationToken}`;
      
      // Déterminer la page de login selon le rôle
      let loginPage = '/';
      switch(role_id) {
        case 1: loginPage = '/login-superadmin'; break;
        case 2: loginPage = '/login-secretaire-central'; break;
        case 3: loginPage = '/login-secretaire-general'; break;
        case 4: loginPage = '/login-chef-service'; break;
        case 5: loginPage = '/login-ddpi'; break;
        case 6: loginPage = '/login-dgi'; break;
        case 7: loginPage = '/login-commission'; break;
        case 8: loginPage = '/login-comite'; break;
        case 9: loginPage = '/login-ministre'; break;
        case 10: loginPage = '/login'; break;
      }
      await transporter.sendMail({
        from: "Ministère des Mines et de l'Industrie <oumar.parhe-sow@richat-partners.com>",
        to: email,
        subject: "Activation de votre compte - Ministère des Mines et de l'Industrie",
        html: mailActivationHTMLWithLoginInfo({ 
          nom, 
          prenom, 
          activationLink, 
          role, 
          loginPage,
          identifiant: uniqueId
        })
      });
      emailSent = true;
    } catch (emailError) {
      console.error(`Erreur lors de l'envoi de l'email à ${email}:`, emailError);
      emailSent = false;
    }
    
    const newUser = rows[0];
    newUser.role = role;
    
    res.json({ 
      success: true, 
      message: "Utilisateur créé avec succès.",
      newUser: newUser,
      emailSent: emailSent,
      loginPage: loginPage
    });
    
  } catch (err) {
    console.error('Erreur lors de la création:', err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});


//Réinitialiser mot de passe SuperAdmin
app.post('/api/admin-reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { nouveau_mot_de_passe } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  const [utilisateurs] = await conn.execute(
    'SELECT id FROM utilisateurs WHERE reset_token=? AND reset_token_expire > NOW()', [token]
  );
  if (utilisateurs.length === 0) {
    await conn.end();
    return res.status(400).json({ error: "Lien invalide ou expiré" });
  }
  const hash = await bcrypt.hash(nouveau_mot_de_passe, 10);
  await conn.execute(
    'UPDATE utilisateurs SET mot_de_passe=?, reset_token=NULL, reset_token_expire=NULL WHERE id=?',
    [hash, utilisateurs[0].id]
  );
  await conn.end();
  res.json({ success: true });
});
// =================== ROUTES SUPERADMIN SUPPLÉMENTAIRES ===================
// Supprimer un utilisateur (SuperAdmin)
app.delete('/api/admin/users/:id', adminAuth(1), async (req, res) => {
  const userId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que l'utilisateur existe
    const [user] = await conn.execute('SELECT id, nom, prenom FROM utilisateurs WHERE id = ?', [userId]);
    if (user.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    // Empêcher la suppression de son propre compte
    if (parseInt(userId) === req.user.id) {
      await conn.end();
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
    }

    // Vérifier s'il y a des demandes associées à cet utilisateur
    const [demandes] = await conn.execute('SELECT COUNT(*) as count FROM demandes WHERE utilisateur_id = ?', [userId]);
    const hasDemandes = demandes[0].count > 0;

    if (hasDemandes) {
      await conn.end();
      return res.status(400).json({ 
        error: `Impossible de supprimer l'utilisateur ${user[0].nom} ${user[0].prenom}. 
        Cet utilisateur a ${demandes[0].count} demande(s) associée(s) dans le système. 
        Veuillez d'abord supprimer ou transférer ces demandes, ou utilisez la fonction "Désactiver" à la place.` 
      });
    }

    // Supprimer l'utilisateur
    const [result] = await conn.execute('DELETE FROM utilisateurs WHERE id = ?', [userId]);
    
    if (result.affectedRows === 0) {
      await conn.end();
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    await conn.end();
    res.json({ 
      success: true, 
      message: `Utilisateur ${user[0].nom} ${user[0].prenom} supprimé avec succès.` 
    });
  } catch (err) {
    console.error('Erreur lors de la suppression:', err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// Désactiver/Activer un utilisateur (SuperAdmin)
app.patch('/api/admin/users/:id/toggle-status', adminAuth(1), async (req, res) => {
  const userId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Récupérer l'utilisateur actuel
    const [user] = await conn.execute('SELECT id, nom, prenom, statut FROM utilisateurs WHERE id = ?', [userId]);
    if (user.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    // Empêcher la désactivation de son propre compte
    if (parseInt(userId) === req.user.id) {
      await conn.end();
      return res.status(400).json({ error: "Vous ne pouvez pas modifier le statut de votre propre compte." });
    }

    const currentStatus = user[0].statut;
    const newStatus = currentStatus === 'ACTIF' ? 'INACTIF' : 'ACTIF';

    // Mettre à jour le statut
    const [result] = await conn.execute(
      'UPDATE utilisateurs SET statut = ?, updated_at = NOW() WHERE id = ?', 
      [newStatus, userId]
    );

    if (result.affectedRows === 0) {
      await conn.end();
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    // Récupérer l'utilisateur mis à jour
    const [updatedUser] = await conn.execute(
      'SELECT id, nom, prenom, email, role_id, statut FROM utilisateurs WHERE id = ?', 
      [userId]
    );

    await conn.end();
    res.json({ 
      success: true, 
      message: `Utilisateur ${user[0].nom} ${user[0].prenom} ${newStatus === 'ACTIF' ? 'activé' : 'désactivé'} avec succès.`,
      user: updatedUser[0]
    });
  } catch (err) {
    console.error('Erreur lors du changement de statut:', err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});



// Route pour renvoyer l'email d'activation (nouvelle route)
app.post('/api/admin/users/:id/resend-activation', adminAuth(1), async (req, res) => {
  const userId = req.params.id;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Récupérer l'utilisateur
    const [user] = await conn.execute(
      'SELECT id, nom, prenom, email, statut, activation_token, identifiant_unique FROM utilisateurs WHERE id = ?', 
      [userId]
    );
    
    if (user.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }
    
    const userData = user[0];
    
    // Vérifier que l'utilisateur est bien en attente
    if (userData.statut !== 'EN_ATTENTE') {
      await conn.end();
      return res.status(400).json({ error: "L'utilisateur n'est pas en attente d'activation." });
    }
    
    // Générer un nouveau token si nécessaire
    let activationToken = userData.activation_token;
    if (!activationToken) {
      activationToken = crypto.randomBytes(32).toString('hex');
      await conn.execute(
        'UPDATE utilisateurs SET activation_token = ? WHERE id = ?',
        [activationToken, userId]
      );
    }
    
    await conn.end();
    
    // Envoyer l'email d'activation
    try {
      const activationLink = `http://localhost:3000/activation/${activationToken}`;
      await transporter.sendMail({
        from: "Ministère des Mines et de l'Industrie <oumar.parhe-sow@richat-partners.com>",
        to: userData.email,
        subject: "Activation de votre compte - Ministère des Mines et de l'Industrie",
        html: mailActivationHTML({ 
          nom: userData.nom, 
          prenom: userData.prenom, 
          activationLink,
          identifiant: userData.identifiant_unique
        })
      });
    
    res.json({ 
      success: true, 
        message: `Email d'activation renvoyé à ${userData.prenom} ${userData.nom}` 
      });
      
    } catch (emailError) {
      console.error(`Erreur lors de l'envoi de l'email à ${userData.email}:`, emailError);
      res.status(500).json({ 
        error: "Erreur lors de l'envoi de l'email d'activation. Veuillez réessayer." 
      });
    }
    
  } catch (err) {
    console.error('Erreur lors du renvoi de l\'activation:', err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});


// =================== ROUTES SECRETAIRE CENTRAL ===================

// LOGIN SECRETAIRE CENTRAL
app.post('/api/login/secretaire', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM utilisateurs WHERE email=? AND role_id=2 LIMIT 1",
      [email]
    );
    await conn.end();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Utilisateur inconnu ou non autorisé' });
    }
    const user = rows[0];

    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    if (user.statut !== 'ACTIF' || user.email_verifie != 1) {
      return res.status(403).json({ error: "Votre compte n'est pas activé. Vérifiez votre email." });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role_id: user.role_id
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const userToSend = {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role_id: user.role_id,
      statut: user.statut,
      email_verifie: user.email_verifie
    };

    res.json({ token, user: userToSend });
  } catch (err) {
    console.error("Erreur /api/login/secretaire :", err);
    res.status(500).json({ error: "Erreur serveur, contactez l'administrateur." });
  }
});
//=====Liste des demandes===================================
app.get('/api/demandes', authSecretaire, async (req, res) => {
  try {
    const { statut } = req.query;
    let where, params = [];
    
    if (statut === 'RECEPTIONNEE') {
      where = "d.statut = 'RECEPTIONNEE'";
    } else if (statut === 'TRANSMISE') {
      where = "d.statut IN ('TRANSMISE_AU_SG', 'TRANSMISE_AU_DGI')";
    } else {
      // "nouvelles" = toutes les demandes en cours de traitement
      where = "d.statut IN ('DEPOSEE', 'RECEPTIONNEE', 'TRANSMISE_AU_SG', 'TRANSMISE_AU_DGI')";
    }
    
    console.log(`📋 [api/demandes] Récupération avec filtre: ${statut || 'toutes'}, WHERE: ${where}`);
    
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT d.id, d.reference, u.nom AS demandeur_nom, u.email AS demandeur_email, 
              u.telephone AS demandeur_telephone, COALESCE(u.adresse_siege) AS demandeur_adresse,
              d.created_at AS date, d.statut, d.fichier_accuse, d.updated_at
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE ${where}
       ORDER BY d.updated_at DESC, d.created_at DESC`,
      params
    );
    await conn.end();
    
    console.log(`✅ [api/demandes] ${rows.length} demandes récupérées`);
    res.json({ demandes: rows });
  } catch (err) {
    console.error('❌ [api/demandes] Erreur:', err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});
//=====================Historique d'une demande ======================
app.get('/api/demandes/:id/historique', authSecretaire, async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT s.*, u.nom AS utilisateur_nom, u.prenom AS utilisateur_prenom
       FROM suivi_demandes s
       LEFT JOIN utilisateurs u ON s.utilisateur_id = u.id
       WHERE s.demande_id = ?
       ORDER BY s.id DESC`, [demandeId]
    );
    await conn.end();
    res.json({ historique: rows });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});
//===========================Accusé de réception ===============
app.post('/api/demandes/:id/accuser-reception', authSecretaire, async (req, res) => {
  const demandeId = req.params.id;
  let conn;
  
  try {
    console.log(`🔄 [accuser-reception] Début du traitement pour demande ${demandeId}`);
    
    // Vérification des permissions
    if (req.user.role_id !== 2) {
      console.warn(`❌ [accuser-reception] Accès refusé pour l'utilisateur role_id=${req.user.role_id}`);
      return res.status(403).json({ 
        error: "Accès refusé : seul le secrétariat central peut générer des accusés de réception" 
      });
    }
    
    conn = await mysql.createConnection(dbConfig);

    // Récupérer la demande avec un verrou pour éviter les conflits
    await conn.execute('SELECT GET_LOCK(?, 10)', [`accuse_${demandeId}`]);

    const [[demande]] = await conn.execute('SELECT * FROM demandes WHERE id=?', [demandeId]);
    if (!demande) {
      console.warn(`❌ [accuser-reception] Demande ${demandeId} non trouvée`);
      await conn.execute('SELECT RELEASE_LOCK(?)', [`accuse_${demandeId}`]);
      await conn.end();
      return res.status(404).json({ error: "Demande non trouvée" });
    }
    
    console.log(`📋 [accuser-reception] Demande trouvée: ${demande.reference}, statut actuel: ${demande.statut}`);

    // Vérifier que la demande est au bon statut
    if (demande.statut !== 'DEPOSEE') {
      console.warn(`❌ [accuser-reception] Statut incorrect: ${demande.statut}, attendu: DEPOSEE`);
      await conn.execute('SELECT RELEASE_LOCK(?)', [`accuse_${demandeId}`]);
      await conn.end();
      return res.status(400).json({ 
        error: `Impossible de générer l'accusé de réception. La demande doit être au statut "DEPOSEE". Statut actuel: ${demande.statut}` 
      });
    }

    // Vérifier qu'un accusé n'existe pas déjà
    if (demande.fichier_accuse) {
      console.warn(`❌ [accuser-reception] Accusé déjà existant: ${demande.fichier_accuse}`);
      await conn.execute('SELECT RELEASE_LOCK(?)', [`accuse_${demandeId}`]);
      await conn.end();
      return res.status(400).json({ 
        error: "Un accusé de réception a déjà été généré pour cette demande" 
      });
    }

    // Récupérer l'utilisateur demandeur
    const [[user]] = await conn.execute('SELECT * FROM utilisateurs WHERE id=?', [demande.user_id || demande.utilisateur_id]);
    if (!user) {
      console.warn(`❌ [accuser-reception] Utilisateur ${demande.utilisateur_id} non trouvé`);
      await conn.execute('SELECT RELEASE_LOCK(?)', [`accuse_${demandeId}`]);
      await conn.end();
      return res.status(404).json({ error: "Utilisateur demandeur non trouvé" });
    }

    console.log(`👤 [accuser-reception] Utilisateur trouvé: ${user.nom} ${user.prenom}`);

    // Générer le PDF d'accusé de réception
    console.log(`📄 [accuser-reception] Génération du PDF pour ${demande.reference}`);
    const pdfFile = await generateAccusePDF(demande, user);
    
    if (!pdfFile) {
      console.error(`❌ [accuser-reception] Échec de génération du PDF`);
      await conn.execute('SELECT RELEASE_LOCK(?)', [`accuse_${demandeId}`]);
      await conn.end();
      return res.status(500).json({ error: "Erreur lors de la génération du PDF d'accusé de réception" });
    }

    console.log(`✅ [accuser-reception] PDF généré: ${pdfFile}`);

    // Commencer une transaction pour la mise à jour
    await conn.beginTransaction();
    
    try {
      // Mettre à jour la demande (statut + fichier_accuse) de façon atomique
    const [updateResult] = await conn.execute(
        'UPDATE demandes SET statut = ?, fichier_accuse = ?, updated_at = NOW() WHERE id = ? AND statut = ?',
        ['RECEPTIONNEE', pdfFile, demandeId, 'DEPOSEE']
    );
      
    if (updateResult.affectedRows === 0) {
        throw new Error("La demande a été modifiée par un autre processus ou n'est plus au statut DEPOSEE");
      }
      
      console.log(`✅ [accuser-reception] Statut mis à jour: DEPOSEE → RECEPTIONNEE`);

      // Enregistrer dans l'historique
      await enregistrerSuivi(
        conn, 
        demandeId, 
        req.user.id, 
        'ACCUSER_RECEPTION', 
        `Accusé de réception généré automatiquement par ${req.user.nom} ${req.user.prenom}`, 
        'DEPOSEE', 
        'RECEPTIONNEE',
        { fichier_accuse: pdfFile, agent_id: req.user.id }
      );

      // Notification pour le demandeur
      await conn.execute(
        'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "ACCUSER_RECEPTION", ?, 0, NOW())',
        [
          (demande.user_id || demande.utilisateur_id), 
          `✅ Votre accusé de réception est maintenant disponible pour la demande ${demande.reference}. Vous pouvez le télécharger depuis votre tableau de bord.`
        ]
      );

      // 🔔 NOTIFICATION INFORMATIVE POUR LA DGI (accusé de réception fait)
      // Récupérer tous les utilisateurs DGI (role_id = 6)
      const [dgiUsers] = await conn.execute('SELECT id FROM utilisateurs WHERE role_id = 6');
      
      for (const dgiUser of dgiUsers) {
        await conn.execute(
          'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "INFO_DGI", ?, 0, NOW())',
          [
            dgiUser.id,
            `📋 Accusé de réception généré pour la demande ${demande.reference} par le Secrétariat Central. La demande est maintenant au statut "RECEPTIONNEE".`
          ]
        );
      }

      console.log(`🔔 [accuser-reception] Notifications envoyées à ${dgiUsers.length} utilisateurs DGI`);

      // Valider la transaction
      await conn.commit();
      console.log(`✅ [accuser-reception] Transaction confirmée pour demande ${demandeId}`);
      
    } catch (transactionError) {
      await conn.rollback();
      console.error(`❌ [accuser-reception] Erreur de transaction:`, transactionError);
      throw transactionError;
    }

    // Libérer le verrou
    await conn.execute('SELECT RELEASE_LOCK(?)', [`accuse_${demandeId}`]);
    await conn.end();
    
    // Mettre à jour le localStorage pour notifier les autres onglets
    const timestamp = Date.now().toString();
    
    // Réponse de succès avec toutes les informations
    res.json({ 
      success: true, 
      message: "Accusé de réception généré avec succès. La DGI a été notifiée.", 
      fichier_accuse: pdfFile,
      nouveau_statut: 'RECEPTIONNEE',
      reference: demande.reference,
      demandeur: `${user.nom} ${user.prenom}`,
      timestamp: timestamp,
      dgi_notifiee: true
    });
    
    console.log(`🎉 [accuser-reception] Succès complet pour demande ${demande.reference}`);
    
  } catch (err) {
    // Nettoyage en cas d'erreur
    if (conn) {
      try {
        await conn.rollback();
        await conn.execute('SELECT RELEASE_LOCK(?)', [`accuse_${demandeId}`]);
        await conn.end();
      } catch (rollbackError) {
        console.error('❌ [accuser-reception] Erreur lors du nettoyage:', rollbackError);
      }
    }
    
    console.error('❌ [accuser-reception] Erreur fatale:', err);
    
    // Réponse d'erreur détaillée
    let errorMessage = "Erreur interne du serveur lors de la génération de l'accusé de réception";
    let statusCode = 500;
    
    if (err.message.includes('modifiée par un autre processus')) {
      errorMessage = "La demande a été modifiée par un autre processus. Veuillez réessayer.";
      statusCode = 409;
    } else if (err.message.includes('PDF')) {
      errorMessage = "Erreur lors de la génération du PDF d'accusé de réception";
      statusCode = 500;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.get('/api/notifications', async (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: "user_id requis" });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT id, message, type, lu, created_at FROM notifications WHERE utilisateur_id = ? ORDER BY created_at DESC`,
      [user_id]
    );
    await conn.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// Route pour permettre au Secrétariat Central de télécharger l'accusé avec le nouveau tampon
app.get('/api/demandes/:id/telecharger-accuse-secretaire', authSecretaire, async (req, res) => {
  const demandeId = req.params.id;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Récupérer les détails de la demande
    const [[demande]] = await conn.execute(
      'SELECT d.*, u.nom, u.prenom, u.email, u.telephone, u.adresse, u.adresse_siege FROM demandes d JOIN utilisateurs u ON d.utilisateur_id = u.id WHERE d.id = ?',
      [demandeId]
    );
    
    if (!demande) {
      await conn.end();
      return res.status(404).json({ error: "Demande non trouvée" });
    }
    
    await conn.end();
    
    // Générer l'accusé avec le nouveau tampon
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });
    
    // En-tête avec logo plus grand et mieux positionné
    const logoPath = path.join(__dirname, 'assets', 'Logo.png');
    if (fs.existsSync(logoPath)) {
      // Logo plus grand et centré
      doc.image(logoPath, 50, 50, { width: 120, height: 120 });
      doc.moveDown(2);
    }
    
    // Titre principal du ministère
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor('#229954')
       .text('MINISTÈRE DES MINES ET DE L\'INDUSTRIE', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Sous-titre avec la Direction Générale
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text('DIRECTION GÉNÉRALE DE L\'INDUSTRIE', { align: 'center' });
    
    doc.moveDown(0.5);
    
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor('#333')
       .text('République Islamique de Mauritanie', { align: 'center' });
    
    doc.moveDown(2);
    
    // Titre principal du document
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#229954')
       .text('ACCUSÉ DE RÉCEPTION', { align: 'center' });
    
    doc.moveDown(2);
    
    // Informations de la demande
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#333')
       .text('N°:', 50, doc.y);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666')
       .text(demande.reference, 200, doc.y - 15);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#333')
       .text('Date de dépôt:', 50, doc.y);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666')
       .text(new Date(demande.date).toLocaleDateString('fr-FR'), 200, doc.y - 15);
    
    doc.moveDown(1);
    
    // Informations du demandeur
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#229954')
       .text('INFORMATIONS DU DEMANDEUR', 50, doc.y);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#333')
       .text('Nom et Prénom:', 50, doc.y);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666')
       .text(`${demande.nom} ${demande.prenom}`, 200, doc.y - 15);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#333')
       .text('Email:', 50, doc.y);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666')
       .text(demande.email, 200, doc.y - 15);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#333')
       .text('Téléphone:', 50, doc.y);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666')
       .text(demande.telephone || 'Non renseigné', 200, doc.y - 15);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#333')
       .text('Adresse:', 50, doc.y);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666')
       .text(demande.adresse || 'Non renseignée', 200, doc.y - 15);
    
    doc.moveDown(2);
    
    // Message de confirmation avec contenu du décret
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#229954')
       .text('CONFIRMATION DE RÉCEPTION ET ENREGISTREMENT', 50, doc.y);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#333')
       .text('Conformément aux dispositions du décret n° 189-2009 du 07 juin 2009 relatif à l\'enregistrement, au suivi et à la classification des entreprises industrielles, notamment son article 4,', 50, doc.y);
    
    doc.moveDown(1);
    
    // Nom de l'établissement
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(`l'**Ets ${demande.nom} ${demande.prenom}**`, 50, doc.y);
    
    doc.font('Helvetica')
       .fillColor('#333')
       .text('est enregistré sous le numéro', 50, doc.y);
    
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(`**${demande.reference}**`, 50, doc.y);
    
    doc.font('Helvetica')
       .fillColor('#333')
       .text('pour une', 50, doc.y);
    
    // Activité dynamique selon la demande (depuis les données JSON)
    let activite = 'Usine transformation de produits agricoles'; // Valeur par défaut
    
    try {
      if (demande.donnees) {
        const donnees = JSON.parse(demande.donnees);
        if (donnees.activite_principale) {
          activite = donnees.activite_principale;
        }
      }
    } catch (e) {
      console.log('Erreur parsing données JSON:', e);
    }
    
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(activite, 50, doc.y);
    
    doc.font('Helvetica')
       .fillColor('#333')
       .text(',', 50, doc.y);
    
    doc.moveDown(1);
    
    // Adresse du siège dynamique
    const adresseSiege = demande.adresse_siege || demande.adresse || 'Adresse non renseignée';
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(adresseSiege, 50, doc.y);
    
    doc.text('.', 50, doc.y);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#333')
       .text('Cet enregistrement est valable pour une durée de six mois, expirant le', 50, doc.y);
    
    // Date d'expiration (6 mois après la date de création)
    const dateCreation = new Date(demande.date);
    const dateExpiration = new Date(dateCreation);
    dateExpiration.setMonth(dateExpiration.getMonth() + 6);
    
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(`**${dateExpiration.toLocaleDateString('fr-FR')}**`, 50, doc.y);
    
    doc.font('Helvetica')
       .fillColor('#333')
       .text('son renouvellement est subordonné à la communication par l\'entreprise de toutes les informations demandées (cf. article 5 du même décret).', 50, doc.y);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#333')
       .text('Nous confirmons la réception de votre demande d\'autorisation d\'exploitation minière.', 50, doc.y);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#333')
       .text('Votre dossier a été enregistré et sera traité dans les plus brefs délais.', 50, doc.y);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#333')
       .text('Vous recevrez une notification dès que votre demande sera transmise au Secrétariat Général.', 50, doc.y);
    
    doc.moveDown(3);
    
    // Tampon officiel exactement comme l'image - Direction Générale de l'Industrie
    doc.moveDown(3);
    
    // Position pour centrer le tampon
    const stampWidth = 240;
    const stampHeight = 160;
    const stampX = (doc.page.width - stampWidth) / 2;
    const stampY = doc.y;
    
    // Rectangle du tampon avec coins arrondis et bordure bleue épaisse
    doc.rect(stampX, stampY, stampWidth, stampHeight)
      .lineWidth(4)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Texte "Direction Générale de l'Industrie" en haut du tampon (centré)
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("Direction Générale de l'Industrie", 
        stampX + stampWidth/2, 
        stampY + 25, 
        { align: 'center', width: stampWidth - 20 }
      );
    
    // Ligne "Arrivée. le" avec date (gauche, bien espacée)
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("Arrivée. le", stampX + 20, stampY + 60);
    
    // Ligne de soulignement bleue épaisse pour la date (étendue jusqu'au bord droit)
    doc.moveTo(stampX + 20, stampY + 80)
      .lineTo(stampX + stampWidth - 20, stampY + 80)
      .lineWidth(3)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Date de la demande (sur la ligne, centrée)
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#1e6a8e')
      .text(new Date(demande.created_at).toLocaleDateString('fr-FR'), 
        stampX + 20, stampY + 85, { width: stampWidth - 40, align: 'center' });
    
    // Ligne "N°:" avec référence (gauche, bien espacée)
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("N°:", stampX + 20, stampY + 110);
    
    // Ligne de soulignement bleue épaisse pour la référence (étendue jusqu'au bord droit)
    doc.moveTo(stampX + 20, stampY + 130)
      .lineTo(stampX + stampWidth - 20, stampY + 130)
      .lineWidth(3)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Référence de la demande (sur la ligne, centrée)
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#1e6a8e')
      .text(demande.reference, stampX + 20, stampY + 135, { width: stampWidth - 40, align: 'center' });
    
    // QR Code à droite du tampon (position ajustée)
    doc.image(qrData, stampX + stampWidth + 20, stampY, { width: 90 });
    
    doc.moveDown(4);
    
    // Signature et cachet
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#333')
       .text('Signature et cachet:', 50, doc.y);
    
    doc.moveDown(1);
    
    // Ligne de signature
    doc.moveTo(50, doc.y)
       .lineTo(250, doc.y)
       .strokeColor('#ccc')
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(1);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666')
       .text('Le Secrétaire Central', 50, doc.y);
    
    doc.moveDown(0.5);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666')
       .text('Direction Générale de l\'Industrie', 50, doc.y);
    
    // Pied de page
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666')
       .text('Ce document est généré automatiquement par le système MMIAPP', 50, 750, { align: 'center' });
    
    // Finaliser le document
    doc.end();
    
    // Définir les headers pour le téléchargement
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="accuse_reception_${demande.reference}_nouveau_tampon.pdf"`);
    
    // Envoyer le PDF
    doc.pipe(res);
    
  } catch (err) {
    console.error('Erreur lors de la génération de l\'accusé avec nouveau tampon:', err);
    res.status(500).json({ error: "Erreur serveur lors de la génération de l'accusé" });
  }
});

// Route pour générer le document d'enregistrement avec adresse dynamique
app.get('/api/demandes/:id/document-enregistrement', async (req, res) => {
  const demandeId = req.params.id;
  const user_id = req.query.user_id;
  
  if (!user_id) {
    return res.status(400).json({ error: "user_id requis" });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Récupérer les détails de la demande et du demandeur
    const [[demande]] = await conn.execute(
      'SELECT d.*, u.nom, u.prenom, u.email, u.telephone, u.adresse, u.adresse_siege FROM demandes d JOIN utilisateurs u ON d.utilisateur_id = u.id WHERE d.id = ? AND u.id = ?',
      [demandeId, user_id]
    );
    
    if (!demande) {
      await conn.end();
      return res.status(404).json({ error: "Demande non trouvée ou accès refusé" });
    }
    
    await conn.end();
    
    // Générer le document d'enregistrement
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });
    
    // En-tête avec logo
    const logoPath = path.join(__dirname, 'assets', 'Logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 50, { width: 80, height: 80 });
      doc.moveDown(1);
    }
    
    // Titre du document
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#229954')
       .text('DOCUMENT D\'ENREGISTREMENT', { align: 'center' });
    
    doc.moveDown(2);
    
    // Contenu du document
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#333');
    
    // Premier paragraphe
    doc.text('Conformément aux dispositions du décret n° 189-2009 du 07 juin 2009 relatif à l\'enregistrement, au suivi et à la classification des entreprises industrielles, notamment son article 4,');
    
    doc.moveDown(1);
    
    // Nom de l'établissement
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(`l'**Ets ${demande.nom} ${demande.prenom}**`);
    
    doc.font('Helvetica')
       .fillColor('#333')
       .text('est enregistré sous le numéro');
    
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(`**${demande.reference}**`);
    
    doc.font('Helvetica')
       .fillColor('#333')
       .text('pour une', 50, doc.y);
    
    // Activité dynamique selon la demande (depuis les données JSON)
    let activite = 'Usine transformation de produits agricoles'; // Valeur par défaut
    
    try {
      if (demande.donnees) {
        const donnees = JSON.parse(demande.donnees);
        if (donnees.activite_principale) {
          activite = donnees.activite_principale;
        }
      }
    } catch (e) {
      console.log('Erreur parsing données JSON:', e);
    }
    
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(activite, 50, doc.y);
    
    doc.font('Helvetica')
       .fillColor('#333')
       .text(',');
    
    // Adresse du siège dynamique
    const adresseSiege = demande.adresse_siege || demande.adresse || 'Adresse non renseignée';
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(`**${adresseSiege}**`);
    
    doc.text('.');
    
    doc.moveDown(2);
    
    // Deuxième paragraphe
    doc.text('Cet enregistrement est valable pour une durée de six mois, expirant le');
    
    // Date d'expiration (6 mois après la date de création)
    const dateCreation = new Date(demande.date);
    const dateExpiration = new Date(dateCreation);
    dateExpiration.setMonth(dateExpiration.getMonth() + 6);
    
    doc.font('Helvetica-Bold')
       .fillColor('#1890ff')
       .text(`**${dateExpiration.toLocaleDateString('fr-FR')}**`);
    
    doc.font('Helvetica')
       .fillColor('#333')
       .text('son renouvellement est subordonné à la communication par l\'entreprise de toutes les informations demandées (cf. article 5 du même décret).');
    
    doc.moveDown(3);
    
    // Tampon officiel exactement comme l'image - Direction Générale de l'Industrie
    doc.moveDown(3);
    
    // Position pour centrer le tampon
    const stampWidth = 240;
    const stampHeight = 160;
    const stampX = (doc.page.width - stampWidth) / 2;
    const stampY = doc.y;
    
    // Rectangle du tampon avec coins arrondis et bordure bleue épaisse
    doc.rect(stampX, stampY, stampWidth, stampHeight)
      .lineWidth(4)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Texte "Direction Générale de l'Industrie" en haut du tampon (centré)
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("Direction Générale de l'Industrie", 
        stampX + stampWidth/2, 
        stampY + 25, 
        { align: 'center', width: stampWidth - 20 }
      );
    
    // Ligne "Arrivée. le" avec date (gauche, bien espacée)
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("Arrivée. le", stampX + 20, stampY + 60);
    
    // Ligne de soulignement bleue épaisse pour la date (étendue jusqu'au bord droit)
    doc.moveTo(stampX + 20, stampY + 80)
      .lineTo(stampX + stampWidth - 20, stampY + 80)
      .lineWidth(3)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Date de la demande (sur la ligne, centrée)
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#1e6a8e')
      .text(new Date(demande.created_at).toLocaleDateString('fr-FR'), 
        stampX + 20, stampY + 85, { width: stampWidth - 40, align: 'center' });
    
    // Ligne "N°:" avec référence (gauche, bien espacée)
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("N°:", stampX + 20, stampY + 110);
    
    // Ligne de soulignement bleue épaisse pour la référence (étendue jusqu'au bord droit)
    doc.moveTo(stampX + 20, stampY + 130)
      .lineTo(stampX + stampWidth - 20, stampY + 130)
      .lineWidth(3)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Référence de la demande (sur la ligne, centrée)
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#1e6a8e')
      .text(demande.reference, stampX + 20, stampY + 135, { width: stampWidth - 40, align: 'center' });
    
    // QR Code à droite du tampon (position ajustée)
    doc.image(qrData, stampX + stampWidth + 20, stampY, { width: 90 });
    
    doc.moveDown(4);
    
    // Signature
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#333')
       .text('Signature et cachet:', 50, doc.y);
    
    doc.moveDown(1);
    
    doc.moveTo(50, doc.y)
       .lineTo(250, doc.y)
       .strokeColor('#ccc')
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(1);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666')
       .text('Le Secrétaire Central', 50, doc.y);
    
    // Pied de page
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666')
       .text('Ce document est généré automatiquement par le système MMIAPP', 50, 750, { align: 'center' });
    
    // Finaliser le document
    doc.end();
    
    // Définir les headers pour le téléchargement
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="document_enregistrement_${demande.reference}.pdf"`);
    
    // Envoyer le PDF
    doc.pipe(res);
    
  } catch (err) {
    console.error('Erreur lors de la génération du document d\'enregistrement:', err);
    res.status(500).json({ error: "Erreur serveur lors de la génération du document" });
  }
});

// Route pour permettre aux demandeurs de télécharger leur accusé de réception
app.get('/api/demandes/:id/telecharger-accuse', async (req, res) => {
  const demandeId = req.params.id;
  const user_id = req.query.user_id;
  
  if (!user_id) {
    return res.status(400).json({ error: "user_id requis" });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande appartient bien à l'utilisateur
    const [[demande]] = await conn.execute(
      'SELECT d.*, u.id as user_id FROM demandes d JOIN utilisateurs u ON d.utilisateur_id = u.id WHERE d.id = ? AND u.id = ?',
      [demandeId, user_id]
    );
    
    if (!demande) {
      await conn.end();
      return res.status(404).json({ error: "Demande non trouvée ou accès refusé" });
    }
    
    if (!demande.fichier_accuse) {
      await conn.end();
      return res.status(404).json({ error: "Aucun accusé de réception disponible pour cette demande" });
    }
    
    await conn.end();
    
    // Construire le chemin complet du fichier
    const filePath = path.join(__dirname, 'uploads', demande.fichier_accuse);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Fichier d'accusé de réception introuvable" });
    }
    
    // Envoyer le fichier
    res.download(filePath, `accuse_reception_${demande.reference}.pdf`);
    
  } catch (err) {
    console.error('Erreur lors du téléchargement de l\'accusé:', err);
    res.status(500).json({ error: "Erreur serveur lors du téléchargement" });
  }
});

app.post('/api/demandes/:id/transmettre-sg', authSecretaire, async (req, res) => {
  const demandeId = req.params.id;
  let conn;
  try {
    console.log(`🔄 [transmettre-sg] Début du traitement pour demande ${demandeId}`);

    conn = await mysql.createConnection(dbConfig);

    const [[demande]] = await conn.execute('SELECT * FROM demandes WHERE id=?', [demandeId]);
    if (!demande) {
      console.warn(`❌ [transmettre-sg] Demande ${demandeId} non trouvée`);
      await conn.end();
      return res.status(404).json({ error: "Demande non trouvée" });
    }

    console.log(`📋 [transmettre-sg] Demande trouvée: ${demande.reference}, statut actuel: ${demande.statut}`);

    // 🔒 VÉRIFICATION : L'accusé de réception doit être fait AVANT la transmission au SG
    if (!demande.fichier_accuse) {
      console.warn(`❌ [transmettre-sg] Accusé de réception non généré pour la demande ${demandeId}`);
      await conn.end();
      return res.status(400).json({ 
        error: "Impossible de transmettre au SG. L'accusé de réception doit être généré en premier." 
      });
    }

    // Vérifier que la demande peut être transmise
    if (!['DEPOSEE', 'RECEPTIONNEE'].includes(demande.statut)) {
      console.warn(`❌ [transmettre-sg] Statut incorrect: ${demande.statut}`);
      await conn.end();
      return res.status(400).json({ error: `Impossible de transmettre. Statut actuel: ${demande.statut}` });
    }

    const statutPrecedent = demande.statut;

    const [updateResult] = await conn.execute(
      'UPDATE demandes SET statut=?, updated_at=NOW() WHERE id=?',
      ['TRANSMISE_AU_SG', demandeId]
    );

    if (updateResult.affectedRows === 0) {
      await conn.end();
      console.error(`❌ [transmettre-sg] La mise à jour du statut a échoué`);
      return res.status(400).json({ error: "La mise à jour a échoué" });
    }

    console.log(`✅ [transmettre-sg] Statut mis à jour: ${statutPrecedent} → TRANSMISE_AU_SG`);

    // Enregistrer dans l'historique
    await enregistrerSuivi(conn, demandeId, req.user.id, 'TRANSMISSION_SG', `Transmise au Secrétaire Général`, statutPrecedent, 'TRANSMISE_AU_SG');

    // 🔔 NOTIFICATION POUR LA DGI : La demande a été transmise au SG
    const [dgiUsers] = await conn.execute('SELECT id FROM utilisateurs WHERE role_id = 6');
    
    for (const dgiUser of dgiUsers) {
      await conn.execute(
        'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "INFO_DGI", ?, 0, NOW())',
        [
          dgiUser.id,
          `📤 Demande ${demande.reference} transmise au Secrétaire Général par le Secrétariat Central. Statut: TRANSMISE_AU_SG.`
        ]
      );
    }

    console.log(`🔔 [transmettre-sg] Notifications envoyées à ${dgiUsers.length} utilisateurs DGI`);

    await conn.end();
    res.json({ 
      success: true, 
      message: "Demande transmise au Secrétaire Général avec succès. La DGI a été notifiée.",
      nouveau_statut: 'TRANSMISE_AU_SG',
      dgi_notifiee: true
    });
  } catch (err) {
    if (conn) await conn.end();
    console.error(`❌ [transmettre-sg] Erreur fatale:`, err);
    res.status(500).json({ error: "Erreur serveur lors de la transmission" });
  }
});

app.post('/api/demandes/:id/transmettre-dgi', authSecretaire, async (req, res) => {
  const demandeId = req.params.id;
  let conn;
  try {
    console.log(`🔄 [transmettre-dgi] Début du traitement pour demande ${demandeId}`);

    conn = await mysql.createConnection(dbConfig);

    const [[demande]] = await conn.execute('SELECT * FROM demandes WHERE id=?', [demandeId]);
    if (!demande) {
      console.warn(`❌ [transmettre-dgi] Demande ${demandeId} non trouvée`);
      await conn.end();
      return res.status(404).json({ error: "Demande non trouvée" });
    }

    console.log(`📋 [transmettre-dgi] Demande trouvée: ${demande.reference}, statut actuel: ${demande.statut}`);

    // Vérifier que la demande peut être transmise
    if (!['DEPOSEE', 'RECEPTIONNEE'].includes(demande.statut)) {
      console.warn(`❌ [transmettre-dgi] Statut incorrect: ${demande.statut}`);
      await conn.end();
      return res.status(400).json({ error: `Impossible de transmettre. Statut actuel: ${demande.statut}` });
    }

    const statutPrecedent = demande.statut;

    const [updateResult] = await conn.execute(
      'UPDATE demandes SET statut = ?, updated_at=NOW() WHERE id = ?',
      ['TRANSMISE_AU_DGI', demandeId]
    );

    if (updateResult.affectedRows === 0) {
      await conn.end();
      console.error(`❌ [transmettre-dgi] La mise à jour du statut a échoué`);
      return res.status(400).json({ error: "La mise à jour du statut a échoué" });
    }

    console.log(`✅ [transmettre-dgi] Statut mis à jour: ${statutPrecedent} → TRANSMISE_AU_DGI`);

    await enregistrerSuivi(conn, demandeId, req.user.id, 'TRANSMISSION_DGI', `Transmise à la Direction Générale de l'Industrie`, statutPrecedent, 'TRANSMISE_AU_DGI');

    await conn.end();

    res.json({ 
      success: true, 
      message: "Demande transmise à la DGI avec succès",
      nouveau_statut: 'TRANSMISE_AU_DGI'
    });

  } catch (err) {
    if (conn) await conn.end();
    console.error(`❌ [transmettre-dgi] Erreur fatale:`, err);
    res.status(500).json({ error: "Erreur serveur lors de la transmission" });
  }
});

//======Fonction utilitaire d'historique===========
async function enregistrerSuivi(conn, demandeId, utilisateurId, action, message, statutPrecedent, nouveauStatut, donneesSupplementaires = null) {
  await conn.execute(
    `INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, statut_precedent, nouveau_statut, date_action, donnees_supplementaires)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [demandeId, utilisateurId, action, message, statutPrecedent, nouveauStatut, donneesSupplementaires ? JSON.stringify(donneesSupplementaires) : null]
  );
}
// Route pour récupérer les demandes avec accusé de réception (statut = RECEPTIONNEE)
app.get('/api/demandes/accuses-reception', authSecretaire, async (req, res) => {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT d.id, d.reference, u.nom AS demandeur_nom, u.email AS demandeur_email, u.telephone AS demandeur_telephone, u.adresse_siege AS demandeur_adresse,
              d.created_at AS date, d.statut, d.fichier_accuse
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.statut = 'RECEPTIONNEE' AND d.fichier_accuse IS NOT NULL
       ORDER BY d.created_at DESC`
    );
    await conn.end();
    res.json({ demandes: rows });
  } catch (err) {
    if (conn) await conn.end();
    console.error('Erreur dans /accuses-reception:', err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

//=======Route de login Secrétaire Général=======================
app.post('/api/login/secretaire-general', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM utilisateurs WHERE email=? AND role_id=3 LIMIT 1", [email]
    );
    await conn.end();
    if (rows.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu ou non autorisé' });
    const user = rows[0];
    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });
    if (user.statut !== 'ACTIF' || user.email_verifie !== 1) {
      return res.status(403).json({ error: "Veuillez activer votre compte via l'email reçu." });
    }
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, nom: user.nom, prenom: user.prenom, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role_id: user.role_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
//============Routes principales pour Secrétaire Général====================

// Liste des demandes à traiter (statut RECEPTIONNEE ou TRANSMISE)
app.get('/api/demandes-a-traiter', authSecretaireGeneral, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT d.id, d.reference, u.nom AS demandeur_nom, d.created_at AS date, d.statut
       FROM demandes d
       JOIN utilisateurs u ON u.id = IFNULL(d.user_id, d.utilisateur_id)
       WHERE d.statut IN ('RECEPTIONNEE', 'TRANSMISE')
       ORDER BY d.created_at DESC`
    );
    await conn.end();
    res.json({ demandes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Consultation détaillée d'une demande
app.get('/api/demande/:id', authSecretaireGeneral, async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT d.*, u.nom AS demandeur_nom, u.prenom AS demandeur_prenom, u.email AS demandeur_email, u.telephone AS demandeur_telephone, u.adresse_siege AS demandeur_adresse
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.id = ?`, [id]
    );
    await conn.end();
    if (rows.length === 0) return res.status(404).json({ error: "Demande introuvable" });
    const demande = rows[0];
    demande.fichiers = demande.fichiers ? JSON.parse(demande.fichiers) : null;
    res.json({ demande });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter une annotation (commentaire + historique)
app.post('/api/demande/:id/annoter', authSecretaireGeneral, async (req, res) => {
  const { id } = req.params;
  const { commentaire } = req.body;
  const utilisateur_id = req.user.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message, date_action)
       VALUES (?, NULL, NULL, ?, 'ANNOTATION', ?, NOW())`,
      [id, utilisateur_id, commentaire]
    );
    await conn.end();
    res.json({ success: true, message: 'Annotation ajoutée.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Transmettre une demande au Ministre (mise à jour statut + historique)
app.post('/api/demande/:id/transmettre', authSecretaireGeneral, async (req, res) => {
  const { id } = req.params;
  const utilisateur_id = req.user.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandes] = await conn.execute('SELECT statut FROM demandes WHERE id=?', [id]);
    if (demandes.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Demande introuvable" });
    }
    const statutPrecedent = demandes[0].statut;
    await conn.execute(
      "UPDATE demandes SET statut='TRANSMISE_AU_MINISTRE', updated_at=NOW() WHERE id=?",
      [id]
    );
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message, date_action)
       VALUES (?, ?, 'TRANSMISE_AU_MINISTRE', ?, 'TRANSMISSION', 'Demande transmise au Ministre', NOW())`,
      [id, statutPrecedent, utilisateur_id]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Transmettre une demande à la DGI (mise à jour statut + historique)
app.post('/api/demande/:id/transmettre-dgi', authSecretaireGeneral, async (req, res) => {
  const { id } = req.params;
  const utilisateur_id = req.user.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandes] = await conn.execute('SELECT statut FROM demandes WHERE id=?', [id]);
    if (demandes.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Demande introuvable" });
    }
    const statutPrecedent = demandes[0].statut;
    await conn.execute(
      "UPDATE demandes SET statut='TRANSMISE_AU_DGI', updated_at=NOW() WHERE id=?",
      [id]
    );
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message, date_action)
       VALUES (?, ?, 'TRANSMISE_AU_DGI', ?, 'TRANSMISSION', 'Demande transmise au DGI', NOW())`,
      [id, statutPrecedent, utilisateur_id]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Historique d'une demande
app.get('/api/demande/:id/historique', authSecretaireGeneral, async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT s.id, s.statut_precedent, s.nouveau_statut, s.action, s.message, s.date_action,
              u.nom AS utilisateur_nom
       FROM suivi_demandes s
       LEFT JOIN utilisateurs u ON s.utilisateur_id = u.id
       WHERE s.demande_id = ?
       ORDER BY s.date_action ASC`, [id]
    );
    await conn.end();
    res.json({ historique: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Historique global des transmissions
app.get('/api/historique-transmissions', authSecretaireGeneral, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT s.id, d.reference AS demande_reference, s.date_action, u.nom AS utilisateur_nom,
              s.nouveau_statut, s.message
       FROM suivi_demandes s
       JOIN demandes d ON s.demande_id = d.id
       JOIN utilisateurs u ON s.utilisateur_id = u.id
       WHERE s.action = 'TRANSMISSION'
       ORDER BY s.date_action DESC`
    );
    await conn.end();
    res.json({ historique: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

//==============DGI DDPI ======================

//========Routes de login=============
// Login DDPI
app.post('/api/login/ddpi', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM utilisateurs WHERE email = ? AND role_id = 5 LIMIT 1", [email]
    );
    await conn.end();
    if (rows.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu ou non autorisé' });
    const user = rows[0];
    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });
    if (user.statut !== 'ACTIF' || user.email_verifie !== 1) {
      return res.status(403).json({ error: "Veuillez activer votre compte via l'email reçu." });
    }
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, nom: user.nom, prenom: user.prenom, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role_id: user.role_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login DGI
app.post('/api/login/dgi', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM utilisateurs WHERE email = ? AND role_id = 6 LIMIT 1", [email]
    );
    await conn.end();
    if (rows.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu ou non autorisé' });
    const user = rows[0];
    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });
    if (user.statut !== 'ACTIF' || user.email_verifie !== 1) {
      return res.status(403).json({ error: "Veuillez activer votre compte via l'email reçu." });
    }
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, nom: user.nom, prenom: user.prenom, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role_id: user.role_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
//========Routes DDPI===============
// Statistiques DDPI
app.get('/api/ddpi/stats', authDDPI, async (req, res) => {
  try {
    console.log(`🔄 [DDPI] Calcul des statistiques pour utilisateur ${req.user.id}`);
    
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT statut, COUNT(*) AS count FROM demandes
       WHERE statut IN ('TRANSMISE_A_DDPI', 'VALIDEE_DDPI', 'EN_COURS_DDPI', 'RETOURNEE')
       GROUP BY statut`
    );
    await conn.end();

    const stats = [
      { id: '1', label: 'À traiter', value: 0, icon: 'clock', color: '#f59e0b' },
      { id: '2', label: 'Validées', value: 0, icon: 'check', color: '#10b981' },
      { id: '3', label: 'En cours/Retournées', value: 0, icon: 'exclamation', color: '#f97316' },
      { id: '4', label: 'Total traité', value: 0, icon: 'file-text', color: '#3b82f6' },
    ];

    let totalTraite = 0;
    rows.forEach(row => {
      if (row.statut === 'TRANSMISE_A_DDPI') {
        stats[0].value += row.count;
      } else if (row.statut === 'VALIDEE_DDPI') {
        stats[1].value += row.count;
        totalTraite += row.count;
      } else if (['EN_COURS_DDPI', 'RETOURNEE'].includes(row.statut)) {
        stats[2].value += row.count;
        totalTraite += row.count;
      }
    });
    
    stats[3].value = totalTraite;

    console.log(`✅ [DDPI] Statistiques calculées:`, stats.map(s => `${s.label}: ${s.value}`).join(', '));
    res.json({ stats });
  } catch (err) {
    console.error('❌ [DDPI] Erreur lors du calcul des statistiques:', err);
    res.status(500).json({ error: 'Erreur stats DDPI' });
  }
});

// Notifications DDPI
app.get('/api/ddpi/notifications', authDDPI, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT id, message AS title, message, created_at AS date, lu AS isNew
       FROM notifications WHERE utilisateur_id = ? ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );
    await conn.end();
    res.json({ notifications: rows.map(n => ({ ...n, isNew: n.isNew === 0 })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur notifications DDPI' });
  }
});

// Récupération des demandes pour DDPI
app.get('/api/ddpi/demandes', authDDPI, async (req, res) => {
  try {
    console.log(`🔄 [DDPI] Récupération des demandes pour utilisateur ${req.user.id}`);
    
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT d.id, d.reference, u.nom_responsable AS demandeur_nom, u.prenom_responsable AS demandeur_prenom, 
              d.statut, d.created_at, d.updated_at, d.type, d.donnees
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.statut IN ('TRANSMISE_A_DDPI', 'VALIDEE_DDPI', 'RETOURNEE', 'EN_COURS_DDPI')
       ORDER BY d.updated_at DESC, d.created_at DESC
       LIMIT 100`,
      []
    );
    await conn.end();
    
    const demandes = rows.map(d => ({
        ...d,
        demandeur: `${d.demandeur_nom} ${d.demandeur_prenom}`,
        donnees: d.donnees ? JSON.parse(d.donnees) : {}
    }));
    
    console.log(`✅ [DDPI] ${demandes.length} demandes récupérées`);
    console.log(`📊 [DDPI] Statuts trouvés: ${[...new Set(demandes.map(d => d.statut))].join(', ')}`);
    
    res.json({ demandes });
  } catch (err) {
    console.error('❌ [DDPI] Erreur lors de la récupération des demandes:', err);
    res.status(500).json({ error: 'Erreur demandes DDPI' });
  }
});

// Commentaire DDPI
app.post('/api/ddpi/demandes/:id/commentaire', authDDPI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;
  if (!commentaire) return res.status(400).json({ error: 'Commentaire requis' });

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut, donnees FROM demandes WHERE id=?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;

    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.commentaire_ddpi', ?) WHERE id = ?`,
      [commentaire, demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'COMMENTAIRE_DDPI', commentaire, oldStatus, oldStatus);
    await conn.end();
    res.json({ success: true, message: 'Commentaire DDPI ajouté/modifié' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur commentaire DDPI' });
  }
});

// Validation DDPI
app.post('/api/ddpi/demandes/:id/valider', authDDPI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut, donnees FROM demandes WHERE id=?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;

    await conn.execute(
      `UPDATE demandes SET statut = 'VALIDEE_DDPI', donnees = JSON_SET(IFNULL(donnees, '{}'), '$.commentaire_ddpi_validation', ?) WHERE id = ?`,
      [commentaire || '', demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'VALIDATION_DDPI', commentaire || 'Demande validée par DDPI', oldStatus, 'VALIDEE_DDPI');
    await conn.end();
    res.json({ success: true, message: 'Demande validée par DDPI' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur validation DDPI' });
  }
});

// Retour DDPI
app.post('/api/ddpi/demandes/:id/retour', authDDPI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;
  if (!commentaire) return res.status(400).json({ error: 'Commentaire obligatoire' });

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut, donnees FROM demandes WHERE id=?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;

    await conn.execute(
      `UPDATE demandes SET statut = 'RETOURNEE', donnees = JSON_SET(IFNULL(donnees, '{}'), '$.commentaire_ddpi_retour', ?) WHERE id = ?`,
      [commentaire, demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'RETOUR_DDPI', commentaire, oldStatus, 'RETOURNEE');
    await conn.end();
    res.json({ success: true, message: 'Demande retournée par DDPI' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur retour DDPI' });
  }
});

// Transmission DDPI vers DGI
app.post('/api/ddpi/demandes/:id/transmettre', authDDPI, async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT statut, reference FROM demandes WHERE id=?', [demandeId]);
    if (rows.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    if (rows[0].statut !== 'VALIDEE_DDPI') { await conn.end(); return res.status(400).json({ error: 'Demande non validée' }); }
    const oldStatus = rows[0].statut;
    const reference = rows[0].reference;

    await conn.execute(
      `UPDATE demandes SET statut = 'TRANSMISE_A_DGI' WHERE id = ?`,
      [demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'TRANSMISSION_DDPI', 'Transmise à la DGI', oldStatus, 'TRANSMISE_A_DGI');
    
    // 🔔 NOTIFICATION POUR LA DGI : Nouvelle demande transmise par le DDPI
    const [dgiUsers] = await conn.execute('SELECT id FROM utilisateurs WHERE role_id = 6');
    for (const dgiUser of dgiUsers) {
      await conn.execute(
        'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "NOUVELLE_DEMANDE_DDPI", ?, 0, NOW())',
        [dgiUser.id, `Nouvelle demande ${reference} transmise par le DDPI et disponible pour traitement`]
      );
    }
    console.log(`🔔 [transmettre-dgi] Notifications envoyées à ${dgiUsers.length} utilisateurs DGI`);
    
    await conn.end();
    res.json({ success: true, message: 'Demande transmise à la DGI' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur transmission DDPI' });
  }
});

// Historique DDPI
app.get('/api/ddpi/demandes/:id/historique', authDDPI, async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT s.id, s.action, s.message, s.date_action, s.statut_precedent, s.nouveau_statut,
              u.nom AS utilisateur_nom, u.prenom AS utilisateur_prenom
       FROM suivi_demandes s
       LEFT JOIN utilisateurs u ON s.utilisateur_id = u.id
       WHERE s.demande_id = ? ORDER BY s.date_action ASC`,
      [demandeId]
    );
    await conn.end();
    res.json({
      historique: rows.map(h => ({
        ...h,
        utilisateur: h.utilisateur_nom ? `${h.utilisateur_nom} ${h.utilisateur_prenom}` : 'Système'
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur historique DDPI' });
  }
});
//======Route DGI==================

// DGI : Affecter une demande au DDPI
app.post('/api/dgi/demandes/:id/affecter-ddpi', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;

  try {
    console.log(`🔄 [DGI→DDPI] Affectation de la demande ${demandeId} au DDPI par utilisateur ${req.user.id}`);
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe et est au bon statut
    const [demandeResult] = await conn.execute(
      'SELECT id, reference, statut FROM demandes WHERE id = ?', 
      [demandeId]
    );
    
    if (demandeResult.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    const demande = demandeResult[0];
    console.log(`📋 [DGI→DDPI] Demande trouvée: ${demande.reference}, statut: ${demande.statut}`);
    
    // Vérifier que la demande peut être affectée au DDPI
    if (!['TRANSMISE_AU_DGI', 'EN_COURS_DGI', 'VALIDEE_DGI'].includes(demande.statut)) {
      await conn.end();
      return res.status(400).json({ 
        error: `Impossible d'affecter au DDPI. Statut actuel: ${demande.statut}. Statuts autorisés: TRANSMISE_AU_DGI, EN_COURS_DGI, VALIDEE_DGI` 
      });
    }

    const oldStatus = demande.statut;
    const newStatus = 'TRANSMISE_A_DDPI';
    
    // Mettre à jour le statut de la demande
    await conn.execute(
      `UPDATE demandes SET 
         statut = ?, 
         donnees = JSON_SET(IFNULL(donnees, '{}'), '$.commentaire_dgi_affectation', ?, '$.date_affectation_ddpi', NOW()),
         updated_at = NOW() 
       WHERE id = ?`,
      [newStatus, commentaire || 'Affectée au DDPI pour instruction technique', demandeId]
    );

    // Enregistrer dans l'historique
    await enregistrerSuivi(
      conn, 
      demandeId, 
      req.user.id, 
      'AFFECTATION_DDPI', 
      commentaire || 'Demande affectée au DDPI pour instruction technique par la DGI',
      oldStatus, 
      newStatus
    );

    // Notification pour le DDPI (optionnel, selon votre système de notifications)
    try {
      await conn.execute(
        `INSERT INTO notifications (utilisateur_id, type, message, demande_id, date_envoi, statut) 
         SELECT u.id, 'NOUVELLE_AFFECTATION', CONCAT('Nouvelle demande affectée: ', ?), ?, NOW(), 'NON_LU'
         FROM utilisateurs u WHERE u.role_id = 5`,
        [demande.reference, demandeId]
      );
      console.log(`📧 [DGI→DDPI] Notification envoyée aux utilisateurs DDPI`);
    } catch (notifErr) {
      console.warn(`⚠️ [DGI→DDPI] Erreur lors de l'envoi de notification:`, notifErr.message);
      // Ne pas faire échouer la requête pour un problème de notification
    }

    await conn.end();
    
    console.log(`✅ [DGI→DDPI] Demande ${demande.reference} affectée au DDPI avec succès`);
    res.json({ 
      success: true, 
      message: `Demande ${demande.reference} affectée au DDPI avec succès`,
      nouveau_statut: newStatus
    });

  } catch (err) {
    console.error('❌ [DGI→DDPI] Erreur lors de l\'affectation:', err);
    res.status(500).json({ error: 'Erreur lors de l\'affectation au DDPI' });
  }
});

// Statistiques DGI
app.get('/api/dgi/stats', authDGI, async (req, res) => {
  try {
    console.log(`🔄 [DGI] Calcul des statistiques pour utilisateur ${req.user.id}`);
    
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT statut, COUNT(*) AS count FROM demandes 
       WHERE statut IN (
         'TRANSMISE_AU_DGI', 'EN_COURS_DGI', 'VALIDEE_DGI', 
         'TRANSMISE_A_DDPI', 'VALIDEE_DDPI', 'RETOURNEE'
       )
       GROUP BY statut`
    );
    await conn.end();

    const stats = [
      { id: '1', label: 'À traiter', value: 0, icon: 'fas fa-inbox', color: '#f59e0b' },
      { id: '2', label: 'En cours DGI', value: 0, icon: 'fas fa-cog', color: '#3b82f6' },
      { id: '3', label: 'Chez DDPI', value: 0, icon: 'fas fa-building', color: '#06b6d4' },
      { id: '4', label: 'Validées', value: 0, icon: 'fas fa-check-circle', color: '#10b981' },
      { id: '5', label: 'Retournées', value: 0, icon: 'fas fa-undo', color: '#f97316' }
    ];

    rows.forEach(row => {
      if (row.statut === 'TRANSMISE_AU_DGI') {
        stats[0].value += row.count;
      } else if (row.statut === 'EN_COURS_DGI') {
        stats[1].value += row.count;
      } else if (row.statut === 'TRANSMISE_A_DDPI') {
        stats[2].value += row.count;
      } else if (['VALIDEE_DGI', 'VALIDEE_DDPI'].includes(row.statut)) {
        stats[3].value += row.count;
      } else if (row.statut === 'RETOURNEE') {
        stats[4].value += row.count;
      }
    });

    console.log(`✅ [DGI] Statistiques calculées:`, stats.map(s => `${s.label}: ${s.value}`).join(', '));
    res.json({ stats });
  } catch (err) {
    console.error('❌ [DGI] Erreur lors du calcul des statistiques:', err);
    res.status(500).json({ error: 'Erreur stats DGI' });
  }
});

// Notifications DGI
app.get('/api/dgi/notifications', authDGI, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT id, message AS title, message, created_at AS date, lu AS isNew
       FROM notifications WHERE utilisateur_id = ? ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );
    await conn.end();
    res.json({ notifications: rows.map(n => ({ ...n, isNew: n.isNew === 0 })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur notifications DGI' });
  }
});

// Récupération des demandes pour DGI
app.get('/api/dgi/demandes', authDGI, async (req, res) => {
  try {
    console.log(`🔄 [DGI] Récupération des demandes pour utilisateur ${req.user.id}`);
    
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
             `SELECT d.id, d.reference, u.nom_responsable AS demandeur_nom, u.prenom_responsable AS demandeur_prenom, 
              d.statut, d.created_at, d.updated_at, d.type, d.donnees
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.statut IN (
         'TRANSMISE_AU_DGI',     -- Nouvelles demandes du SG
         'TRANSMISE_A_DGI',      -- Demandes transmises par le DDPI
         'EN_COURS_DGI',         -- Demandes en cours de traitement
         'VALIDEE_DGI',          -- Demandes validées par DGI
         'TRANSMISE_A_DDPI',     -- Demandes affectées au DDPI (pour suivi)
         'VALIDEE_DDPI',         -- Demandes validées par DDPI (retour)
         'RETOURNEE'             -- Demandes retournées par DDPI
       )
       ORDER BY d.updated_at DESC, d.created_at DESC 
       LIMIT 100`
    );
    await conn.end();
    
    const demandes = rows.map(d => ({
        ...d,
        demandeur: `${d.demandeur_nom} ${d.demandeur_prenom}`,
        donnees: d.donnees ? JSON.parse(d.donnees) : {}
    }));
    
    console.log(`✅ [DGI] ${demandes.length} demandes récupérées`);
    console.log(`📊 [DGI] Statuts trouvés: ${[...new Set(demandes.map(d => d.statut))].join(', ')}`);
    
    res.json({ demandes });
  } catch (err) {
    console.error('❌ [DGI] Erreur lors de la récupération des demandes:', err);
    res.status(500).json({ error: 'Erreur demandes DGI' });
  }
});

// Commentaire DGI
app.post('/api/dgi/demandes/:id/commentaire', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;
  if (!commentaire) return res.status(400).json({ error: 'Commentaire requis' });

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut, donnees FROM demandes WHERE id=?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;

    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.commentaire_dgi', ?) WHERE id = ?`,
      [commentaire, demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'COMMENTAIRE_DGI', commentaire, oldStatus, oldStatus);
    await conn.end();
    res.json({ success: true, message: 'Commentaire ajouté/modifié avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'ajout du commentaire" });
  }
});

// Validation DGI
app.post('/api/dgi/demandes/:id/valider', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut, donnees FROM demandes WHERE id=?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;

    await conn.execute(
      `UPDATE demandes SET statut = 'VALIDEE_DGI', donnees = JSON_SET(IFNULL(donnees, '{}'), '$.commentaire_dgi_validation', ?) WHERE id = ?`,
      [commentaire || '', demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'VALIDATION_DGI', commentaire || 'Demande validée', oldStatus, 'VALIDEE_DGI');
    await conn.end();
    res.json({ success: true, message: 'Demande validée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la validation' });
  }
});

// Transmission DGI vers Ministre
app.post('/api/dgi/demandes/:id/transmettre-ministre', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;

  try {
    console.log(`🔄 [DGI→Ministre] Transmission de la demande ${demandeId} au Ministre`);
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe et est validée par la DGI
    const [demandeResult] = await conn.execute(
      'SELECT id, reference, statut, donnees FROM demandes WHERE id = ?', 
      [demandeId]
    );
    
    if (demandeResult.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    const demande = demandeResult[0];
    
    // Permettre la transmission depuis plusieurs statuts DGI
    const statutsAutorises = ['VALIDEE_DGI', 'TRANSMISE_A_DGI', 'EN_COURS_DGI'];
    if (!statutsAutorises.includes(demande.statut)) {
      await conn.end();
      return res.status(400).json({ 
        error: `Impossible de transmettre au Ministre. Statut actuel: ${demande.statut}. Statuts autorisés: ${statutsAutorises.join(', ')}` 
      });
    }

    const oldStatus = demande.statut;
    const newStatus = 'TRANSMISE_AU_MINISTRE';
    
    // Mettre à jour le statut de la demande
    await conn.execute(
      `UPDATE demandes SET 
         statut = ?, 
         donnees = JSON_SET(IFNULL(donnees, '{}'), '$.commentaire_dgi_transmission_ministre', ?, '$.date_transmission_ministre', NOW()),
         updated_at = NOW() 
       WHERE id = ?`,
      [newStatus, commentaire || 'Transmise au Ministre pour signature', demandeId]
    );

    // Enregistrer dans l'historique
    await enregistrerSuivi(
      conn, 
      demandeId, 
      req.user.id, 
      'TRANSMISSION_MINISTRE', 
      commentaire || 'Demande transmise au Ministre pour signature', 
      oldStatus, 
      newStatus
    );

    // 🔔 NOTIFICATION POUR LE MINISTRE
    const [ministreUsers] = await conn.execute('SELECT id FROM utilisateurs WHERE role_id = 7'); // Role Ministre
    for (const ministreUser of ministreUsers) {
      await conn.execute(
        'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "NOUVELLE_DEMANDE_MINISTRE", ?, 0, NOW())',
        [ministreUser.id, `Nouvelle demande ${demande.reference} transmise par la DGI et disponible pour signature`]
      );
    }
    console.log(`🔔 [DGI→Ministre] Notifications envoyées à ${ministreUsers.length} utilisateurs Ministre`);

    await conn.end();
    
    console.log(`✅ [DGI→Ministre] Demande ${demande.reference} transmise au Ministre avec succès`);
    res.json({ 
      success: true, 
      message: 'Demande transmise au Ministre avec succès',
      nouveau_statut: newStatus
    });
    
  } catch (err) {
    console.error('❌ [DGI→Ministre] Erreur lors de la transmission:', err);
    res.status(500).json({ error: 'Erreur lors de la transmission au Ministre' });
  }
});

// Retour DGI (demande de modification)
app.post('/api/dgi/demandes/:id/retour', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;
  if (!commentaire) return res.status(400).json({ error: 'Commentaire obligatoire pour retour' });

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut, donnees FROM demandes WHERE id=?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;

    await conn.execute(
      `UPDATE demandes SET statut = 'RETOURNEE', donnees = JSON_SET(IFNULL(donnees, '{}'), '$.commentaire_dgi_retour', ?) WHERE id = ?`,
      [commentaire, demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'RETOUR_DGI', commentaire, oldStatus, 'RETOURNEE');
    await conn.end();
    res.json({ success: true, message: 'Demande retournée pour modification' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du retour' });
  }
});

// Transmission DGI (vers ministère)
app.post('/api/dgi/demandes/:id/transmettre', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT statut FROM demandes WHERE id=?', [demandeId]);
    if (rows.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    if (rows[0].statut !== 'VALIDEE_DGI') { await conn.end(); return res.status(400).json({ error: 'Demande non validée, transmission impossible' }); }
    const oldStatus = rows[0].statut;

    await conn.execute(
      `UPDATE demandes SET statut = 'TRANSMISE_MINISTERE' WHERE id = ?`,
      [demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'TRANSMISSION_DGI', 'Transmise au ministère', oldStatus, 'TRANSMISE_MINISTERE');
    await conn.end();
    res.json({ success: true, message: 'Demande transmise au ministère' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la transmission' });
  }
});

// Historique des actions sur une demande pour DGI
app.get('/api/dgi/demandes/:id/historique', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT action, message, date_action, statut_precedent, nouveau_statut
       FROM suivi_demandes WHERE demande_id = ? ORDER BY date_action ASC`, [demandeId]
    );
    await conn.end();
    res.json({ historique: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur historique' });
  }
});

// =================== STATISTIQUES GRAPHIQUES & EXPORT DGI ===================

// Statistiques graphiques pour Chart.js (type, secteur, emplacement, signées)
app.get('/api/dgi/stats-graph', authDGI, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);

    // Par type
    const [byType] = await conn.execute(`
      SELECT type, COUNT(*) as count
      FROM demandes
      GROUP BY type
    `);

    // Par secteur (extraction depuis JSON)
    const [bySecteur] = await conn.execute(`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(donnees, '$.secteur')) as secteur, COUNT(*) as count
      FROM demandes
      GROUP BY secteur
    `);

    // Par emplacement (extraction depuis JSON)
    const [byEmplacement] = await conn.execute(`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(donnees, '$.emplacement')) as emplacement, COUNT(*) as count
      FROM demandes
      GROUP BY emplacement
    `);

    // Autorisations signées par le ministre
    const [signed] = await conn.execute(`
      SELECT COUNT(*) as count FROM demandes
      WHERE statut = 'SIGNEE_MINISTRE'
    `);

    await conn.end();
    res.json({
      byType,
      bySecteur,
      byEmplacement,
      signed: signed[0].count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur stats graphiques DGI" });
  }
});

// Export demandes/statistiques en CSV
app.get('/api/dgi/export/csv', authDGI, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(`
      SELECT d.reference, d.type, d.statut, d.created_at,
        JSON_UNQUOTE(JSON_EXTRACT(d.donnees, '$.secteur')) as secteur,
        JSON_UNQUOTE(JSON_EXTRACT(d.donnees, '$.emplacement')) as emplacement,
        u.nom, u.prenom, u.email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      ORDER BY d.created_at DESC
    `);
    await conn.end();

    const parser = new Parser();
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('demandes.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur export CSV DGI" });
  }
});

// Export statistiques en PDF
app.get('/api/dgi/export/pdf', authDGI, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(`
      SELECT d.reference, d.type, d.statut, d.created_at,
        JSON_UNQUOTE(JSON_EXTRACT(d.donnees, '$.secteur')) as secteur,
        JSON_UNQUOTE(JSON_EXTRACT(d.donnees, '$.emplacement')) as emplacement,
        u.nom, u.prenom, u.email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      ORDER BY d.created_at DESC
      LIMIT 100
    `);
    await conn.end();

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="statistiques_dgi.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text('Statistiques DGI', { align: 'center' });
    doc.moveDown();
    rows.forEach((row, i) => {
      doc.fontSize(10).text(
        `${i + 1}. [${row.reference}] ${row.type} | ${row.secteur || '-'} | ${row.emplacement || '-'} | ${row.statut} | ${row.nom} ${row.prenom} (${row.email}) | ${row.created_at}`
      );
    });
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur export PDF DGI" });
  }
});

// Détail d'une demande pour DGI (avec tous les champs utiles)
app.get('/api/dgi/demandes/:id', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute(`
      SELECT d.*, u.nom AS demandeur_nom, u.prenom AS demandeur_prenom, u.email AS demandeur_email, u.telephone AS demandeur_telephone, u.adresse_siege AS demandeur_adresse
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.id = ?
    `, [demandeId]);
    await conn.end();
    if (!demande) return res.status(404).json({ error: "Demande non trouvée" });

    // Parse les JSON
    demande.donnees = demande.donnees ? JSON.parse(demande.donnees) : {};
    demande.fichiers = demande.fichiers ? JSON.parse(demande.fichiers) : {};
    res.json({ demande });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// Ajouter une observation technique à la demande (champ donnees.observation_dgi)
app.post('/api/dgi/demandes/:id/observation', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { observation } = req.body;
  if (!observation) return res.status(400).json({ error: 'Observation requise' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.observation_dgi', ?) WHERE id = ?`,
      [observation, demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'OBSERVATION_DGI', observation, null, null);
    await conn.end();
    res.json({ success: true, message: 'Observation ajoutée' });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'ajout de l'observation" });
  }
});

// Historique global de toutes les actions du DGI (pour le menu latéral)
app.get('/api/dgi/historique', authDGI, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT s.id, s.demande_id, s.action, s.message, s.date_action, s.statut_precedent, s.nouveau_statut,
              d.reference, d.type, d.statut AS statut_demande
       FROM suivi_demandes s
       JOIN demandes d ON s.demande_id = d.id
       WHERE s.utilisateur_id = ?
       ORDER BY s.date_action DESC
       LIMIT 200`,
      [req.user.id]
    );
    await conn.end();
    res.json({ historique: rows });
  } catch (err) {
    res.status(500).json({ error: "Erreur historique DGI" });
  }
});

// POST /api/demandes/:id/transmettre-ministre
app.post('/api/demandes/:id/transmettre-ministre', authRole([6]), async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    await conn.execute('UPDATE demandes SET statut = ? WHERE id = ?', ['EN_ATTENTE_SIGNATURE_MINISTRE', demandeId]);

    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demandeId, demande.statut, 'EN_ATTENTE_SIGNATURE_MINISTRE', req.user.id, 'TRANSMISSION_MINISTRE', 'Transmise au ministre']
    );

    // Notifier ministre (role_id = 9)
    const [[ministre]] = await conn.execute('SELECT id FROM utilisateurs WHERE role_id=9 LIMIT 1');
    if (ministre) {
      await conn.execute(
        `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
         VALUES (?, "TRANSMISSION", ?, 0, NOW())`,
        [ministre.id, `Une nouvelle demande vous a été transmise pour signature.`]
      );
    }
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la transmission au ministre' });
  }
});

// POST /api/demandes/:id/retour-sg
app.post('/api/demandes/:id/retour-sg', authRole([6]), async (req, res) => {
  const demandeId = req.params.id;
  const { motif } = req.body;
  if (!motif) return res.status(400).json({ error: 'Motif obligatoire' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    await conn.execute('UPDATE demandes SET statut="RETOURNEE_SG" WHERE id=?', [demandeId]);
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demandeId, demande.statut, 'RETOURNEE_SG', req.user.id, 'RETOUR_SG', motif]
    );
    // Notifier SG (role_id = 3)
    const [[sg]] = await conn.execute('SELECT id FROM utilisateurs WHERE role_id=3 LIMIT 1');
    if (sg) {
      await conn.execute(
        `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
         VALUES (?, "RETOUR_SG", ?, 0, NOW())`,
        [sg.id, `Une demande vous a été retournée par la DGI : ${motif}`]
      );
    }
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du retour au SG' });
  }
});

// POST /api/demandes/:id/solliciter-avis
app.post('/api/demandes/:id/solliciter-avis', authRole([6]), async (req, res) => {
  const demandeId = req.params.id;
  const { commission_id, message } = req.body;
  if (!commission_id) return res.status(400).json({ error: 'Commission obligatoire' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      `INSERT INTO avis_commissions (demande_id, commission_id, type_avis, observations)
       VALUES (?, ?, 'EN_ATTENTE', ?)`,
      [demandeId, commission_id, message || 'Avis multisectoriel sollicité']
    );
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demandeId, 'EN_COURS_DGI', 'EN_ATTENTE_AVIS_COMMISSION', req.user.id, 'SOLLICITATION_AVIS', message]
    );
    // Notifier membres de la commission (optionnel)
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la sollicitation d\'avis' });
  }
});

// =================== ACTIONS AVANCÉES DGI ===================

// POST /api/dgi/demandes/:id/suspendre - Suspendre temporairement une demande
app.post('/api/dgi/demandes/:id/suspendre', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { motif, duree_suspension } = req.body;
  if (!motif) return res.status(400).json({ error: 'Motif de suspension requis' });
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    const statutPrecedent = demande.statut;
    await conn.execute('UPDATE demandes SET statut = "SUSPENDUE" WHERE id = ?', [demandeId]);
    
    // Ajouter les détails de suspension dans les données JSON
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.suspension', JSON_OBJECT(
        'motif', ?, 
        'date_suspension', NOW(), 
        'duree_prevue', ?,
        'statut_precedent', ?
      )) WHERE id = ?`,
      [motif, duree_suspension || null, statutPrecedent, demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'SUSPENSION_DGI', `Demande suspendue: ${motif}`, statutPrecedent, 'SUSPENDUE');
    
    // Notifier le demandeur
    const [[demandeur]] = await conn.execute('SELECT utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (demandeur) {
      await conn.execute(
        `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
         VALUES (?, "SUSPENSION", ?, 0, NOW())`,
        [demandeur.utilisateur_id, `Votre demande a été temporairement suspendue par la DGI: ${motif}`]
      );
    }
    
    await conn.end();
    res.json({ success: true, message: 'Demande suspendue avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la suspension' });
  }
});

// POST /api/dgi/demandes/:id/reprendre - Reprendre une demande suspendue
app.post('/api/dgi/demandes/:id/reprendre', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute(
      'SELECT statut, donnees FROM demandes WHERE id=? AND statut="SUSPENDUE"', 
      [demandeId]
    );
    if (!demande) return res.status(404).json({ error: 'Demande suspendue non trouvée' });
    
    // Récupérer le statut précédent depuis les données JSON
    const donnees = demande.donnees ? JSON.parse(demande.donnees) : {};
    const statutPrecedent = donnees.suspension?.statut_precedent || 'EN_COURS_DGI';
    
    await conn.execute('UPDATE demandes SET statut = ? WHERE id = ?', [statutPrecedent, demandeId]);
    
    // Supprimer les informations de suspension
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_REMOVE(IFNULL(donnees, '{}'), '$.suspension') WHERE id = ?`,
      [demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'REPRISE_DGI', commentaire || 'Demande reprise', 'SUSPENDUE', statutPrecedent);
    
    // Notifier le demandeur
    const [[demandeur]] = await conn.execute('SELECT utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (demandeur) {
      await conn.execute(
        `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
         VALUES (?, "REPRISE", ?, 0, NOW())`,
        [demandeur.utilisateur_id, `Votre demande a été reprise par la DGI et est de nouveau en cours de traitement.`]
      );
    }
    
    await conn.end();
    res.json({ success: true, message: 'Demande reprise avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la reprise' });
  }
});

// POST /api/dgi/demandes/:id/rejeter - Rejeter définitivement une demande
app.post('/api/dgi/demandes/:id/rejeter', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { motif_rejet, recommandations } = req.body;
  if (!motif_rejet) return res.status(400).json({ error: 'Motif de rejet requis' });
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    const statutPrecedent = demande.statut;
    await conn.execute('UPDATE demandes SET statut = "REJETEE_DGI" WHERE id = ?', [demandeId]);
    
    // Ajouter les détails du rejet dans les données JSON
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.rejet_dgi', JSON_OBJECT(
        'motif', ?, 
        'recommandations', ?,
        'date_rejet', NOW(),
        'agent_rejet_id', ?
      )) WHERE id = ?`,
      [motif_rejet, recommandations || null, req.user.id, demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'REJET_DGI', `Demande rejetée: ${motif_rejet}`, statutPrecedent, 'REJETEE_DGI');
    
    // Notifier le demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "REJET", ?, 0, NOW())`,
      [demande.utilisateur_id, `Votre demande a été rejetée par la DGI. Motif: ${motif_rejet}`]
    );
    
    await conn.end();
    res.json({ success: true, message: 'Demande rejetée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
});

// POST /api/dgi/demandes/:id/demander-complement - Demander des compléments d'information
app.post('/api/dgi/demandes/:id/demander-complement', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { documents_requis, delai_reponse, observations } = req.body;
  if (!documents_requis || documents_requis.length === 0) {
    return res.status(400).json({ error: 'Liste des documents requis nécessaire' });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    const statutPrecedent = demande.statut;
    await conn.execute('UPDATE demandes SET statut = "COMPLEMENT_REQUIS" WHERE id = ?', [demandeId]);
    
    // Ajouter les détails de la demande de complément
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.complement_dgi', JSON_OBJECT(
        'documents_requis', ?,
        'delai_reponse', ?,
        'observations', ?,
        'date_demande', NOW(),
        'statut_precedent', ?
      )) WHERE id = ?`,
      [JSON.stringify(documents_requis), delai_reponse || '15 jours', observations || null, statutPrecedent, demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'COMPLEMENT_REQUIS_DGI', 
      `Compléments requis: ${documents_requis.join(', ')}`, statutPrecedent, 'COMPLEMENT_REQUIS');
    
    // Notifier le demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "COMPLEMENT_REQUIS", ?, 0, NOW())`,
      [demande.utilisateur_id, `La DGI demande des compléments pour votre demande. Délai: ${delai_reponse || '15 jours'}`]
    );
    
    await conn.end();
    res.json({ success: true, message: 'Demande de complément envoyée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la demande de complément' });
  }
});

// POST /api/dgi/demandes/:id/programmer-visite - Programmer une visite technique
app.post('/api/dgi/demandes/:id/programmer-visite', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { date_visite, heure_visite, lieu, equipe_technique, objectifs } = req.body;
  if (!date_visite || !lieu) {
    return res.status(400).json({ error: 'Date et lieu de visite requis' });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    const statutPrecedent = demande.statut;
    await conn.execute('UPDATE demandes SET statut = "VISITE_PROGRAMMEE" WHERE id = ?', [demandeId]);
    
    // Ajouter les détails de la visite
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.visite_technique', JSON_OBJECT(
        'date_visite', ?,
        'heure_visite', ?,
        'lieu', ?,
        'equipe_technique', ?,
        'objectifs', ?,
        'date_programmation', NOW(),
        'statut_precedent', ?,
        'statut_visite', 'PROGRAMMEE'
      )) WHERE id = ?`,
      [date_visite, heure_visite || null, lieu, equipe_technique || null, objectifs || null, statutPrecedent, demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'VISITE_PROGRAMMEE_DGI', 
      `Visite technique programmée le ${date_visite} à ${lieu}`, statutPrecedent, 'VISITE_PROGRAMMEE');
    
    // Notifier le demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "VISITE_PROGRAMMEE", ?, 0, NOW())`,
      [demande.utilisateur_id, `Une visite technique a été programmée pour votre demande le ${date_visite} à ${lieu}`]
    );
    
    await conn.end();
    res.json({ success: true, message: 'Visite technique programmée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la programmation de visite' });
  }
});

// POST /api/dgi/demandes/:id/rapport-visite - Enregistrer le rapport de visite
app.post('/api/dgi/demandes/:id/rapport-visite', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { observations, recommandations, decision, documents_rapport } = req.body;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, donnees FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    const donnees = demande.donnees ? JSON.parse(demande.donnees) : {};
    if (!donnees.visite_technique) {
      return res.status(400).json({ error: 'Aucune visite technique programmée pour cette demande' });
    }
    
    // Mettre à jour les informations de visite avec le rapport
    const rapportVisite = {
      ...donnees.visite_technique,
      observations: observations || null,
      recommandations: recommandations || null,
      decision: decision || null,
      documents_rapport: documents_rapport || null,
      date_rapport: new Date().toISOString(),
      statut_visite: 'TERMINEE'
    };
    
    await conn.execute(
      `UPDATE demandes SET 
        donnees = JSON_SET(IFNULL(donnees, '{}'), '$.visite_technique', ?),
        statut = ?
       WHERE id = ?`,
      [JSON.stringify(rapportVisite), decision === 'FAVORABLE' ? 'EN_COURS_DGI' : 'VISITE_DEFAVORABLE', demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'RAPPORT_VISITE_DGI', 
      `Rapport de visite enregistré. Décision: ${decision || 'En attente'}`, 'VISITE_PROGRAMMEE', decision === 'FAVORABLE' ? 'EN_COURS_DGI' : 'VISITE_DEFAVORABLE');
    
    await conn.end();
    res.json({ success: true, message: 'Rapport de visite enregistré avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du rapport' });
  }
});

// =================== GESTION AVANCÉE DES DEMANDES DGI ===================

// API DGI des demandes avec filtres avancés (version corrigée)
app.get('/api/dgi/demandes-filtres', authDGI, async (req, res) => {
  try {
    const { statut, type, secteur, date_debut, date_fin, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (statut) {
      whereClause += ' AND d.statut = ?';
      params.push(statut);
    }
    if (type) {
      whereClause += ' AND d.type = ?';
      params.push(type);
    }
    if (secteur) {
      whereClause += ' AND JSON_EXTRACT(d.donnees, "$.secteur") = ?';
      params.push(secteur);
    }
    if (date_debut) {
      whereClause += ' AND DATE(d.created_at) >= ?';
      params.push(date_debut);
    }
    if (date_fin) {
      whereClause += ' AND DATE(d.created_at) <= ?';
      params.push(date_fin);
    }
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Requête principale avec nom_responsable et prenom_responsable
    const [rows] = await conn.execute(`
      SELECT 
        d.id, d.reference, d.type, d.statut, d.created_at, d.updated_at,
        JSON_UNQUOTE(JSON_EXTRACT(d.donnees, '$.secteur')) as secteur,
        JSON_UNQUOTE(JSON_EXTRACT(d.donnees, '$.emplacement')) as emplacement,
        u.nom_responsable AS demandeur_nom, u.prenom_responsable AS demandeur_prenom, u.email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    
    // Compte total pour pagination
    const [countResult] = await conn.execute(`
      SELECT COUNT(*) as total
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      ${whereClause}
    `, params);
    
    await conn.end();
    
    // Formater les données avec demandeur complet
    const demandes = rows.map(d => ({
      ...d,
      demandeur: `${d.demandeur_prenom} ${d.demandeur_nom}`,
      donnees: d.donnees ? JSON.parse(d.donnees) : {}
    }));
    
    res.json({
      demandes: demandes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération demandes DGI" });
  }
});

// Recherche avancée de demandes
app.get('/api/dgi/recherche', authDGI, async (req, res) => {
  try {
    const { q, type, statut, secteur } = req.query;
    if (!q) return res.status(400).json({ error: 'Terme de recherche requis' });
    
    const conn = await mysql.createConnection(dbConfig);
    
    let whereClause = 'WHERE (d.reference LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ?)';
    const params = [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`];
    
    if (type) {
      whereClause += ' AND d.type = ?';
      params.push(type);
    }
    if (statut) {
      whereClause += ' AND d.statut = ?';
      params.push(statut);
    }
    if (secteur) {
      whereClause += ' AND JSON_EXTRACT(d.donnees, "$.secteur") = ?';
      params.push(secteur);
    }
    
    const [rows] = await conn.execute(`
      SELECT 
        d.id, d.reference, d.type, d.statut, d.created_at,
        JSON_UNQUOTE(JSON_EXTRACT(d.donnees, '$.secteur')) as secteur,
        u.nom, u.prenom, u.email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT 50
    `, params);
    
    await conn.end();
    res.json({ resultats: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur recherche DGI" });
  }
});

// =================== RAPPORTS ET ANALYSES DGI ===================

// Rapport de performance DGI
app.get('/api/dgi/rapport-performance', authDGI, async (req, res) => {
  try {
    const { mois, annee } = req.query;
    const dateFilter = mois && annee ? `WHERE MONTH(d.created_at) = ? AND YEAR(d.created_at) = ?` : '';
    const params = mois && annee ? [parseInt(mois), parseInt(annee)] : [];
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Statistiques générales
    const [stats] = await conn.execute(`
      SELECT 
        COUNT(*) as total_demandes,
        SUM(CASE WHEN statut = 'SIGNEE_MINISTRE' THEN 1 ELSE 0 END) as autorisations_signees,
        SUM(CASE WHEN statut = 'REJETEE_DGI' THEN 1 ELSE 0 END) as demandes_rejetees,
        AVG(CASE WHEN statut = 'SIGNEE_MINISTRE' THEN DATEDIFF(updated_at, created_at) END) as delai_moyen_traitement
      FROM demandes d
      ${dateFilter}
    `, params);
    
    // Performance par type de demande
    const [performanceType] = await conn.execute(`
      SELECT 
        type,
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'SIGNEE_MINISTRE' THEN 1 ELSE 0 END) as signees,
        AVG(CASE WHEN statut = 'SIGNEE_MINISTRE' THEN DATEDIFF(updated_at, created_at) END) as delai_moyen
      FROM demandes d
      ${dateFilter}
      GROUP BY type
    `, params);
    
    await conn.end();
    
    res.json({
      periode: { mois, annee },
      statistiques: stats[0],
      performance_par_type: performanceType
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur génération rapport performance' });
  }
});

// Analyse des tendances
app.get('/api/dgi/analyse-tendances', authDGI, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Tendances mensuelles
    const [tendancesMensuelles] = await conn.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as mois,
        COUNT(*) as nouvelles_demandes,
        SUM(CASE WHEN statut = 'SIGNEE_MINISTRE' THEN 1 ELSE 0 END) as autorisations_signees
      FROM demandes
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY mois
    `);
    
    // Top secteurs
    const [topSecteurs] = await conn.execute(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(donnees, '$.secteur')) as secteur,
        COUNT(*) as nombre_demandes
      FROM demandes
      WHERE JSON_EXTRACT(donnees, '$.secteur') IS NOT NULL
      GROUP BY secteur
      ORDER BY nombre_demandes DESC
      LIMIT 10
    `);
    
    await conn.end();
    
    res.json({
      tendances_mensuelles: tendancesMensuelles,
      top_secteurs: topSecteurs
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur analyse tendances' });
  }
});

// Export rapport détaillé en PDF
app.get('/api/dgi/export-rapport-pdf', authDGI, async (req, res) => {
  try {
    const { date_debut, date_fin, type_rapport } = req.query;
    
    const conn = await mysql.createConnection(dbConfig);
    
    let whereClause = '';
    const params = [];
    
    if (date_debut && date_fin) {
      whereClause = 'WHERE DATE(d.created_at) BETWEEN ? AND ?';
      params.push(date_debut, date_fin);
    }
    
    const [rows] = await conn.execute(`
      SELECT 
        d.reference, d.type, d.statut, d.created_at, d.updated_at,
        JSON_UNQUOTE(JSON_EXTRACT(d.donnees, '$.secteur')) as secteur,
        u.nom, u.prenom, u.email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
    `, params);
    
    await conn.end();
    
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport_dgi_${type_rapport || 'general'}.pdf"`);
    doc.pipe(res);
    
    // En-tête du document
    doc.fontSize(18).text('Rapport DGI - Ministère des Mines et de l\'Industrie', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Période: ${date_debut || 'Toutes'} - ${date_fin || 'Toutes'}`, { align: 'center' });
    doc.moveDown(2);
    
    // Statistiques
    const stats = {
      total: rows.length,
      signees: rows.filter(r => r.statut === 'SIGNEE_MINISTRE').length,
      rejetees: rows.filter(r => r.statut === 'REJETEE_DGI').length,
      en_cours: rows.filter(r => !['SIGNEE_MINISTRE', 'REJETEE_DGI'].includes(r.statut)).length
    };
    
    doc.fontSize(14).text('Statistiques Générales', { underline: true });
    doc.fontSize(10).text(`Total demandes: ${stats.total}`);
    doc.fontSize(10).text(`Autorisations signées: ${stats.signees}`);
    doc.fontSize(10).text(`Demandes rejetées: ${stats.rejetees}`);
    doc.fontSize(10).text(`En cours: ${stats.en_cours}`);
    doc.moveDown(2);
    
    // Détail des demandes
    doc.fontSize(14).text('Détail des Demandes', { underline: true });
    doc.moveDown();
    
    let yPosition = doc.y;
    rows.forEach((row, i) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(10).text(
        `${i + 1}. ${row.reference} - ${row.type} - ${row.statut}`,
        { continued: true }
      );
      doc.fontSize(8).text(` (${row.secteur || 'N/A'})`, { color: 'gray' });
      doc.moveDown(0.5);
      
      yPosition += 20;
    });
    
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur export rapport PDF' });
  }
});

// =================== NOTIFICATIONS ET ALERTES DGI ===================

// Obtenir les notifications DGI
app.get('/api/dgi/notifications', authDGI, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(`
      SELECT * FROM notifications 
      WHERE utilisateur_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.id]);
    
    await conn.end();
    res.json({ notifications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur récupération notifications' });
  }
});

// Marquer notification comme lue
app.put('/api/dgi/notifications/:id/lu', authDGI, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      'UPDATE notifications SET lu = 1 WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.user.id]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur mise à jour notification' });
  }
});

// =================== ACTIONS AVANCÉES DGI COMPLÈTES ===================

// Suspendre une demande
app.post('/api/dgi/demandes/:id/suspendre', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { motif, duree } = req.body;
  if (!motif) return res.status(400).json({ error: 'Motif obligatoire' });
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    const statutPrecedent = demande.statut;
    await conn.execute('UPDATE demandes SET statut = "SUSPENDUE" WHERE id = ?', [demandeId]);
    
    // Ajouter les détails de suspension dans les données JSON
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.suspension', JSON_OBJECT(
        'motif', ?, 
        'date_suspension', NOW(), 
        'duree_prevue', ?,
        'statut_precedent', ?
      )) WHERE id = ?`,
      [motif, duree || null, statutPrecedent, demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'SUSPENSION_DGI', `Demande suspendue: ${motif}`, statutPrecedent, 'SUSPENDUE');
    
    await conn.end();
    res.json({ success: true, message: 'Demande suspendue avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la suspension' });
  }
});

// Reprendre une demande suspendue
app.post('/api/dgi/demandes/:id/reprendre', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute(
      'SELECT statut, donnees FROM demandes WHERE id=? AND statut="SUSPENDUE"', 
      [demandeId]
    );
    if (!demande) return res.status(404).json({ error: 'Demande suspendue non trouvée' });
    
    // Récupérer le statut précédent depuis les données JSON
    const donnees = demande.donnees ? JSON.parse(demande.donnees) : {};
    const statutPrecedent = donnees.suspension?.statut_precedent || 'EN_COURS_DGI';
    
    await conn.execute('UPDATE demandes SET statut = ? WHERE id = ?', [statutPrecedent, demandeId]);
    
    // Supprimer les informations de suspension
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_REMOVE(IFNULL(donnees, '{}'), '$.suspension') WHERE id = ?`,
      [demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'REPRISE_DGI', commentaire || 'Demande reprise', 'SUSPENDUE', statutPrecedent);
    
    await conn.end();
    res.json({ success: true, message: 'Demande reprise avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la reprise' });
  }
});

// Rejeter une demande
app.post('/api/dgi/demandes/:id/rejeter', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { motif_rejet, recommandations } = req.body;
  if (!motif_rejet) return res.status(400).json({ error: 'Motif de rejet requis' });
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    const statutPrecedent = demande.statut;
    await conn.execute('UPDATE demandes SET statut = "REJETEE_DGI" WHERE id = ?', [demandeId]);
    
    // Ajouter les détails du rejet dans les données JSON
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.rejet_dgi', JSON_OBJECT(
        'motif', ?, 
        'recommandations', ?,
        'date_rejet', NOW(),
        'agent_rejet_id', ?
      )) WHERE id = ?`,
      [motif_rejet, recommandations || null, req.user.id, demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'REJET_DGI', `Demande rejetée: ${motif_rejet}`, statutPrecedent, 'REJETEE_DGI');
    
    // Notifier le demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "REJET", ?, 0, NOW())`,
      [demande.utilisateur_id, `Votre demande a été rejetée par la DGI. Motif: ${motif_rejet}`]
    );
    
    await conn.end();
    res.json({ success: true, message: 'Demande rejetée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
});

// Demander des compléments
app.post('/api/dgi/demandes/:id/demander-complement', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { documents_requis, informations_requises, delai_jours } = req.body;
  
  if (!documents_requis && !informations_requises) {
    return res.status(400).json({ error: 'Documents ou informations requis' });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute(
      'SELECT statut, utilisateur_id FROM demandes WHERE id = ?',
      [demandeId]
    );
    
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    // Mettre à jour le statut et ajouter les informations de complément
    await conn.execute(
      `UPDATE demandes 
       SET statut = 'EN_ATTENTE_COMPLEMENT', 
           donnees = JSON_SET(IFNULL(donnees, '{}'), '$.complement', JSON_OBJECT('documents_requis', ?, 'informations_requises', ?, 'delai_jours', ?, 'date_demande', NOW()))
       WHERE id = ?`,
      [JSON.stringify(documents_requis || []), JSON.stringify(informations_requises || []), delai_jours || 30, demandeId]
    );
    
    // Enregistrer dans le suivi
    await enregistrerSuivi(
      conn, demandeId, req.user.id, 'DEMANDE_COMPLEMENT', 
      `Compléments demandés${delai_jours ? ` (délai: ${delai_jours} jours)` : ''}`, 
      demande.statut, 'EN_ATTENTE_COMPLEMENT'
    );
    
    // Notifier le demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "COMPLEMENT", ?, 0, NOW())`,
      [demande.utilisateur_id, `Des compléments ont été demandés pour votre demande. Veuillez consulter votre espace.`]
    );
    
    await conn.end();
    res.json({ success: true, message: 'Demande de compléments envoyée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la demande de compléments' });
  }
});

// Planifier une visite technique
app.post('/api/dgi/demandes/:id/planifier-visite', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { date_visite, lieu, motif, participants } = req.body;
  
  if (!date_visite || !lieu) return res.status(400).json({ error: 'Date et lieu de visite requis' });
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute(
      'SELECT statut, utilisateur_id FROM demandes WHERE id = ?',
      [demandeId]
    );
    
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    // Ajouter les informations de visite technique
    await conn.execute(
      `UPDATE demandes 
       SET donnees = JSON_SET(IFNULL(donnees, '{}'), '$.visite_technique', JSON_OBJECT('date_visite', ?, 'lieu', ?, 'motif', ?, 'participants', ?, 'date_planification', NOW()))
       WHERE id = ?`,
      [date_visite, lieu, motif || 'Visite technique de routine', JSON.stringify(participants || []), demandeId]
    );
    
    // Enregistrer dans le suivi
    await enregistrerSuivi(
      conn, demandeId, req.user.id, 'VISITE_TECHNIQUE', 
      `Visite technique planifiée: ${date_visite} à ${lieu}`, 
      null, null
    );
    
    // Notifier le demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "VISITE", ?, 0, NOW())`,
      [demande.utilisateur_id, `Une visite technique a été planifiée pour votre demande le ${date_visite} à ${lieu}.`]
    );
    
    await conn.end();
    res.json({ success: true, message: 'Visite technique planifiée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la planification de la visite' });
  }
});

// Enregistrer rapport de visite
app.post('/api/dgi/demandes/:id/rapport-visite', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { rapport_visite, conformite, recommandations, photos, decision_suite } = req.body;
  if (!rapport_visite) return res.status(400).json({ error: 'Rapport de visite requis' });
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut FROM demandes WHERE id=? AND statut="VISITE_PROGRAMMEE"', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande avec visite programmée non trouvée' });
    
    // Déterminer le nouveau statut selon la décision
    let nouveauStatut = 'EN_COURS_DGI';
    if (decision_suite === 'VALIDER') nouveauStatut = 'VALIDEE_DGI';
    else if (decision_suite === 'REJETER') nouveauStatut = 'REJETEE_DGI';
    else if (decision_suite === 'COMPLEMENT') nouveauStatut = 'COMPLEMENT_REQUIS';
    
    await conn.execute('UPDATE demandes SET statut = ? WHERE id = ?', [nouveauStatut, demandeId]);
    
    // Mettre à jour les informations de visite avec le rapport
    await conn.execute(
      `UPDATE demandes SET donnees = JSON_SET(IFNULL(donnees, '{}'), 
        '$.visite_technique.rapport', ?,
        '$.visite_technique.conformite', ?,
        '$.visite_technique.recommandations', ?,
        '$.visite_technique.photos', ?,
        '$.visite_technique.date_rapport', NOW(),
        '$.visite_technique.statut_visite', 'EFFECTUEE',
        '$.visite_technique.decision_suite', ?
      ) WHERE id = ?`,
      [rapport_visite, conformite || null, recommandations || null, JSON.stringify(photos || []), decision_suite || null, demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'RAPPORT_VISITE_DGI', 
      `Rapport de visite enregistré. Décision: ${decision_suite || 'En cours d\'analyse'}`, 'VISITE_PROGRAMMEE', nouveauStatut);
    
    await conn.end();
    res.json({ success: true, message: 'Rapport de visite enregistré avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du rapport' });
  }
});

// Endpoint de réattribution supprimé - conflit avec l'endpoint principal

// Clôturer une demande
app.post('/api/demandes/:id/cloturer', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { motif_cloture } = req.body;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    await conn.execute(
      'UPDATE demandes SET statut = "CLOTUREE", motif_cloture = ?, date_cloture = NOW() WHERE id = ?',
      [motif_cloture || 'Clôture administrative', demandeId]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'CLOTURE', 
      `Demande clôturée: ${motif_cloture || 'Clôture administrative'}`, demande.statut, 'CLOTUREE');
    
    await conn.end();
    res.json({ success: true, message: 'Demande clôturée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la clôture' });
  }
});

// Relancer une demande
app.post('/api/demandes/:id/relancer', authDGI, async (req, res) => {
  const demandeId = req.params.id;
  const { type_relance, message } = req.body;
  if (!type_relance || !message) return res.status(400).json({ error: 'Type et message de relance requis' });
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    
    // Enregistrer la relance
    await conn.execute(
      `INSERT INTO relances (demande_id, type_relance, message, agent_relance, date_relance)
       VALUES (?, ?, ?, ?, NOW())`,
      [demandeId, type_relance, message, req.user.id]
    );
    
    // Notifier le demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "RELANCE", ?, 0, NOW())`,
      [demande.utilisateur_id, `Relance ${type_relance}: ${message}`]
    );
    
    await enregistrerSuivi(conn, demandeId, req.user.id, 'RELANCE', 
      `Relance ${type_relance}: ${message}`, null, null);
    
    await conn.end();
    res.json({ success: true, message: 'Relance envoyée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la relance' });
  }
});

// GET /api/dgi/demandes-par-statut/:statut - Filtrer les demandes par statut
app.get('/api/dgi/demandes-par-statut/:statut', authDGI, async (req, res) => {
  const { statut } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandes] = await conn.execute(
      `SELECT d.*, u.nom AS demandeur_nom, u.prenom AS demandeur_prenom, u.email AS demandeur_email
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.statut = ?
       ORDER BY d.updated_at DESC
       LIMIT ? OFFSET ?`,
      [statut, parseInt(limit), parseInt(offset)]
    );
    
    // Compter le total pour la pagination
    const [[{ total }]] = await conn.execute(
      'SELECT COUNT(*) as total FROM demandes WHERE statut = ?',
      [statut]
    );
    
    await conn.end();
    
    // Parser les JSON pour chaque demande
    const demandesFormatees = demandes.map(d => ({
      ...d,
      donnees: d.donnees ? JSON.parse(d.donnees) : {},
      fichiers: d.fichiers ? JSON.parse(d.fichiers) : {}
    }));
    
    res.json({
      demandes: demandesFormatees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes' });
  }
});

//===========Chef de service==================
// Middleware auth Chef de Service (role_id = 4)
function authChefService(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token manquant' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role_id !== 4) return res.status(403).json({ error: 'Accès refusé' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// Login Chef de Service
app.post('/api/login/chef-service', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM utilisateurs WHERE email=? AND role_id=4 LIMIT 1", [email]
    );
    await conn.end();
    if (rows.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu ou non autorisé' });
    const user = rows[0];
    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });
    if (user.statut !== 'ACTIF' || user.email_verifie !== 1) {
      return res.status(403).json({ error: "Veuillez activer votre compte via l'email reçu." });
    }
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, nom: user.nom, prenom: user.prenom, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role_id: user.role_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques Chef de Service
app.get('/api/chef-service/stats', authChefService, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT statut, COUNT(*) AS count FROM demandes
       WHERE statut IN ('REÇUE', 'TRANSMISE_CHEF', 'VALIDEE_CHEF', 'RETOURNEE')
       GROUP BY statut`
    );
    await conn.end();

    const stats = [
      { id: '1', label: 'À traiter', value: 0, icon: 'fas fa-clock', color: '#faad14' },
      { id: '2', label: 'Validées', value: 0, icon: 'fas fa-check', color: '#52c41a' },
      { id: '3', label: 'Retournées', value: 0, icon: 'fas fa-times', color: '#f5222d' },
    ];

    rows.forEach(row => {
      if (row.statut === 'REÇUE' || row.statut === 'TRANSMISE_CHEF') stats[0].value += row.count;
      else if (row.statut === 'VALIDEE_CHEF') stats[1].value += row.count;
      else if (row.statut === 'RETOURNEE') stats[2].value += row.count;
    });

    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur statistiques Chef de Service' });
  }
});

// Notifications Chef de Service
app.get('/api/chef-service/notifications', authChefService, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT id, message AS title, message, created_at AS date, lu AS isNew
       FROM notifications WHERE utilisateur_id=? ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );
    await conn.end();
    res.json({ notifications: rows.map(n => ({ ...n, isNew: n.isNew === 0 })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur notifications Chef de Service' });
  }
});

// Récupération demandes Chef de Service
app.get('/api/chef-service/demandes', authChefService, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT d.id, d.reference, u.nom AS demandeur_nom, u.prenom AS demandeur_prenom, d.statut, d.created_at, d.type, d.donnees
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.statut IN ('REÇUE', 'TRANSMISE_CHEF', 'VALIDEE_CHEF', 'RETOURNEE')
       ORDER BY d.created_at DESC`
    );
    await conn.end();
    res.json({
      demandes: rows.map(d => ({
        ...d,
        demandeur: `${d.demandeur_nom} ${d.demandeur_prenom}`,
        donnees: d.donnees ? JSON.parse(d.donnees) : {}
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur récupération demandes Chef de Service' });
  }
});

// Historique d'une demande Chef de Service
app.get('/api/chef-service/demandes/:id/historique', authChefService, async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT s.id, s.action, s.message, s.date_action, s.statut_precedent, s.nouveau_statut,
              u.nom AS utilisateur_nom, u.prenom AS utilisateur_prenom
       FROM suivi_demandes s
       LEFT JOIN utilisateurs u ON s.utilisateur_id = u.id
       WHERE s.demande_id = ? ORDER BY s.date_action ASC`,
      [demandeId]
    );
    await conn.end();
    res.json({
      historique: rows.map(h => ({
        ...h,
        utilisateur: h.utilisateur_nom ? `${h.utilisateur_nom} ${h.utilisateur_prenom}` : 'Système'
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur historique Chef de Service' });
  }
});

// Ajouter un commentaire Chef de Service
app.post('/api/chef-service/demandes/:id/commentaire', authChefService, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;
  if (!commentaire) return res.status(400).json({ error: 'Commentaire requis' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut FROM demandes WHERE id = ?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;
    await enregistrerSuivi(conn, demandeId, req.user.id, 'COMMENTAIRE_CHEF_SERVICE', commentaire, oldStatus, oldStatus);
    await conn.end();
    res.json({ success: true, message: 'Commentaire ajouté' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur ajout commentaire Chef de Service' });
  }
});

// Valider une demande Chef de Service
app.post('/api/chef-service/demandes/:id/valider', authChefService, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut FROM demandes WHERE id = ?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;
    await conn.execute(
      `UPDATE demandes SET statut = 'VALIDEE_CHEF' WHERE id = ?`,
      [demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'VALIDATION_CHEF_SERVICE', commentaire || 'Demande validée', oldStatus, 'VALIDEE_CHEF');
    await conn.end();
    res.json({ success: true, message: 'Demande validée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur validation Chef de Service' });
  }
});

// Retourner une demande Chef de Service
app.post('/api/chef-service/demandes/:id/retour', authChefService, async (req, res) => {
  const demandeId = req.params.id;
  const { commentaire } = req.body;
  if (!commentaire) return res.status(400).json({ error: 'Commentaire obligatoire' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut FROM demandes WHERE id = ?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;
    await conn.execute(
      `UPDATE demandes SET statut = 'RETOURNEE' WHERE id = ?`,
      [demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'RETOUR_CHEF_SERVICE', commentaire, oldStatus, 'RETOURNEE');
    await conn.end();
    res.json({ success: true, message: 'Demande retournée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur retour Chef de Service' });
  }
});

// Vérification des tokens Chef de Service
app.get('/api/chef-service/verify-token', authChefService, async (req, res) => {
  try {
    // Si on arrive ici, le token est valide (authChefService a passé)
    res.json({ 
      valid: true, 
      user: req.user,
      message: 'Token Chef de Service valide' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la vérification du token' });
  }
});

// Transmettre une demande Chef de Service vers DDPI
app.post('/api/chef-service/demandes/:id/transmettre', authChefService, async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute('SELECT statut FROM demandes WHERE id = ?', [demandeId]);
    if (demandeResult.length === 0) { await conn.end(); return res.status(404).json({ error: 'Demande non trouvée' }); }
    const oldStatus = demandeResult[0].statut;
    await conn.execute(
      `UPDATE demandes SET statut = 'TRANSMISE_A_DDPI' WHERE id = ?`,
      [demandeId]
    );
    await enregistrerSuivi(conn, demandeId, req.user.id, 'TRANSMISSION_CHEF_SERVICE', 'Transmise à la DDPI', oldStatus, 'TRANSMISE_A_DDPI');
    await conn.end();
    res.json({ success: true, message: 'Demande transmise à la DDPI' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur transmission Chef de Service' });
  }
});


//=== Variantes==============================

// POST /api/demandes/:id/rejeter
app.post('/api/demandes/:id/rejeter', authRole([4,5,6]), async (req, res) => {
  const demandeId = req.params.id;
  const { motif } = req.body;
  if (!motif) return res.status(400).json({ error: 'Motif obligatoire' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    await conn.execute('UPDATE demandes SET statut="REJETEE" WHERE id=?', [demandeId]);
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demandeId, demande.statut, 'REJETEE', req.user.id, 'REJET', motif]
    );
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "REJET", ?, 0, NOW())`,
      [demande.utilisateur_id, `Votre demande a été rejetée : ${motif}`]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
});

// POST /api/demandes/:id/complement
app.post('/api/demandes/:id/complement', authRole([4,5]), async (req, res) => {
  const demandeId = req.params.id;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message obligatoire' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    await conn.execute('UPDATE demandes SET statut="PIECES_MANQUANTES" WHERE id=?', [demandeId]);
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demandeId, demande.statut, 'PIECES_MANQUANTES', req.user.id, 'COMPLEMENT', message]
    );
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "COMPLEMENT", ?, 0, NOW())`,
      [demande.utilisateur_id, `Complément demandé : ${message}`]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la demande de complément' });
  }
});

// POST /api/demandes/:id/retour-etape
app.post('/api/demandes/:id/retour-etape', authRole([4,6,11]), async (req, res) => {
  const demandeId = req.params.id;
  const { nouvelle_etape, message } = req.body;
  if (!nouvelle_etape) return res.status(400).json({ error: 'Nouvelle étape obligatoire' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    await conn.execute('UPDATE demandes SET statut=? WHERE id=?', [nouvelle_etape, demandeId]);
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demandeId, demande.statut, nouvelle_etape, req.user.id, 'RETOUR_ETAPE', message]
    );
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "RETOUR", ?, 0, NOW())`,
      [demande.utilisateur_id, `Votre dossier a été renvoyé à une étape précédente : ${message}`]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du retour à l\'étape' });
  }
});


// POST /api/demandes/:id/solliciter-avis
app.post('/api/demandes/:id/solliciter-avis', authRole([6]), async (req, res) => {
  const demandeId = req.params.id;
  const { commission_id, message } = req.body;
  if (!commission_id) return res.status(400).json({ error: 'Commission obligatoire' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      `INSERT INTO avis_commissions (demande_id, commission_id, type_avis, observations)
       VALUES (?, ?, 'AJOURNE', ?)`,
      [demandeId, commission_id, message || 'Avis multisectoriel sollicité']
    );
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demandeId, 'EN_COURS_DGI', 'EN_ATTENTE_AVIS_COMMISSION', req.user.id, 'SOLLICITATION_AVIS', message]
    );
    // Optionnel : notification aux membres de la commission
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la sollicitation d\'avis' });
  }
});


// POST /api/demandes/:id/cloturer
app.post('/api/demandes/:id/cloturer', authRole([6,1]), async (req, res) => {
  const demandeId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT statut, utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    await conn.execute('UPDATE demandes SET statut="CLOTUREE" WHERE id=?', [demandeId]);
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demandeId, demande.statut, 'CLOTUREE', req.user.id, 'CLOTURE', 'Demande clôturée et archivée']
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la clôture' });
  }
});


// POST /api/demandes/:id/relancer
app.post('/api/demandes/:id/relancer', authRole([4,5,6]), async (req, res) => {
  const demandeId = req.params.id;
  const { type_relance, message } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [[demande]] = await conn.execute('SELECT utilisateur_id FROM demandes WHERE id=?', [demandeId]);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    await conn.execute(
      `INSERT INTO relances (demande_id, type_relance, destinataire_id, message)
       VALUES (?, ?, ?, ?)`,
      [demandeId, type_relance, demande.utilisateur_id, message]
    );
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "RELANCE", ?, 0, NOW())`,
      [demande.utilisateur_id, message]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la relance' });
  }
});

// =======Comité et Commission=====

// Login Commission/Comité
app.post('/api/login/commission', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM utilisateurs WHERE email=? AND role_id IN (7,8) LIMIT 1", [email]
    );
    await conn.end();
    if (rows.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu ou non autorisé' });
    const user = rows[0];
    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });
    if (user.statut !== 'ACTIF' || user.email_verifie !== 1) {
      return res.status(403).json({ error: "Veuillez activer votre compte via l'email reçu." });
    }
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, nom: user.nom, prenom: user.prenom, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role_id: user.role_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques Commission/Comité
app.get('/api/commission/stats', authCommission, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT statut, COUNT(*) AS count FROM demandes WHERE statut IN ('EN_ATTENTE_AVIS_COMMISSION','EN_ATTENTE_AVIS_COMITE','EN_COURS_COMMISSION','EN_COURS_COMITE') GROUP BY statut`
    );
    await conn.end();
    const stats = [
      { id: '1', label: 'À examiner', value: 0, icon: 'fas fa-clock', color: '#016b5b' },
      { id: '2', label: 'Validés', value: 0, icon: 'fas fa-check', color: '#43a047' },
      { id: '3', label: 'Réserves', value: 0, icon: 'fas fa-exclamation', color: '#ffb300' },
      { id: '4', label: 'Rejetés', value: 0, icon: 'fas fa-times', color: '#d32f2f' },
    ];
    rows.forEach(row => {
      if (row.statut.includes('EN_ATTENTE')) stats[0].value += row.count;
      if (row.statut.includes('VALIDE')) stats[1].value += row.count;
      if (row.statut.includes('RESERVE')) stats[2].value += row.count;
      if (row.statut.includes('REJETE')) stats[3].value += row.count;
    });
    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur stats commission' });
  }
});

// Notifications Commission/Comité
app.get('/api/commission/notifications', authCommission, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT id, message AS title, message, created_at AS date, lu AS isNew
       FROM notifications WHERE utilisateur_id=? ORDER BY created_at DESC LIMIT 10`, [req.user.id]
    );
    await conn.end();
    res.json({ notifications: rows.map(n => ({ ...n, isNew: n.isNew === 0 })) });
  } catch (err) {
    res.status(500).json({ error: 'Erreur notifications commission' });
  }
});

// Dossiers à traiter Commission/Comité
app.get('/api/commission/dossiers', authCommission, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT d.id, d.reference, u.nom AS demandeur_nom, u.prenom AS demandeur_prenom, d.statut, d.created_at, d.type, d.donnees
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.statut IN ('EN_ATTENTE_AVIS_COMMISSION','EN_ATTENTE_AVIS_COMITE')
       ORDER BY d.created_at DESC LIMIT 50`
    );
    await conn.end();
    res.json({
      dossiers: rows.map(d => ({
        ...d,
        demandeur: `${d.demandeur_nom} ${d.demandeur_prenom}`,
        donnees: d.donnees ? JSON.parse(d.donnees) : {}
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur dossiers commission' });
  }
});

// Enregistrer un avis sur un dossier (favorable, défavorable, réserve)
app.post('/api/commission/dossiers/:id/avis', authCommission, async (req, res) => {
  const dossierId = req.params.id;
  const { type_avis, observations } = req.body;
  if (!type_avis) return res.status(400).json({ error: 'Type d\'avis requis' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const commission_id = req.user.role_id === 7 ? 1 : 2; // Exemple d'attribution commission_id
    await conn.execute(
      `INSERT INTO avis_commissions (demande_id, commission_id, membre_rapporteur_id, type_avis, observations)
       VALUES (?, ?, ?, ?, ?)`,
      [dossierId, commission_id, req.user.id, type_avis, observations || '']
    );
    let newStatut = type_avis === 'FAVORABLE' ? 'AVIS_FAVORABLE_COMMISSION' :
                    type_avis === 'DEFAVORABLE' ? 'AVIS_DEFAVORABLE_COMMISSION' :
                    type_avis === 'RESERVE' ? 'RESERVE_COMMISSION' : 'AJOURNE';
    await conn.execute('UPDATE demandes SET statut=? WHERE id=?', [newStatut, dossierId]);
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dossierId, 'EN_ATTENTE_AVIS_COMMISSION', newStatut, req.user.id, 'AVIS_COMMISSION', observations || type_avis]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur avis commission' });
  }
});

// Historique d'un dossier Commission/Comité
app.get('/api/commission/dossiers/:id/historique', authCommission, async (req, res) => {
  const dossierId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT action, message, date_action, statut_precedent, nouveau_statut
       FROM suivi_demandes WHERE demande_id=? ORDER BY date_action ASC`, [dossierId]
    );
    await conn.end();
    res.json({ historique: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur historique commission' });
  }
});

//____________________Ministre_____________________
// LOGIN Ministre (role_id = 9)
app.post('/api/login/ministere', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM utilisateurs WHERE email=? AND role_id=9 LIMIT 1", [email]
    );
    await conn.end();
    if (rows.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu ou non autorisé' });
    const user = rows[0];
    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, nom: user.nom, prenom: user.prenom, email: user.email },
      JWT_SECRET, { expiresIn: '2h' }
    );
    res.json({ token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role_id: user.role_id } });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

//--- Dossiers à signer (statut = 'TRANSMISE_AU_MINISTRE')
app.get('/api/ministere/dossiers', authMinistre, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT d.id, d.reference, u.nom_responsable AS demandeur_nom, u.prenom_responsable AS demandeur_prenom, d.statut, d.created_at, d.type, d.donnees
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.statut = 'TRANSMISE_AU_MINISTRE'
       ORDER BY d.created_at DESC LIMIT 50`
    );
    await conn.end();
    res.json({
      dossiers: rows.map(d => ({
        ...d,
        demandeur: `${d.demandeur_prenom} ${d.demandeur_nom}`,
        donnees: d.donnees ? JSON.parse(d.donnees) : {}
      }))
    });
  } catch (err) {
    console.error('❌ [Ministre] Erreur dossiers:', err);
    res.status(500).json({ error: 'Erreur dossiers ministre' });
  }
});

// Statistiques du Ministre
app.get('/api/ministere/stats', authMinistre, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Total des dossiers transmis au Ministre
    const [totalResult] = await conn.execute(`
      SELECT COUNT(*) as total
      FROM demandes
      WHERE statut = 'TRANSMISE_AU_MINISTRE'
    `);
    
    // Dossiers en attente de signature
    const [enAttenteResult] = await conn.execute(`
      SELECT COUNT(*) as en_attente
      FROM demandes
      WHERE statut = 'TRANSMISE_AU_MINISTRE'
    `);
    
    // Dossiers signés et clôturés
    const [signeesResult] = await conn.execute(`
      SELECT COUNT(*) as signees
      FROM demandes
      WHERE statut = 'CLOTUREE' 
      AND id IN (
        SELECT demande_id 
        FROM suivi_demandes 
        WHERE action = 'SIGNATURE_MINISTRE'
      )
    `);
    
    // Dossiers urgents (en attente depuis plus de 7 jours)
    const [urgentResult] = await conn.execute(`
      SELECT COUNT(*) as urgent
      FROM demandes
      WHERE statut = 'TRANSMISE_AU_MINISTRE'
      AND DATEDIFF(NOW(), updated_at) > 7
    `);
    
    await conn.end();
    
    const stats = {
      total: totalResult[0].total || 0,
      enAttente: enAttenteResult[0].en_attente || 0,
      signees: signeesResult[0].signees || 0,
      urgent: urgentResult[0].urgent || 0
    };
    
    res.json({ stats });
  } catch (err) {
    console.error('❌ [Ministre] Erreur stats:', err);
    res.status(500).json({ error: 'Erreur lors du chargement des statistiques' });
  }
});

// Notifications MMI
app.get('/api/ministere/notifications', authMinistre, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT id, message AS title, message, created_at AS date, lu AS isNew
       FROM notifications WHERE utilisateur_id=? ORDER BY created_at DESC LIMIT 10`, [req.user.id]
    );
    await conn.end();
    res.json({ notifications: rows.map(n => ({ ...n, isNew: n.isNew === 0 })) });
  } catch (err) {
    res.status(500).json({ error: 'Erreur notifications ministre' });
  }
});

// Prévisualisation PDF avant signature
app.post('/api/ministere/dossiers/:id/preview-pdf', authMinistre, async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { signatureData } = req.body;
    
    console.log(`🔍 [MINISTRE] Prévisualisation PDF pour demande ${id}`);
    
    // Validation de l'ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID de demande invalide' });
    }
    
    conn = await mysql.createConnection(dbConfig);
    
    // 1. Récupérer la demande avec timeout
    const [demandes] = await Promise.race([
      conn.execute(`
        SELECT d.*, u.nom_responsable, u.prenom_responsable, u.email, u.telephone, u.adresse
        FROM demandes d
        JOIN utilisateurs u ON d.utilisateur_id = u.id
        WHERE d.id = ? AND d.statut = 'TRANSMISE_AU_MINISTRE'
      `, [id]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout base de données')), 10000)
      )
    ]);
    
    if (demandes.length === 0) {
      return res.status(404).json({ 
        error: 'Demande non trouvée ou non autorisée',
        details: 'Vérifiez que la demande existe et a le statut TRANSMISE_AU_MINISTRE'
      });
    }
    
    const demande = demandes[0];
    console.log(`   ✅ Demande trouvée: ${demande.reference}`);
    
    // Validation des données de la demande
    if (!demande.reference || !demande.type) {
      return res.status(400).json({ 
        error: 'Données de demande incomplètes',
        details: 'Référence ou type manquant'
      });
    }
    
    // 2. Générer le PDF de prévisualisation avec timeout
    const pdfBuffer = await Promise.race([
      generatePreviewPDF(demande, signatureData),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout génération PDF')), 30000)
      )
    ]);
    
    // 3. Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview-${demande.reference}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
    console.log(`   ✅ PDF de prévisualisation généré et envoyé (${pdfBuffer.length} bytes)`);
    
  } catch (error) {
    console.error('❌ [MINISTRE] Erreur prévisualisation PDF:', error);
    
    // Gestion spécifique des erreurs
    if (error.message.includes('Timeout')) {
      res.status(408).json({ 
        error: 'Délai d\'attente dépassé',
        details: 'La génération du PDF prend trop de temps'
      });
    } else if (error.message.includes('PDF')) {
      res.status(500).json({ 
        error: 'Erreur lors de la génération du PDF',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'Erreur lors de la génération de la prévisualisation',
        details: error.message 
      });
    }
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch (closeError) {
        console.error('❌ Erreur fermeture connexion:', closeError);
      }
    }
  }
});

// Fonction pour générer le PDF de prévisualisation
async function generatePreviewPDF(demande, signatureData) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`      📝 [PDF] Début génération pour ${demande.reference}`);
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      // Gestion des événements avec gestion d'erreur
      const chunks = [];
      let hasError = false;
      
      doc.on('data', chunk => {
        if (!hasError) {
          chunks.push(chunk);
          console.log(`      📦 [PDF] Chunk reçu: ${chunk.length} bytes`);
        }
      });
      
      doc.on('end', () => {
        if (!hasError) {
          try {
            const buffer = Buffer.concat(chunks);
            console.log(`      ✅ [PDF] Génération terminée: ${buffer.length} bytes`);
            resolve(buffer);
          } catch (bufferError) {
            console.error(`      ❌ [PDF] Erreur création buffer: ${bufferError.message}`);
            reject(new Error(`Erreur création buffer PDF: ${bufferError.message}`));
          }
        }
      });
      
      doc.on('error', (error) => {
        hasError = true;
        console.error(`      ❌ [PDF] Erreur PDF: ${error.message}`);
        reject(new Error(`Erreur génération PDF: ${error.message}`));
      });
      
      // En-tête avec logo
      console.log(`      🏛️ [PDF] Ajout en-tête avec logo...`);
      
      // Logo en haut à gauche
      try {
        const logoPath = path.join(__dirname, 'assets', 'logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 50, { width: 80, height: 80 });
          console.log(`      🖼️ [PDF] Logo ajouté: ${logoPath}`);
        } else {
          console.log(`      ⚠️ [PDF] Logo non trouvé: ${logoPath}`);
        }
      } catch (logoError) {
        console.log(`      ⚠️ [PDF] Erreur logo: ${logoError.message}`);
      }
      
      // Titre centré
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('MINISTÈRE DES MINES ET DE L\'INDUSTRIE', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(14)
         .font('Helvetica')
         .text('Direction Générale de l\'Industrie', { align: 'center' });
      
      doc.moveDown(2);
      
      // Document officiel d'autorisation
      console.log(`      📋 [PDF] Ajout contenu officiel...`);
      
      // Destinataire
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Monsieur le Directeur Général de l\'ETS XXXX');
      
      doc.moveDown(1);
      
      // Objet
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Objet : Autorisation d\'Installation d\'une unité de recyclage de plastique');
      
      // Référence
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Référence : ${demande.reference || 'N/A'} - ${new Date().toLocaleDateString('fr-FR')}`);
      
      doc.moveDown(1);
      
      // Corps du document
      doc.fontSize(12)
         .font('Helvetica')
         .text('Monsieur le directeur général,', { align: 'left' });
      
      doc.moveDown(1);
      
      doc.text('Faisant suite à votre lettre ci-dessus référencée, j\'ai l\'honneur de vous informer que notre Département donne son accord de principe pour l\'Installation par votre société dans la wilaya de Nouakchott.');
      
      doc.moveDown(1);
      
      doc.text('Votre société doit s\'engager à respecter strictement les dispositions de la réglementation en vigueur dans notre pays relative à cette activité notamment celle concernant les normes de santé, de sécurité, de qualité et d\'environnement.');
      
      doc.moveDown(1);
      
      doc.text('En cas de non-respect par votre Société de toutes les conditions requises pour l\'installation de ce genre d\'industrie, le Département se réserve le droit d\'annuler cette autorisation.');
      
      doc.moveDown(1);
      
      doc.text('Nos services concernés restent à votre disposition pour vous apporter leur appui et tout l\'accompagnement nécessaire à la réalisation de votre projet.');
      
      doc.moveDown(1);
      
      doc.text('Pour des fins d\'enregistrement et de suivi, conformément au décret n° 2009/189 du 7 Juin 2009 relatif à l\'enregistrement, au suivi et à la classification des entreprises industrielles, vous devez transmettre aux services chargés de l\'industrie, au plus tard trois mois après le début de l\'opération d\'investissement et dès le démarrage de l\'activité de production, les renseignements contenus dans le formulaire ci-joint.');
      
      doc.moveDown(1);
      
      doc.text('Les informations relatives à l\'activité doivent également être communiquées périodiquement (tous les trois mois) aux services du Développement industriel. Un certificat d\'enregistrement valable pour six mois vous sera délivré une fois que le questionnaire dûment rempli parvient aux services.');
      
      doc.moveDown(1);
      
      doc.text('Faute de communication de cette situation durant neuf (09) mois l\'entreprise est considérée arrêtée et le certificat d\'enregistrement n\'est pas renouvelé. (Article 5 du décret cité supra)');
      
      doc.moveDown(1);
      
      doc.text('Veuillez agréer, Monsieur le directeur général, l\'expression de mes salutations distinguées.');
      
      doc.moveDown(2);
      
      // Signature du ministre - MAINTENANT À GAUCHE
      console.log(`      ✍️ [PDF] Ajout zone signature à gauche...`);
      doc.fontSize(12)
         .font('Helvetica')
         .text('Signature du ministre', { align: 'left' });
      
      doc.moveDown(0.5);
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('THIAM Tidjani', { align: 'left' });
      
      // Finalisation
      console.log(`      🏁 [PDF] Finalisation...`);
      doc.end();
      
    } catch (error) {
      console.error(`      ❌ [PDF] Erreur dans generatePreviewPDF: ${error.message}`);
      reject(new Error(`Erreur génération PDF: ${error.message}`));
    }
  });
}

// Fonction pour générer l'autorisation officielle signée
async function generateAutorisationOfficielle(demande, ministre) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`      📝 [AUTORISATION] Début génération autorisation officielle pour ${demande.reference}`);
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      // Gestion des événements avec gestion d'erreur
      const chunks = [];
      let hasError = false;
      
      doc.on('data', chunk => {
        if (!hasError) {
          chunks.push(chunk);
          console.log(`      📦 [AUTORISATION] Chunk reçu: ${chunk.length} bytes`);
        }
      });
      
      doc.on('end', () => {
        if (!hasError) {
          try {
            const buffer = Buffer.concat(chunks);
            console.log(`      ✅ [AUTORISATION] Génération terminée: ${buffer.length} bytes`);
            resolve(buffer);
          } catch (bufferError) {
            console.error(`      ❌ [AUTORISATION] Erreur création buffer: ${bufferError.message}`);
            reject(new Error(`Erreur création buffer autorisation: ${bufferError.message}`));
          }
        }
      });
      
      doc.on('error', (error) => {
        hasError = true;
        console.error(`      ❌ [AUTORISATION] Erreur PDF: ${error.message}`);
        reject(new Error(`Erreur génération autorisation: ${error.message}`));
      });
      
      // En-tête avec logo
      console.log(`      🏛️ [AUTORISATION] Ajout en-tête avec logo...`);
      
      // Logo en haut à gauche
      try {
        const logoPath = path.join(__dirname, 'assets', 'logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 50, { width: 80, height: 80 });
          console.log(`      🖼️ [AUTORISATION] Logo ajouté: ${logoPath}`);
        } else {
          console.log(`      ⚠️ [AUTORISATION] Logo non trouvé: ${logoPath}`);
        }
      } catch (logoError) {
        console.log(`      ⚠️ [AUTORISATION] Erreur logo: ${logoError.message}`);
      }
      
      // Titre centré
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('MINISTÈRE DES MINES ET DE L\'INDUSTRIE', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(14)
         .font('Helvetica')
         .text('Direction Générale de l\'Industrie', { align: 'center' });
      
      doc.moveDown(2);
      
      // Document officiel d'autorisation
      console.log(`      📋 [AUTORISATION] Ajout contenu officiel...`);
      
      // Destinataire - Utilise les vraies données du demandeur
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`Monsieur le Directeur Général de l'ETS Direction Générale de l'Industrie`);
      
      doc.moveDown(1);
      
      // Objet - Personnalisé avec le vrai type de demande
      const typeDemande = demande.type || 'activité industrielle';
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`Objet : Autorisation d'Installation d'une unité de ${typeDemande}`);
      
      // Référence et date
      const dateSignature = new Date().toLocaleDateString('fr-FR');
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Référence : ${demande.reference || 'N/A'} - ${dateSignature}`);
      
      doc.moveDown(1);
      
      // Corps du document
      doc.fontSize(12)
         .font('Helvetica')
         .text('Monsieur le directeur général,', { align: 'left' });
      
      doc.moveDown(1);
      
      // Adresse personnalisée du demandeur
      const adresse = demande.adresse || 'Nouakchott';
      doc.text(`Faisant suite à votre lettre ci-dessus référencée, j'ai l'honneur de vous informer que notre Département donne son accord de principe pour l'Installation par votre société dans la wilaya de ${adresse}.`);
      
      doc.moveDown(1);
      
      doc.text('Votre société doit s\'engager à respecter strictement les dispositions de la réglementation en vigueur dans notre pays relative à cette activité notamment celle concernant les normes de santé, de sécurité, de qualité et d\'environnement.');
      
      doc.moveDown(1);
      
      doc.text('En cas de non-respect par votre Société de toutes les conditions requises pour l\'installation de ce genre d\'industrie, le Département se réserve le droit d\'annuler cette autorisation.');
      
      doc.moveDown(1);
      
      doc.text('Nos services concernés restent à votre disposition pour vous apporter leur appui et tout l\'accompagnement nécessaire à la réalisation de votre projet.');
      
      doc.moveDown(1);
      
      doc.text('Pour des fins d\'enregistrement et de suivi, conformément au décret n° 2009/189 du 7 Juin 2009 relatif à l\'enregistrement, au suivi et à la classification des entreprises industrielles, vous devez transmettre aux services chargés de l\'industrie, au plus tard trois mois après le début de l\'opération d\'investissement et dès le démarrage de l\'activité de production, les renseignements contenus dans le formulaire ci-joint.');
      
      doc.moveDown(1);
      
      doc.text('Les informations relatives à l\'activité doivent également être communiquées périodiquement (tous les trois mois) aux services du Développement industriel. Un certificat d\'enregistrement valide pour six mois vous sera délivré une fois que le questionnaire dûment rempli parvient aux services.');
      
      doc.moveDown(1);
      
      doc.text('Faute de communication de cette situation durant neuf (09) mois l\'entreprise est considérée arrêtée et le certificat d\'enregistrement n\'est pas renouvelé. (Article 5 du décret cité supra)');
      
      doc.moveDown(1);
      
      doc.text('Veuillez agréer, Monsieur le directeur général, l\'expression de mes salutations distinguées.');
      
      doc.moveDown(2);
      
      // Signature du ministre - MAINTENANT À GAUCHE avec vraie signature
      console.log(`      ✍️ [AUTORISATION] Ajout signature à gauche...`);
      
      // 🔍 RÉCUPÉRATION DE LA VRAIE SIGNATURE UPLOADÉE
      let signatureData = null;
      let signatureType = 'electronique';
      
      try {
        // 1. Chercher dans les données de la demande
        if (demande.donnees) {
          const donnees = JSON.parse(demande.donnees);
          console.log(`      🔍 [AUTORISATION] Données trouvées: ${Object.keys(donnees).length} champs`);
          
          // Chercher tous les champs liés à la signature
          const signatureFields = Object.keys(donnees).filter(key => 
            key.toLowerCase().includes('signature') || 
            key.toLowerCase().includes('upload') ||
            key.toLowerCase().includes('image') ||
            key.toLowerCase().includes('data')
          );
          
          if (signatureFields.length > 0) {
            console.log(`      ✍️ [AUTORISATION] Champs signature trouvés: ${signatureFields.join(', ')}`);
            
            // Priorité 1: Signature uploadée (image)
            for (const field of signatureFields) {
              const value = donnees[field];
              if (typeof value === 'string' && value.startsWith('data:image/')) {
                signatureData = value;
                signatureType = 'upload';
                console.log(`      🖼️ [AUTORISATION] Signature uploadée trouvée dans ${field}: ${value.length} caractères`);
                break;
              }
            }
            
            // Priorité 2: Signature électronique (texte)
            if (!signatureData) {
              for (const field of signatureFields) {
                const value = donnees[field];
                if (typeof value === 'string' && value.length > 0 && !value.startsWith('data:')) {
                  signatureData = value;
                  signatureType = 'electronique';
                  console.log(`      ✍️ [AUTORISATION] Signature électronique trouvée dans ${field}: ${value}`);
                  break;
                }
              }
            }
          }
        }
        
        // 2. Si pas trouvé dans donnees, chercher dans la base de données
        if (!signatureData) {
          console.log(`      🔍 [AUTORISATION] Signature non trouvée dans donnees, recherche en base...`);
          
          // Connexion temporaire pour chercher la signature
          const conn = await mysql.createConnection(dbConfig);
          try {
            // Chercher dans la table signatures_ministre
            const [signatures] = await conn.execute(`
              SELECT fichier_signature, type_signature 
              FROM signatures_ministre 
              WHERE utilisateur_id = ? AND statut = 'ACTIVE'
              ORDER BY date_creation DESC 
              LIMIT 1
            `, [ministre.id]);
            
            if (signatures.length > 0) {
              const signature = signatures[0];
              const signaturePath = path.join(__dirname, 'uploads', signature.fichier_signature);
              
              if (fs.existsSync(signaturePath)) {
                // Lire le fichier de signature
                const signatureBuffer = fs.readFileSync(signaturePath);
                signatureData = `data:image/png;base64,${signatureBuffer.toString('base64')}`;
                signatureType = 'upload';
                console.log(`      🖼️ [AUTORISATION] Signature uploadée trouvée en base: ${signaturePath}`);
              }
            }
            
            await conn.end();
          } catch (dbError) {
            console.log(`      ⚠️ [AUTORISATION] Erreur recherche base: ${dbError.message}`);
            if (conn) await conn.end();
          }
        }
        
      } catch (parseError) {
        console.log(`      ⚠️ [AUTORISATION] Erreur parsing données: ${parseError.message}`);
      }
      
      // 🎨 AFFICHAGE DE LA SIGNATURE
      if (signatureData && signatureType === 'upload') {
        // Signature uploadée (image) - À GAUCHE
        try {
          console.log(`      🖼️ [AUTORISATION] Ajout signature uploadée à gauche...`);
          const signatureBuffer = Buffer.from(signatureData.split(',')[1], 'base64');
          doc.image(signatureBuffer, 50, doc.y + 20, { width: 120, height: 60 });
          doc.moveDown(1);
          console.log(`      ✅ [AUTORISATION] Signature uploadée affichée à gauche`);
        } catch (signatureError) {
          console.log(`      ⚠️ [AUTORISATION] Erreur signature image: ${signatureError.message}`);
          // Fallback: signature électronique
          doc.fontSize(12)
             .font('Helvetica')
             .text('✍️ Signature électronique du ministre', { align: 'left' });
        }
      } else if (signatureData && signatureType === 'electronique') {
        // Signature électronique (texte) - À GAUCHE
        doc.fontSize(12)
           .font('Helvetica')
           .text(`✍️ ${signatureData}`, { align: 'left' });
        console.log(`      ✅ [AUTORISATION] Signature électronique affichée à gauche`);
      } else {
        // Aucune signature trouvée - Signature par défaut à gauche
        doc.fontSize(12)
           .font('Helvetica')
           .text('✍️ Signature électronique du ministre', { align: 'left' });
        console.log(`      ⚠️ [AUTORISATION] Aucune signature trouvée, utilisation signature par défaut`);
      }
      
      // Nom du ministre à gauche
      doc.moveDown(0.5);
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('THIAM Tidjani', { align: 'left' });
      
      // Finalisation
      console.log(`      🏁 [AUTORISATION] Finalisation...`);
      doc.end();
      
    } catch (error) {
      console.error(`      ❌ [AUTORISATION] Erreur dans generateAutorisationOfficielle: ${error.message}`);
      reject(new Error(`Erreur génération autorisation officielle: ${error.message}`));
    }
  });
}

// Signature électronique et archivage
app.post('/api/ministere/dossiers/:id/signer', authMinistre, async (req, res) => {
  const dossierId = req.params.id;
  try {
    const conn = await mysql.createConnection(dbConfig);
    //------- Récupérer la demande et le demandeur
    const [[demande]] = await conn.execute('SELECT * FROM demandes WHERE id=?', [dossierId]);
    if (!demande) return res.status(404).json({ error: 'Dossier non trouvé' });

    // Créer une autorisation
    await conn.execute(
      `INSERT INTO autorisations (demande_id, numero_autorisation, type_autorisation, signataire_id, contenu_autorisation)
       VALUES (?, ?, ?, ?, ?)`,
      [
        dossierId,
        `AUT-${dossierId}-${Date.now()}`,
        demande.type,
        req.user.id,
        JSON.stringify(demande.donnees)
      ]
    );
    // Mettre à jour le statut de la demande
    await conn.execute('UPDATE demandes SET statut="CLOTUREE" WHERE id=?', [dossierId]);
    // Historique
    await conn.execute(
      `INSERT INTO suivi_demandes (demande_id, statut_precedent, nouveau_statut, utilisateur_id, action, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dossierId, demande.statut, 'CLOTUREE', req.user.id, 'SIGNATURE_MINISTRE', 'Arrêté signé et dossier archivé']
    );
    // Notification au demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "INFO", ?, 0, NOW())`,
      [demande.utilisateur_id, "Votre demande a été signée et l'autorisation délivrée."]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la signature' });
  }
});

// =================== GESTION DES SIGNATURES DU MINISTRE ===================

// Upload d'une signature du ministre
app.post('/api/ministere/signatures/upload', authMinistre, upload.single('signature'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier de signature fourni' });
    }

    const { type_signature, commentaire } = req.body;
    const conn = await mysql.createConnection(dbConfig);

    // Créer le dossier de signatures s'il n'existe pas
    const signaturesDir = path.join(__dirname, 'uploads', 'signatures', req.user.id.toString());
    if (!fs.existsSync(signaturesDir)) {
      fs.mkdirSync(signaturesDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const extension = path.extname(req.file.originalname);
    const filename = `signature_${type_signature}_${timestamp}${extension}`;
    const filepath = path.join(signaturesDir, filename);

    // Déplacer le fichier
    fs.renameSync(req.file.path, filepath);

    // Sauvegarder en base de données
    const [result] = await conn.execute(
      `INSERT INTO signatures_ministre (utilisateur_id, type_signature, fichier_signature, nom_fichier_original, taille_fichier, mime_type, commentaire)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        type_signature || 'AUTORISATION',
        path.join('signatures', req.user.id.toString(), filename),
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        commentaire || null
      ]
    );

    await conn.end();

    res.json({
      success: true,
      message: 'Signature uploadée avec succès',
      signature_id: result.insertId,
      fichier: filename
    });

  } catch (err) {
    console.error('Erreur upload signature:', err);
    res.status(500).json({ error: 'Erreur lors de l\'upload de la signature' });
  }
});

// Lister les signatures du ministre
app.get('/api/ministere/signatures', authMinistre, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT id, type_signature, nom_fichier_original, taille_fichier, mime_type, statut, date_creation, commentaire
       FROM signatures_ministre 
       WHERE utilisateur_id = ? 
       ORDER BY date_creation DESC`,
      [req.user.id]
    );
    await conn.end();

    res.json({ signatures: rows });
  } catch (err) {
    console.error('Erreur récupération signatures:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des signatures' });
  }
});

// Supprimer une signature
app.delete('/api/ministere/signatures/:id', authMinistre, async (req, res) => {
  try {
    const signatureId = req.params.id;
    const conn = await mysql.createConnection(dbConfig);

    // Vérifier que la signature appartient au ministre
    const [[signature]] = await conn.execute(
      'SELECT fichier_signature FROM signatures_ministre WHERE id = ? AND utilisateur_id = ?',
      [signatureId, req.user.id]
    );

    if (!signature) {
      await conn.end();
      return res.status(404).json({ error: 'Signature non trouvée' });
    }

    // Supprimer le fichier physique
    const filepath = path.join(__dirname, 'uploads', signature.fichier_signature);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Supprimer de la base de données
    await conn.execute('DELETE FROM signatures_ministre WHERE id = ?', [signatureId]);
    await conn.end();

    res.json({ success: true, message: 'Signature supprimée avec succès' });

  } catch (err) {
    console.error('Erreur suppression signature:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de la signature' });
  }
});

// Appliquer une signature à un document
app.post('/api/ministere/signatures/:id/appliquer', authMinistre, async (req, res) => {
  try {
    const { signature_id, demande_id, type_document } = req.body;
    const conn = await mysql.createConnection(dbConfig);

    // Vérifier que la signature appartient au ministre
    const [[signature]] = await conn.execute(
      'SELECT * FROM signatures_ministre WHERE id = ? AND utilisateur_id = ? AND statut = "ACTIVE"',
      [signature_id, req.user.id]
    );

    if (!signature) {
      await conn.end();
      return res.status(404).json({ error: 'Signature non trouvée ou inactive' });
    }

    // Vérifier que la demande existe
    const [[demande]] = await conn.execute(
      'SELECT * FROM demandes WHERE id = ?',
      [demande_id]
    );

    if (!demande) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    // Enregistrer l'application de la signature
    await conn.execute(
      `INSERT INTO signatures_appliquees (signature_id, demande_id, type_document, fichier_document_signee, utilisateur_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        signature_id,
        demande_id,
        type_document,
        `document_signe_${demande_id}_${Date.now()}.pdf`,
        req.user.id
      ]
    );

    await conn.end();

    res.json({
      success: true,
      message: 'Signature appliquée avec succès',
      signature_appliquee_id: result.insertId
    });

  } catch (err) {
    console.error('Erreur application signature:', err);
    res.status(500).json({ error: 'Erreur lors de l\'application de la signature' });
  }
});
// =================== ROUTES PNME ===================

// Middleware auth PNME (role_id = 7)
const authPNME = authRole([7]);

// Login PNME
app.post('/api/login/pnme', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM utilisateurs WHERE email = ? AND role_id = 7 LIMIT 1", [email]
    );
    await conn.end();
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Utilisateur inconnu ou non autorisé' });
    }
    
    const user = rows[0];
    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    
    if (user.statut !== 'ACTIF' || user.email_verifie !== 1) {
      return res.status(403).json({ error: "Veuillez activer votre compte via l'email reçu." });
    }
    
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, nom: user.nom, prenom: user.prenom, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        nom: user.nom, 
        prenom: user.prenom, 
        email: user.email, 
        role_id: user.role_id 
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques PNME
app.get('/api/pnme/stats', authPNME, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    // Statistiques générales
    const [totalStats] = await conn.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'DEPOSEE' THEN 1 ELSE 0 END) as en_attente,
        SUM(CASE WHEN statut = 'VALIDEE_PNME' THEN 1 ELSE 0 END) as validees,
        SUM(CASE WHEN statut = 'REJETEE' THEN 1 ELSE 0 END) as rejetees,
        SUM(CASE WHEN statut IN ('EN_COURS_PNME', 'TRANSMISE_PNME') THEN 1 ELSE 0 END) as en_cours
       FROM demandes WHERE type = 'pnme'`
    );
    // Évolution mensuelle
    const [monthlyStats] = await conn.execute(
      `SELECT 
        MONTH(created_at) as mois,
        YEAR(created_at) as annee,
        COUNT(*) as demandes,
        SUM(CASE WHEN statut = 'VALIDEE_PNME' THEN 1 ELSE 0 END) as validees
       FROM demandes 
       WHERE type = 'pnme' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY YEAR(created_at), MONTH(created_at)
       ORDER BY annee, mois`
    );
    // Répartition par secteur
    const [secteurStats] = await conn.execute(
      `SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(donnees, '$.secteur_activite')) as secteur,
        COUNT(*) as count
       FROM demandes 
       WHERE type = 'pnme' AND JSON_EXTRACT(donnees, '$.secteur_activite') IS NOT NULL
       GROUP BY secteur
       ORDER BY count DESC
       LIMIT 10`
    );
    await conn.end();
    res.json({
      stats: totalStats[0],
      evolution: monthlyStats,
      secteurs: secteurStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
});

// Liste des demandes PNME
app.get('/api/pnme/demandes', authPNME, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', statut = '', secteur = '' } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = "d.type = 'pnme'";
    let params = [];
    if (search) {
      whereClause += " AND (d.reference LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (statut) {
      whereClause += " AND d.statut = ?";
      params.push(statut);
    }
    if (secteur) {
      whereClause += " AND JSON_EXTRACT(d.donnees, '$.secteur_activite') = ?";
      params.push(secteur);
    }
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT 
        d.id, d.reference, d.statut, d.created_at, d.donnees,
        u.nom, u.prenom, u.email, u.telephone, u.registre_commerce
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [countResult] = await conn.execute(
      `SELECT COUNT(*) as total FROM demandes d 
       JOIN utilisateurs u ON d.utilisateur_id = u.id 
       WHERE ${whereClause}`,
      params
    );
    await conn.end();
    const demandes = rows.map(row => ({
      ...row,
      donnees: row.donnees ? JSON.parse(row.donnees) : {},
      demandeur: `${row.nom} ${row.prenom}`
    }));
    res.json({
      demandes,
      total: countResult[0].total,
      page: parseInt(page),
      totalPages: Math.ceil(countResult[0].total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes' });
  }
});

// Détails d'une demande PNME
app.get('/api/pnme/demandes/:id', authPNME, async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT 
        d.*, 
        u.nom, u.prenom, u.email, u.telephone, u.registre_commerce, u.nif, u.adresse
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.id = ? AND d.type = 'pnme'`,
      [id]
    );
    if (rows.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    const demande = rows[0];
    demande.donnees = demande.donnees ? JSON.parse(demande.donnees) : {};
    demande.fichiers = demande.fichiers ? JSON.parse(demande.fichiers) : {};
    await conn.end();
    res.json({ demande });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des détails' });
  }
});

// =================== ENDPOINTS DRMNE/PMNE ===================
// Ces endpoints couvrent tous les scénarios PMNE/DRMNE décrits dans les TDR

// GET /api/drmne/demandes - Liste des demandes PMNE avec filtres
app.get('/api/drmne/demandes', authDRMNE, async (req, res) => {
  try {
    const { statut = 'TOUTES', page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = "d.type = 'pnme'";
    let params = [];
    
    if (statut && statut !== 'TOUTES') {
      whereClause += " AND d.statut = ?";
      params.push(statut);
    }
    
    if (search) {
      whereClause += " AND (d.reference LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT 
        d.id, d.reference, d.statut, d.created_at, d.updated_at,
        u.nom AS demandeur_nom, u.prenom AS demandeur_prenom, 
        u.email AS demandeur_email, u.telephone AS demandeur_telephone
       FROM demandes d 
       JOIN utilisateurs u ON u.id = d.utilisateur_id
       WHERE ${whereClause} 
       ORDER BY d.updated_at DESC, d.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    
    const [countResult] = await conn.execute(
      `SELECT COUNT(*) as total FROM demandes d 
       JOIN utilisateurs u ON u.id = d.utilisateur_id 
       WHERE ${whereClause}`,
      params
    );
    
    await conn.end();
    
    const demandes = rows.map(row => ({
      ...row,
      demandeur: `${row.demandeur_nom} ${row.demandeur_prenom}`
    }));
    
    res.json({ 
      demandes, 
      total: countResult[0].total,
      page: parseInt(page),
      totalPages: Math.ceil(countResult[0].total / limit)
    });
  } catch (e) { 
    console.error('Erreur DRMNE demandes:', e);
    res.status(500).json({ error: 'Erreur serveur' }); 
  }
});

// GET /api/drmne/demandes/:id - Détails d'une demande PMNE
app.get('/api/drmne/demandes/:id', authDRMNE, async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT 
        d.*, 
        u.nom, u.prenom, u.email, u.telephone, u.registre_commerce, u.nif, u.adresse
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.id = ? AND d.type = 'pnme'`,
      [id]
    );
    
    if (rows.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    const demande = rows[0];
    demande.donnees = demande.donnees ? JSON.parse(demande.donnees) : {};
    demande.fichiers = demande.fichiers ? JSON.parse(demande.fichiers) : {};
    
    await conn.end();
    res.json({ demande });
  } catch (e) {
    console.error('Erreur DRMNE détails:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/drmne/demandes/:id/demander-complement - Demander des pièces complémentaires
app.post('/api/drmne/demandes/:id/demander-complement', authDRMNE, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body || {};
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe et est de type PMNE
    const [demandeCheck] = await conn.execute(
      'SELECT id, statut FROM demandes WHERE id = ? AND type = ?',
      [id, 'pnme']
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    // Mettre à jour le statut
    await conn.execute(
      'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
      ['PIECES_MANQUANTES', id]
    );
    
    // Enregistrer l'action dans le suivi
    await conn.execute(
      'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
      [id, req.user.id, 'DEMANDER_COMPLEMENT_DRMNE', message || 'Pièces complémentaires demandées par la DRMNE']
    );
    
    await conn.end();
    
    // TODO: Envoyer notification au demandeur
    // await sendNotification(demande.utilisateur_id, 'COMPLEMENT_DEMANDE', { demande_id: id, message });
    
    res.json({ 
      success: true, 
      message: 'Complément demandé avec succès',
      statut: 'PIECES_MANQUANTES'
    });
  } catch (e) {
    console.error('Erreur DRMNE demander-complement:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/drmne/demandes/:id/valider - Valider une demande PMNE
app.post('/api/drmne/demandes/:id/valider', authDRMNE, async (req, res) => {
  const { id } = req.params;
  const { observations } = req.body || {};
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe et est de type PMNE
    const [demandeCheck] = await conn.execute(
      'SELECT id, statut FROM demandes WHERE id = ? AND type = ?',
      [id, 'pnme']
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    // Mettre à jour le statut selon le circuit (vers MMI ou DGI)
    const nextStatut = 'EN_ATTENTE_SIGNATURE'; // ou 'TRANSMISE_AU_MINISTRE' selon ton flow
    
    await conn.execute(
      'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
      [nextStatut, id]
    );
    
    // Enregistrer l'action dans le suivi
    await conn.execute(
      'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
      [id, req.user.id, 'VALIDER_DRMNE', observations || 'Demande validée par la DRMNE']
    );
    
    await conn.end();
    
    // TODO: Notifier l'acteur suivant (Ministère ou DGI)
    // await sendNotification(nextActorId, 'DEMANDE_VALIDEE_DRMNE', { demande_id: id });
    
    res.json({ 
      success: true, 
      message: 'Demande validée avec succès',
      statut: nextStatut
    });
  } catch (e) {
    console.error('Erreur DRMNE valider:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/drmne/demandes/:id/rejeter - Rejeter une demande PMNE
app.post('/api/drmne/demandes/:id/rejeter', authDRMNE, async (req, res) => {
  const { id } = req.params;
  const { motif } = req.body || {};
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe et est de type PMNE
    const [demandeCheck] = await conn.execute(
      'SELECT id, statut FROM demandes WHERE id = ? AND type = ?',
      [id, 'pnme']
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    // Mettre à jour le statut et ajouter le motif de rejet
    await conn.execute(
      'UPDATE demandes SET statut = ?, motif_rejet = ?, updated_at = NOW() WHERE id = ?',
      ['REJETEE', motif || 'Rejeté par la DRMNE', id]
    );
    
    // Enregistrer l'action dans le suivi
    await conn.execute(
      'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
      [id, req.user.id, 'REJETER_DRMNE', motif || 'Demande rejetée par la DRMNE']
    );
    
    await conn.end();
    
    // TODO: Notifier le demandeur du rejet
    // await sendNotification(demande.utilisateur_id, 'DEMANDE_REJETEE', { demande_id: id, motif });
    
    res.json({ 
      success: true, 
      message: 'Demande rejetée avec succès',
      statut: 'REJETEE',
      motif: motif || 'Rejeté par la DRMNE'
    });
  } catch (e) {
    console.error('Erreur DRMNE rejeter:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/drmne/demandes/:id/transmettre - Transmettre vers MMI ou DGI
app.post('/api/drmne/demandes/:id/transmettre', authDRMNE, async (req, res) => {
  const { id } = req.params;
  const { cible, observations } = req.body || {}; // 'MMI' ou 'DGI'
  
  if (!cible || !['MMI', 'DGI'].includes(cible)) {
    return res.status(400).json({ error: 'Cible de transmission invalide (MMI ou DGI)' });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe et est de type PMNE
    const [demandeCheck] = await conn.execute(
      'SELECT id, statut FROM demandes WHERE id = ? AND type = ?',
      [id, 'pnme']
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    // Déterminer le prochain statut selon la cible
    const nextStatut = cible === 'DGI' ? 'TRANSMISE_AU_DGI' : 'TRANSMISE_AU_MINISTRE';
    
    // Mettre à jour le statut
    await conn.execute(
      'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
      [nextStatut, id]
    );
    
    // Enregistrer l'action dans le suivi
    await conn.execute(
      'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
      [id, req.user.id, 'TRANSMETTRE_DRMNE', `Transmise vers ${cible}${observations ? ': ' + observations : ''}`]
    );
    
    await conn.end();
    
    // TODO: Notifier l'acteur ciblé
    // await sendNotification(nextActorId, 'DEMANDE_TRANSMISE_DRMNE', { demande_id: id, cible });
    
    res.json({ 
      success: true, 
      message: `Demande transmise vers ${cible} avec succès`,
      statut: nextStatut,
      cible
    });
  } catch (e) {
    console.error('Erreur DRMNE transmettre:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/drmne/demandes/:id/historique - Historique complet d'une demande PMNE
app.get('/api/drmne/demandes/:id/historique', authDRMNE, async (req, res) => {
  const { id } = req.params;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe et est de type PMNE
    const [demandeCheck] = await conn.execute(
      'SELECT id FROM demandes WHERE id = ? AND type = ?',
      [id, 'pnme']
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    // Récupérer l'historique complet
    const [rows] = await conn.execute(
      `SELECT 
        s.*, 
        u.nom as utilisateur_nom, 
        u.prenom as utilisateur_prenom,
        u.role_id
       FROM suivi_demandes s 
       LEFT JOIN utilisateurs u ON u.id = s.utilisateur_id
       WHERE s.demande_id = ? 
       ORDER BY s.date_action DESC, s.id DESC`,
      [id]
    );
    
    await conn.end();
    
    // Formater l'historique avec les informations utilisateur
    const historique = rows.map(row => ({
      ...row,
      utilisateur: row.utilisateur_id ? `${row.utilisateur_nom} ${row.utilisateur_prenom}` : 'Système',
      role: row.role_id ? getRoleName(row.role_id) : 'Système'
    }));
    
    res.json({ historique });
  } catch (e) {
    console.error('Erreur DRMNE historique:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction utilitaire pour obtenir le nom du rôle
function getRoleName(roleId) {
  const roles = {
    1: 'Administrateur',
    2: 'Secrétariat Central',
    3: 'Secrétariat Général',
    4: 'Chef de Service',
    5: 'DDPI',
    6: 'DGI',
    7: 'Commission',
    8: 'Comité Technique',
    9: 'Ministère',
    11: 'DRMNE/PMNE'
  };
  return roles[roleId] || 'Inconnu';
}

// Validation d'une demande PNME
app.post('/api/pnme/demandes/:id/valider', authPNME, async (req, res) => {
  const { id } = req.params;
  const { commentaire, montant_accorde } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute(
      'SELECT statut, utilisateur_id, donnees FROM demandes WHERE id = ? AND type = "pnme"',
      [id]
    );
    if (demandeResult.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande PNME non trouvée' });
    }
    const demande = demandeResult[0];
    const oldStatus = demande.statut;
    // Mettre à jour les données avec le commentaire et le montant
    const donnees = demande.donnees ? JSON.parse(demande.donnees) : {};
    donnees.commentaire_pnme = commentaire;
    donnees.montant_accorde = montant_accorde;
    donnees.date_validation = new Date().toISOString();
    await conn.execute(
      `UPDATE demandes 
       SET statut = 'VALIDEE_PNME', 
           donnees = ?, 
           updated_at = NOW() 
       WHERE id = ?`,
      [JSON.stringify(donnees), id]
    );
    // Historique
    await enregistrerSuivi(
      conn, 
      id, 
      req.user.id, 
      'VALIDATION_PNME', 
      `Demande validée par PNME. ${commentaire || ''}`, 
      oldStatus, 
      'VALIDEE_PNME'
    );
    // Notification au demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "VALIDATION_PNME", ?, 0, NOW())`,
      [
        demande.utilisateur_id, 
        `Votre demande PNME a été validée. Montant accordé: ${montant_accorde || 'Non spécifié'}`
      ]
    );
    await conn.end();
    res.json({ success: true, message: 'Demande validée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la validation' });
  }
});

// Rejet d'une demande PNME
app.post('/api/pnme/demandes/:id/rejeter', authPNME, async (req, res) => {
  const { id } = req.params;
  const { motif } = req.body;
  if (!motif) {
    return res.status(400).json({ error: 'Motif de rejet obligatoire' });
  }
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute(
      'SELECT statut, utilisateur_id FROM demandes WHERE id = ? AND type = "pnme"',
      [id]
    );
    if (demandeResult.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande PNME non trouvée' });
    }
    const demande = demandeResult[0];
    const oldStatus = demande.statut;
    await conn.execute(
      `UPDATE demandes 
       SET statut = 'REJETEE', 
           motif_rejet = ?, 
           updated_at = NOW() 
       WHERE id = ?`,
      [motif, id]
    );
    // Historique
    await enregistrerSuivi(
      conn, 
      id, 
      req.user.id, 
      'REJET_PNME', 
      `Demande rejetée par PNME. Motif: ${motif}`, 
      oldStatus, 
      'REJETEE'
    );
    // Notification au demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "REJET_PNME", ?, 0, NOW())`,
      [demande.utilisateur_id, `Votre demande PNME a été rejetée. Motif: ${motif}`]
    );
    await conn.end();
    res.json({ success: true, message: 'Demande rejetée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
});

// Demander des compléments d'informations
app.post('/api/pnme/demandes/:id/complement', authPNME, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message obligatoire' });
  }
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [demandeResult] = await conn.execute(
      'SELECT statut, utilisateur_id FROM demandes WHERE id = ? AND type = "pnme"',
      [id]
    );
    if (demandeResult.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande PNME non trouvée' });
    }
    const demande = demandeResult[0];
    const oldStatus = demande.statut;
    await conn.execute(
      `UPDATE demandes 
       SET statut = 'COMPLEMENT_REQUIS_PNME', 
           updated_at = NOW() 
       WHERE id = ?`,
      [id]
    );
    // Historique
    await enregistrerSuivi(
      conn, 
      id, 
      req.user.id, 
      'COMPLEMENT_PNME', 
      `Complément d'informations demandé: ${message}`, 
      oldStatus, 
      'COMPLEMENT_REQUIS_PNME'
    );
    // Notification au demandeur
    await conn.execute(
      `INSERT INTO notifications (utilisateur_id, type, message, lu, created_at)
       VALUES (?, "COMPLEMENT_PNME", ?, 0, NOW())`,
      [demande.utilisateur_id, `Complément d'informations requis pour votre demande PNME: ${message}`]
    );
    await conn.end();
    res.json({ success: true, message: 'Demande de complément envoyée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la demande de complément' });
  }
});

// Historique d'une demande PNME
app.get('/api/pnme/demandes/:id/historique', authPNME, async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT 
        s.id, s.action, s.message, s.date_action, s.statut_precedent, s.nouveau_statut,
        u.nom AS utilisateur_nom, u.prenom AS utilisateur_prenom
       FROM suivi_demandes s
       LEFT JOIN utilisateurs u ON s.utilisateur_id = u.id
       WHERE s.demande_id = ?
       ORDER BY s.date_action DESC`,
      [id]
    );
    await conn.end();
    const historique = rows.map(h => ({
      ...h,
      utilisateur: h.utilisateur_nom ? `${h.utilisateur_nom} ${h.utilisateur_prenom}` : 'Système'
    }));
    res.json({ historique });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
});

// Notifications PNME
app.get('/api/pnme/notifications', authPNME, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT id, message AS title, message, created_at AS date, lu AS isNew
       FROM notifications 
       WHERE utilisateur_id = ? 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [req.user.id]
    );
    await conn.end();
    res.json({ 
      notifications: rows.map(n => ({ 
        ...n, 
        isNew: n.isNew === 0 
      })) 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
});

// Marquer une notification comme lue
app.post('/api/pnme/notifications/:id/marquer-lu', authPNME, async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      'UPDATE notifications SET lu = 1 WHERE id = ? AND utilisateur_id = ?',
      [id, req.user.id]
    );
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Génération de rapport PNME
app.get('/api/pnme/rapport', authPNME, async (req, res) => {
  try {
    const { dateDebut, dateFin, format = 'json' } = req.query;
    const conn = await mysql.createConnection(dbConfig);
    let whereClause = "d.type = 'pnme'";
    let params = [];
    if (dateDebut && dateFin) {
      whereClause += " AND d.created_at BETWEEN ? AND ?";
      params.push(dateDebut, dateFin);
    }
    const [demandes] = await conn.execute(
      `SELECT 
        d.reference, d.statut, d.created_at, d.donnees,
        u.nom, u.prenom, u.email, u.registre_commerce
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE ${whereClause}
       ORDER BY d.created_at DESC`,
      params
    );
    const [stats] = await conn.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'VALIDEE_PNME' THEN 1 ELSE 0 END) as validees,
        SUM(CASE WHEN statut = 'REJETEE' THEN 1 ELSE 0 END) as rejetees,
        SUM(CASE WHEN statut IN ('DEPOSEE', 'EN_COURS_PNME') THEN 1 ELSE 0 END) as en_cours
       FROM demandes d
       WHERE ${whereClause}`,
      params
    );
    await conn.end();
    if (format === 'csv') {
      // Génération CSV
      const csvHeader = 'Reference,Entreprise,Representant,Email,Statut,Date Depot,Secteur\n';
      const csvContent = demandes.map(d => {
        const donnees = d.donnees ? JSON.parse(d.donnees) : {};
        return `${d.reference},"${donnees.raison_sociale || 'N/A'}","${d.nom} ${d.prenom}",${d.email},${d.statut},${d.created_at},"${donnees.secteur_activite || 'N/A'}"`;
      }).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="rapport_pnme.csv"');
      res.send(csvHeader + csvContent);
    } else {
      res.json({
        demandes: demandes.map(d => ({
          ...d,
          donnees: d.donnees ? JSON.parse(d.donnees) : {}
        })),
        statistiques: stats[0]
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
  }
});

// Export des entreprises bénéficiaires
app.get('/api/pnme/beneficiaires', authPNME, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT 
        d.reference, d.donnees, d.created_at,
        u.nom, u.prenom, u.email, u.telephone, u.registre_commerce
       FROM demandes d
       JOIN utilisateurs u ON d.utilisateur_id = u.id
       WHERE d.type = 'pnme' AND d.statut = 'VALIDEE_PNME'
       ORDER BY d.created_at DESC`
    );
    await conn.end();
    const beneficiaires = rows.map(row => {
      const donnees = row.donnees ? JSON.parse(row.donnees) : {};
      return {
        reference: row.reference,
        raison_sociale: donnees.raison_sociale || 'N/A',
        representant: `${row.nom} ${row.prenom}`,
        email: row.email,
        telephone: row.telephone,
        registre_commerce: row.registre_commerce,
        secteur: donnees.secteur_activite || 'N/A',
        montant_accorde: donnees.montant_accorde || 'N/A',
        date_validation: donnees.date_validation || row.created_at
      };
    });
    res.json({ beneficiaires });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des bénéficiaires' });
  }
});
// =================== FIN ROUTES PNME ===================

// =================== ROUTES MINISTRE ===================
// Notifications du ministre
app.get('/api/ministere/notifications', authMinistre, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [notifications] = await conn.execute(`
      SELECT n.*, d.reference, d.type, u.nom as demandeur_nom, u.prenom as demandeur_prenom
      FROM notifications n
      LEFT JOIN demandes d ON n.demande_id = d.id
      LEFT JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE n.type IN ('DGI_TRANSMISSION', 'AUTORISATION_SIGNEE')
      ORDER BY n.created_at DESC
      LIMIT 50
    `);
    await conn.end();
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// Dossiers transmis par la DGI
app.get('/api/ministere/dossiers', authMinistre, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [dossiers] = await conn.execute(`
      SELECT d.*, u.nom as demandeur_nom, u.prenom as demandeur_prenom, u.email as demandeur_email,
             u.telephone as demandeur_telephone, u.adresse as demandeur_adresse
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.statut = 'TRANSMISE_AU_MINISTRE'
      ORDER BY d.created_at DESC
    `);
    await conn.end();
    res.json({ dossiers });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// Détails d'un dossier
app.get('/api/ministere/dossiers/:id', authMinistre, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [dossier] = await conn.execute(`
      SELECT d.*, u.nom as demandeur_nom, u.prenom as demandeur_prenom, u.email as demandeur_email,
             u.telephone as demandeur_telephone, u.adresse as demandeur_adresse
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.id = ? AND d.statut = 'TRANSMISE_AU_MINISTRE'
    `, [req.params.id]);
    
    if (dossier.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Dossier non trouvé" });
    }
    
    await conn.end();
    res.json({ dossier: dossier[0] });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// Signer électroniquement un dossier
app.post('/api/ministere/dossiers/:id/signer', authMinistre, async (req, res) => {
  const { signature_type, signature_data } = req.body;
  const dossierId = req.params.id;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que le dossier existe et est en attente de signature
    const [dossier] = await conn.execute(`
      SELECT d.*, u.nom as demandeur_nom, u.prenom as demandeur_prenom, u.email as demandeur_email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.id = ? AND d.statut = 'TRANSMISE_AU_MINISTRE'
    `, [dossierId]);
    
    if (dossier.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Dossier non trouvé ou déjà traité" });
    }
    
    const dossierData = dossier[0];
    
    // Générer le PDF d'autorisation
    const pdfPath = await generateAutorisationPDF(dossierData, req.user, signature_type, signature_data);
    
    // Mettre à jour le statut du dossier
    await conn.execute(
      'UPDATE demandes SET statut = ?, autorisation_pdf = ?, updated_at = NOW() WHERE id = ?',
      ['AUTORISATION_SIGNEE', pdfPath, dossierId]
    );
    
    // Enregistrer l'action dans le suivi
    await enregistrerSuivi(
      conn, dossierId, req.user.id, 
      'SIGNATURE_AUTORISATION', 
      'Autorisation signée par le ministre et est maintenant disponible pour téléchargement.', 
      'TRANSMISE_AU_MINISTRE', 'AUTORISATION_SIGNEE'
    );
    
    // Créer une notification pour le demandeur
    await conn.execute(
      'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, ?, ?, 0, NOW())',
      [dossierData.utilisateur_id, 'AUTORISATION_SIGNEE', 
       `🎉 Félicitations ! Votre autorisation ${dossierData.reference} a été signée par le ministre et est maintenant disponible pour téléchargement.`]
    );
    
    await conn.end();
    
    res.json({ 
      success: true, 
      message: "Autorisation signée avec succès",
      pdfPath: pdfPath
    });
    
  } catch (err) {
    console.error('Erreur lors de la signature:', err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

// Signer électroniquement un dossier
app.post('/api/ministere/dossiers/:id/signer', authMinistre, async (req, res) => {
  const { signature_type, signature_data } = req.body;
  const dossierId = req.params.id;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que le dossier existe et est en attente de signature
        const [dossier] = await conn.execute(`
      SELECT d.*, u.nom as demandeur_nom, u.prenom as demandeur_prenom, u.email as demandeur_email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.id = ? AND d.statut = 'TRANSMISE_AU_MINISTRE'
    `, [dossierId]);
    
    if (dossier.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Dossier non trouvé" });
    }
    
    // Mettre à jour le statut
    await conn.execute(
      'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
      ['AUTORISATION_SIGNEE', dossierId]
    );
    
    // Enregistrer dans l'historique
    await enregistrerSuivi(
      conn, 
      dossierId, 
      req.user.id, 
      'SIGNATURE_AUTORISATION', 
      'Autorisation signée électroniquement par le ministre et est maintenant disponible pour téléchargement.', 
      'TRANSMISE_AU_MINISTRE', 
      'AUTORISATION_SIGNEE'
    );
    
    // Notification au demandeur
    await conn.execute(
      'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "AUTORISATION_SIGNEE", ?, 0, NOW())',
      [
        dossier[0].utilisateur_id,
        `Votre autorisation ${dossier[0].reference} a été signée par le ministre et est maintenant disponible pour téléchargement.`
      ]
    );
    
    await conn.end();
    
    res.json({ 
      success: true, 
      message: "Autorisation signée avec succès"
    });
    
  } catch (err) {
    if (conn) await conn.end();
    console.error('Erreur lors de la signature:', err);
    res.status(500).json({ error: "Erreur serveur lors de la signature" });
  }
});

// =================== FIN ROUTES MINISTRE ===================

// =================== ENDPOINTS POUR VARIANTES ET FONCTIONNALITÉS MANQUANTES ===================

// POST /api/demandes/:id/reattribuer - Ré-attribution de dossier
app.post('/api/demandes/:id/reattribuer', authRole([1, 4, 6, 11]), async (req, res) => {
  const { id } = req.params;
  const { nouveau_service, justification } = req.body;
  
  if (!nouveau_service || !justification) {
    return res.status(400).json({ error: 'Nouveau service et justification requis' });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe
    const [demandeCheck] = await conn.execute(
      'SELECT id, statut, utilisateur_id FROM demandes WHERE id = ?',
      [id]
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    const demande = demandeCheck[0];
    
    // Enregistrer la ré-attribution dans le suivi
    try {
      await conn.execute(
        'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
        [id, req.user.id, 'REATTRIBUTION', `Ré-attribuée vers ${nouveau_service}: ${justification}`]
      );
    } catch (suiviError) {
      console.log('⚠️ [reattribuer] Erreur suivi_demandes, utilisation de enregistrerSuivi:', suiviError.message);
      // Fallback vers enregistrerSuivi si la table suivi_demandes n'existe pas
      await enregistrerSuivi(conn, id, req.user.id, 'REATTRIBUTION', `Ré-attribuée vers ${nouveau_service}: ${justification}`, null, nouveauStatut);
    }
    
    // Mettre à jour le statut selon le nouveau service
    let nouveauStatut;
    switch (nouveau_service) {
      case 'DGI':
        nouveauStatut = 'TRANSMISE_AU_DGI';
        break;
      case 'DDPI':
        nouveauStatut = 'TRANSMISE_AU_DDPI';
        break;
      case 'COMMISSION':
        nouveauStatut = 'EN_COURS_COMMISSION';
        break;
      case 'MINISTERE':
        nouveauStatut = 'TRANSMISE_AU_MINISTRE';
        break;
      default:
        nouveauStatut = 'EN_COURS_TRAITEMENT';
    }
    
    await conn.execute(
      'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
      [nouveauStatut, id]
    );
    
    await conn.end();
    
    // TODO: Notifier le nouveau service
    // await sendNotification(nouveauServiceId, 'DOSSIER_REATTRIBUE', { demande_id: id, ancien_service: req.user.role_id });
    
    res.json({ 
      success: true, 
      message: `Dossier ré-attribué vers ${nouveau_service} avec succès`,
      nouveau_statut: nouveauStatut
    });
  } catch (e) {
    console.error('Erreur ré-attribution:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/demandes/:id/retour-etape-precedente - Retour à l'étape précédente
app.post('/api/demandes/:id/retour-etape-precedente', authRole([4, 6, 11, 9]), async (req, res) => {
  const { id } = req.params;
  const { etape_cible, justification } = req.body;
  
  if (!etape_cible || !justification) {
    return res.status(400).json({ error: 'Étape cible et justification requises' });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe
    const [demandeCheck] = await conn.execute(
      'SELECT id, statut FROM demandes WHERE id = ?',
      [id]
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    // Déterminer le statut de retour selon l'étape cible
    let statutRetour;
    switch (etape_cible) {
      case 'SECRETARIAT_CENTRAL':
        statutRetour = 'DEPOSEE';
        break;
      case 'SECRETARIAT_GENERAL':
        statutRetour = 'TRANSMISE_AU_SG';
        break;
      case 'DGI':
        statutRetour = 'TRANSMISE_AU_DGI';
        break;
      case 'DDPI':
        statutRetour = 'TRANSMISE_AU_DDPI';
        break;
      default:
        statutRetour = 'EN_COURS_TRAITEMENT';
    }
    
    // Mettre à jour le statut
    await conn.execute(
      'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
      [statutRetour, id]
    );
    
    // Enregistrer le retour dans le suivi
    await conn.execute(
      'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
      [id, req.user.id, 'RETOUR_ETAPE', `Retour à ${etape_cible}: ${justification}`]
    );
    
    await conn.end();
    
    // TODO: Notifier l'acteur de l'étape cible
    // await sendNotification(etapeCibleId, 'DOSSIER_RETOURNE', { demande_id: id, justification });
    
    res.json({ 
      success: true, 
      message: `Dossier retourné à ${etape_cible} avec succès`,
      nouveau_statut: statutRetour
    });
  } catch (e) {
    console.error('Erreur retour étape:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/demandes/:id/relancer - Relance automatique
app.post('/api/demandes/:id/relancer', authRole([2, 4, 6, 11]), async (req, res) => {
  const { id } = req.params;
  const { type_relance, message } = req.body;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe
    const [demandeCheck] = await conn.execute(
      'SELECT id, statut, utilisateur_id FROM demandes WHERE id = ?',
      [id]
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    const demande = demandeCheck[0];
    
    // Enregistrer la relance
    await conn.execute(
      'INSERT INTO relances (demande_id, type_relance, message, date_relance, utilisateur_id) VALUES (?,?,?,NOW(),?)',
      [id, type_relance || 'AUTOMATIQUE', message || 'Relance automatique', req.user.id]
    );
    
    // Enregistrer dans le suivi
    await conn.execute(
      'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
      [id, req.user.id, 'RELANCE', `Relance ${type_relance || 'automatique'}: ${message || 'Relance automatique'}`]
    );
    
    await conn.end();
    
    // TODO: Envoyer notification/email de relance
    // await sendNotification(demande.utilisateur_id, 'RELANCE_DEMANDE', { demande_id: id, type_relance, message });
    
    res.json({ 
      success: true, 
      message: 'Relance envoyée avec succès',
      type_relance: type_relance || 'AUTOMATIQUE'
    });
  } catch (e) {
    console.error('Erreur relance:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/demandes/:id/cloturer - Clôture et archivage
app.post('/api/demandes/:id/cloturer', authRole([1, 6, 9]), async (req, res) => {
  const { id } = req.params;
  const { motif_cloture } = req.body;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe et peut être clôturée
    const [demandeCheck] = await conn.execute(
      'SELECT id, statut FROM demandes WHERE id = ? AND statut NOT IN ("CLOTUREE", "ARCHIVEE")',
      [id]
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(400).json({ error: 'Demande non trouvée ou déjà clôturée' });
    }
    
    // Mettre à jour le statut
    await conn.execute(
      'UPDATE demandes SET statut = ?, archive = 1, updated_at = NOW() WHERE id = ?',
      ['CLOTUREE', id]
    );
    
    // Enregistrer la clôture dans le suivi
    await conn.execute(
      'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
      [id, req.user.id, 'CLOTURE', `Demande clôturée: ${motif_cloture || 'Clôture automatique'}`]
    );
    
    await conn.end();
    
    res.json({ 
      success: true, 
      message: 'Demande clôturée et archivée avec succès',
      statut: 'CLOTUREE'
    });
  } catch (e) {
    console.error('Erreur clôture:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/demandes/:id/relances - Historique des relances
app.get('/api/demandes/:id/relances', authRole([1, 2, 4, 6, 11]), async (req, res) => {
  const { id } = req.params;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    const [rows] = await conn.execute(
      `SELECT r.*, u.nom, u.prenom 
       FROM relances r 
       LEFT JOIN utilisateurs u ON u.id = r.utilisateur_id
       WHERE r.demande_id = ? 
       ORDER BY r.date_relance DESC`,
      [id]
    );
    
    await conn.end();
    
    const relances = rows.map(row => ({
      ...row,
      utilisateur: row.utilisateur_id ? `${row.nom} ${row.prenom}` : 'Système'
    }));
    
    res.json({ relances });
  } catch (e) {
    console.error('Erreur relances:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/demandes/:id/avis-multisectoriel - Demande d'avis multisectoriel
app.post('/api/demandes/:id/avis-multisectoriel', authRole([6, 7, 8]), async (req, res) => {
  const { id } = req.params;
  const { commission_cible, motif, delai } = req.body;
  
  if (!commission_cible || !motif) {
    return res.status(400).json({ error: 'Commission cible et motif requis' });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier que la demande existe
    const [demandeCheck] = await conn.execute(
      'SELECT id, statut FROM demandes WHERE id = ?',
      [id]
    );
    
    if (demandeCheck.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    // Mettre à jour le statut
    const nouveauStatut = commission_cible === 'COMMISSION_MULTISECTORIELLE' ? 'EN_COURS_COMMISSION' : 'EN_COURS_COMITE';
    
    await conn.execute(
      'UPDATE demandes SET statut = ?, updated_at = NOW() WHERE id = ?',
      [nouveauStatut, id]
    );
    
    // Enregistrer la demande d'avis
    await conn.execute(
      'INSERT INTO suivi_demandes (demande_id, utilisateur_id, action, message, date_action) VALUES (?,?,?,?,NOW())',
      [id, req.user.id, 'DEMANDE_AVIS', `Avis demandé à ${commission_cible}: ${motif}`]
    );
    
    await conn.end();
    
    // TODO: Notifier la commission/comité
    // await sendNotification(commissionId, 'DEMANDE_AVIS_MULTISECTORIEL', { demande_id: id, motif, delai });
    
    res.json({ 
      success: true, 
      message: `Avis demandé à ${commission_cible} avec succès`,
      nouveau_statut: nouveauStatut
    });
  } catch (e) {
    console.error('Erreur avis multisectoriel:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =================== ENDPOINTS DE NOTIFICATION AVANCÉS ===================

// POST /api/notifications/envoyer - Envoi de notification personnalisée
app.post('/api/notifications/envoyer', authRole([1, 2, 4, 6, 11]), async (req, res) => {
  const { destinataires, type, message, donnees_supplementaires } = req.body;
  
  if (!destinataires || !type || !message) {
    return res.status(400).json({ error: 'Destinataires, type et message requis' });
  }
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    const notifications = [];
    for (const destinataireId of destinataires) {
      await conn.execute(
        'INSERT INTO notifications (utilisateur_id, type, message, donnees_supplementaires, lu, created_at) VALUES (?,?,?,?,0,NOW())',
        [destinataireId, type, message, donnees_supplementaires ? JSON.stringify(donnees_supplementaires) : null]
      );
      notifications.push(destinataireId);
    }
    
    await conn.end();
    
    res.json({ 
      success: true, 
      message: `${notifications.length} notification(s) envoyée(s) avec succès`,
      notifications_envoyees: notifications
    });
  } catch (e) {
    console.error('Erreur envoi notifications:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/notifications/types - Types de notifications disponibles
app.get('/api/notifications/types', authRole([1, 2, 4, 6, 11]), async (req, res) => {
  try {
    const types = [
      'COMPLEMENT_DEMANDE',
      'DEMANDE_VALIDEE',
      'DEMANDE_REJETEE',
      'PIECES_MANQUANTES',
      'TRANSMISSION_DOSSIER',
      'RETOUR_ETAPE',
      'REATTRIBUTION',
      'RELANCE',
      'CLOTURE',
      'AVIS_MULTISECTORIEL',
      'SIGNATURE_AUTORISATION'
    ];
    
    res.json({ types });
  } catch (e) {
    console.error('Erreur types notifications:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =================== ENDPOINTS DE TÉLÉCHARGEMENT PAR RÉFÉRENCE ===================

// Endpoint pour télécharger l'accusé de réception par référence
app.get('/api/download-accuse/:reference', async (req, res) => {
  const { reference } = req.params;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Récupérer la demande par référence
    const [[demande]] = await conn.execute(
      'SELECT d.*, u.id as user_id FROM demandes d JOIN utilisateurs u ON d.utilisateur_id = u.id WHERE d.reference = ?',
      [reference]
    );
    
    if (!demande) {
      await conn.end();
      return res.status(404).json({ error: "Demande non trouvée" });
    }
    
    if (!demande.fichier_accuse) {
      await conn.end();
      return res.status(404).json({ error: "Aucun accusé de réception disponible pour cette demande" });
    }
    
    await conn.end();
    
    // Construire le chemin complet du fichier
    const filePath = path.join(__dirname, 'uploads', demande.fichier_accuse);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Fichier d'accusé de réception introuvable" });
    }
    
    // Envoyer le fichier
    res.download(filePath, `accuse_reception_${demande.reference}.pdf`);
    
  } catch (err) {
    console.error('Erreur lors du téléchargement de l\'accusé:', err);
    res.status(500).json({ error: "Erreur serveur lors du téléchargement" });
  }
});

// Endpoint pour télécharger l'autorisation par référence
app.get('/api/download-autorisation/:reference', async (req, res) => {
  const { reference } = req.params;
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Récupérer la demande par référence
    const [[demande]] = await conn.execute(
      'SELECT d.*, u.id as user_id FROM demandes d JOIN utilisateurs u ON d.utilisateur_id = u.id WHERE d.reference = ?',
      [reference]
    );
    
    if (!demande) {
      await conn.end();
      return res.status(404).json({ error: "Demande non trouvée" });
    }
    
    if (!demande.fichier_autorisation) {
      await conn.end();
      return res.status(404).json({ error: "Aucune autorisation disponible pour cette demande" });
    }
    
    await conn.end();
    
    // Construire le chemin complet du fichier
    const filePath = path.join(__dirname, 'uploads', demande.fichier_autorisation);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Fichier d'autorisation introuvable" });
    }
    
    // Envoyer le fichier
    res.download(filePath, `autorisation_${demande.reference}.pdf`);
    
  } catch (err) {
    console.error('Erreur lors du téléchargement de l\'autorisation:', err);
    res.status(500).json({ error: "Erreur serveur lors du téléchargement" });
  }
});

// =================== ROUTE DE TEST ===================
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API backend fonctionne correctement',
    timestamp: new Date().toISOString(),
    status: 'success'
  });
});

// =================== LANCEMENT DU SERVEUR ===================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 