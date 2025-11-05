#!/bin/bash
# Script pour créer favicon.ico avec emoji signature

cd "$(dirname "$0")/public"

# Créer un fichier ICO basique à partir du SVG
# Méthode 1: Utiliser ImageMagick si disponible
if command -v convert &> /dev/null; then
    convert -background '#ff7d47' -fill white -font DejaVu-Sans -pointsize 24 \
            label:'✍️' -resize 32x32 favicon.ico
    echo "✅ Favicon.ico créé avec ImageMagick"
    exit 0
fi

# Méthode 2: Utiliser inkscape si disponible
if command -v inkscape &> /dev/null; then
    inkscape favicon.svg --export-filename=favicon.png --export-width=32 --export-height=32
    # Convertir PNG en ICO nécessite encore ImageMagick ou un autre outil
    echo "✅ Favicon PNG créé avec Inkscape"
    echo "⚠️  Utilisez un convertisseur en ligne pour créer favicon.ico"
    exit 0
fi

# Méthode 3: Créer un fichier HTML qui génère le favicon
cat > favicon-generator.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Favicon Generator</title>
</head>
<body>
    <canvas id="canvas" width="32" height="32" style="display:none;"></canvas>
    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        // Fond orange
        ctx.fillStyle = '#ff7d47';
        ctx.fillRect(0, 0, 32, 32);
        
        // Emoji signature
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✍️', 16, 16);
        
        // Télécharger comme PNG
        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'favicon.png';
            a.click();
            console.log('Favicon PNG généré !');
        });
    </script>
</body>
</html>
EOF

echo "📝 Fichier favicon-generator.html créé"
echo "💡 Ouvrez-le dans un navigateur pour générer favicon.png"
echo "💡 Ensuite, utilisez https://convertio.co/png-ico/ pour convertir en ICO"

# Méthode 4: Utiliser le SVG directement (supporté par les navigateurs modernes)
echo ""
echo "✅ Le fichier favicon.svg existe déjà et sera utilisé par les navigateurs modernes"

