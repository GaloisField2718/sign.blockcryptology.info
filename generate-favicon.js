// Script pour générer favicon.ico avec emoji signature
const fs = require('fs');
const { createCanvas } = require('canvas');

// Vérifier si canvas est disponible
let canvas;
try {
  canvas = require('canvas');
} catch (e) {
  console.log('Canvas non disponible, utilisation d\'une méthode alternative...');
  // Créer un fichier SVG simple qui sera converti
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#ff7d47"/>
  <text x="50" y="75" font-size="70" text-anchor="middle" fill="white">✍️</text>
</svg>`;
  
  fs.writeFileSync('public/favicon.svg', svgContent);
  console.log('✅ Favicon SVG créé avec emoji signature');
  process.exit(0);
}

// Créer le canvas
const size = 32;
const canvasInstance = createCanvas(size, size);
const ctx = canvasInstance.getContext('2d');

// Fond orange
ctx.fillStyle = '#ff7d47';
ctx.fillRect(0, 0, size, size);

// Dessiner l'emoji
ctx.font = '24px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('✍️', size / 2, size / 2);

// Sauvegarder en PNG (fallback)
const buffer = canvasInstance.toBuffer('image/png');
fs.writeFileSync('public/favicon.png', buffer);
console.log('✅ Favicon PNG créé avec emoji signature');

// Note: La conversion en ICO nécessite un outil externe
console.log('⚠️  Pour créer favicon.ico, utilisez un convertisseur en ligne ou ImageMagick');
console.log('💡 Le SVG et PNG sont créés, vous pouvez les utiliser directement');

