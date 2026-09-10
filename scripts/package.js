const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

const releaseDir = path.join(__dirname, '..', 'release');
if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
}

const vsixName = `vscode-skills-manager-${version}.vsix`;
const vsixPath = path.join(releaseDir, vsixName);
const iconPath = path.join(__dirname, '..', 'media', 'icon.png');
const swiftScript = path.join(__dirname, 'set_icon.swift');

console.log(`[1/3] Compilando paquete VSIX para la version ${version}...`);
try {
    execSync(`npx @vscode/vsce package --out "${vsixPath}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
    });
} catch (error) {
    console.error('Error al compilar VSIX con vsce:', error.message);
    process.exit(1);
}

if (process.platform === 'darwin' && fs.existsSync(iconPath) && fs.existsSync(swiftScript)) {
    console.log('[2/3] Asignando icono personalizado de Finder al archivo VSIX en macOS...');
    try {
        execSync(`swift "${swiftScript}" "${iconPath}" "${vsixPath}"`, {
            stdio: 'inherit'
        });
    } catch (iconError) {
        console.warn('Aviso: No se pudo asignar el icono de Finder:', iconError.message);
    }
} else {
    console.log('[2/3] Omitiendo asignacion de icono de Finder (no es macOS o falta el icono).');
}

console.log(`[3/3] Paquete generado exitosamente: ${vsixPath}`);
