const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(directoryPath);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace text-white with text-theme-text unless it's a button background
    // To be safe, we'll just replace all text-white and fix buttons later if needed
    content = content.replace(/text-white/g, 'text-theme-text');
    content = content.replace(/text-gray-400/g, 'text-theme-text-muted');
    content = content.replace(/border-white\/10/g, 'border-theme-border');
    content = content.replace(/border-white\/5/g, 'border-theme-border');
    content = content.replace(/bg-white\/5/g, 'bg-theme-glass');
    content = content.replace(/hover:bg-white\/10/g, 'hover:bg-theme-border');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${file}`);
    }
});
