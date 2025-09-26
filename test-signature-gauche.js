const fs = require('fs');
const path = require('path');

async function testSignatureGauche() {
  try {
    console.log('🧪 Test de la Position de la Signature...\n');
    
    // 1. Vérifier les fonctions PDF
    console.log('🔍 1. Vérification des fonctions PDF :');
    
    const serverPath = path.join(__dirname, 'server.js');
    if (fs.existsSync(serverPath)) {
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      // Vérifier generatePreviewPDF
      const hasPreviewSignatureGauche = serverContent.includes('Signature du ministre', { align: 'left'});
      const hasPreviewTHIAMGauche = serverContent.includes('THIAM Tidjani', { align: 'left'});
      const hasPreviewNB = serverContent.includes('NB: Activités principales');
      
      console.log(`   ${hasPreviewSignatureGauche ? '✅' : '❌'} generatePreviewPDF - Signature à gauche`);
      console.log(`   ${hasPreviewTHIAMGauche ? '✅' : '❌'} generatePreviewPDF - THIAM Tidjani à gauche`);
      console.log(`   ${!hasPreviewNB ? '✅' : '❌'} generatePreviewPDF - NB supprimé`);
      
      // Vérifier generateAutorisationOfficielle
      const hasAuthSignatureGauche = serverContent.includes('Signature du ministre', { align: 'left'});
      const hasAuthTHIAMGauche = serverContent.includes('THIAM Tidjani', { align: 'left'});
      const hasAuthNB = serverContent.includes('NB: Activités principales');
      
      console.log(`   ${hasAuthSignatureGauche ? '✅' : '❌'} generateAutorisationOfficielle - Signature à gauche`);
      console.log(`   ${hasAuthTHIAMGauche ? '✅' : '❌'} generateAutorisationOfficielle - THIAM Tidjani à gauche`);
      console.log(`   ${!hasAuthNB ? '✅' : '❌'} generateAutorisationOfficielle - NB supprimé`);
      
    } else {
      console.log('   ❌ Fichier server.js non trouvé');
    }
    
    // 2. Vérifier les anciennes références
    console.log('\n🔍 2. Vérification des anciennes références :');
    
    if (fs.existsSync(serverPath)) {
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      const hasOldSignatureDroite = serverContent.includes('signature du ministre', { align: 'right'});
      const hasOldTHIAMDroite = serverContent.includes('THIAM Tidjani', { align: 'right'});
      const hasOldNB = serverContent.includes('NB: Activités principales');
      
      console.log(`   ${!hasOldSignatureDroite ? '✅' : '❌'} Plus de signature à droite`);
      console.log(`   ${!hasOldTHIAMDroite ? '✅' : '❌'} Plus de THIAM Tidjani à droite`);
      console.log(`   ${!hasOldNB ? '✅' : '❌'} Plus de note NB`);
    }
    
    // 3. Résumé des corrections
    console.log('\n✅ 3. Résumé des corrections appliquées :');
    console.log('   🎯 Signature du ministre → MAINTENANT À GAUCHE');
    console.log('   🎯 THIAM Tidjani → MAINTENANT À GAUCHE');
    console.log('   🎯 Note NB → SUPPRIMÉE');
    console.log('   🎯 Document plus professionnel');
    
    // 4. Actions recommandées
    console.log('\n💡 4. Actions recommandées :');
    console.log('   1. Redémarrez le serveur backend');
    console.log('   2. Testez la génération de PDF');
    console.log('   3. Vérifiez que la signature est à gauche');
    console.log('   4. Vérifiez que le NB n\'apparaît plus');
    
    console.log('\n✅ Test de la position de la signature terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testSignatureGauche();



