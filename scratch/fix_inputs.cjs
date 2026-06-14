const fs = require('fs');
const path = require('path');

const files = [
    path.join(__dirname, '../src/pages/Signup.jsx'),
    path.join(__dirname, '../src/pages/Login.jsx')
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/bg-\[#151b2b\]/g, 'bg-theme-card-alt');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed inputs in: ${file}`);
    }
});
