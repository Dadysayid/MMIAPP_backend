// ==================== ENDPOINT TRANSMISSION AU SG ====================
// À ajouter dans server.js

app.put('/api/demandes/:id/transmettre-sg', adminAuth(2), async (req, res) => {
  const { id } = req.params;
  const conn = await mysql.createConnection(dbConfig);
  
  try {
    // Vérifier que la demande existe et est en statut RECEPTIONNEE
    const [demandes] = await conn.execute(
      'SELECT * FROM demandes WHERE id = ? AND statut = "RECEPTIONNEE"',
      [id]
    );
    
    if (demandes.length === 0) {
      return res.status(400).json({ 
        error: 'Demande non trouvée ou non éligible pour transmission au SG' 
      });
    }
    
    const demande = demandes[0];
    
    // Mettre à jour le statut de la demande
    await conn.execute(
      'UPDATE demandes SET statut = "TRANSMISE_AU_SG", date_transmission_sg = NOW() WHERE id = ?',
      [id]
    );
    
    // Enregistrer le suivi
    await enregistrerSuivi(
      conn, 
      id, 
      req.user.id, 
      'TRANSMISSION_AU_SG', 
      `Demande transmise au Secrétaire Général par ${req.user.nom} ${req.user.prenom}`,
      'RECEPTIONNEE',
      'TRANSMISE_AU_SG',
      { transmis_par: req.user.id, date_transmission: new Date() }
    );
    
    // Créer une notification pour le SG
    const [sgUsers] = await conn.execute(
      'SELECT id FROM utilisateurs WHERE role_id = 3' // Role SG
    );
    
    for (const sgUser of sgUsers) {
      await conn.execute(
        'INSERT INTO notifications (utilisateur_id, type, message, lu, created_at) VALUES (?, "DEMANDE_TRANSMISE", ?, 0, NOW())',
        [
          sgUser.id,
          `📋 Nouvelle demande ${demande.reference} transmise par le Secrétariat Central. Veuillez l'examiner.`
        ]
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Demande transmise au Secrétaire Général avec succès',
      demande: {
        id: demande.id,
        reference: demande.reference,
        statut: 'TRANSMISE_AU_SG',
        date_transmission_sg: new Date()
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la transmission au SG:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la transmission au Secrétaire Général' 
    });
  } finally {
    conn.end();
  }
});





