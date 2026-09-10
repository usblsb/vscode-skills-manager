const assert = require('assert');
const {
  inicializarEstado,
  obtenerFavoritas,
  esFavorita,
  conmutarFavorita,
  obtenerInactivas,
  esInactiva,
  conmutarActiva,
  debeOcultarInactivas,
  conmutarOcultarInactivas,
  reiniciarMemoriaPruebas
} = require('../src/skills_state');

console.log('--- Iniciando pruebas de skills_state ---');

(async () => {
  reiniciarMemoriaPruebas();

  // 1. Estado inicial vacio
  assert.deepStrictEqual(obtenerFavoritas(), []);
  assert.deepStrictEqual(obtenerInactivas(), []);
  assert.strictEqual(debeOcultarInactivas(), false);
  console.log('Prueba 1 superada: estado inicial por defecto correcto.');

  // 2. Conmutar favoritas
  const skillA = 'Global:agent-orchestration:mi-skill-a';
  const esFav1 = await conmutarFavorita(skillA);
  assert.strictEqual(esFav1, true);
  assert.strictEqual(esFavorita(skillA), true);
  assert.strictEqual(obtenerFavoritas().length, 1);

  // Desmarcar favorita
  const esFav2 = await conmutarFavorita(skillA);
  assert.strictEqual(esFav2, false);
  assert.strictEqual(esFavorita(skillA), false);
  assert.strictEqual(obtenerFavoritas().length, 0);
  console.log('Prueba 2 superada: conmutar favorita agrega y elimina correctamente.');

  // 3. Conmutar inactivas
  const skillB = 'Global:ops-and-setup:mi-skill-b';
  const esInact1 = await conmutarActiva(skillB);
  assert.strictEqual(esInact1, true);
  assert.strictEqual(esInactiva(skillB), true);

  const esInact2 = await conmutarActiva(skillB);
  assert.strictEqual(esInact2, false);
  assert.strictEqual(esInactiva(skillB), false);
  console.log('Prueba 3 superada: conmutar activa/inactiva funciona como toggle.');

  // 4. Conmutar visibilidad de inactivas
  const vis1 = await conmutarOcultarInactivas();
  assert.strictEqual(vis1, true);
  assert.strictEqual(debeOcultarInactivas(), true);

  const vis2 = await conmutarOcultarInactivas();
  assert.strictEqual(vis2, false);
  assert.strictEqual(debeOcultarInactivas(), false);
  console.log('Prueba 4 superada: alternancia de ocultar inactivas verificada.');

  // 5. Prueba con simulacion de globalState de VS Code
  const almacenSimulado = new Map();
  const contextSimulado = {
    globalState: {
      get: (clave, valorDefecto) => almacenSimulado.has(clave) ? almacenSimulado.get(clave) : valorDefecto,
      update: async (clave, valor) => {
        almacenSimulado.set(clave, valor);
      }
    }
  };

  inicializarEstado(contextSimulado);
  await conmutarFavorita('skill-persistencia');
  assert.strictEqual(esFavorita('skill-persistencia'), true);
  assert.deepStrictEqual(almacenSimulado.get('skillsManager.favoritas'), ['skill-persistencia']);

  console.log('Prueba 5 superada: compatibilidad con globalState de VS Code.');
  console.log('--- Todas las pruebas de skills_state pasaron satisfactoriamente! ---');
})();
