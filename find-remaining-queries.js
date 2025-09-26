const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');

async function findRemainingQueries() {
  try {
    console.log('🔍 Recherche des requêtes SQL restantes à corriger...\n');
    
    // Lire le fichier server.js
    const content = fs.readFileSync(serverPath, 'utf8');
    
    // Rechercher toutes les requêtes SQL avec u.nom et u.prenom
    const patterns = [
      /u\.nom AS [^,]+/g,
      /u\.prenom AS [^,]+/g,
      /u\.nom as [^,]+/g,
      /u\.prenom as [^,]+/g,
      /u\.nom, u\.prenom/g,
      /u\.prenom, u\.nom/g
    ];
    
    let totalFound = 0;
    
    patterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`📋 Pattern ${index + 1}: ${pattern.source}`);
        console.log(`   Trouvé ${matches.length} occurrences:`);
        matches.forEach((match, i) => {
          console.log(`   ${i + 1}. ${match}`);
        });
        console.log('');
        totalFound += matches.length;
      }
    });
    
    // Rechercher spécifiquement les requêtes SELECT complètes
    const selectQueries = content.match(/SELECT[^;]+FROM[^;]+JOIN[^;]+utilisateurs[^;]+/gi);
    if (selectQueries) {
      console.log('🔍 Requêtes SELECT avec JOIN utilisateurs trouvées:');
      selectQueries.forEach((query, i) => {
        if (query.includes('u.nom') || query.includes('u.prenom')) {
          console.log(`\n📋 Requête ${i + 1}:`);
          console.log(query.trim());
        }
      });
    }
    
    console.log(`\n📊 Total: ${totalFound} occurrences trouvées`);
    
    if (totalFound === 0) {
      console.log('✅ Toutes les requêtes sont déjà corrigées !');
    } else {
      console.log('\n💡 Utilisez le script correct-demandeur-fields.js pour corriger automatiquement.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error);
  }
}

findRemainingQueries();



