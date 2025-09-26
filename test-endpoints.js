const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000';

async function testEndpoints() {
  console.log('🧪 Test des endpoints du backend...\n');

  // Test 1: Vérifier si le serveur répond
  try {
    console.log('1️⃣ Test de connexion au serveur...');
    const response = await fetch(`${BASE_URL}/api/secretaire/stats`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Réponse: ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('   ✅ Serveur répond - Erreur 401 attendue (pas de token)');
    } else if (response.status === 200) {
      const data = await response.json();
      console.log('   ✅ Serveur répond - Données reçues:', data);
    } else {
      console.log('   ❌ Serveur répond mais avec un statut inattendu');
    }
  } catch (error) {
    console.log('   ❌ Erreur de connexion:', error.message);
  }

  // Test 2: Vérifier l'endpoint des accusés
  try {
    console.log('\n2️⃣ Test de l\'endpoint des accusés...');
    const response = await fetch(`${BASE_URL}/api/secretaire/accuses-stats`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Réponse: ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('   ✅ Endpoint accessible - Erreur 401 attendue (pas de token)');
    } else {
      console.log('   ❌ Endpoint inaccessible ou erreur inattendue');
    }
  } catch (error) {
    console.log('   ❌ Erreur de connexion:', error.message);
  }

  // Test 3: Vérifier l'endpoint des transmissions
  try {
    console.log('\n3️⃣ Test de l\'endpoint des transmissions...');
    const response = await fetch(`${BASE_URL}/api/secretaire/transmissions-stats`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Réponse: ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('   ✅ Endpoint accessible - Erreur 401 attendue (pas de token)');
    } else {
      console.log('   ❌ Endpoint inaccessible ou erreur inattendue');
    }
  } catch (error) {
    console.log('   ❌ Erreur de connexion:', error.message);
  }

  console.log('\n✅ Tests terminés !');
}

testEndpoints().catch(console.error); 