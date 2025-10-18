import { copyFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

const filesToCopy = [
    {
        from: 'src/frontend/popup/popup.html',
        to: 'dist/popup/popup.html',
        required: true
    },
    {
        from: 'src/frontend/popup/styles.css',
        to: 'dist/popup/styles.css',
        required: true
    },
    {
        from: 'src/frontend/manifest.json',
        to: 'dist/manifest.json',
        required: true
    },
    {
        from: 'src/frontend/options/options.html',
        to: 'dist/options/options.html',
        required: true
    },
    {
        from: 'src/frontend/options/options.css',
        to: 'dist/options/options.css',
        required: true
    },
    // Icons are optional - will be copied if they exist
    {
        from: 'store-assets/icons/icon-16.png',
        to: 'dist/icons/icon-16.png',
        required: false
    },
    {
        from: 'store-assets/icons/icon-48.png',
        to: 'dist/icons/icon-48.png',
        required: false
    },
    {
        from: 'store-assets/icons/icon-128.png',
        to: 'dist/icons/icon-128.png',
        required: false
    }
];

/**
 * Check if file exists
 */
async function fileExists(path) {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function copyFiles() {
    try {
        // Create required directories first
        await mkdir('dist/popup', { recursive: true });
        await mkdir('dist/options', { recursive: true });
        await mkdir('dist/icons', { recursive: true });

        let copiedCount = 0;
        let skippedCount = 0;

        for (const file of filesToCopy) {
            const exists = await fileExists(file.from);

            if (!exists) {
                if (file.required) {
                    console.error(`❌ Required file not found: ${file.from}`);
                    process.exit(1);
                } else {
                    console.log(`⚠️  Optional file not found, skipping: ${file.from}`);
                    skippedCount++;
                    continue;
                }
            }

            await copyFile(file.from, file.to);
            console.log(`✓ Copied ${file.from} to ${file.to}`);
            copiedCount++;
        }

        console.log(`\n✅ Build complete: ${copiedCount} files copied, ${skippedCount} files skipped`);
    } catch (error) {
        console.error('❌ Error copying files:', error);
        process.exit(1);
    }
}

copyFiles(); 