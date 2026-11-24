const fs = require('node:fs');
for (const file of ['dist/index.html', 'dist/sber/index.html']) {
  const prefix = file.includes('/sber/') ? '../' : './';
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/liquid-interactions\.js\?v=\d+/g, 'liquid-interactions.js?v=33');
  if (!html.includes('contact-wave.js')) html = html.replace('</head>', `<link rel="stylesheet" href="${prefix}contact-wave.css?v=33"><script type="module" src="${prefix}contact-wave.js?v=33"></script></head>`);
  fs.writeFileSync(file, html);
}
