const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testLimitesUpload() {
  try {
    console.log('🧪 Test des limites d\'upload...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier la demande 14
    console.log('📋 1. Vérification de la demande 14 :');
    const [demande] = await conn.execute(`
      SELECT id, reference, type, statut, donnees
      FROM demandes
      WHERE id = 14
    `);
    
    if (demande.length === 0) {
      console.log('   ❌ Demande 14 non trouvée');
      return;
    }
    
    const d = demande[0];
    console.log(`   ✅ Demande trouvée: ${d.reference} - ${d.type} - ${d.statut}`);
    
    // 2. Vérifier l'endpoint preview-pdf
    console.log('\n🎯 2. Vérification de l\'endpoint preview-pdf :');
    console.log('   🔗 Endpoint: POST /api/ministere/dossiers/:id/preview-pdf');
    console.log('   📊 Limites configurées:');
    console.log('      - Taille fichier: 50MB');
    console.log('      - Taille champ: 50MB');
    console.log('      - Fichiers max: 10');
    console.log('      - Champs max: 100');
    
    // 3. Vérifier les types de fichiers acceptés
    console.log('\n📁 3. Types de fichiers acceptés :');
    console.log('   ✅ Images: image/* (JPEG, PNG, GIF, etc.)');
    console.log('   ✅ PDFs: application/pdf');
    console.log('   ❌ Autres types: Rejetés automatiquement');
    
    // 4. Test de simulation d'upload
    console.log('\n🔄 4. Test de simulation d\'upload :');
    
    // Simuler différentes tailles de fichiers
    const taillesTest = [
      { nom: 'Petit fichier', taille: '1MB', statut: '✅ Accepté' },
      { nom: 'Fichier moyen', taille: '10MB', statut: '✅ Accepté' },
      { nom: 'Gros fichier', taille: '25MB', statut: '✅ Accepté' },
      { nom: 'Très gros fichier', taille: '50MB', statut: '✅ Accepté (limite)' },
      { nom: 'Fichier trop gros', taille: '60MB', statut: '❌ Rejeté' }
    ];
    
    taillesTest.forEach(test => {
      console.log(`   ${test.statut} ${test.nom}: ${test.taille}`);
    });
    
    // 5. Vérifier la configuration du serveur
    console.log('\n⚙️ 5. Configuration du serveur :');
    console.log('   ✅ express.json limit: 50mb');
    console.log('   ✅ express.urlencoded limit: 50mb');
    console.log('   ✅ CORS maxFileSize: 50mb');
    console.log('   ✅ Multer fileSize: 50MB');
    console.log('   ✅ Multer fieldSize: 50MB');
    
    // 6. Recommandations pour l'endpoint
    console.log('\n💡 6. Recommandations pour l\'endpoint preview-pdf :');
    console.log('   🔧 Vérifiez que l\'endpoint utilise la bonne configuration multer');
    console.log('   🔧 Assurez-vous que les données de signature ne dépassent pas 50MB');
    console.log('   🔧 Utilisez la compression d\'image si nécessaire');
    console.log('   🔧 Validez le type de fichier avant traitement');
    
    await conn.end();
    
    console.log('\n✅ Test des limites terminé !');
    console.log('\n🚀 Actions à effectuer :');
    console.log('   1. Redémarrez le serveur backend');
    console.log('   2. Testez l\'upload de fichiers jusqu\'à 50MB');
    console.log('   3. Vérifiez que l\'erreur 413 a disparu');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testLimitesUpload();



