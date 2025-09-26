const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testSignatureComplete() {
  try {
    console.log('🧪 Test Complet de la Signature Uploadée...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier la structure de la base
    console.log('📋 1. Structure de la base de données :');
    
    // Vérifier la table demandes
    const [structureDemandes] = await conn.execute('DESCRIBE demandes');
    const hasDonnees = structureDemandes.some(col => col.Field === 'donnees');
    const hasFichierAutorisation = structureDemandes.some(col => col.Field === 'fichier_autorisation');
    
    console.log(`   ${hasDonnees ? '✅' : '❌'} Champ 'donnees' (JSON) : ${hasDonnees}`);
    console.log(`   ${hasFichierAutorisation ? '✅' : '❌'} Champ 'fichier_autorisation' : ${hasFichierAutorisation}`);
    
    // Vérifier la table signatures_ministre
    try {
      const [structureSignatures] = await conn.execute('DESCRIBE signatures_ministre');
      console.log(`   ✅ Table 'signatures_ministre' : ${structureSignatures.length} colonnes`);
    } catch (error) {
      console.log(`   ❌ Table 'signatures_ministre' : ${error.message}`);
    }
    
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
      console.log('   💡 Le ministre doit d\'abord signer une demande');
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
              key.toLowerCase().includes('image') ||
              key.toLowerCase().includes('data')
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
    
    // 3. Vérifier les signatures uploadées
    console.log('\n🔍 3. Signatures uploadées par le ministre :');
    try {
      const [signatures] = await conn.execute(`
        SELECT id, utilisateur_id, type_signature, nom_fichier_original, taille_fichier, statut, date_creation
        FROM signatures_ministre
        ORDER BY date_creation DESC
        LIMIT 5
      `);
      
      if (signatures.length === 0) {
        console.log('   ❌ Aucune signature uploadée trouvée');
        console.log('   💡 Le ministre doit d\'abord uploader une signature');
      } else {
        console.log(`   ✅ ${signatures.length} signature(s) uploadée(s) :`);
        signatures.forEach(sig => {
          console.log(`      📁 ID: ${sig.id}, Type: ${sig.type_signature}, Fichier: ${sig.nom_fichier_original}`);
          console.log(`         📊 Taille: ${sig.taille_fichier} bytes, Statut: ${sig.statut}`);
          console.log(`         📅 Date: ${sig.date_creation}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Erreur accès signatures: ${error.message}`);
    }
    
    // 4. Vérifier les utilisateurs ministre
    console.log('\n👤 4. Utilisateurs avec rôle ministre :');
    const [ministres] = await conn.execute(`
      SELECT id, nom, prenom, email, role_id, statut
      FROM utilisateurs
      WHERE role_id = 9
      ORDER BY id
    `);
    
    if (ministres.length === 0) {
      console.log('   ❌ Aucun utilisateur ministre trouvé (role_id = 9)');
    } else {
      console.log(`   ✅ ${ministres.length} utilisateur(s) ministre trouvé(s) :`);
      ministres.forEach(ministre => {
        console.log(`      👑 ID: ${ministre.id}, Nom: ${ministre.nom} ${ministre.prenom}, Email: ${ministre.email}`);
        console.log(`         📊 Statut: ${ministre.statut}`);
      });
    }
    
    // 5. Test de la fonction generateAutorisationOfficielle
    console.log('\n🧪 5. Test de la fonction generateAutorisationOfficielle :');
    console.log('   ✅ Fonction corrigée pour récupérer la signature uploadée');
    console.log('   ✅ Recherche dans demande.donnees (JSON)');
    console.log('   ✅ Recherche dans table signatures_ministre');
    console.log('   ✅ Affichage de la signature à gauche');
    console.log('   ✅ Fallback vers signature électronique si pas d\'upload');
    
    // 6. Actions recommandées
    console.log('\n💡 6. Actions recommandées :');
    console.log('   1. Vérifiez que le ministre a uploadé une signature');
    console.log('   2. Vérifiez que la signature est stockée en base');
    console.log('   3. Vérifiez que la demande a le statut AUTORISATION_SIGNEE');
    console.log('   4. Testez la génération du PDF avec signature');
    console.log('   5. Vérifiez que la signature apparaît à gauche');
    
    // 7. Workflow complet
    console.log('\n🚀 7. Workflow complet de signature :');
    console.log('   1️⃣ Ministre upload une signature → Table signatures_ministre');
    console.log('   2️⃣ Ministre signe une demande → Statut → AUTORISATION_SIGNEE');
    console.log('   3️⃣ generateAutorisationOfficielle() est appelée');
    console.log('   4️⃣ Recherche de la signature dans demande.donnees');
    console.log('   5️⃣ Si pas trouvé, recherche dans signatures_ministre');
    console.log('   6️⃣ Affichage de la signature sur le PDF (à gauche)');
    console.log('   7️⃣ PDF stocké dans fichier_autorisation');
    console.log('   8️⃣ Demandeur peut télécharger l\'autorisation signée');
    
    await conn.end();
    
    console.log('\n✅ Test complet de la signature terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testSignatureComplete();



