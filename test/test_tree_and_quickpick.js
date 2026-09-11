const assert = require('assert');
const { SkillsTreeProvider, SkillTreeItem } = require('../src/skills_tree_provider');
const {
  reiniciarMemoriaPruebas,
  conmutarFavorita,
  conmutarActiva,
  conmutarOcultarInactivas
} = require('../src/skills_state');

console.log('--- Iniciando pruebas de integracion de SkillsTreeProvider ---');

(async () => {
  reiniciarMemoriaPruebas();

  const provider = new SkillsTreeProvider();

  // Mock de datos con la nueva estructura
  provider.datosSkills = {
    propias: [
      { id: 'Propia:cat1:skill-1', nombre: 'skill-1', categoria: 'cat1', origen: 'Propia', comandoMencion: '@skill-1' },
      { id: 'Propia:cat1:skill-2', nombre: 'skill-2', categoria: 'cat1', origen: 'Propia', comandoMencion: '@skill-2' }
    ],
    catalogo: [
      { id: 'Catálogo Remoto:cat2:skill-3', nombre: 'skill-3', categoria: 'cat2', origen: 'Catálogo Remoto', esCatalogo: true, comandoMencion: '@skill-3' }
    ],
    workspace: [],
    todas: [
      { id: 'Propia:cat1:skill-1', nombre: 'skill-1', categoria: 'cat1', origen: 'Propia', comandoMencion: '@skill-1' },
      { id: 'Propia:cat1:skill-2', nombre: 'skill-2', categoria: 'cat1', origen: 'Propia', comandoMencion: '@skill-2' },
      { id: 'Catálogo Remoto:cat2:skill-3', nombre: 'skill-3', categoria: 'cat2', origen: 'Catálogo Remoto', esCatalogo: true, comandoMencion: '@skill-3' }
    ]
  };

  // 1. Sin favoritas, no debe haber grupo de Favoritas
  const raiz1 = await provider.getChildren();
  assert.strictEqual(raiz1.some(i => i.tipo === 'grupoFavoritas'), false, 'No debe existir grupo favoritas si ninguna esta marcada');
  console.log('Prueba 1 superada: arbol sin grupo favoritas cuando no hay seleccionadas.');

  // 2. Marcar skill-1 como favorita
  await conmutarFavorita('Propia:cat1:skill-1');
  const raiz2 = await provider.getChildren();
  const itemFav = raiz2.find(i => i.tipo === 'grupoFavoritas');
  assert.ok(itemFav, 'Debe existir el grupo Favoritas en la raiz');
  assert.strictEqual(itemFav.label, '⭐ Favoritas (1)');

  const hijosFav = await provider.getChildren(itemFav);
  assert.strictEqual(hijosFav.length, 1);
  assert.strictEqual(hijosFav[0].label, 'skill-1');
  assert.strictEqual(hijosFav[0].contextValue.includes('fav'), true);
  console.log('Prueba 2 superada: seccion Favoritas renderizada correctamente con sus items.');

  // 3. Desactivar skill-2 y ocultar inactivas
  await conmutarActiva('Propia:cat1:skill-2');
  const itemPropias = raiz2.find(i => i.tipo === 'grupoPropias');
  const catsSinFiltro = await provider.getChildren(itemPropias);
  const cat1SinFiltro = catsSinFiltro.find(c => c.datosExtra && c.datosExtra.categoria === 'cat1');
  assert.strictEqual(cat1SinFiltro.label, 'cat1 (2)', 'Debe mostrar 2 skills en cat1 cuando no se ocultan inactivas');

  // Ahora activar ocultar inactivas
  await conmutarOcultarInactivas();
  const raiz3 = await provider.getChildren();
  const itemPropiasFiltrado = raiz3.find(i => i.tipo === 'grupoPropias');
  const catsFiltradas = await provider.getChildren(itemPropiasFiltrado);
  const cat1Filtrada = catsFiltradas.find(c => c.datosExtra && c.datosExtra.categoria === 'cat1');
  assert.strictEqual(cat1Filtrada.label, 'cat1 (1)', 'Debe mostrar 1 skill activa en cat1 al ocultar inactivas');

  console.log('Prueba 3 superada: filtro de habilidades inactivas aplicado correctamente en categorias.');

  // 4. Grupo catalogo
  const itemCatalogo = raiz3.find(i => i.tipo === 'grupoCatalogo');
  assert.ok(itemCatalogo, 'Debe existir el grupo Catálogo Remoto GitHub');
  const catsCatalogo = await provider.getChildren(itemCatalogo);
  assert.strictEqual(catsCatalogo.length, 1);
  const skillsCatalogo = await provider.getChildren(catsCatalogo[0]);
  assert.strictEqual(skillsCatalogo.length, 1);
  assert.strictEqual(skillsCatalogo[0].contextValue.startsWith('skillItem_catalogo'), true);
  console.log('Prueba 4 superada: seccion Catalogo Remoto renderizada correctamente.');

  // 5. Grupo Baul de Referencia
  provider.datosSkills.backup = [
    { id: 'Backup:utilidades:skill-backup-1', nombre: 'skill-backup-1', categoria: 'utilidades', origen: 'Backup', esBackup: true, comandoMencion: '@skill-backup-1' }
  ];
  const raiz4 = await provider.getChildren();
  const itemBackup = raiz4.find(i => i.tipo === 'grupoBackup');
  assert.ok(itemBackup, 'Debe existir el grupo Baul de Referencia');
  assert.ok(itemBackup.label.includes('Baúl de Referencia'));
  const catsBackup = await provider.getChildren(itemBackup);
  assert.strictEqual(catsBackup.length, 1);
  const skillsBackup = await provider.getChildren(catsBackup[0]);
  assert.strictEqual(skillsBackup.length, 1);
  assert.strictEqual(skillsBackup[0].contextValue.startsWith('skillItem_backup'), true);
  console.log('Prueba 5 superada: seccion Baul de Referencia renderizada correctamente con items de backup.');

  console.log('--- Todas las pruebas de arbol pasaron satisfactoriamente! ---');
})();
