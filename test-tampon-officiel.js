const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function testTamponOfficiel() {
  console.log('🔍 Test du Tampon Officiel - Direction Générale de l\'Industrie');
  console.log('==============================================================\n');

  try {
    // Créer un document PDF de test
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    // Créer le répertoire de test s'il n'existe pas
    const testDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-tampon-officiel.pdf');
    const writeStream = fs.createWriteStream(testFilePath);
    
    doc.pipe(writeStream);
    
    // En-tête
    doc.fontSize(16).fillColor('#1e6a8e').font('Helvetica-Bold')
      .text("MINISTÈRE DES MINES ET DE L'INDUSTRIE", { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(13).fillColor('#444').font('Helvetica-Bold')
      .text("Direction Générale de l'Industrie", { align: 'center' });
    
    doc.moveDown(2);
    
    // Titre de l'accusé
    doc.fontSize(14).fillColor('#1e6a8e').font('Helvetica-Bold')
      .text("ACCUSÉ DE RÉCEPTION DE DEMANDE", { align: 'center', underline: true });
    
    doc.moveDown(3);
    
    // Tampon officiel exactement comme l'image
    const stampWidth = 220;
    const stampHeight = 140;
    const stampX = (doc.page.width - stampWidth) / 2;
    const stampY = doc.y;
    
    // Rectangle du tampon avec coins arrondis et bordure bleue épaisse
    doc.rect(stampX, stampY, stampWidth, stampHeight)
      .lineWidth(4)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Texte "Direction Générale de l'Industrie" en haut du tampon (centré)
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("Direction Générale de l'Industrie", 
        stampX + stampWidth/2, 
        stampY + 30, 
        { align: 'center', width: stampWidth }
      );
    
    // Ligne "Arrivée. le" avec date (gauche)
    doc.fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("Arrivée. le", stampX + 25, stampY + 65);
    
    // Ligne de soulignement bleue épaisse pour la date (étendue jusqu'au bord droit)
    doc.moveTo(stampX + 25, stampY + 85)
      .lineTo(stampX + stampWidth - 25, stampY + 85)
      .lineWidth(3)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Date de la demande (sur la ligne)
    doc.fontSize(12)
      .font('Helvetica')
      .fillColor('#1e6a8e')
      .text(new Date().toLocaleDateString('fr-FR'), 
        stampX + 25, stampY + 90);
    
    // Ligne "N°:" avec référence (gauche, alignée avec "Arrivée. le")
    doc.fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#1e6a8e')
      .text("N°:", stampX + 25, stampY + 105);
    
    // Ligne de soulignement bleue épaisse pour la référence (étendue jusqu'au bord droit)
    doc.moveTo(stampX + 25, stampY + 125)
      .lineTo(stampX + stampWidth - 25, stampY + 125)
      .lineWidth(3)
      .strokeColor('#1e6a8e')
      .stroke();
    
    // Référence de la demande (sur la ligne)
    doc.fontSize(12)
      .font('Helvetica')
      .fillColor('#1e6a8e')
      .text("TEST-2025-0001", stampX + 25, stampY + 130);
    
    // QR Code à droite du tampon (position ajustée)
    // Créer un rectangle pour simuler le QR code
    doc.rect(stampX + stampWidth + 30, stampY, 100, 100)
      .lineWidth(2)
      .strokeColor('#666')
      .stroke();
    
    doc.fontSize(10)
      .fillColor('#666')
      .text("QR Code", stampX + stampWidth + 30, stampY + 50, { width: 100, align: 'center' });
    
    doc.moveDown(4);
    
    // Informations de test
    doc.fontSize(11).fillColor('#222').font('Helvetica')
      .text("Ceci est un test du tampon officiel")
      .text("Référence: TEST-2025-0001")
      .text("Date: " + new Date().toLocaleDateString('fr-FR'))
      .moveDown(2);
    
    // Signature
    doc.fontSize(11).fillColor('#222').font('Helvetica')
      .text("Pour le Ministère des Mines et de l'Industrie")
      .text("Le Secrétariat Central");
    
    // Finaliser le document
    doc.end();
    
    // Attendre que le fichier soit écrit
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    console.log('✅ Tampon officiel testé avec succès !');
    console.log(`📄 Fichier de test créé: ${testFilePath}`);
    console.log('\n📋 Caractéristiques du tampon:');
    console.log('   🎨 Bordure bleue épaisse (#1e6a8e)');
    console.log('   📏 Dimensions: 220x140 pixels');
    console.log('   🏢 Texte: "Direction Générale de l\'Industrie" (centré)');
    console.log('   📅 Ligne "Arrivée. le" avec date');
    console.log('   🔢 Ligne "N°:" avec référence');
    console.log('   📍 Position: Centré sur la page');
    console.log('   🎯 QR Code: À droite du tampon');
    
    console.log('\n🚀 Prochaines étapes:');
    console.log('   1. Ouvrir le fichier PDF de test');
    console.log('   2. Vérifier que le tampon ressemble à l\'image');
    console.log('   3. Tester l\'accusé de réception complet');
    
  } catch (error) {
    console.error('❌ Erreur lors du test du tampon:', error);
  }
}

// Exécuter le test
testTamponOfficiel();



