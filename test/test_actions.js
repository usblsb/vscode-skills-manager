const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { sanitizarNombre, obtenerRutasGlobalesEspejo } = require('../src/skills_actions');
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

  // 4. Prueba de rutas globales en espejo
  const rutasEspejo = obtenerRutasGlobalesEspejo();
  assert.ok(rutasEspejo.length >= 3, 'Deben existir al menos 3 rutas espejo (.agents, .gemini y .claude)');
  assert.ok(rutasEspejo.some(r => r.includes('.agents')), 'Debe incluir ruta universal .agents/skills');
  assert.ok(rutasEspejo.some(r => r.includes('.gemini')), 'Debe incluir ruta gemini config/skills');
  assert.ok(rutasEspejo.some(r => r.includes('.claude')), 'Debe incluir ruta claude skills');
  console.log('Prueba 4 superada: resolucion de rutas globales espejo universal, gemini y claude.');

  // 5. Prueba de copiarSkillABackup
  const { copiarSkillABackup, eliminarSkill } = require('../src/skills_actions');
  const dirTempSkill = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-backup-test-'));
  const carpetaSkillOrigen = path.join(dirTempSkill, 'test-respaldo');
  await fs.mkdir(carpetaSkillOrigen, { recursive: true });
  await fs.writeFile(path.join(carpetaSkillOrigen, 'SKILL.md'), '---\nname: test-respaldo\n---\n# Test Respaldo\n', 'utf8');

  const objSkillOrigen = {
    nombre: 'test-respaldo',
    rutaCarpeta: carpetaSkillOrigen,
    origen: 'Propia'
  };

  const resultadoCopia = await copiarSkillABackup(objSkillOrigen, null, true);
  assert.strictEqual(resultadoCopia, true, 'copiarSkillABackup debe devolver true al copiar');

  const { resolverRutaBackup } = require('../src/skills_loader');
  const rutaEnBackup = path.join(resolverRutaBackup(), 'test-respaldo');
  const statsEnBackup = await fs.stat(path.join(rutaEnBackup, 'SKILL.md'));
  assert.ok(statsEnBackup.isFile(), 'El archivo SKILL.md debe existir en la carpeta de backup');

  console.log('Prueba 5 superada: copiarSkillABackup almacena la copia en el baul.');

  // 6. Prueba de eliminacion de skill del baul
  const skillEnBackup = {
    nombre: 'test-respaldo',
    rutaCarpeta: rutaEnBackup,
    origen: 'Backup',
    esBackup: true
  };
  const { _setVscode } = require('../src/skills_actions');
  _setVscode({
    workspace: {
      getConfiguration: () => ({ get: (k, d) => d }),
      workspaceFolders: []
    },
    window: {
      showInformationMessage: () => {},
      showErrorMessage: () => {},
      showWarningMessage: async () => 'Eliminar del Baúl'
    }
  });

  await eliminarSkill(skillEnBackup);
  let existeDespuesDeBorrar = true;
  try {
    await fs.stat(rutaEnBackup);
  } catch (e) {
    existeDespuesDeBorrar = false;
  }
  assert.strictEqual(existeDespuesDeBorrar, false, 'La skill debe haber sido eliminada del baul tras confirmacion');

  await fs.rm(dirTempSkill, { recursive: true, force: true });
  console.log('Prueba 6 superada: eliminarSkill remueve permanentemente del baul con confirmacion.');

  // 7. Prueba de respaldarTodasLasSkillsEnBackup
  const { respaldarTodasLasSkillsEnBackup } = require('../src/skills_actions');
  let callbackEjecutado = false;
  await respaldarTodasLasSkillsEnBackup(() => {
    callbackEjecutado = true;
  });
  assert.strictEqual(callbackEjecutado, true, 'El callback de respaldarTodasLasSkillsEnBackup debe ejecutarse');
  console.log('Prueba 7 superada: respaldarTodasLasSkillsEnBackup ejecuta el respaldo de todas las skills activas.');

  // 8. Prueba de copiarSkillAClaude y resolucion de ruta Claude
  const { resolverRutaPropia, resolverRutaClaude } = require('../src/skills_loader');
  const { copiarSkillAClaude } = require('../src/skills_actions');
  const rutaClaude = resolverRutaClaude();
  assert.ok(rutaClaude.includes('.claude'), 'Ruta Claude debe apuntar a carpeta .claude/skills');

  const dirTempSkillClaude = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-claude-test-'));
  const carpetaSkillClaude = path.join(dirTempSkillClaude, 'skill-para-claude');
  await fs.mkdir(carpetaSkillClaude, { recursive: true });
  await fs.writeFile(path.join(carpetaSkillClaude, 'SKILL.md'), '---\nname: skill-para-claude\n---\n# Claude Skill\n', 'utf8');

  const objSkillClaude = {
    nombre: 'skill-para-claude',
    rutaCarpeta: carpetaSkillClaude,
    origen: 'Propia'
  };

  let callbackClaudeLlamado = false;
  await copiarSkillAClaude(objSkillClaude, () => {
    callbackClaudeLlamado = true;
  });
  assert.strictEqual(callbackClaudeLlamado, true, 'El callback de copiarSkillAClaude debe ejecutarse');

  const rutaDestinoClaude = path.join(rutaClaude, 'skill-para-claude');
  const statsClaude = await fs.stat(path.join(rutaDestinoClaude, 'SKILL.md'));
  assert.ok(statsClaude.isFile(), 'El archivo SKILL.md debe existir en .claude/skills');

  // Limpieza del test
  await fs.rm(rutaDestinoClaude, { recursive: true, force: true });
  await fs.rm(path.join(resolverRutaPropia(), 'skill-para-claude'), { recursive: true, force: true });
  await fs.rm(dirTempSkillClaude, { recursive: true, force: true });
  console.log('Prueba 8 superada: copiarSkillAClaude copia correctamente a .claude/skills.');

  // 9. Prueba de replica automatica en espejo local (.claude/skills) al copiar a local
  const { obtenerRutasLocalesEspejo, copiarSkillALocal } = require('../src/skills_actions');
  const rutasLocalesEspejo = obtenerRutasLocalesEspejo();
  assert.ok(rutasLocalesEspejo.length >= 2, 'Deben existir al menos 2 rutas espejo locales (.agents y .claude)');
  assert.ok(rutasLocalesEspejo.some(r => r.includes('.agents')), 'Debe incluir ruta universal local .agents/skills');
  assert.ok(rutasLocalesEspejo.some(r => r.includes('.claude')), 'Debe incluir ruta claude local .claude/skills');

  const dirTempSkillAuto = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-auto-test-'));
  const carpetaSkillAuto = path.join(dirTempSkillAuto, 'skill-auto-espejo');
  await fs.mkdir(carpetaSkillAuto, { recursive: true });
  await fs.writeFile(path.join(carpetaSkillAuto, 'SKILL.md'), '---\nname: skill-auto-espejo\n---\n# Auto Espejo\n', 'utf8');

  const objSkillAuto = {
    nombre: 'skill-auto-espejo',
    rutaCarpeta: carpetaSkillAuto,
    origen: 'Catalogo'
  };

  await copiarSkillALocal(objSkillAuto);
  const rutaDestinoAgents = path.join(resolverRutaPropia(), 'skill-auto-espejo');
  const rutaDestinoClaudeAuto = path.join(resolverRutaClaude(), 'skill-auto-espejo');

  const statsAgents = await fs.stat(path.join(rutaDestinoAgents, 'SKILL.md'));
  const statsClaudeAuto = await fs.stat(path.join(rutaDestinoClaudeAuto, 'SKILL.md'));
  assert.ok(statsAgents.isFile(), 'El archivo SKILL.md debe existir en .agents/skills');
  assert.ok(statsClaudeAuto.isFile(), 'El archivo SKILL.md debe haberse replicado automaticamente en .claude/skills');

  // Limpieza
  await fs.rm(rutaDestinoAgents, { recursive: true, force: true });
  await fs.rm(rutaDestinoClaudeAuto, { recursive: true, force: true });
  await fs.rm(dirTempSkillAuto, { recursive: true, force: true });
  console.log('Prueba 9 superada: replica automatica en espejo local (.agents <-> .claude) verificada.');

  console.log('--- Todas las pruebas de skills_actions pasaron satisfactoriamente! ---');
})();
