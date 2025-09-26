const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

async function testDocumentOfficiel() {
  try {
    console.log('🧪 Test de génération du document officiel...\n');
    
    // 1. Vérifier l'existence du logo
    console.log('🖼️ 1. Vérification du logo :');
    const logoPath = path.join(__dirname, 'assets', 'logo.png');
    
    if (fs.existsSync(logoPath)) {
      const stats = fs.statSync(logoPath);
      console.log(`   ✅ Logo trouvé: ${logoPath}`);
      console.log(`   📊 Taille: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   📅 Modifié: ${stats.mtime}`);
    } else {
      console.log(`   ❌ Logo non trouvé: ${logoPath}`);
      console.log('   💡 Vérifiez que le fichier logo.png existe dans le dossier assets/');
      return;
    }
    
    // 2. Vérifier le dossier assets
    console.log('\n📁 2. Vérification du dossier assets :');
    const assetsDir = path.join(__dirname, 'assets');
    
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      console.log(`   ✅ Dossier assets trouvé: ${assetsDir}`);
      console.log(`   📋 Fichiers présents: ${files.join(', ')}`);
    } else {
      console.log(`   ❌ Dossier assets non trouvé: ${assetsDir}`);
      console.log('   💡 Créez le dossier assets/ et placez-y le logo.png');
      return;
    }
    
    // 3. Test de création du document PDF
    console.log('\n📄 3. Test de création du document PDF :');
    
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
      
      // Test des événements
      let chunks = [];
      doc.on('data', chunk => {
        chunks.push(chunk);
        console.log(`   📦 Chunk reçu: ${chunk.length} bytes`);
      });
      
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`   ✅ PDF terminé: ${buffer.length} bytes`);
        
        // Sauvegarder le PDF de test
        const testPath = path.join(__dirname, 'test-document-officiel.pdf');
        fs.writeFileSync(testPath, buffer);
        console.log(`   💾 PDF sauvegardé: ${testPath}`);
      });
      
      doc.on('error', (error) => {
        console.log(`   ❌ Erreur PDF: ${error.message}`);
      });
      
      // Test d'ajout du logo
      console.log('   🖼️ Test d\'ajout du logo...');
      try {
        doc.image(logoPath, 50, 50, { width: 80, height: 80 });
        console.log('   ✅ Logo ajouté au PDF');
      } catch (logoError) {
        console.log(`   ❌ Erreur ajout logo: ${logoError.message}`);
      }
      
      // Test d'ajout du contenu officiel
      console.log('   📋 Test d\'ajout du contenu officiel...');
      
      // En-tête
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('MINISTÈRE DES MINES ET DE L\'INDUSTRIE', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(14)
         .font('Helvetica')
         .text('Direction Générale de l\'Industrie', { align: 'center' });
      
      doc.moveDown(2);
      
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
         .text(`Référence : TEST-001 - ${new Date().toLocaleDateString('fr-FR')}`);
      
      doc.moveDown(1);
      
      // Corps du document (version courte pour le test)
      doc.fontSize(12)
         .font('Helvetica')
         .text('Monsieur le directeur général,');
      
      doc.moveDown(1);
      
      doc.text('Faisant suite à votre lettre ci-dessus référencée, j\'ai l\'honneur de vous informer que notre Département donne son accord de principe pour l\'Installation par votre société dans la wilaya de Nouakchott.');
      
      doc.moveDown(2);
      
      // Signature
      doc.fontSize(12)
         .font('Helvetica')
         .text('                                                                                                                         signature du ministre', { align: 'right' });
      
      doc.moveDown(0.5);
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('THIAM Tidjani', { align: 'right' });
      
      // Finalisation
      doc.end();
      
    } catch (pdfError) {
      console.log(`   ❌ Erreur création PDF: ${pdfError.message}`);
      return;
    }
    
    // 4. Recommandations
    console.log('\n💡 4. Recommandations :');
    console.log('   🔧 Assurez-vous que logo.png est dans le dossier assets/');
    console.log('   🔧 Vérifiez que le logo est au format PNG valide');
    console.log('   🔧 Redémarrez le serveur backend après vérification');
    console.log('   🔧 Testez la prévisualisation dans l\'interface');
    
    console.log('\n✅ Test du document officiel terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testDocumentOfficiel();



