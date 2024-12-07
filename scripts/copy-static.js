import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';

const filesToCopy = [
    {
        from: 'src/frontend/popup/popup.html',
        to: 'dist/popup/popup.html'
    },
    {
        from: 'src/frontend/popup/styles.css',
        to: 'dist/popup/styles.css'
    },
    {
        from: 'src/frontend/manifest.json',
        to: 'dist/manifest.json'
    },
    {
        from: 'src/frontend/options/options.html',
        to: 'dist/options/options.html'
    },
    {
        from: 'src/frontend/options/options.css',
        to: 'dist/options/options.css'
    },
    {
        from: 'store-assets/icons/icon-16.png',
        to: 'dist/icons/icon-16.png'
    },
    {
        from: 'store-assets/icons/icon-48.png',
        to: 'dist/icons/icon-48.png'
    },
    {
        from: 'store-assets/icons/icon-128.png',
        to: 'dist/icons/icon-128.png'
    }
];

async function copyFiles() {
    try {
        // Create required directories first
        await mkdir('dist/popup', { recursive: true });
        await mkdir('dist/options', { recursive: true });
        await mkdir('dist/icons', { recursive: true });
        
        for (const file of filesToCopy) {
            await copyFile(file.from, file.to);
            console.log(`Copied ${file.from} to ${file.to}`);
        }
    } catch (error) {
        console.error('Error copying files:', error);
        process.exit(1);
    }
}

copyFiles(); 