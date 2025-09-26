const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');

async function correctDemandeurFields() {
  try {
    console.log('🔧 Correction automatique des champs demandeur...\n');
    
    // Lire le fichier server.js
    let content = fs.readFileSync(serverPath, 'utf8');
    let corrections = 0;
    
    // 1. Corriger les SELECT avec alias demandeur_nom/demandeur_prenom
    const selectPatterns = [
      {
        from: /u\.nom AS demandeur_nom, u\.prenom AS demandeur_prenom/g,
        to: 'u.nom_responsable AS demandeur_nom, u.prenom_responsable AS demandeur_prenom'
      },
      {
        from: /u\.nom as demandeur_nom, u\.prenom as demandeur_prenom/g,
        to: 'u.nom_responsable as demandeur_nom, u.prenom_responsable as demandeur_prenom'
      }
    ];
    
    selectPatterns.forEach(pattern => {
      const matches = content.match(pattern.from);
      if (matches) {
        content = content.replace(pattern.from, pattern.to);
        corrections += matches.length;
        console.log(`✅ Corrigé ${matches.length} SELECT avec alias demandeur`);
      }
    });
    
    // 2. Corriger les autres références directes
    const otherPatterns = [
      {
        from: /u\.nom AS demandeur_nom/g,
        to: 'u.nom_responsable AS demandeur_nom'
      },
      {
        from: /u\.prenom AS demandeur_prenom/g,
        to: 'u.prenom_responsable AS demandeur_prenom'
      },
      {
        from: /u\.nom as demandeur_nom/g,
        to: 'u.nom_responsable as demandeur_nom'
      },
      {
        from: /u\.prenom as demandeur_prenom/g,
        to: 'u.prenom_responsable as demandeur_prenom'
      }
    ];
    
    otherPatterns.forEach(pattern => {
      const matches = content.match(pattern.from);
      if (matches) {
        content = content.replace(pattern.from, pattern.to);
        corrections += matches.length;
        console.log(`✅ Corrigé ${matches.length} références directes`);
      }
    });
    
    // 3. Sauvegarder le fichier corrigé
    fs.writeFileSync(serverPath, content, 'utf8');
    
    console.log(`\n🎉 Correction terminée ! ${corrections} modifications effectuées.`);
    console.log('📁 Fichier server.js mis à jour avec succès.');
    
    // 4. Vérifier qu'il n'y a plus de références incorrectes
    const remainingIncorrect = content.match(/u\.nom.*demandeur|u\.prenom.*demandeur/g);
    if (remainingIncorrect && remainingIncorrect.length > 0) {
      console.log('\n⚠️  Références restantes à vérifier :');
      remainingIncorrect.forEach(ref => {
        console.log(`   ${ref}`);
      });
    } else {
      console.log('\n✅ Toutes les références incorrectes ont été corrigées !');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

correctDemandeurFields();



