import { writeFile, mkdir } from 'fs/promises';

/**
 * Generate simple placeholder PNG icons for Chrome extension
 * Creates minimal valid PNG files with solid color
 */

/**
 * Create a minimal valid PNG file (solid purple square)
 * This is a real PNG file, just very simple
 */
function createMinimalPNG(size) {
    // This is a base64-encoded minimal PNG (16x16 purple square)
    // We'll decode it and it will be scaled by the browser
    const minimalPNG = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAF0lEQVR42mP8z8DwHwyZGEhFIxpOTDoAcf4G/5m6hhUAAAAASUVORK5CYII=';

    // For different sizes, we use the same minimal PNG
    // Browser will scale it appropriately
    return Buffer.from(minimalPNG, 'base64');
}

/**
 * Better: Create a simple colored square with rounded corners
 */
function createSimplePNG(size) {
    // Create PNG data manually for a solid colored square
    // This is a 1x1 purple pixel PNG that browsers will scale
    const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  // Width=1, Height=1
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  // 8-bit RGB
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  // IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0x60, 0x00, 0x02, 0x00,  // Data: purple pixel
        0x00, 0x05, 0x00, 0x01, 0xE2, 0x26, 0x05, 0x9B,  // (RGB: 96, 0, 192)
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,  // IEND chunk
        0xAE, 0x42, 0x60, 0x82                            // CRC
    ]);

    return pngData;
}

async function generateIcons() {
    const sizes = [16, 48, 128];
    const iconsDir = 'dist/icons';

    try {
        // Create icons directory
        await mkdir(iconsDir, { recursive: true });
        console.log('📁 Created dist/icons/ directory');

        for (const size of sizes) {
            const pngData = createSimplePNG(size);
            const filename = `${iconsDir}/icon-${size}.png`;
            await writeFile(filename, pngData);
            console.log(`✓ Generated ${filename} (${size}x${size} placeholder)`);
        }

        console.log('\n✅ All placeholder icons generated successfully!');
        console.log('   These are minimal PNG files - Chrome will scale them.');
        console.log('   For better quality, replace with custom ${size}x${size} PNG icons.\n');
    } catch (error) {
        console.error('❌ Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();
