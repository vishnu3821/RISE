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

    content = content.replace(/bg-\[#121c33\]/g, 'bg-theme-card');
    content = content.replace(/bg-\[#0a0f1c\]/g, 'bg-theme-card-alt');
    content = content.replace(/bg-\[#0b1326\]/g, 'bg-theme-bg');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${file}`);
    }
});
