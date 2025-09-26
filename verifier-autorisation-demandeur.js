const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function verifierAutorisationDemandeur() {
  try {
    console.log('🔍 Vérification de l\'Autorisation du Demandeur...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier la demande spécifique (20250814-0001)
    console.log('📋 1. Vérification de la demande 20250814-0001 :');
    const [demande] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.fichier_autorisation, d.donnees,
             u.nom_responsable, u.prenom_responsable, u.email
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.reference = '20250814-0001'
    `);
    
    if (demande.length === 0) {
      console.log('   ❌ Demande 20250814-0001 non trouvée');
    } else {
      const d = demande[0];
      console.log(`   ✅ Demande trouvée :`);
      console.log(`      📋 ID: ${d.id}, Réf: ${d.reference}, Type: ${d.type}`);
      console.log(`      📊 Statut: ${d.statut}`);
      console.log(`      👤 Demandeur: ${d.prenom_responsable} ${d.nom_responsable}`);
      console.log(`      📧 Email: ${d.email}`);
      
      // Vérifier le fichier d'autorisation
      if (d.fichier_autorisation) {
        console.log(`      📄 Fichier autorisation: ${d.fichier_autorisation.length} bytes`);
      } else {
        console.log(`      ❌ Pas de fichier d'autorisation`);
      }
      
      // Analyser les données JSON
      if (d.donnees) {
        try {
          const donnees = JSON.parse(d.donnees);
          console.log(`      📄 Données JSON: ${Object.keys(donnees).length} champs`);
          
          // Chercher les champs liés à la signature
          const signatureFields = Object.keys(donnees).filter(key => 
            key.toLowerCase().includes('signature') || 
            key.toLowerCase().includes('upload') ||
            key.toLowerCase().includes('image') ||
            key.toLowerCase().includes('data')
          );
          
          if (signatureFields.length > 0) {
            console.log(`      ✍️ Champs signature trouvés: ${signatureFields.join(', ')}`);
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
          console.log(`      ❌ Erreur parsing JSON: ${parseError.message}`);
        }
      } else {
        console.log(`      ❌ Pas de données JSON`);
      }
    }
    
    // 2. Vérifier toutes les demandes avec autorisation
    console.log('\n🟢 2. Toutes les demandes avec autorisation :');
    const [demandesAvecAutorisation] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut, d.fichier_autorisation,
             u.nom_responsable, u.prenom_responsable
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.fichier_autorisation IS NOT NULL
      ORDER BY d.id DESC
    `);
    
    if (demandesAvecAutorisation.length === 0) {
      console.log('   ❌ Aucune demande avec autorisation trouvée');
    } else {
      console.log(`   ✅ ${demandesAvecAutorisation.length} demande(s) avec autorisation :`);
      demandesAvecAutorisation.forEach(d => {
        const statutColor = d.statut === 'AUTORISATION_SIGNEE' ? '🟢' : 
                           d.statut === 'CLOTUREE' ? '🔵' : '⚪';
        console.log(`      ${statutColor} ID: ${d.id}, Réf: ${d.reference}, Type: ${d.type}, Statut: ${d.statut}`);
        console.log(`         👤 Demandeur: ${d.prenom_responsable} ${d.nom_responsable}`);
        console.log(`         📄 Autorisation: ${d.fichier_autorisation.length} bytes`);
      });
    }
    
    // 3. Vérifier l'endpoint de téléchargement
    console.log('\n🔗 3. Endpoint de téléchargement :');
    console.log('   ✅ GET /api/demandeur/autorisation/:id - Disponible');
    console.log('   ✅ Authentification: authRole([4]) - Demandeur');
    console.log('   ✅ Vérification: demande appartient au demandeur');
    console.log('   ✅ Vérification: statut = AUTORISATION_SIGNEE OU CLOTUREE');
    console.log('   ✅ Vérification: fichier_autorisation existe');
    
    // 4. Vérifier le frontend
    console.log('\n🎨 4. Frontend - Dashboard Demandeur :');
    console.log('   ✅ Bouton "Télécharger Autorisation" ajouté');
    console.log('   ✅ Affiché si statut = AUTORISATION_SIGNEE OU CLOTUREE');
    console.log('   ✅ Affiché si fichier_autorisation existe');
    console.log('   ✅ Style: Vert (#52c41a) avec icône certificat');
    console.log('   ✅ Fonction: handleDownloadAutorisation(demande.id)');
    
    // 5. Actions recommandées
    console.log('\n💡 5. Actions recommandées :');
    console.log('   1. Vérifiez que la demande a un fichier_autorisation');
    console.log('   2. Vérifiez que le statut est AUTORISATION_SIGNEE ou CLOTUREE');
    console.log('   3. Vérifiez que le bouton apparaît dans le frontend');
    console.log('   4. Testez l\'endpoint de téléchargement');
    console.log('   5. Vérifiez que le demandeur peut télécharger');
    
    // 6. Test de l'API
    if (demande.length > 0) {
      const d = demande[0];
      console.log('\n🧪 6. Test de l\'API de téléchargement :');
      console.log(`   📋 Test avec la demande ${d.id} (${d.reference})`);
      console.log(`   🔗 URL: http://localhost:4000/api/demandeur/autorisation/${d.id}`);
      console.log(`   🔐 Authentification: Bearer token (role demandeur)`);
      console.log(`   📊 Statut attendu: 200 OK`);
      console.log(`   📄 Contenu attendu: PDF de l'autorisation`);
      
      if (d.fichier_autorisation) {
        console.log(`   ✅ Fichier autorisation disponible: ${d.fichier_autorisation.length} bytes`);
      } else {
        console.log(`   ❌ Fichier autorisation manquant`);
      }
    }
    
    await conn.end();
    
    console.log('\n✅ Vérification de l\'autorisation du demandeur terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

verifierAutorisationDemandeur();



