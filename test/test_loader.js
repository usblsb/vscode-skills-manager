const assert = require('assert');
const { extraerFrontmatter } = require('../src/skills_loader');

console.log('--- Iniciando pruebas unitarias de skills_loader ---');

// 1. Prueba de extraerFrontmatter
const sampleSkillContent = `---
name: test-skill
description: Habilidad de prueba para verificar el motor de carga de skills.
---

# Titulo de la habilidad
Contenido de la skill.
`;

const metadatos = extraerFrontmatter(sampleSkillContent);
assert.strictEqual(metadatos.name, 'test-skill', 'El nombre debe ser test-skill');
assert.strictEqual(
  metadatos.description,
  'Habilidad de prueba para verificar el motor de carga de skills.',
  'La descripcion debe coincidir'
);

console.log('Prueba 1 superada: extraerFrontmatter funciona correctamente.');

// 2. Prueba con frontmatter multilinea
const multilineSample = `---
name: multiline-skill
description: Esta es una descripcion larga
  que abarca varias lineas
  en formato YAML.
---
`;

const metaMulti = extraerFrontmatter(multilineSample);
assert.strictEqual(metaMulti.name, 'multiline-skill');
assert.ok(metaMulti.description.includes('que abarca varias lineas'));

console.log('Prueba 2 superada: soporte de descripcion multilinea en YAML.');

// 3. Prueba sin frontmatter
const sinFrontmatter = `# Titulo sin yaml
Texto plano.`;
const metaVacio = extraerFrontmatter(sinFrontmatter);
assert.deepStrictEqual(metaVacio, {});

console.log('Prueba 3 superada: gestion segura de archivos sin frontmatter.');

// 4. Prueba de escaneo de directorio con SKILL.md temporal
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { escanearDirectorio } = require('../src/skills_loader');

(async () => {
  const dirTemp = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-test-'));
  const catDir = path.join(dirTemp, 'categoria-test');
  const skillDir = path.join(catDir, 'mi-skill');
  await fs.mkdir(skillDir, { recursive: true });

  const skillMdContent = `---
name: mi-skill
description: Habilidad creada en directorio temporal para probar el escaner.
---
# Mi Skill
`;
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMdContent, 'utf8');

  const skillsDetectadas = await escanearDirectorio(dirTemp, 'TestGlobal');
  assert.strictEqual(skillsDetectadas.length, 1, 'Debe encontrar 1 skill');
  assert.strictEqual(skillsDetectadas[0].nombre, 'mi-skill');
  assert.strictEqual(skillsDetectadas[0].categoria, 'categoria-test');
  assert.strictEqual(skillsDetectadas[0].comandoMencion, '@mi-skill');

  // Limpiar
  await fs.rm(dirTemp, { recursive: true, force: true });
  console.log('Prueba 4 superada: escaner recursivo y clasificacion por categoria.');

  // 5. Prueba con estructura anidada bajo skills/ y descarte de backups
  const dirTemp2 = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-test-nested-'));
  const skillsSubdir = path.join(dirTemp2, 'skills', 'agent-orchestration', 'skill-nested');
  const backupSubdir = path.join(dirTemp2, 'corral-skill-backups', 'backup-skill');
  await fs.mkdir(skillsSubdir, { recursive: true });
  await fs.mkdir(backupSubdir, { recursive: true });

  await fs.writeFile(
    path.join(skillsSubdir, 'SKILL.md'),
    `---\nname: skill-nested\ndescription: Skill anidada.\n---\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(backupSubdir, 'SKILL.md'),
    `---\nname: backup-skill\ndescription: Backup que debe ignorarse.\n---\n`,
    'utf8'
  );

  const detectadas2 = await escanearDirectorio(dirTemp2, 'TestGlobal');
  assert.strictEqual(detectadas2.length, 1, 'Debe encontrar solo la skill activa y omitir backups');
  assert.strictEqual(detectadas2[0].nombre, 'skill-nested');
  assert.strictEqual(
    detectadas2[0].categoria,
    'agent-orchestration',
    'La categoria debe ser la subcarpeta tematica y no el contenedor generico skills'
  );

  await fs.rm(dirTemp2, { recursive: true, force: true });
  console.log('Prueba 5 superada: omision de backups y resolucion de categoria tematica.');
  console.log('--- Todas las pruebas pasaron satisfactoriamente! ---');
})();
