const { openScriptDatabase } = require('../src/config/scriptDatabase');
const db = openScriptDatabase(undefined, { readOnly: true });

db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%faq%'`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Tablas FAQs encontradas:', rows.length === 0 ? 'Ninguna' : '');
    rows.forEach(row => console.log('  -', row.name));
  }
  db.close();
});
