const fetch = require('node-fetch');

async function testActivation() {
  console.log('🧪 Test de la route d\'activation...');
  
  try {
    // Test avec un token invalide
    const response = await fetch('http://localhost:4000/api/activation/test-token-invalide');
    const data = await response.json();
    
    console.log('📡 Réponse du serveur:');
    console.log('Status:', response.status);
    console.log('Data:', data);
    
    if (response.status === 400) {
      console.log('✅ Serveur backend fonctionne correctement');
    } else {
      console.log('❌ Problème avec le serveur backend');
    }
  } catch (error) {
    console.error('❌ Erreur de connexion au serveur:', error.message);
    console.log('💡 Assurez-vous que le serveur backend est démarré sur le port 4000');
  }
}

testActivation();
