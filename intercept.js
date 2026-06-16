const fs = require('fs');
const file = 'node_modules/.pnpm/corsair@0.1.76/node_modules/corsair/dist/chunk-LIZVHWQK.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/function Je\([^)]*\)\s*{/g, '$&\nconsole.log("Je called with:", arguments);');
fs.writeFileSync(file, content);
