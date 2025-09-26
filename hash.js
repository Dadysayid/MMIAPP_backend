
const bcrypt = require('bcrypt');
const passwords = [
  'superadmin2025',
  'seccentral2025',
  'secgeneral2025',
  'dgi2025',
  'ddpi2025',
  'chefservice2025',
  'commission2025',
  'mmi2025',
  'pnme2025',
  'ministre2025'
];
passwords.forEach(pwd => {
  bcrypt.hash(pwd, 10).then(hash => {
    console.log(`${pwd}: ${hash}`);
  });
});
