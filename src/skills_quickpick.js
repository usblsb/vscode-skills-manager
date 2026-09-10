let vscode;
try {
  vscode = require('vscode');
} catch (e) {
  vscode = {
    window: {
      showQuickPick: async () => null,
      showInformationMessage: async () => null,
      showWarningMessage: async () => null,
      showErrorMessage: async () => null
    },
    env: {
      clipboard: {
        writeText: async () => {}
      }
    },
    QuickPickItemKind: {
      Separator: -1,
      Default: 0
    }
  };
}
const { cargarTodasLasSkills } = require('./skills_loader');
const { sincronizarRepositorioGlobal } = require('./github_sync');
const {
  esFavorita,
  esInactiva,
  conmutarFavorita
} = require('./skills_state');
const { instalarSkillDesdeCatalogo } = require('./skills_actions');

/**
 * Muestra el menu QuickPick interactivo para buscar y seleccionar una skill.
 * Permite filtrar por favoritas, activas e inactivas.
 * @param {Function} [alActualizarCallback]
 */
async function mostrarQuickPickSkills(alActualizarCallback) {
  const { todas } = await cargarTodasLasSkills();

  if (!todas || todas.length === 0) {
    const seleccion = await vscode.window.showWarningMessage(
      'No se encontraron skills. ¿Deseas sincronizar el catálogo remoto de GitHub ahora?',
      'Sincronizar ahora',
      'Cancelar'
    );

    if (seleccion === 'Sincronizar ahora') {
      await sincronizarRepositorioGlobal(alActualizarCallback);
    }
    return;
  }

  // Separar en favoritas, activas e inactivas
  const listaFavoritas = [];
  const listaActivas = [];
  const listaInactivas = [];

  for (const s of todas) {
    if (esInactiva(s.id)) {
      listaInactivas.push(s);
    } else if (esFavorita(s.id)) {
      listaFavoritas.push(s);
    } else {
      listaActivas.push(s);
    }
  }

  // Ordenar cada grupo alfabeticamente por nombre
  listaFavoritas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  listaActivas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  listaInactivas.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const items = [];

  // 1. Grupo de Favoritas
  if (listaFavoritas.length > 0) {
    items.push({
      label: 'Favoritas',
      kind: vscode.QuickPickItemKind ? vscode.QuickPickItemKind.Separator : -1
    });

    for (const skill of listaFavoritas) {
      const etiquetaOrigen = skill.esCatalogo ? ' [Catálogo]' : '';
      items.push({
        label: `$(star-full) ${skill.nombre}`,
        description: `${skill.comandoMencion}  [${skill.categoria}]${etiquetaOrigen}  [⭐ Favorita]`,
        detail: skill.descripcion,
        skill
      });
    }
  }

  // 2. Grupo de Activas
  if (listaActivas.length > 0) {
    items.push({
      label: 'Habilidades Disponibles',
      kind: vscode.QuickPickItemKind ? vscode.QuickPickItemKind.Separator : -1
    });

    for (const skill of listaActivas) {
      const icono = skill.esCatalogo ? '$(package)' : '$(symbol-keyword)';
      const etiquetaOrigen = skill.esCatalogo ? ' [Catálogo Remoto]' : '';
      items.push({
        label: `${icono} ${skill.nombre}`,
        description: `${skill.comandoMencion}  [${skill.categoria}]${etiquetaOrigen}`,
        detail: skill.descripcion,
        skill
      });
    }
  }

  // 3. Grupo de Inactivas (al final)
  if (listaInactivas.length > 0) {
    items.push({
      label: 'Habilidades Desactivadas',
      kind: vscode.QuickPickItemKind ? vscode.QuickPickItemKind.Separator : -1
    });

    for (const skill of listaInactivas) {
      items.push({
        label: `$(circle-slash) ${skill.nombre}`,
        description: `${skill.comandoMencion}  [${skill.categoria}]  [Inactiva]`,
        detail: skill.descripcion,
        skill
      });
    }
  }

  const opciones = {
    placeHolder: 'Escribe para buscar una skill (Enter para copiar @mencion)...',
    matchOnDescription: true,
    matchOnDetail: true
  };

  const elementoSeleccionado = await vscode.window.showQuickPick(items, opciones);

  if (elementoSeleccionado && elementoSeleccionado.skill) {
    const s = elementoSeleccionado.skill;
    await vscode.env.clipboard.writeText(s.comandoMencion);

    const actualmenteFav = esFavorita(s.id);
    const textoAccionFav = actualmenteFav ? 'Quitar de Favoritas' : 'Marcar como Favorita';

    const botonesMensaje = ['Ver documentación'];
    if (s.esCatalogo) {
      botonesMensaje.push('Añadir a mis habilidades');
    } else {
      botonesMensaje.push(textoAccionFav);
    }

    const accion = await vscode.window.showInformationMessage(
      `Copiado: ${s.comandoMencion} al portapapeles`,
      ...botonesMensaje
    );

    if (accion === 'Ver documentación') {
      try {
        const doc = await vscode.workspace.openTextDocument(s.rutaSkillMd);
        await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
      } catch (err) {
        vscode.window.showErrorMessage(`No se pudo abrir ${s.rutaSkillMd}: ${err.message}`);
      }
    } else if (accion === 'Añadir a mis habilidades') {
      await instalarSkillDesdeCatalogo(s, alActualizarCallback);
    } else if (accion === textoAccionFav) {
      await conmutarFavorita(s.id);
      if (alActualizarCallback) {
        alActualizarCallback();
      }
      vscode.window.showInformationMessage(
        actualmenteFav
          ? `Eliminada ${s.nombre} de favoritas.`
          : `Añadida ${s.nombre} a favoritas ⭐.`
      );
    }
  }
}

module.exports = {
  mostrarQuickPickSkills
};
