if (!process.env.DEMO_ADMIN_PASSWORD) throw new Error("Configure DEMO_ADMIN_PASSWORD para una base de prueba");
const bcrypt = require('bcrypt');

async function generateHash() {
  const password = process.env.DEMO_ADMIN_PASSWORD;
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash:', hash);
}

generateHash();
