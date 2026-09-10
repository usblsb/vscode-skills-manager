let vscode;
try {
  vscode = require('vscode');
} catch (e) {
  vscode = {
    workspace: {
      getConfiguration: () => ({
        get: (key, defaultValue) => defaultValue
      }),
      workspaceFolders: [],
      openTextDocument: async () => ({}),
    },
    window: {
      showInformationMessage: () => {},
      showErrorMessage: () => {},
      showWarningMessage: async () => {},
      showInputBox: async () => {},
      showQuickPick: async () => {},
      showTextDocument: async () => {}
    }
  };
}

const fs = require('fs').promises;
const path = require('path');
const { resolverRutaPropia } = require('./skills_loader');

/**
 * Normaliza el nombre para que sea seguro en carpetas y menciones.
 * @param {string} texto
 * @returns {string}
 */
function sanitizarNombre(texto) {
  return texto
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

/**
 * Copia recursivamente una carpeta y sus contenidos.
 * @param {string} origen
 * @param {string} destino
 */
async function copiarCarpetaRecursiva(origen, destino) {
  await fs.mkdir(destino, { recursive: true });
  const entradas = await fs.readdir(origen, { withFileTypes: true });

  for (const entrada of entradas) {
    const rutaOrigen = path.join(origen, entrada.name);
    const rutaDestino = path.join(destino, entrada.name);

    if (entrada.isDirectory()) {
      await copiarCarpetaRecursiva(rutaOrigen, rutaDestino);
    } else if (entrada.isFile()) {
      await fs.copyFile(rutaOrigen, rutaDestino);
    }
  }
}

/**
 * Instala / copia una habilidad desde el catalogo remoto hacia la carpeta de skills propias.
 * @param {object} skill
 * @param {Function} [alFinalizarCallback]
 */
async function instalarSkillDesdeCatalogo(skill, alFinalizarCallback) {
  if (!skill || !skill.rutaCarpeta) {
    vscode.window.showErrorMessage('No se ha podido identificar la carpeta de la habilidad a instalar.');
    return;
  }

  const rutaBasePropias = resolverRutaPropia();
  const nombreCarpetaSkill = path.basename(skill.rutaCarpeta);
  const categoria = skill.categoria || 'General';

  const rutaDestino = path.join(rutaBasePropias, categoria, nombreCarpetaSkill);

  try {
    // Comprobar si ya existe
    let yaExiste = false;
    try {
      await fs.stat(rutaDestino);
      yaExiste = true;
    } catch (e) {
      yaExiste = false;
    }

    if (yaExiste) {
      const sobrescribir = await vscode.window.showWarningMessage(
        `La habilidad "${skill.nombre}" ya existe en tus habilidades propias. ¿Deseas sobrescribirla?`,
        { modal: true },
        'Sobrescribir',
        'Cancelar'
      );
      if (sobrescribir !== 'Sobrescribir') {
        return;
      }
    }

    await copiarCarpetaRecursiva(skill.rutaCarpeta, rutaDestino);
    vscode.window.showInformationMessage(`Habilidad "${skill.nombre}" añadida a tus habilidades en uso.`);

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error al instalar habilidad: ${error.message}`);
    console.error('Error al instalar skill:', error);
  }
}

/**
 * Elimina una habilidad de las skills propias o del workspace previa confirmacion.
 * @param {object} skill
 * @param {Function} [alFinalizarCallback]
 */
async function eliminarSkill(skill, alFinalizarCallback) {
  if (!skill || !skill.rutaCarpeta) {
    vscode.window.showErrorMessage('No se ha podido identificar la carpeta de la habilidad.');
    return;
  }

  // Prevenir borrado accidental en el catalogo remoto
  if (skill.esCatalogo) {
    vscode.window.showInformationMessage(
      'Las habilidades del catálogo remoto no se borran para evitar conflictos de Git al sincronizar. Si no deseas usarla, simplemente no la instales en tus habilidades.'
    );
    return;
  }

  const confirmacion = await vscode.window.showWarningMessage(
    `¿Estás seguro de que deseas eliminar permanentemente la habilidad "${skill.nombre}" de tus skills?`,
    { modal: true },
    'Eliminar permanentemente',
    'Cancelar'
  );

  if (confirmacion !== 'Eliminar permanentemente') {
    return;
  }

  try {
    await fs.rm(skill.rutaCarpeta, { recursive: true, force: true });
    vscode.window.showInformationMessage(`Habilidad "${skill.nombre}" eliminada correctamente.`);

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error al eliminar habilidad: ${error.message}`);
    console.error('Error al eliminar skill:', error);
  }
}

/**
 * Asistente para crear una nueva habilidad con plantilla SKILL.md.
 * @param {Array<object>} skillsExistentes
 * @param {Function} [alFinalizarCallback]
 */
async function asistenteCrearNuevaSkill(skillsExistentes = [], alFinalizarCallback) {
  const rutaBasePropias = resolverRutaPropia();
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // 1. Seleccionar destino
  const opcionesDestino = [
    {
      label: '$(home) Skills Propias',
      description: 'En tu carpeta dedicada de habilidades personales',
      detail: rutaBasePropias,
      tipo: 'propia'
    }
  ];

  if (workspaceFolders && workspaceFolders.length > 0) {
    const rutaWorkspace = path.join(workspaceFolders[0].uri.fsPath, '.agent', 'skills');
    opcionesDestino.push({
      label: '$(folder) Workspace actual (.agent/skills)',
      description: 'Solo para este proyecto',
      detail: rutaWorkspace,
      tipo: 'workspace'
    });
  }

  const seleccionDestino = await vscode.window.showQuickPick(opcionesDestino, {
    placeHolder: '¿Dónde deseas crear la nueva habilidad?'
  });

  if (!seleccionDestino) return;

  const rutaBaseElegida = seleccionDestino.tipo === 'propia'
    ? rutaBasePropias
    : path.join(workspaceFolders[0].uri.fsPath, '.agent', 'skills');

  // 2. Obtener lista de categorias existentes
  const conjuntoCategorias = new Set(['General']);
  for (const s of skillsExistentes) {
    if (s.categoria && s.categoria !== 'General') {
      conjuntoCategorias.add(s.categoria);
    }
  }

  const opcionesCategoria = Array.from(conjuntoCategorias).map((cat) => ({
    label: `$(folder) ${cat}`,
    categoria: cat
  }));
  opcionesCategoria.unshift({
    label: '$(add) Crear nueva categoría...',
    categoria: '__nueva__'
  });

  const seleccionCat = await vscode.window.showQuickPick(opcionesCategoria, {
    placeHolder: 'Selecciona una categoría o crea una nueva'
  });

  if (!seleccionCat) return;

  let categoriaFinal = seleccionCat.categoria;
  if (categoriaFinal === '__nueva__') {
    const inputCategoria = await vscode.window.showInputBox({
      prompt: 'Escribe el nombre de la nueva categoría (ej: database, frontend, utilidades)',
      placeHolder: 'mi-categoria',
      validateInput: (val) => {
        if (!val || !val.trim()) return 'El nombre de la categoría no puede estar vacío.';
        return null;
      }
    });

    if (!inputCategoria) return;
    categoriaFinal = sanitizarNombre(inputCategoria);
  }

  // 3. Nombre de la habilidad
  const nombreSkillInput = await vscode.window.showInputBox({
    prompt: 'Nombre identificador de la habilidad (se usará como carpeta y en @mención)',
    placeHolder: 'mi-nueva-habilidad',
    validateInput: (val) => {
      const limpio = sanitizarNombre(val);
      if (!limpio) return 'Introduce un nombre válido (letras, números y guiones).';
      return null;
    }
  });

  if (!nombreSkillInput) return;
  const nombreSkill = sanitizarNombre(nombreSkillInput);

  // 4. Descripcion breve
  const descripcionInput = await vscode.window.showInputBox({
    prompt: 'Breve descripción de la habilidad (qué hace y cuándo usarla)',
    placeHolder: 'Ayuda a realizar tareas específicas...'
  });

  const descripcion = (descripcionInput && descripcionInput.trim()) || 'Descripción de la habilidad.';

  // 5. Crear la carpeta y el archivo SKILL.md
  const carpetaNuevaSkill = path.join(rutaBaseElegida, categoriaFinal, nombreSkill);
  const archivoSkillMd = path.join(carpetaNuevaSkill, 'SKILL.md');

  try {
    await fs.mkdir(carpetaNuevaSkill, { recursive: true });

    const contenidoPlantilla = [
      '---',
      `name: ${nombreSkill}`,
      `description: ${descripcion}`,
      '---',
      '',
      `# ${nombreSkill}`,
      '',
      descripcion,
      '',
      '## Cuándo usar esta habilidad',
      '- Describe aquí los casos de uso principales.',
      '',
      '## Instrucciones para el agente de IA',
      '1. Paso 1 a realizar...',
      '2. Paso 2 a realizar...',
      '',
      '## Ejemplos de uso',
      `- Prompt: "@${nombreSkill} ejecuta la tarea..."`,
      ''
    ].join('\n');

    await fs.writeFile(archivoSkillMd, contenidoPlantilla, 'utf8');

    // 6. Abrir inmediatamente el archivo en el editor
    const doc = await vscode.workspace.openTextDocument(archivoSkillMd);
    await vscode.window.showTextDocument(doc, { preview: false });

    vscode.window.showInformationMessage(`Habilidad "${nombreSkill}" creada en ${categoriaFinal}.`);

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error al crear la nueva habilidad: ${error.message}`);
    console.error('Error al crear nueva skill:', error);
  }
}

module.exports = {
  instalarSkillDesdeCatalogo,
  eliminarSkill,
  asistenteCrearNuevaSkill,
  sanitizarNombre
};
