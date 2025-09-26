const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const mysql = require('mysql2/promise');
const path = require('path'); // Added missing import for path

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testGenerationPDF() {
  try {
    console.log('📄 Test de génération PDF...\n');
    
    // 1. Test de création du document PDF
    console.log('📋 1. Test de création du document PDF :');
    
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      console.log('   ✅ Document PDF créé avec succès');
      console.log(`   📏 Taille: ${doc.page.width} x ${doc.page.height}`);
      console.log(`   📐 Marges: ${doc.page.margins.top}px`);
      
      // Test des événements
      let chunks = [];
      doc.on('data', chunk => {
        chunks.push(chunk);
        console.log(`   📦 Chunk reçu: ${chunk.length} bytes`);
      });
      
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`   ✅ PDF terminé: ${buffer.length} bytes`);
      });
      
      doc.on('error', (error) => {
        console.log(`   ❌ Erreur PDF: ${error.message}`);
      });
      
    } catch (pdfError) {
      console.log(`   ❌ Erreur création PDF: ${pdfError.message}`);
      return;
    }
    
    // 2. Test de la base de données
    console.log('\n🗄️ 2. Test de la base de données :');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier la demande 14
    const [demande14] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.donnees,
             u.nom_responsable, u.prenom_responsable, u.email, u.telephone, u.adresse
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.id = 14
    `);
    
    if (demande14.length === 0) {
      console.log('   ❌ Demande 14 non trouvée');
      await conn.end();
      return;
    }
    
    const demande = demande14[0];
    console.log(`   ✅ Demande trouvée: ${demande.reference}`);
    console.log(`   📊 Type: ${demande.type}`);
    console.log(`   📊 Statut: ${demande.statut}`);
    console.log(`   👤 Demandeur: ${demande.prenom_responsable} ${demande.nom_responsable}`);
    
    // 3. Test de génération PDF complète
    console.log('\n🔧 3. Test de génération PDF complète :');
    
    try {
      const pdfBuffer = await generateTestPDF(demande);
      console.log(`   ✅ PDF généré avec succès: ${pdfBuffer.length} bytes`);
      
      // Sauvegarder le PDF de test
      const fs = require('fs');
      const testPath = path.join(__dirname, 'test-preview.pdf');
      fs.writeFileSync(testPath, pdfBuffer);
      console.log(`   💾 PDF sauvegardé: ${testPath}`);
      
    } catch (pdfError) {
      console.log(`   ❌ Erreur génération PDF: ${pdfError.message}`);
      console.log(`   📋 Stack trace: ${pdfError.stack}`);
    }
    
    await conn.end();
    
    // 4. Recommandations
    console.log('\n💡 4. Recommandations :');
    console.log('   🔧 Redémarrez le serveur backend après les corrections');
    console.log('   🔧 Vérifiez que PDFKit est installé: npm install pdfkit');
    console.log('   🔧 Vérifiez que QRCode est installé: npm install qrcode');
    console.log('   🔧 Testez la prévisualisation dans l\'interface');
    
    console.log('\n✅ Test de génération PDF terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Fonction de test de génération PDF
async function generateTestPDF(demande) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('      📝 Début de génération PDF...');
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        console.log('      📄 PDF terminé, création du buffer...');
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      
      doc.on('error', (error) => {
        console.log(`      ❌ Erreur PDF: ${error.message}`);
        reject(error);
      });
      
      // En-tête avec logo
      console.log('      🏛️ Ajout de l\'en-tête...');
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('MINISTÈRE DES MINES ET DE L\'INDUSTRIE', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(14)
         .font('Helvetica')
         .text('Direction Générale de l\'Industrie', { align: 'center' });
      
      doc.moveDown(1);
      
      // Informations de la demande
      console.log('      📋 Ajout des informations de la demande...');
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('PRÉVISUALISATION - AUTORISATION', { align: 'center' });
      
      doc.moveDown(1);
      
      // Détails de la demande
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`Référence: ${demande.reference}`);
      
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Type: ${demande.type}`);
      
      doc.text(`Demandeur: ${demande.prenom_responsable} ${demande.nom_responsable}`);
      doc.text(`Email: ${demande.email || 'Non renseigné'}`);
      doc.text(`Téléphone: ${demande.telephone || 'Non renseigné'}`);
      doc.text(`Adresse: ${demande.adresse || 'Non renseignée'}`);
      
      doc.moveDown(1);
      
      // Zone de signature (prévisualisation)
      console.log('      ✍️ Ajout de la zone de signature...');
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('ZONE DE SIGNATURE', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .font('Helvetica')
         .text('(Signature du Ministre à apposer ici)', { align: 'center' });
      
      // QR Code de prévisualisation
      console.log('      📱 Ajout du QR code...');
      doc.moveDown(1);
      const qrData = `PREVIEW-${demande.reference}-${Date.now()}`;
      
      doc.fontSize(8)
         .font('Helvetica')
         .text('QR Code de prévisualisation', { align: 'center' });
      
      console.log('      🏁 Finalisation du PDF...');
      doc.end();
      
    } catch (error) {
      console.log(`      ❌ Erreur dans generateTestPDF: ${error.message}`);
      reject(error);
    }
  });
}

testGenerationPDF();



