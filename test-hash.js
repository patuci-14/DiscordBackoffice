const bcrypt = require('bcryptjs');

const password = 'ACZUQqm9Gk892**Jukp_!QsCTU6jpf';
const hash = '$2b$10$vnL8Z27X7ukdSKPw3XY6.Olm1pm0TRGZWSNw6eOa4EbAVCSfgvtLO';

console.log('Testing password:', password);
console.log('Testing hash:', hash);

bcrypt.compare(password, hash)
  .then(result => {
    console.log('Result:', result);
    if (result) {
      console.log('SUCCESS: Password matches hash!');
    } else {
      console.log('FAILED: Password does not match hash');
      // Try generating a new hash
      return bcrypt.hash(password, 10);
    }
  })
  .then(newHash => {
    if (newHash) {
      console.log('New hash generated:', newHash);
      return bcrypt.compare(password, newHash);
    }
  })
  .then(verifyResult => {
    if (verifyResult !== undefined) {
      console.log('New hash verification:', verifyResult ? 'SUCCESS' : 'FAILED');
    }
  })
  .catch(err => {
    console.error('Error:', err);
  });

