const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function verifierSignatureUpload() {
  try {
    console.log('🔍 Vérification de la Signature Uploadée...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier la structure de la table demandes
    console.log('📋 1. Structure de la table demandes :');
    const [structure] = await conn.execute('DESCRIBE demandes');
    const hasDonnees = structure.some(col => col.Field === 'donnees');
    const hasFichierAutorisation = structure.some(col => col.Field === 'fichier_autorisation');
    
    console.log(`   ${hasDonnees ? '✅' : '❌'} Champ 'donnees' (JSON) : ${hasDonnees}`);
    console.log(`   ${hasFichierAutorisation ? '✅' : '❌'} Champ 'fichier_autorisation' : ${hasFichierAutorisation}`);
    
    // 2. Vérifier les demandes avec autorisation signée
    console.log('\n🟢 2. Demandes avec autorisation signée :');
    const [demandesSignees] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.donnees, d.fichier_autorisation
      FROM demandes d
      WHERE d.statut = 'AUTORISATION_SIGNEE'
      ORDER BY d.id DESC
      LIMIT 3
    `);
    
    if (demandesSignees.length === 0) {
      console.log('   ❌ Aucune demande avec autorisation signée trouvée');
    } else {
      console.log(`   ✅ ${demandesSignees.length} demande(s) avec autorisation signée :`);
      demandesSignees.forEach(demande => {
        console.log(`      📋 ID: ${demande.id}, Réf: ${demande.reference}, Type: ${demande.type}`);
        
        // Analyser le champ donnees (JSON)
        if (demande.donnees) {
          try {
            const donnees = JSON.parse(demande.donnees);
            console.log(`         📄 Données JSON: ${Object.keys(donnees).length} champs`);
            
            // Chercher les champs liés à la signature
            const signatureFields = Object.keys(donnees).filter(key => 
              key.toLowerCase().includes('signature') || 
              key.toLowerCase().includes('upload') ||
              key.toLowerCase().includes('image')
            );
            
            if (signatureFields.length > 0) {
              console.log(`         ✍️ Champs signature trouvés: ${signatureFields.join(', ')}`);
              signatureFields.forEach(field => {
                const value = donnees[field];
                if (typeof value === 'string' && value.startsWith('data:image/')) {
                  console.log(`         🖼️ ${field}: Image uploadée (${value.length} caractères)`);
                } else {
                  console.log(`         📝 ${field}: ${typeof value} - ${String(value).substring(0, 100)}...`);
                }
              });
            } else {
              console.log(`         ❌ Aucun champ signature trouvé dans les données`);
            }
            
          } catch (parseError) {
            console.log(`         ❌ Erreur parsing JSON: ${parseError.message}`);
          }
        } else {
          console.log(`         ❌ Pas de données JSON`);
        }
        
        // Vérifier le fichier d'autorisation
        if (demande.fichier_autorisation) {
          console.log(`         📄 Fichier autorisation: ${demande.fichier_autorisation.length} bytes`);
        } else {
          console.log(`         ❌ Pas de fichier d'autorisation`);
        }
      });
    }
    
    // 3. Vérifier toutes les demandes pour trouver des signatures
    console.log('\n🔍 3. Recherche de signatures dans toutes les demandes :');
    const [allDemandes] = await conn.execute(`
      SELECT d.id, d.reference, d.donnees
      FROM demandes d
      WHERE d.donnees IS NOT NULL
      ORDER BY d.id DESC
      LIMIT 5
    `);
    
    if (allDemandes.length === 0) {
      console.log('   ❌ Aucune demande avec données JSON trouvée');
    } else {
      console.log(`   ✅ ${allDemandes.length} demande(s) avec données JSON :`);
      allDemandes.forEach(demande => {
        try {
          const donnees = JSON.parse(demande.donnees);
          const signatureFields = Object.keys(donnees).filter(key => 
            key.toLowerCase().includes('signature') || 
            key.toLowerCase().includes('upload') ||
            key.toLowerCase().includes('image')
          );
          
          if (signatureFields.length > 0) {
            console.log(`      📋 Demande ${demande.id} (${demande.reference}):`);
            signatureFields.forEach(field => {
              const value = donnees[field];
              if (typeof value === 'string' && value.startsWith('data:image/')) {
                console.log(`         🖼️ ${field}: Image uploadée (${value.length} caractères)`);
              } else {
                console.log(`         📝 ${field}: ${typeof value}`);
              }
            });
          }
        } catch (parseError) {
          // Ignorer les erreurs de parsing
        }
      });
    }
    
    // 4. Recommandations
    console.log('\n💡 4. Recommandations pour corriger l\'affichage :');
    console.log('   1. Vérifiez que la signature est bien uploadée lors de la signature');
    console.log('   2. Vérifiez que la signature est stockée dans le champ donnees');
    console.log('   3. Vérifiez que generateAutorisationOfficielle récupère la signature');
    console.log('   4. Vérifiez que la signature est affichée sur le PDF final');
    
    await conn.end();
    
    console.log('\n✅ Vérification de la signature uploadée terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

verifierSignatureUpload();



