const assert = require('assert');
const {
  extraerFrontmatter,
  resolverRutaPropia,
  resolverRutaGlobal,
  resolverRutaBackup,
  cargarTodasLasSkills,
  procesarArchivoSkill
} = require('../src/skills_loader');

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
  assert.strictEqual(skillsDetectadas[0].comandoMencion, '/mi-skill');

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

  // 6. Prueba de rutas estandar y soporte de categoria en frontmatter
  const rutaGlobal = resolverRutaGlobal();
  assert.ok(rutaGlobal.includes('.agents') || rutaGlobal.includes('skills'), 'Ruta global universal debe apuntar a carpeta de skills');
  assert.ok(!rutaGlobal.startsWith('~'), 'La tilde ~ debe haberse expandido');

  const rutaPropia = resolverRutaPropia();
  assert.ok(rutaPropia.includes('.agents'), 'Ruta propia por defecto debe incluir .agents/skills');

  const dirSkillTest = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-cat-test-'));
  const archivoSkillMd = path.join(dirSkillTest, 'SKILL.md');
  await fs.writeFile(
    archivoSkillMd,
    `---\nname: skill-cat-test\ndescription: Test con categoria.\ncategory: DevOps\n---\n# DevOps Skill\n`,
    'utf8'
  );

  const resultadoSkill = await procesarArchivoSkill(archivoSkillMd, 'General', 'Test');
  assert.strictEqual(resultadoSkill.categoria, 'DevOps', 'Debe tomar la categoria indicada en el frontmatter');
  assert.strictEqual(resultadoSkill.comandoMencion, '/skill-cat-test', 'Debe usar prefijo slash /');

  await fs.rm(dirSkillTest, { recursive: true, force: true });
  console.log('Prueba 6 superada: resolucion de rutas estandar y categoria en frontmatter.');

  // 7. Prueba de ruta del Baul de Backup y cargarTodasLasSkills
  const rutaBackup = resolverRutaBackup();
  assert.ok(rutaBackup.includes('.skills-backup'), 'Ruta de backup debe apuntar a .skills-backup');
  assert.ok(!rutaBackup.startsWith('~'), 'La tilde ~ de ruta backup debe expandirse');

  const resultadoCarga = await cargarTodasLasSkills();
  assert.ok(Array.isArray(resultadoCarga.backup), 'cargarTodasLasSkills debe incluir array backup');
  assert.ok(Array.isArray(resultadoCarga.propias), 'cargarTodasLasSkills debe incluir array propias');
  assert.ok(Array.isArray(resultadoCarga.globales), 'cargarTodasLasSkills debe incluir array globales');
  console.log('Prueba 7 superada: resolucion de baul de backup y estructura de retorno.');

  console.log('--- Todas las pruebas pasaron satisfactoriamente! ---');
})();
