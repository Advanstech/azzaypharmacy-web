const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./app', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Fix `const { theme } = useTheme();` -> `const { theme, resolvedTheme } = useTheme();`
    // but only if `resolvedTheme` is not already there
    content = content.replace(/const\s*{\s*theme\s*}\s*=\s*useTheme\(\);/g, "const { theme, resolvedTheme } = useTheme();");
    content = content.replace(/const\s*{\s*theme,\s*setTheme\s*}\s*=\s*useTheme\(\);/g, "const { theme, setTheme, resolvedTheme } = useTheme();");
    content = content.replace(/const\s*{\s*setTheme,\s*theme\s*}\s*=\s*useTheme\(\);/g, "const { setTheme, theme, resolvedTheme } = useTheme();");

    // Fix `const isDark = mounted && theme === 'dark';`
    content = content.replace(/const isDark = mounted && theme === 'dark';/g, "const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');");
    
    // Fix `const isDark = theme === 'dark';`
    content = content.replace(/const isDark = theme === 'dark';/g, "const isDark = resolvedTheme === 'dark' || theme === 'dark';");

    // Also some might be `const isDark = mounted && theme === "dark";`
    content = content.replace(/const isDark = mounted && theme === "dark";/g, "const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');");

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed', filePath);
    }
  }
});
