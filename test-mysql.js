const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'ag343.myd.infomaniak.com',
      user: 'ag343_022025mmi',
      password: 'Richat2025!',
      database: 'ag343_022025mmi',
      port: 3306, // optionnel, mais explicite
      connectTimeout: 10000 // 10 secondes, optionnel
    });
    const [rows] = await conn.execute('SELECT 1');
    console.log('Connexion OK', rows);
    await conn.end();
  } catch (err) {
    console.error('Erreur connexion MySQL:', err.message);
  }
})();

