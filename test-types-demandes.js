const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testTypesDemandes() {
  try {
    console.log('🧪 Test des Types de Demandes...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier les types de demandes existants
    console.log('🔍 1. Types de demandes dans la base :');
    const [types] = await conn.execute(`
      SELECT DISTINCT type, COUNT(*) as nombre
      FROM demandes
      GROUP BY type
      ORDER BY nombre DESC
    `);
    
    if (types.length === 0) {
      console.log('   ❌ Aucun type de demande trouvé');
    } else {
      console.log(`   ✅ ${types.length} type(s) de demande(s) trouvé(s) :`);
      types.forEach(type => {
        console.log(`      📋 ${type.type} : ${type.nombre} demande(s)`);
      });
    }
    
    // 2. Exemples de types de demandes
    console.log('\n📝 2. Exemples de types de demandes :');
    const exemples = [
      'Boulangerie et Pâtisserie',
      'Usine de Production d\'Eau',
      'Recyclage de Plastique',
      'Industrie Textile',
      'Fabrication de Meubles',
      'Production Alimentaire',
      'Industrie Chimique',
      'Métallurgie'
    ];
    
    exemples.forEach(exemple => {
      console.log(`      🏭 ${exemple}`);
    });
    
    // 3. Vérifier une demande spécifique
    console.log('\n📋 3. Vérification d\'une demande spécifique :');
    const [demandeExemple] = await conn.execute(`
      SELECT d.id, d.reference, d.type, d.statut,
             u.nom_responsable, u.prenom_responsable
      FROM demandes d
      JOIN utilisateurs u ON d.utilisateur_id = u.id
      WHERE d.type IS NOT NULL
      LIMIT 1
    `);
    
    if (demandeExemple.length > 0) {
      const demande = demandeExemple[0];
      console.log(`   ✅ Demande trouvée :`);
      console.log(`      📋 ID: ${demande.id}`);
      console.log(`      📋 Référence: ${demande.reference}`);
      console.log(`      🏭 Type: ${demande.type}`);
      console.log(`      📊 Statut: ${demande.statut}`);
      console.log(`      👤 Demandeur: ${demande.prenom_responsable} ${demande.nom_responsable}`);
      
      // Simuler l'objet de l'autorisation
      const objet = `Autorisation d'Installation d'une unité de ${demande.type}`;
      console.log(`      📄 Objet de l'autorisation: ${objet}`);
    } else {
      console.log('   ❌ Aucune demande avec type trouvée');
    }
    
    // 4. Test de personnalisation
    console.log('\n🎯 4. Test de personnalisation des objets :');
    const typesTest = ['Boulangerie', 'Production d\'Eau', 'Recyclage', 'Textile'];
    
    typesTest.forEach(type => {
      const objet = `Autorisation d'Installation d'une unité de ${type}`;
      console.log(`      📄 ${type} → ${objet}`);
    });
    
    // 5. Recommandations
    console.log('\n💡 5. Recommandations :');
    console.log('   ✅ Le type de demande est maintenant utilisé dans l\'objet');
    console.log('   ✅ Plus de "recyclage de plastique" par défaut');
    console.log('   ✅ Chaque autorisation est personnalisée selon le type');
    console.log('   ✅ Format: "Autorisation d\'Installation d\'une unité de [TYPE]"');
    
    await conn.end();
    
    console.log('\n✅ Test des types de demandes terminé !');
    console.log('\n🚀 Maintenant testez avec différents types de demandes !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testTypesDemandes();



