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
const {
  cargarTodasLasSkills,
  resolverRutaPropia,
  resolverRutaGlobal,
  resolverRutaBackup,
  expandirTilde,
  escanearDirectorio
} = require('./skills_loader');

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
 * Obtiene las carpetas globales principales para mantener en espejo:
 * ~/.agents/skills (Universal) y ~/.gemini/config/skills (Antigravity).
 * @returns {Array<string>}
 */
function obtenerRutasGlobalesEspejo() {
  const rutaUniversal = resolverRutaGlobal();
  const rutaGemini = expandirTilde('~/.gemini/config/skills');
  const rutas = [rutaUniversal];
  if (path.resolve(rutaUniversal) !== path.resolve(rutaGemini)) {
    rutas.push(rutaGemini);
  }
  return rutas;
}

/**
 * Instala una habilidad desde el catalogo remoto hacia el proyecto o global.
 * @param {object} skill
 * @param {Function} [alFinalizarCallback]
 */
async function instalarSkillDesdeCatalogo(skill, alFinalizarCallback) {
  if (!skill || !skill.rutaCarpeta) {
    vscode.window.showErrorMessage('No se ha podido identificar la carpeta de la habilidad a instalar.');
    return;
  }

  const rutaBasePropias = resolverRutaPropia();
  const rutaBaseGlobal = resolverRutaGlobal();
  const workspaceFolders = vscode.workspace.workspaceFolders;

  let rutaDestinoBase = rutaBasePropias;
  let etiquetaDestino = 'el proyecto';

  if (workspaceFolders && workspaceFolders.length > 0) {
    const opciones = [
      {
        label: '$(folder) En este proyecto (Workspace)',
        description: rutaBasePropias,
        detail: 'Disponible para este proyecto (.agents/skills)',
        ruta: rutaBasePropias,
        etiqueta: 'el proyecto'
      },
      {
        label: '$(globe) Global (Universal para Cursor, Antigravity y Claude)',
        description: rutaBaseGlobal,
        detail: `Disponible en toda tu maquina (${rutaBaseGlobal})`,
        ruta: rutaBaseGlobal,
        etiqueta: 'modo global'
      }
    ];

    const seleccion = await vscode.window.showQuickPick(opciones, {
      placeHolder: `¿Dónde deseas instalar la habilidad "${skill.nombre}"?`
    });

    if (!seleccion) {
      return;
    }

    rutaDestinoBase = seleccion.ruta;
    etiquetaDestino = seleccion.etiqueta;
  } else {
    rutaDestinoBase = rutaBaseGlobal;
    etiquetaDestino = 'modo global';
  }

  const nombreCarpetaSkill = path.basename(skill.rutaCarpeta);
  // Estructura estandar: directamente bajo la carpeta de skills sin subcarpeta de categoria en disco
  const rutaDestino = path.join(rutaDestinoBase, nombreCarpetaSkill);

  try {
    let yaExiste = false;
    try {
      await fs.stat(rutaDestino);
      yaExiste = true;
    } catch (e) {
      yaExiste = false;
    }

    if (yaExiste) {
      const sobrescribir = await vscode.window.showWarningMessage(
        `La habilidad "${skill.nombre}" ya existe en ${etiquetaDestino}. ¿Deseas sobrescribirla?`,
        { modal: true },
        'Sobrescribir',
        'Cancelar'
      );
      if (sobrescribir !== 'Sobrescribir') {
        return;
      }
    }

    await copiarCarpetaRecursiva(skill.rutaCarpeta, rutaDestino);

    // Replicar en espejo en las demas carpetas globales (ej: ~/.gemini/config/skills)
    if (etiquetaDestino === 'modo global') {
      const rutasEspejo = obtenerRutasGlobalesEspejo();
      for (const dirGlobal of rutasEspejo) {
        const espejoDestino = path.join(dirGlobal, nombreCarpetaSkill);
        if (path.resolve(espejoDestino) !== path.resolve(rutaDestino)) {
          try {
            await copiarCarpetaRecursiva(skill.rutaCarpeta, espejoDestino);
          } catch (e) {
            console.warn('Aviso: No se pudo replicar en espejo global:', e);
          }
        }
      }
    }

    vscode.window.showInformationMessage(`Habilidad "${skill.nombre}" instalada correctamente en ${etiquetaDestino}.`);

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error al instalar habilidad: ${error.message}`);
    console.error('Error al instalar skill:', error);
  }
}

/**
 * Copia una habilidad al espacio de trabajo local (.agents/skills).
 * @param {object} skill
 * @param {Function} [alFinalizarCallback]
 */
async function copiarSkillALocal(skill, alFinalizarCallback) {
  if (!skill || !skill.rutaCarpeta) {
    vscode.window.showErrorMessage('No se ha podido identificar la carpeta de la habilidad a copiar.');
    return;
  }

  const rutaBasePropias = resolverRutaPropia();
  const nombreCarpeta = path.basename(skill.rutaCarpeta);
  const destino = path.join(rutaBasePropias, nombreCarpeta);

  if (path.resolve(destino) === path.resolve(skill.rutaCarpeta)) {
    vscode.window.showInformationMessage(`La habilidad "${skill.nombre}" ya está en la carpeta Local de este proyecto.`);
    return;
  }

  try {
    let existe = false;
    try {
      await fs.stat(destino);
      existe = true;
    } catch (e) {
      existe = false;
    }

    if (existe) {
      const confirmacion = await vscode.window.showWarningMessage(
        `Ya existe una habilidad llamada "${nombreCarpeta}" en Local. ¿Deseas sobreescribirla?`,
        { modal: true },
        'Sobreescribir',
        'Cancelar'
      );
      if (confirmacion !== 'Sobreescribir') {
        return;
      }
    }

    await copiarCarpetaRecursiva(skill.rutaCarpeta, destino);
    vscode.window.showInformationMessage(`Habilidad "${skill.nombre}" copiada a Local (.agents/skills).`);

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error al copiar habilidad a Local: ${error.message}`);
    console.error('Error al copiar a Local:', error);
  }
}

/**
 * Copia una habilidad a la carpeta Global (~/.agents/skills) y la replica en espejos (~/.gemini/config/skills).
 * @param {object} skill
 * @param {Function} [alFinalizarCallback]
 */
async function copiarSkillAGlobal(skill, alFinalizarCallback) {
  if (!skill || !skill.rutaCarpeta) {
    vscode.window.showErrorMessage('No se ha podido identificar la carpeta de la habilidad a copiar.');
    return;
  }

  const rutaBaseGlobal = resolverRutaGlobal();
  const nombreCarpeta = path.basename(skill.rutaCarpeta);
  const destino = path.join(rutaBaseGlobal, nombreCarpeta);

  if (path.resolve(destino) === path.resolve(skill.rutaCarpeta)) {
    vscode.window.showInformationMessage(`La habilidad "${skill.nombre}" ya está en la carpeta Global principal.`);
    return;
  }

  try {
    let existe = false;
    try {
      await fs.stat(destino);
      existe = true;
    } catch (e) {
      existe = false;
    }

    if (existe) {
      const confirmacion = await vscode.window.showWarningMessage(
        `Ya existe una habilidad llamada "${nombreCarpeta}" en Global. ¿Deseas sobreescribirla?`,
        { modal: true },
        'Sobreescribir',
        'Cancelar'
      );
      if (confirmacion !== 'Sobreescribir') {
        return;
      }
    }

    // Copiar a la carpeta global principal
    await copiarCarpetaRecursiva(skill.rutaCarpeta, destino);

    // Replicar en espejo global (~/.gemini/config/skills)
    const rutasEspejo = obtenerRutasGlobalesEspejo();
    for (const dirGlobal of rutasEspejo) {
      const espejoDestino = path.join(dirGlobal, nombreCarpeta);
      if (path.resolve(espejoDestino) !== path.resolve(destino)) {
        try {
          await copiarCarpetaRecursiva(skill.rutaCarpeta, espejoDestino);
        } catch (e) {
          console.warn('Aviso: No se pudo replicar en espejo global:', e);
        }
      }
    }

    vscode.window.showInformationMessage(`Habilidad "${skill.nombre}" copiada a Global (universal para todos los proyectos e IDEs).`);

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error al copiar habilidad a Global: ${error.message}`);
    console.error('Error al copiar a Global:', error);
  }
}

/**
 * Guarda una copia de la habilidad en el Baul de Referencia (~/.skills-backup).
 * @param {object} skill
 * @param {Function} [alFinalizarCallback]
 * @param {boolean} [silencioso=false]
 * @returns {Promise<boolean>}
 */
async function copiarSkillABackup(skill, alFinalizarCallback, silencioso = false) {
  if (!skill || !skill.rutaCarpeta) {
    if (!silencioso) {
      vscode.window.showErrorMessage('No se ha podido identificar la carpeta de la habilidad.');
    }
    return false;
  }

  const rutaBackup = resolverRutaBackup();
  const nombreCarpeta = path.basename(skill.rutaCarpeta);
  const destino = path.join(rutaBackup, nombreCarpeta);

  if (path.resolve(destino) === path.resolve(skill.rutaCarpeta)) {
    if (!silencioso) {
      vscode.window.showInformationMessage(`La habilidad "${skill.nombre}" ya está en el Baúl de Referencia.`);
    }
    return true;
  }

  try {
    let existe = false;
    try {
      await fs.stat(destino);
      existe = true;
    } catch (e) {
      existe = false;
    }

    if (existe && !silencioso) {
      const confirmacion = await vscode.window.showWarningMessage(
        `Ya existe una copia de "${nombreCarpeta}" en el Baúl de Referencia. ¿Deseas sobreescribirla?`,
        { modal: true },
        'Sobreescribir',
        'Cancelar'
      );
      if (confirmacion !== 'Sobreescribir') {
        return false;
      }
    }

    await copiarCarpetaRecursiva(skill.rutaCarpeta, destino);

    if (!silencioso) {
      vscode.window.showInformationMessage(`Habilidad "${skill.nombre}" guardada en el Baúl de Referencia (~/.skills-backup).`);
    }

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
    return true;
  } catch (error) {
    if (!silencioso) {
      vscode.window.showErrorMessage(`Error al guardar en el Baúl: ${error.message}`);
    }
    console.error('Error al guardar en Baul:', error);
    return false;
  }
}

/**
 * Elimina una habilidad. Si es Local o Global, comprueba y asegura primero
 * que exista una copia en el Baul de Referencia (~/.skills-backup).
 * @param {object} skill
 * @param {Function} [alFinalizarCallback]
 */
async function eliminarSkill(skill, alFinalizarCallback) {
  if (!skill || !skill.rutaCarpeta) {
    vscode.window.showErrorMessage('No se ha podido identificar la carpeta de la habilidad a eliminar.');
    return;
  }

  // 1. Catalogo remoto protegido
  if (skill.esCatalogo) {
    vscode.window.showInformationMessage(
      'Las habilidades del catálogo remoto no se borran para evitar conflictos de Git al sincronizar. Si no deseas usarla, simplemente no la instales en tus habilidades.'
    );
    return;
  }

  // 2. Si es una habilidad que esta en el Baul de Backup
  if (skill.esBackup || skill.origen === 'Backup') {
    const confirmacion = await vscode.window.showWarningMessage(
      `¿Estás seguro de que deseas eliminar permanentemente la habilidad "${skill.nombre}" del Baúl de Referencia? Esta acción no se puede deshacer.`,
      { modal: true },
      'Eliminar del Baúl',
      'Cancelar'
    );

    if (confirmacion !== 'Eliminar del Baúl') {
      return;
    }

    try {
      await fs.rm(skill.rutaCarpeta, { recursive: true, force: true });
      vscode.window.showInformationMessage(`Habilidad "${skill.nombre}" eliminada del Baúl de Referencia.`);
      if (typeof alFinalizarCallback === 'function') {
        alFinalizarCallback();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error al eliminar habilidad del Baúl: ${error.message}`);
      console.error('Error al eliminar skill del Baul:', error);
    }
    return;
  }

  // 3. Si es Local o Global: verificar/crear copia previa en el Baul antes de eliminar
  const rutaBackupBase = resolverRutaBackup();
  const nombreCarpeta = path.basename(skill.rutaCarpeta);
  const rutaEnBackup = path.join(rutaBackupBase, nombreCarpeta);
  const archivoSkillEnBackup = path.join(rutaEnBackup, 'SKILL.md');

  let existeEnBackup = false;
  try {
    await fs.stat(archivoSkillEnBackup);
    existeEnBackup = true;
  } catch (e) {
    existeEnBackup = false;
  }

  if (!existeEnBackup) {
    try {
      await copiarCarpetaRecursiva(skill.rutaCarpeta, rutaEnBackup);
      existeEnBackup = true;
      vscode.window.showInformationMessage(`Respaldo preventivo guardado en el Baúl (~/.skills-backup/${nombreCarpeta}).`);
    } catch (errBackup) {
      vscode.window.showErrorMessage(`No se pudo respaldar en el Baúl: ${errBackup.message}. Se cancela el borrado por seguridad.`);
      return;
    }
  }

  const confirmacion = await vscode.window.showWarningMessage(
    `¿Estás seguro de que deseas eliminar la habilidad "${skill.nombre}" de tus skills activas? (Permanecerá a salvo en tu Baúl de Referencia).`,
    { modal: true },
    'Eliminar de activas',
    'Cancelar'
  );

  if (confirmacion !== 'Eliminar de activas') {
    return;
  }

  try {
    await fs.rm(skill.rutaCarpeta, { recursive: true, force: true });

    // Si es una skill global, eliminar tambien de las carpetas espejo si existe
    if (skill.origen === 'Global') {
      const rutasEspejo = obtenerRutasGlobalesEspejo();
      for (const dirGlobal of rutasEspejo) {
        const rutaEspejo = path.join(dirGlobal, nombreCarpeta);
        if (path.resolve(rutaEspejo) !== path.resolve(skill.rutaCarpeta)) {
          try {
            await fs.rm(rutaEspejo, { recursive: true, force: true });
          } catch (e) {
            // No es necesario actuar si no existe en esa ruta
          }
        }
      }
    }

    vscode.window.showInformationMessage(`Habilidad "${skill.nombre}" eliminada de tus skills activas (copia disponible en el Baúl).`);

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
  const rutaBaseGlobal = resolverRutaGlobal();
  const rutaBaseBackup = resolverRutaBackup();
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // 1. Seleccionar destino (Proyecto, Global o Baul de Referencia)
  const opcionesDestino = [];

  if (workspaceFolders && workspaceFolders.length > 0) {
    opcionesDestino.push({
      label: '$(folder) En este proyecto (Workspace)',
      description: rutaBasePropias,
      detail: 'Solo disponible para este proyecto (.agents/skills)',
      ruta: rutaBasePropias
    });
  }

  opcionesDestino.push({
    label: '$(globe) Global para todos los proyectos (Universal)',
    description: rutaBaseGlobal,
    detail: `Disponible en toda tu maquina (${rutaBaseGlobal})`,
    ruta: rutaBaseGlobal
  });

  opcionesDestino.push({
    label: '$(archive) En el Baúl de Referencia (Privado / Respaldo)',
    description: rutaBaseBackup,
    detail: 'Guardar en ~/.skills-backup (inactiva hasta que decidas copiarla a Local o Global)',
    ruta: rutaBaseBackup
  });

  const seleccionDestino = await vscode.window.showQuickPick(opcionesDestino, {
    placeHolder: '¿Dónde deseas crear la nueva habilidad?'
  });

  if (!seleccionDestino) return;

  const rutaBaseElegida = seleccionDestino.ruta;

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
    prompt: 'Nombre identificador de la habilidad (se usará como carpeta y en /comando)',
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

  // 5. Crear la carpeta y el archivo SKILL.md de forma plana (estandar para agentes)
  const carpetaNuevaSkill = path.join(rutaBaseElegida, nombreSkill);
  const archivoSkillMd = path.join(carpetaNuevaSkill, 'SKILL.md');

  try {
    await fs.mkdir(carpetaNuevaSkill, { recursive: true });

    const contenidoPlantilla = [
      '---',
      `name: ${nombreSkill}`,
      `description: ${descripcion}`,
      `category: ${categoriaFinal}`,
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
      `- Prompt: "/${nombreSkill} ejecuta la tarea..."`,
      ''
    ].join('\n');

    await fs.writeFile(archivoSkillMd, contenidoPlantilla, 'utf8');

    // Replicar en espejo si el destino es global
    if (path.resolve(rutaBaseElegida) === path.resolve(rutaBaseGlobal)) {
      const rutasEspejo = obtenerRutasGlobalesEspejo();
      for (const dirGlobal of rutasEspejo) {
        const espejoDestino = path.join(dirGlobal, nombreSkill);
        if (path.resolve(espejoDestino) !== path.resolve(carpetaNuevaSkill)) {
          try {
            await copiarCarpetaRecursiva(carpetaNuevaSkill, espejoDestino);
          } catch (e) {
            console.warn('Aviso: No se pudo replicar en espejo global:', e);
          }
        }
      }
    }

    // 6. Abrir inmediatamente el archivo en el editor
    const doc = await vscode.workspace.openTextDocument(archivoSkillMd);
    await vscode.window.showTextDocument(doc, { preview: false });

    const esBaul = path.resolve(rutaBaseElegida) === path.resolve(rutaBaseBackup);
    const mensajeExito = esBaul
      ? `Habilidad "${nombreSkill}" creada en el Baúl de Referencia (~/.skills-backup).`
      : `Habilidad "${nombreSkill}" creada en ${categoriaFinal}.`;

    vscode.window.showInformationMessage(mensajeExito);

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error al crear la nueva habilidad: ${error.message}`);
    console.error('Error al crear nueva skill:', error);
  }
}

/**
 * Consolida y sincroniza las habilidades globales entre ~/.agents/skills y ~/.gemini/config/skills
 * trayendo tambien las existentes de ~/.cursor/skills y ~/.claude/skills.
 * @param {Function} [alFinalizarCallback]
 */
async function consolidarSkillsGlobales(alFinalizarCallback) {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const carpetasGlobales = config.get('globalSearchFolders', [
    '~/.agents/skills',
    '~/.gemini/config/skills',
    '~/.claude/skills',
    '~/.cursor/skills'
  ]);

  const rutasGlobales = carpetasGlobales.map((r) => expandirTilde(r));
  const rutasEspejo = obtenerRutasGlobalesEspejo();

  let totalSincronizadas = 0;

  try {
    // 1. Recopilar todas las skills existentes en cualquiera de las carpetas globales
    const mapaSkills = new Map();

    for (const dir of rutasGlobales) {
      try {
        const stats = await fs.stat(dir);
        if (!stats.isDirectory()) continue;
        const skills = await escanearDirectorio(dir, 'Global', false);
        for (const s of skills) {
          if (!mapaSkills.has(s.nombre)) {
            mapaSkills.set(s.nombre, s);
          }
        }
      } catch (e) {
        // La carpeta no existe aun
      }
    }

    if (mapaSkills.size === 0) {
      vscode.window.showInformationMessage('No se encontraron habilidades globales para consolidar.');
      return;
    }

    // 2. Asegurar que cada skill este replicada en las rutas de espejo principales
    for (const [nombre, skill] of mapaSkills.entries()) {
      for (const destinoBase of rutasEspejo) {
        const rutaFinal = path.join(destinoBase, nombre);
        const archivoFinal = path.join(rutaFinal, 'SKILL.md');

        let existeDestino = false;
        try {
          await fs.stat(archivoFinal);
          existeDestino = true;
        } catch (e) {
          existeDestino = false;
        }

        if (!existeDestino) {
          await copiarCarpetaRecursiva(skill.rutaCarpeta, rutaFinal);
          totalSincronizadas++;
        }
      }
    }

    vscode.window.showInformationMessage(
      `Consolidación completada: ${mapaSkills.size} habilidades globales verificadas (${totalSincronizadas} sincronizaciones en espejo).`
    );

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error al consolidar habilidades globales: ${error.message}`);
    console.error('Error al consolidar globales:', error);
  }
}

/**
 * Respalda todas las habilidades activas (locales y globales) en el Baul de Referencia (~/.skills-backup).
 * @param {Function} [alFinalizarCallback]
 */
async function respaldarTodasLasSkillsEnBackup(alFinalizarCallback) {
  try {
    const datos = await cargarTodasLasSkills();
    const skillsActivas = [
      ...(datos.propias || []),
      ...(datos.workspace || []),
      ...(datos.globales || [])
    ];

    const mapaUnico = new Map();
    for (const s of skillsActivas) {
      if (!mapaUnico.has(s.nombre)) {
        mapaUnico.set(s.nombre, s);
      }
    }

    if (mapaUnico.size === 0) {
      vscode.window.showInformationMessage('No se encontraron habilidades activas para respaldar en el Baúl.');
      return;
    }

    const rutaBackup = resolverRutaBackup();
    await fs.mkdir(rutaBackup, { recursive: true });

    let respaldadasNuevas = 0;
    let actualizadas = 0;

    for (const [nombre, skill] of mapaUnico.entries()) {
      if (!skill.rutaCarpeta) continue;
      const destino = path.join(rutaBackup, nombre);
      if (path.resolve(destino) === path.resolve(skill.rutaCarpeta)) {
        continue;
      }

      let existe = false;
      try {
        await fs.stat(destino);
        existe = true;
      } catch (e) {
        existe = false;
      }

      await copiarCarpetaRecursiva(skill.rutaCarpeta, destino);
      if (existe) {
        actualizadas++;
      } else {
        respaldadasNuevas++;
      }
    }

    vscode.window.showInformationMessage(
      `Baúl de Referencia actualizado: ${respaldadasNuevas} nuevas respaldadas, ${actualizadas} actualizadas.`
    );

    if (typeof alFinalizarCallback === 'function') {
      alFinalizarCallback();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error al respaldar habilidades en el Baúl: ${error.message}`);
    console.error('Error al respaldar todas en Baul:', error);
  }
}

function _setVscode(mock) {
  vscode = mock;
}

module.exports = {
  instalarSkillDesdeCatalogo,
  eliminarSkill,
  asistenteCrearNuevaSkill,
  consolidarSkillsGlobales,
  copiarSkillALocal,
  copiarSkillAGlobal,
  copiarSkillABackup,
  respaldarTodasLasSkillsEnBackup,
  obtenerRutasGlobalesEspejo,
  sanitizarNombre,
  _setVscode
};
