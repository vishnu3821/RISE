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

    // A simple regex to replace text-theme-text with text-white if it's in the same class string as bg-brand-primary or bg-blue or from-brand-primary
    // But since order matters, it's easier to just do a global replace for common button classes
    
    // Fix buttons with bg-brand-primary
    content = content.replace(/bg-brand-primary([^"]*)text-theme-text/g, 'bg-brand-primary$1text-white');
    content = content.replace(/text-theme-text([^"]*)bg-brand-primary/g, 'text-white$1bg-brand-primary');

    // Fix buttons with bg-brand-secondary
    content = content.replace(/bg-brand-secondary([^"]*)text-theme-text/g, 'bg-brand-secondary$1text-white');
    content = content.replace(/text-theme-text([^"]*)bg-brand-secondary/g, 'text-white$1bg-brand-secondary');

    // Fix linear gradients
    content = content.replace(/from-brand-primary([^"]*)text-theme-text/g, 'from-brand-primary$1text-white');
    content = content.replace(/text-theme-text([^"]*)from-brand-primary/g, 'text-white$1from-brand-primary');

    // Fix red buttons
    content = content.replace(/bg-red-500([^"]*)text-theme-text/g, 'bg-red-500$1text-white');
    content = content.replace(/text-theme-text([^"]*)bg-red-500/g, 'text-white$1bg-red-500');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed buttons in: ${file}`);
    }
});
