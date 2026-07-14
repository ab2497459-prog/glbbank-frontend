require('dotenv').config();
const { seedAdmin } = require('./seedAdmin');

seedAdmin()
  .then(u => {
    console.log(JSON.stringify(u, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
