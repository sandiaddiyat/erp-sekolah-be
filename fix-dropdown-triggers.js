const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src/app'));

let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Match DropdownMenuTrigger with render={<Button ... />}
  const regex = /<DropdownMenuTrigger\s+render=\{\s*<Button\s+variant="outline"\s+size="sm"\s+className="([^"]+)"\s*\/>\s*\}\s*>/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, (match, className) => {
      // Create a new className by combining the base classes and the ones from the Button
      const newClassName = `inline-flex items-center justify-center rounded-[12px] text-[0.8rem] font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${className}`;
      return `<DropdownMenuTrigger\n                className="${newClassName}"\n              >`;
    });
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
    changedFiles++;
  }
}

console.log(`Done. Updated ${changedFiles} files.`);
