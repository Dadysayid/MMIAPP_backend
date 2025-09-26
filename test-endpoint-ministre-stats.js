const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisations'
};

async function testEndpointMinistreStats() {
  try {
    console.log('🧪 Test de l\'endpoint /api/ministere/stats...\n');
    
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Vérifier les demandes au statut TRANSMISE_AU_MINISTRE
    console.log('📤 1. Demandes au statut TRANSMISE_AU_MINISTRE :');
    const [demandesMinistre] = await conn.execute(`
      SELECT 
        id, reference, type, statut, created_at, updated_at
      FROM demandes
      WHERE statut = 'TRANSMISE_AU_MINISTRE'
      ORDER BY updated_at DESC
    `);
    
    if (demandesMinistre.length === 0) {
      console.log('   ❌ Aucune demande au statut TRANSMISE_AU_MINISTRE');
    } else {
      console.log(`   ✅ ${demandesMinistre.length} demande(s) au statut TRANSMISE_AU_MINISTRE :`);
      demandesMinistre.forEach(d => {
        console.log(`      📋 ${d.reference} - ${d.type} - Transmis le: ${d.updated_at}`);
      });
    }
    
    // 2. Vérifier les demandes clôturées avec signature Ministre
    console.log('\n✅ 2. Demandes clôturées avec signature Ministre :');
    const [demandesSignees] = await conn.execute(`
      SELECT 
        d.id, d.reference, d.type, d.statut, d.updated_at
      FROM demandes d
      WHERE d.statut = 'CLOTUREE' 
      AND d.id IN (
        SELECT demande_id 
        FROM suivi_demandes 
        WHERE action = 'SIGNATURE_MINISTRE'
      )
      ORDER BY d.updated_at DESC
    `);
    
    if (demandesSignees.length === 0) {
      console.log('   ❌ Aucune demande clôturée avec signature Ministre');
    } else {
      console.log(`   ✅ ${demandesSignees.length} demande(s) clôturée(s) avec signature Ministre :`);
      demandesSignees.forEach(d => {
        console.log(`      📋 ${d.reference} - ${d.type} - Clôturée le: ${d.updated_at}`);
      });
    }
    
    // 3. Vérifier les demandes urgentes (en attente > 7 jours)
    console.log('\n🚨 3. Demandes urgentes (en attente > 7 jours) :');
    const [demandesUrgentes] = await conn.execute(`
      SELECT 
        id, reference, type, statut, updated_at,
        DATEDIFF(NOW(), updated_at) AS jours_attente
      FROM demandes
      WHERE statut = 'TRANSMISE_AU_MINISTRE'
      AND DATEDIFF(NOW(), updated_at) > 7
      ORDER BY updated_at ASC
    `);
    
    if (demandesUrgentes.length === 0) {
      console.log('   ✅ Aucune demande urgente (toutes traitées dans les délais)');
    } else {
      console.log(`   🚨 ${demandesUrgentes.length} demande(s) urgente(s) :`);
      demandesUrgentes.forEach(d => {
        console.log(`      🔴 ${d.reference} - ${d.type} - En attente depuis ${d.jours_attente} jour(s)`);
      });
    }
    
    // 4. Test de la requête exacte de l'endpoint
    console.log('\n🔍 4. Test de la requête exacte de l\'endpoint :');
    
    try {
      // Total des dossiers transmis au Ministre
      const [totalResult] = await conn.execute(`
        SELECT COUNT(*) as total
        FROM demandes
        WHERE statut = 'TRANSMISE_AU_MINISTRE'
      `);
      
      // Dossiers en attente de signature
      const [enAttenteResult] = await conn.execute(`
        SELECT COUNT(*) as en_attente
        FROM demandes
        WHERE statut = 'TRANSMISE_AU_MINISTRE'
      `);
      
      // Dossiers signés et clôturés
      const [signeesResult] = await conn.execute(`
        SELECT COUNT(*) as signees
        FROM demandes
        WHERE statut = 'CLOTUREE' 
        AND id IN (
          SELECT demande_id 
          FROM suivi_demandes 
          WHERE action = 'SIGNATURE_MINISTRE'
        )
      `);
      
      // Dossiers urgents
      const [urgentResult] = await conn.execute(`
        SELECT COUNT(*) as urgent
        FROM demandes
        WHERE statut = 'TRANSMISE_AU_MINISTRE'
        AND DATEDIFF(NOW(), updated_at) > 7
      `);
      
      const stats = {
        total: totalResult[0].total || 0,
        enAttente: enAttenteResult[0].en_attente || 0,
        signees: signeesResult[0].signees || 0,
        urgent: urgentResult[0].urgent || 0
      };
      
      console.log('   ✅ Requête exécutée avec succès');
      console.log(`   📊 Statistiques calculées:`);
      console.log(`      - Total: ${stats.total}`);
      console.log(`      - En attente: ${stats.enAttente}`);
      console.log(`      - Signées: ${stats.signees}`);
      console.log(`      - Urgentes: ${stats.urgent}`);
      
    } catch (testError) {
      console.log(`   ❌ Erreur lors du test: ${testError.message}`);
    }
    
    // 5. Vérifier l'authentification Ministre
    console.log('\n🔐 5. Vérification de l\'authentification Ministre :');
    try {
      const [utilisateursMinistre] = await conn.execute(`
        SELECT id, nom_responsable, prenom_responsable, email, role_id
        FROM utilisateurs
        WHERE role_id = 7
        ORDER BY id
      `);
      
      if (utilisateursMinistre.length === 0) {
        console.log('   ❌ Aucun utilisateur Ministre trouvé (role_id = 7)');
        console.log('   💡 Créez un utilisateur avec role_id = 7');
      } else {
        console.log(`   👑 ${utilisateursMinistre.length} utilisateur(s) Ministre :`);
        utilisateursMinistre.forEach(u => {
          console.log(`      👤 ID: ${u.id} - ${u.prenom_responsable} ${u.nom_responsable} - ${u.email}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Erreur vérification utilisateurs: ${error.message}`);
    }
    
    await conn.end();
    
    console.log('\n✅ Test terminé !');
    console.log('\n🚀 Actions à effectuer :');
    console.log('   1. Redémarrez le serveur backend');
    console.log('   2. Testez l\'endpoint /api/ministere/stats');
    console.log('   3. Vérifiez que le dashboard Ministre charge sans erreur 404');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testEndpointMinistreStats();



