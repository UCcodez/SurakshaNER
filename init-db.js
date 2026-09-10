const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('disaster.db');
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

console.log('Database initialized: disaster.db');
db.close();