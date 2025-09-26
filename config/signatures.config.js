// Configuration des signatures du ministre
module.exports = {
  // Types de signatures supportés
  signatureTypes: {
    AUTORISATION: {
      name: 'Autorisation',
      description: 'Signature pour les autorisations d\'exploitation',
      allowedFormats: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'],
      maxSize: 10 * 1024 * 1024, // 10 MB
      required: true
    },
    ACCUSE: {
      name: 'Accusé de Réception',
      description: 'Signature pour les accusés de réception',
      allowedFormats: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'],
      maxSize: 10 * 1024 * 1024, // 10 MB
      required: false
    },
    DOCUMENT_OFFICIEL: {
      name: 'Document Officiel',
      description: 'Signature pour les documents officiels',
      allowedFormats: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'],
      maxSize: 10 * 1024 * 1024, // 10 MB
      required: false
    }
  },

  // Configuration des dossiers
  directories: {
    base: 'uploads/signatures',
    temp: 'uploads/temp',
    maxFilesPerUser: 50
  },

  // Configuration de sécurité
  security: {
    allowedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/svg+xml',
      'application/pdf'
    ],
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    virusScan: false, // À activer en production
    watermark: false // À activer si nécessaire
  },

  // Configuration de l'interface
  ui: {
    maxPreviewSize: 200, // pixels
    thumbnailQuality: 0.8,
    showFileSize: true,
    showUploadDate: true,
    allowComments: true
  },

  // Configuration des notifications
  notifications: {
    onUpload: true,
    onDelete: true,
    onApply: true,
    emailNotifications: false
  }
};




