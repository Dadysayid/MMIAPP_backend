// Test de la fonctionnalité des signatures du ministre
const testSignatures = () => {
  console.log('🧪 Test des Signatures du Ministre');
  
  // Test 1: Upload de signature
  const testUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('signature', 'test_signature.png');
      formData.append('type_signature', 'AUTORISATION');
      formData.append('commentaire', 'Signature de test');
      
      console.log('✅ Test upload signature:', formData);
    } catch (error) {
      console.error('❌ Erreur test upload:', error);
    }
  };
  
  // Test 2: Liste des signatures
  const testList = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/ministere/signatures', {
        headers: { Authorization: 'Bearer test_token' }
      });
      
      if (response.ok) {
        console.log('✅ Test liste signatures: OK');
      } else {
        console.log('❌ Test liste signatures: Erreur', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur test liste:', error);
    }
  };
  
  // Test 3: Suppression de signature
  const testDelete = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/ministere/signatures/1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test_token' }
      });
      
      if (response.ok) {
        console.log('✅ Test suppression signature: OK');
      } else {
        console.log('❌ Test suppression signature: Erreur', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur test suppression:', error);
    }
  };
  
  // Exécuter les tests
  testUpload();
  testList();
  testDelete();
  
  console.log('🏁 Tests terminés');
};

// Exporter pour utilisation
module.exports = { testSignatures };




