const fs = require('fs');
const path = require('path');

const docsDir = 'c:\\Users\\nwave\\OneDrive\\Ominext\\Projects\\VFDashBoard\\docs';
const mdFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

let hasError = false;

mdFiles.forEach(file => {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const linkRegex = /\[.*?\]\(\.\/(.*?)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
        const linkPath = match[1].split('#')[0]; // Remove anchors
        const fullLinkPath = path.join(docsDir, linkPath);
        if (!fs.existsSync(fullLinkPath)) {
            console.error(`Error in ${file}: Link to ${linkPath} is broken.`);
            hasError = true;
        } else {
            console.log(`OK in ${file}: Link to ${linkPath} is valid.`);
        }
    }
});

if (!hasError) {
    console.log('All internal links are valid.');
} else {
    process.exit(1);
}
