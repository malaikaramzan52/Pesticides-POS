const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Replace ($) with (Rs.)
  content = content.replace(/\(\$\)/g, '(Rs.)');

  // 2. Replace $\${ with Rs. \${ in template strings
  content = content.replace(/\$\\\$\{/g, 'Rs. \\${');

  // 3. Replace >$ with >Rs.  in JSX
  content = content.replace(/>\$/g, '>Rs. ');

  // 4. Replace -$\${ with -Rs. \${
  content = content.replace(/-\$\\\$\{/g, '-Rs. \\${');

  // 5. Replace +$\${ with +Rs. \${
  content = content.replace(/\+\$\\\$\{/g, '+Rs. \\${');

  // 6. Replace $ in audit log strings (e.g. $10,000)
  content = content.replace(/\$10,000/g, 'Rs. 10,000');
  content = content.replace(/\$17,850/g, 'Rs. 17,850');
  content = content.replace(/\$8,460/g, 'Rs. 8,460');

  // 7. Check specific lines
  content = content.replace(/"\$\{/g, '"Rs. ${');
  content = content.replace(/>\$\{/g, '>Rs. {');
  content = content.replace(/Outstanding: \$/g, 'Outstanding: Rs. ');
  content = content.replace(/Credit Limit: \$/g, 'Credit Limit: Rs. ');
  content = content.replace(/Outstanding Balance: \$/g, 'Outstanding Balance: Rs. ');
  content = content.replace(/Outstanding \$/g, 'Outstanding Rs. ');
  content = content.replace(/outstanding_balance \?\s*'\$'/g, "outstanding_balance ? 'Rs.'");
  
  // Custom manual fixes
  content = content.replace(/Limit: \$/g, 'Limit: Rs. ');
  content = content.replace(/outstanding_balance > 0 \?\s*'\$'/g, "outstanding_balance > 0 ? 'Rs.'");
  content = content.replace(/-\$/g, '-Rs. ');
  content = content.replace(/\+\$/g, '+Rs. ');
  content = content.replace(/Total: \$/g, 'Total: Rs. ');
  content = content.replace(/Total (\S+) \$/g, 'Total $1 Rs. ');
  content = content.replace(/Rate: \$/g, 'Rate: Rs. ');
  content = content.replace(/Balance Due: \$/g, 'Balance Due: Rs. ');
  content = content.replace(/Grand Total: \$/g, 'Grand Total: Rs. ');
  content = content.replace(/GRAND TOTAL: \$/g, 'GRAND TOTAL: Rs. ');
  content = content.replace(/SUBTOTAL: \$/g, 'SUBTOTAL: Rs. ');
  content = content.replace(/DISCOUNT: \$/g, 'DISCOUNT: Rs. ');
  content = content.replace(/TAX: \$/g, 'TAX: Rs. ');
  content = content.replace(/PAID AMOUNT: \$/g, 'PAID AMOUNT: Rs. ');
  content = content.replace(/BALANCE DUE: \$/g, 'BALANCE DUE: Rs. ');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Converted: ${path.relative(srcDir, file)}`);
  }
});
console.log('Currency conversion completed.');
