const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_autorisation'
};

async function fixReferences() {
  try {
    console.log('🔧 Diagnostic et correction des références des demandes...');
    
    const conn = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion DB OK');
    
    // 1. Analyser les références existantes
    console.log('\n📊 ANALYSE DES RÉFÉRENCES EXISTANTES:');
    const [references] = await conn.execute(
      'SELECT reference, COUNT(*) as count FROM demandes GROUP BY reference ORDER BY reference'
    );
    
    references.forEach(ref => {
      if (ref.count > 1) {
        console.log(`⚠️  RÉFÉRENCE DUPLIQUÉE: ${ref.reference} (${ref.count} fois)`);
      } else {
        console.log(`✅ ${ref.reference} (${ref.count} fois)`);
      }
    });
    
    // 2. Vérifier les séquences par date
    console.log('\n📅 ANALYSE DES SÉQUENCES PAR DATE:');
    const [sequences] = await conn.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_demandes,
        GROUP_CONCAT(reference ORDER BY reference) as references
      FROM demandes 
      GROUP BY DATE(created_at) 
      ORDER BY date DESC 
      LIMIT 10
    `);
    
    sequences.forEach(seq => {
      console.log(`📅 ${seq.date}: ${seq.total_demandes} demandes - ${seq.references}`);
    });
    
    // 3. Identifier les problèmes de séquences
    console.log('\n🔍 DÉTECTION DES PROBLÈMES DE SÉQUENCES:');
    const [problemDates] = await conn.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        MIN(CAST(SUBSTRING(reference, 9) AS UNSIGNED)) as min_seq,
        MAX(CAST(SUBSTRING(reference, 9) AS UNSIGNED)) as max_seq
      FROM demandes 
      WHERE reference IS NOT NULL 
      GROUP BY DATE(created_at)
      HAVING COUNT(*) > 1
      ORDER BY date DESC
    `);
    
    if (problemDates.length === 0) {
      console.log('✅ Aucun problème de séquence détecté');
    } else {
      problemDates.forEach(prob => {
        console.log(`⚠️  ${prob.date}: ${prob.total} demandes, séquences ${prob.min_seq} à ${prob.max_seq}`);
      });
    }
    
    // 4. Proposer des corrections
    console.log('\n🛠️  PROPOSITIONS DE CORRECTION:');
    
    // Vérifier s'il y a des références NULL
    const [nullRefs] = await conn.execute(
      'SELECT COUNT(*) as count FROM demandes WHERE reference IS NULL'
    );
    
    if (nullRefs[0].count > 0) {
      console.log(`⚠️  ${nullRefs[0].count} demandes sans référence - à corriger`);
    }
    
    // Vérifier les références mal formatées
    const [malformedRefs] = await conn.execute(
      'SELECT COUNT(*) as count FROM demandes WHERE reference NOT REGEXP "^[0-9]{8}-[0-9]{4}$"'
    );
    
    if (malformedRefs[0].count > 0) {
      console.log(`⚠️  ${malformedRefs[0].count} références mal formatées - à corriger`);
    }
    
    await conn.end();
    console.log('\n✅ Diagnostic terminé');
    
  } catch (err) {
    console.error('❌ Erreur lors du diagnostic:', err);
  }
}

// Exécuter le diagnostic
fixReferences();



