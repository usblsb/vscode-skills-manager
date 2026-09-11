const vscode = require('vscode');
const { SkillsTreeProvider, SkillTreeItem } = require('./src/skills_tree_provider');
const { mostrarQuickPickSkills } = require('./src/skills_quickpick');
const { sincronizarRepositorioGlobal } = require('./src/github_sync');
const {
  inicializarEstado,
  conmutarFavorita,
  conmutarActiva,
  conmutarOcultarInactivas,
  debeOcultarInactivas
} = require('./src/skills_state');
const {
  instalarSkillDesdeCatalogo,
  eliminarSkill,
  asistenteCrearNuevaSkill,
  consolidarSkillsGlobales,
  copiarSkillALocal,
  copiarSkillAGlobal,
  copiarSkillABackup,
  respaldarTodasLasSkillsEnBackup
} = require('./src/skills_actions');

/**
 * Normaliza el objeto skill recibido desde un comando de arbol o directo.
 * @param {SkillTreeItem|object} elemento
 * @returns {object|null}
 */
function obtenerObjetoSkill(elemento) {
  if (!elemento) return null;
  if (elemento.skill) return elemento.skill;
  if (elemento.datosExtra && elemento.datosExtra.skill) return elemento.datosExtra.skill;
  if (elemento.comandoMencion) return elemento;
  return null;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Gestor de Skills IA activado.');

  // Inicializar almacenamiento de estado
  inicializarEstado(context);

  // Sincronizar contexto inicial de VS Code para menus condicionales
  vscode.commands.executeCommand(
    'setContext',
    'skillsManager.ocultarInactivas',
    debeOcultarInactivas()
  );

  const treeProvider = new SkillsTreeProvider();
  vscode.window.registerTreeDataProvider('skills-manager-tree', treeProvider);

  // 1. Comando: Buscar y seleccionar mediante QuickPick
  const buscarCmd = vscode.commands.registerCommand('skills-manager.buscar', async () => {
    await mostrarQuickPickSkills(() => treeProvider.recargar());
  });

  // 2. Comando: Recargar arbol de skills
  const recargarCmd = vscode.commands.registerCommand('skills-manager.recargar', () => {
    treeProvider.recargar();
    vscode.window.showInformationMessage('Lista de skills actualizada.');
  });

  // 3. Comando: Sincronizar catalogo remoto con GitHub
  const sincronizarCmd = vscode.commands.registerCommand('skills-manager.sincronizar', async () => {
    await sincronizarRepositorioGlobal(() => treeProvider.recargar());
  });

  // 4. Comando: Copiar mencion (@skill) al portapapeles
  const copiarMencionCmd = vscode.commands.registerCommand('skills-manager.copiarMencion', async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill) {
      vscode.window.showErrorMessage('No se ha podido identificar la skill seleccionada.');
      return;
    }

    await vscode.env.clipboard.writeText(skill.comandoMencion);
    vscode.window.showInformationMessage(`Copiado: ${skill.comandoMencion} al portapapeles`);
  });

  // 5. Comando: Abrir documento SKILL.md
  const abrirSkillCmd = vscode.commands.registerCommand('skills-manager.abrirSkill', async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill || !skill.rutaSkillMd) {
      vscode.window.showErrorMessage('No se encontró el archivo SKILL.md para esta habilidad.');
      return;
    }

    try {
      const doc = await vscode.workspace.openTextDocument(skill.rutaSkillMd);
      await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
    } catch (error) {
      vscode.window.showErrorMessage(`Error al abrir documentacion: ${error.message}`);
    }
  });

  // 6. Comando: Copiar ruta absoluta de la carpeta de la skill
  const copiarRutaCmd = vscode.commands.registerCommand('skills-manager.copiarRuta', async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill || !skill.rutaCarpeta) {
      vscode.window.showErrorMessage('No se encontró la ruta de la skill.');
      return;
    }

    await vscode.env.clipboard.writeText(skill.rutaCarpeta);
    vscode.window.showInformationMessage(`Ruta copiada: ${skill.rutaCarpeta}`);
  });

  // 7. Comando: Crear nueva habilidad con asistente
  const crearSkillCmd = vscode.commands.registerCommand('skills-manager.crearSkill', async () => {
    await asistenteCrearNuevaSkill(treeProvider.obtenerSkillsActuales(), () => treeProvider.recargar());
  });

  // 8. Comando: Instalar habilidad desde el catalogo remoto (+)
  const instalarSkillCmd = vscode.commands.registerCommand('skills-manager.instalarSkill', async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill) {
      vscode.window.showErrorMessage('No se ha podido identificar la habilidad del catálogo a instalar.');
      return;
    }
    await instalarSkillDesdeCatalogo(skill, () => treeProvider.recargar());
  });

  // 9. Comando: Eliminar habilidad (Papelera)
  const eliminarSkillCmd = vscode.commands.registerCommand('skills-manager.eliminarSkill', async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill) {
      vscode.window.showErrorMessage('No se ha podido identificar la habilidad a eliminar.');
      return;
    }
    await eliminarSkill(skill, () => treeProvider.recargar());
  });

  // 10. Comando: Consolidar y sincronizar skills globales en espejo
  const consolidarGlobalesCmd = vscode.commands.registerCommand('skills-manager.consolidarGlobales', async () => {
    await consolidarSkillsGlobales(() => treeProvider.recargar());
  });

  // 11. Comando: Copiar habilidad a Local (Workspace)
  const copiarALocalCmd = vscode.commands.registerCommand('skills-manager.copiarALocal', async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill) {
      vscode.window.showErrorMessage('No se ha podido identificar la habilidad a copiar a Local.');
      return;
    }
    await copiarSkillALocal(skill, () => treeProvider.recargar());
  });

  // 12. Comando: Copiar habilidad a Global (Universal)
  const copiarAGlobalCmd = vscode.commands.registerCommand('skills-manager.copiarAGlobal', async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill) {
      vscode.window.showErrorMessage('No se ha podido identificar la habilidad a copiar a Global.');
      return;
    }
    await copiarSkillAGlobal(skill, () => treeProvider.recargar());
  });

  // 13. Comando: Guardar copia en el Baul de Referencia
  const copiarABackupCmd = vscode.commands.registerCommand('skills-manager.copiarABackup', async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill) {
      vscode.window.showErrorMessage('No se ha podido identificar la habilidad para guardar en el Baúl.');
      return;
    }
    await copiarSkillABackup(skill, () => treeProvider.recargar());
  });

  // 14. Comando: Respaldar todas las habilidades activas en el Baul
  const respaldarTodoCmd = vscode.commands.registerCommand('skills-manager.respaldarTodo', async () => {
    await respaldarTodasLasSkillsEnBackup(() => treeProvider.recargar());
  });

  // Manejador central de conmutar favorita
  const alternarFavoritaHandler = async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill) {
      vscode.window.showErrorMessage('No se pudo identificar la habilidad.');
      return;
    }

    const nuevoEstado = await conmutarFavorita(skill.id);
    treeProvider.recargar();

    if (nuevoEstado) {
      vscode.window.showInformationMessage(`⭐ Añadida a favoritas: ${skill.nombre}`);
    } else {
      vscode.window.showInformationMessage(`Eliminada de favoritas: ${skill.nombre}`);
    }
  };

  const conmutarFavoritaCmd = vscode.commands.registerCommand('skills-manager.conmutarFavorita', alternarFavoritaHandler);
  const marcarFavoritaCmd = vscode.commands.registerCommand('skills-manager.marcarFavorita', alternarFavoritaHandler);
  const desmarcarFavoritaCmd = vscode.commands.registerCommand('skills-manager.desmarcarFavorita', alternarFavoritaHandler);

  // Manejador central de conmutar activa
  const alternarActivaHandler = async (elemento) => {
    const skill = obtenerObjetoSkill(elemento);
    if (!skill) {
      vscode.window.showErrorMessage('No se pudo identificar la habilidad.');
      return;
    }

    const quedoInactiva = await conmutarActiva(skill.id);
    treeProvider.recargar();

    if (quedoInactiva) {
      vscode.window.showInformationMessage(`Habilidad desactivada: ${skill.nombre}`);
    } else {
      vscode.window.showInformationMessage(`Habilidad activada: ${skill.nombre}`);
    }
  };

  const conmutarActivaCmd = vscode.commands.registerCommand('skills-manager.conmutarActiva', alternarActivaHandler);
  const activarSkillCmd = vscode.commands.registerCommand('skills-manager.activarSkill', alternarActivaHandler);
  const desactivarSkillCmd = vscode.commands.registerCommand('skills-manager.desactivarSkill', alternarActivaHandler);

  // Manejador de alternar visibilidad de inactivas en la cabecera
  const alternarOcultarHandler = async () => {
    const ocultas = await conmutarOcultarInactivas();
    await vscode.commands.executeCommand('setContext', 'skillsManager.ocultarInactivas', ocultas);
    treeProvider.recargar();

    if (ocultas) {
      vscode.window.showInformationMessage('Habilidades inactivas ocultadas del árbol.');
    } else {
      vscode.window.showInformationMessage('Mostrando todas las habilidades en el árbol.');
    }
  };

  const alternarOcultarCmd = vscode.commands.registerCommand('skills-manager.alternarOcultarInactivas', alternarOcultarHandler);
  const ocultarInactivasCmd = vscode.commands.registerCommand('skills-manager.ocultarInactivas', alternarOcultarHandler);
  const mostrarInactivasCmd = vscode.commands.registerCommand('skills-manager.mostrarInactivas', alternarOcultarHandler);

  // Escuchar cambios en la configuracion de skillsManager para refrescar automaticamente
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('skillsManager')) {
      treeProvider.recargar();
    }
  });

  context.subscriptions.push(
    buscarCmd,
    recargarCmd,
    sincronizarCmd,
    copiarMencionCmd,
    abrirSkillCmd,
    copiarRutaCmd,
    crearSkillCmd,
    instalarSkillCmd,
    eliminarSkillCmd,
    consolidarGlobalesCmd,
    copiarALocalCmd,
    copiarAGlobalCmd,
    copiarABackupCmd,
    respaldarTodoCmd,
    conmutarFavoritaCmd,
    marcarFavoritaCmd,
    desmarcarFavoritaCmd,
    conmutarActivaCmd,
    activarSkillCmd,
    desactivarSkillCmd,
    alternarOcultarCmd,
    ocultarInactivasCmd,
    mostrarInactivasCmd,
    configWatcher
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
