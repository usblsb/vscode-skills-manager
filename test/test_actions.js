const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { sanitizarNombre } = require('../src/skills_actions');
const { extraerFrontmatter } = require('../src/skills_loader');

console.log('--- Iniciando pruebas de skills_actions ---');

(async () => {
  // 1. Prueba de sanitizacion
  assert.strictEqual(sanitizarNombre('  Mi Habilidad Especial  '), 'mi-habilidad-especial');
  assert.strictEqual(sanitizarNombre('test_123-abc!@#$'), 'test_123-abc');
  console.log('Prueba 1 superada: sanitizarNombre genera identificadores limpios.');

  // 2. Prueba de generacion de plantilla y frontmatter
  const dirPruebas = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-test-'));
  const carpetaSkill = path.join(dirPruebas, 'mi-skill');
  await fs.mkdir(carpetaSkill, { recursive: true });

  const archivoSkillMd = path.join(carpetaSkill, 'SKILL.md');
  const contenidoPlantilla = [
    '---',
    'name: mi-skill-test',
    'description: Descripcion de prueba para test.',
    '---',
    '',
    '# mi-skill-test',
    'Contenido de instrucciones.'
  ].join('\n');

  await fs.writeFile(archivoSkillMd, contenidoPlantilla, 'utf8');

  const contenidoLeido = await fs.readFile(archivoSkillMd, 'utf8');
  const frontmatter = extraerFrontmatter(contenidoLeido);

  assert.strictEqual(frontmatter.name, 'mi-skill-test');
  assert.strictEqual(frontmatter.description, 'Descripcion de prueba para test.');
  console.log('Prueba 2 superada: plantilla SKILL.md creada y parseada correctamente.');

  // 3. Limpieza
  await fs.rm(dirPruebas, { recursive: true, force: true });
  console.log('Prueba 3 superada: eliminacion limpia de carpeta de skill de prueba.');

  console.log('--- Todas las pruebas de skills_actions pasaron satisfactoriamente! ---');
})();
