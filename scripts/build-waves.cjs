// Node 24+: no dependencies; keep the MIT engine separate from our page adapter.
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
for (const name of ['controller', 'capture', 'model', 'renderer']) {
  const source = fs.readFileSync(`vendor/distortion-waves/${name}.ts`, 'utf8');
  const js = stripTypeScriptTypes(source, { mode: 'transform' })
    .replace(/from "\.\/(model|renderer|capture)"/g, 'from "./$1.js"');
  fs.writeFileSync(`dist/vendor/distortion-waves/${name}.js`, js);
}
