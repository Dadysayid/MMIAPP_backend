const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function verifierDemandeSimple() {
  try {
    console.log('🔍 Vérification Rapide de la Demande 20250814-0001...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Vérifier la demande spécifique
    const [demande] = await conn.execute(`
      SELECT id, reference, type, statut, fichier_autorisation, fichier_accuse
      FROM demandes 
      WHERE reference = '20250814-0001'
    `);
    
    if (demande.length === 0) {
      console.log('❌ Demande 20250814-0001 non trouvée');
    } else {
      const d = demande[0];
      console.log('✅ Demande trouvée :');
      console.log(`   📋 ID: ${d.id}, Réf: ${d.reference}, Type: ${d.type}`);
      console.log(`   📊 Statut: ${d.statut}`);
      
      // Vérifier l'accusé
      if (d.fichier_accuse) {
        console.log(`   📄 Accusé: ✅ Présent (${d.fichier_accuse.length} bytes)`);
      } else {
        console.log(`   📄 Accusé: ❌ Manquant`);
      }
      
      // Vérifier l'autorisation
      if (d.fichier_autorisation) {
        console.log(`   📄 Autorisation: ✅ Présente (${d.fichier_autorisation.length} bytes)`);
        console.log(`   🎯 Le bouton "Télécharger Autorisation" DOIT apparaître !`);
      } else {
        console.log(`   📄 Autorisation: ❌ MANQUANTE`);
        console.log(`   🚨 Le bouton "Télécharger Autorisation" ne peut PAS apparaître !`);
        console.log(`   💡 Cause: Pas de fichier_autorisation généré`);
      }
      
      // Diagnostic
      console.log('\n🔍 Diagnostic :');
      if (d.statut === 'CLOTUREE' && !d.fichier_autorisation) {
        console.log('   ❌ Problème: Demande CLÔTURÉE mais pas d\'autorisation générée');
        console.log('   💡 Solution: Le ministre doit d\'abord signer et générer l\'autorisation');
      } else if (d.statut === 'CLOTUREE' && d.fichier_autorisation) {
        console.log('   ✅ OK: Demande CLÔTURÉE avec autorisation - bouton doit apparaître');
      } else {
        console.log(`   ⚠️ Statut: ${d.statut} - vérifiez le workflow`);
      }
    }
    
    await conn.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

verifierDemandeSimple();



