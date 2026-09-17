const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const {
  CATALOGO_AGENTES,
  expandirTilde,
  obtenerCatalogoAgentes,
  obtenerAgentePorId,
  estaAgentePresente,
  obtenerAgentesActivos,
  obtenerAgentesConSkill
} = require('../src/agent_registry');

console.log('--- Iniciando pruebas de agent_registry ---');

(async () => {
  // 1. Prueba de catalogo completo
  const catalogo = obtenerCatalogoAgentes();
  assert.ok(catalogo.length >= 60, `El catalogo debe contener al menos 60 agentes (actual: ${catalogo.length})`);
  assert.ok(catalogo.some(a => a.id === 'universal'), 'Debe incluir agente universal');
  assert.ok(catalogo.some(a => a.id === 'claude'), 'Debe incluir Claude Code');
  assert.ok(catalogo.some(a => a.id === 'windsurf'), 'Debe incluir Windsurf');
  assert.ok(catalogo.some(a => a.id === 'openhands'), 'Debe incluir OpenHands');
  assert.ok(catalogo.some(a => a.id === 'continue'), 'Debe incluir Continue');
  assert.ok(catalogo.some(a => a.id === 'goose'), 'Debe incluir Goose');
  console.log(`Prueba 1 superada: catalogo contiene ${catalogo.length} agentes correctamente estructurados.`);

  // 2. Prueba de expandirTilde
  const rutaExpandida = expandirTilde('~/.test/skills');
  assert.strictEqual(rutaExpandida, path.join(os.homedir(), '.test/skills'));
  assert.strictEqual(expandirTilde('/ruta/absoluta'), '/ruta/absoluta');
  assert.strictEqual(expandirTilde(''), '');
  console.log('Prueba 2 superada: expandirTilde resuelve rutas de usuario de forma segura.');

  // 3. Prueba de busqueda por ID
  const windsurf = obtenerAgentePorId('windsurf');
  assert.ok(windsurf, 'Debe encontrar Windsurf');
  assert.strictEqual(windsurf.nombre, 'Windsurf (Codeium)');

  const mayusculas = obtenerAgentePorId('CLAUDE');
  assert.ok(mayusculas, 'Busqueda debe ser insensible a mayusculas');
  assert.strictEqual(mayusculas.id, 'claude');

  assert.strictEqual(obtenerAgentePorId('inexistente_xyz'), null);
  console.log('Prueba 3 superada: obtenerAgentePorId busca e ignora mayusculas correctamente.');

  // 4. Prueba de agentes activos con configuracion personalizada
  const configPersonalizada = ['claude', 'windsurf'];
  const activosPersonalizados = obtenerAgentesActivos(configPersonalizada);
  assert.strictEqual(activosPersonalizados.length, 2);
  assert.strictEqual(activosPersonalizados[0].id, 'claude');
  assert.strictEqual(activosPersonalizados[1].id, 'windsurf');
  console.log('Prueba 4 superada: obtenerAgentesActivos respeta lista fija configurada.');

  // 5. Prueba de autodeteccion
  const detectados = obtenerAgentesActivos(['auto']);
  assert.ok(Array.isArray(detectados), 'Debe retornar un array');
  assert.ok(detectados.length > 0, 'Debe detectar al menos el agente universal');
  assert.ok(detectados.some(a => a.id === 'universal'), 'Universal siempre debe estar incluido');
  console.log(`Prueba 5 superada: autodeteccion ('auto') resolvio ${detectados.length} agentes presentes.`);

  // 6. Prueba de deteccion de skills por agente (obtenerAgentesConSkill)
  const dirTempPrueba = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-agents-test-'));
  const agenteSimulado1 = {
    id: 'agente_mock_1',
    nombre: 'Agente Mock 1',
    rutaGlobal: path.join(dirTempPrueba, 'agente1/skills')
  };
  const agenteSimulado2 = {
    id: 'agente_mock_2',
    nombre: 'Agente Mock 2',
    rutaGlobal: path.join(dirTempPrueba, 'agente2/skills')
  };

  // Crear skill solo en agente 1
  const skillId = 'mi-super-skill';
  await fs.mkdir(path.join(agenteSimulado1.rutaGlobal, skillId), { recursive: true });
  await fs.writeFile(path.join(agenteSimulado1.rutaGlobal, skillId, 'SKILL.md'), '---\nname: mi-super-skill\n---');

  const agentesConSkill = obtenerAgentesConSkill(skillId, [agenteSimulado1, agenteSimulado2]);
  assert.strictEqual(agentesConSkill.length, 1);
  assert.strictEqual(agentesConSkill[0].id, 'agente_mock_1');
  console.log('Prueba 6 superada: obtenerAgentesConSkill localiza agentes con la habilidad instalada.');

  // 7. Prueba de despliegue interactivo con mock de VS Code
  const { desplegarSkillEnAgente, _setVscode } = require('../src/skills_actions');
  const dirOrigen = path.join(dirTempPrueba, 'skill-desplegable');
  await fs.mkdir(dirOrigen, { recursive: true });
  await fs.writeFile(path.join(dirOrigen, 'SKILL.md'), '---\nname: skill-desplegable\n---');

  const skillParaDesplegar = {
    id: 'skill-desplegable',
    nombre: 'Skill Desplegable',
    rutaCarpeta: dirOrigen
  };

  const mockVscode = {
    workspace: {
      getConfiguration: () => ({
        get: (key, def) => {
          if (key === 'agentesActivos') return ['agente_mock_2'];
          if (key === 'usarEnlacesSimbolicos') return false;
          return def;
        }
      })
    },
    window: {
      showInformationMessage: () => {},
      showErrorMessage: () => {},
      showWarningMessage: () => {},
      showQuickPick: async (opciones) => {
        // Simular seleccion del primer agente
        return [opciones[0]];
      }
    }
  };

  // Temporariamente registrar agente mock 2 en catalogo para el test
  CATALOGO_AGENTES.push(agenteSimulado2);
  _setVscode(mockVscode);

  let callbackLlamado = false;
  await desplegarSkillEnAgente(skillParaDesplegar, () => {
    callbackLlamado = true;
  });

  const archivoDesplegado = path.join(agenteSimulado2.rutaGlobal, 'skill-desplegable', 'SKILL.md');
  const existeDesplegado = require('fs').existsSync(archivoDesplegado);
  assert.ok(existeDesplegado, 'El archivo SKILL.md debe haberse copiado al agente destino');
  assert.ok(callbackLlamado, 'El callback de finalizacion debe haberse invocado');
  console.log('Prueba 7 superada: desplegarSkillEnAgente copia exitosamente al agente seleccionado.');

  // Limpieza
  await fs.rm(dirTempPrueba, { recursive: true, force: true });
  console.log('Prueba 8 superada: limpieza de recursos temporales completada.');

  console.log('--- Todas las pruebas de agent_registry pasaron satisfactoriamente! ---');
})();
