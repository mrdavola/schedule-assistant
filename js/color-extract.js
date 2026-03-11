// Extract dominant color from an image and apply as theme
const ColorExtract = (() => {

  // Extract the dominant color from an image src (base64 or URL)
  function fromImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // Sample at small size for performance
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Count color frequencies, ignoring near-white and near-black pixels
        const colorCounts = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue; // skip transparent
          const brightness = (r + g + b) / 3;
          if (brightness > 240 || brightness < 15) continue; // skip near-white/black
          // Quantize to reduce noise
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        // Find most frequent color
        let maxCount = 0;
        let dominant = '0,122,255'; // fallback blue
        for (const [color, count] of Object.entries(colorCounts)) {
          if (count > maxCount) {
            maxCount = count;
            dominant = color;
          }
        }

        const [r, g, b] = dominant.split(',').map(Number);
        resolve({ r, g, b, hex: rgbToHex(r, g, b) });
      };
      img.onerror = () => {
        resolve({ r: 0, g: 122, b: 255, hex: '#007AFF' }); // fallback
      };
      img.src = src;
    });
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // Apply extracted color as CSS custom properties on the document
  function applyTheme(color) {
    document.documentElement.style.setProperty('--mic-bg', color.hex);
    document.documentElement.style.setProperty('--accent', color.hex);
    // Slightly darker version for hover states
    const darker = {
      r: Math.max(0, color.r - 30),
      g: Math.max(0, color.g - 30),
      b: Math.max(0, color.b - 30),
    };
    document.documentElement.style.setProperty('--mic-bg-hover', rgbToHex(darker.r, darker.g, darker.b));
  }

  // Full pipeline: extract from logo and apply
  async function applyFromLogo(logoSrc) {
    if (!logoSrc) return;
    const color = await fromImage(logoSrc);
    applyTheme(color);
    return color;
  }

  return { fromImage, applyTheme, applyFromLogo };
})();
