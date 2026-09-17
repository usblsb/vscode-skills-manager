const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { obtenerAgentesActivos, obtenerAgentesConSkill } = require('./agent_registry');
let vscode;
try {
  vscode = require('vscode');
} catch (e) {
  vscode = {
    workspace: {
      getConfiguration: () => ({
        get: (key, defaultValue) => defaultValue
      }),
      workspaceFolders: []
    }
  };
}

/**
 * Expande el caracter tilde ~ al directorio home del usuario.
 * @param {string} ruta
 * @returns {string}
 */
function expandirTilde(ruta) {
  if (!ruta) return ruta;
  if (ruta.startsWith('~')) {
    return path.join(os.homedir(), ruta.slice(1));
  }
  return ruta;
}

/**
 * Resuelve una ruta que puede ser absoluta o relativa a la raiz del proyecto abierto.
 * @param {string} rutaConfigurada
 * @param {string} rutaDefecto
 * @returns {string}
 */
function resolverRuta(rutaConfigurada, rutaDefecto) {
  let ruta = rutaConfigurada || rutaDefecto;
  ruta = expandirTilde(ruta);
  if (path.isAbsolute(ruta)) {
    return ruta;
  }
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return path.join(workspaceFolders[0].uri.fsPath, ruta);
  }
  return path.resolve(ruta);
}

/**
 * Obtiene la ruta absoluta de las skills propias o de proyecto.
 * @returns {string}
 */
function resolverRutaPropia() {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const rutaConfig = config.get('ownSkillsPath', '.agents/skills');
  return resolverRuta(rutaConfig, '.agents/skills');
}

/**
 * Obtiene la ruta absoluta de las skills globales del sistema.
 * @returns {string}
 */
function resolverRutaGlobal() {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const rutaConfig = config.get('globalSkillsPath', '~/.agents/skills');
  return expandirTilde(rutaConfig || '~/.agents/skills');
}

/**
 * Obtiene la ruta absoluta de las skills para Claude Code en el proyecto.
 * @returns {string}
 */
function resolverRutaClaude() {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const rutaConfig = config.get('claudeSkillsPath', '.claude/skills');
  return resolverRuta(rutaConfig, '.claude/skills');
}

/**
 * Obtiene la ruta absoluta de las skills globales de Claude Code.
 * @returns {string}
 */
function resolverRutaClaudeGlobal() {
  return expandirTilde('~/.claude/skills');
}

/**
 * Obtiene la ruta absoluta del catalogo remoto de GitHub.
 * @returns {string}
 */
function resolverRutaRemota() {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const rutaConfig = config.get('remoteSkillsPath', 'skills-remotas');
  return resolverRuta(rutaConfig, 'skills-remotas');
}

/**
 * Obtiene la ruta absoluta de la carpeta baul/backup de habilidades.
 * @returns {string}
 */
function resolverRutaBackup() {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const rutaConfig = config.get('backupSkillsPath', '~/.skills-backup');
  return expandirTilde(rutaConfig || '~/.skills-backup');
}

/**
 * Parsea el frontmatter simple (YAML) de un archivo SKILL.md
 * Extrae name y description sin requerir dependencias externas pesadas.
 * @param {string} contenido
 * @returns {{ name?: string, description?: string }}
 */
function extraerFrontmatter(contenido) {
  const resultado = {};
  if (!contenido.startsWith('---')) {
    return resultado;
  }

  const finFrontmatter = contenido.indexOf('\n---', 3);
  if (finFrontmatter === -1) {
    return resultado;
  }

  const bloque = contenido.slice(3, finFrontmatter).trim();
  const lineas = bloque.split(/\r?\n/);

  let claveActual = null;
  let valorAcumulado = '';

  for (const linea of lineas) {
    const matchClave = linea.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (matchClave) {
      if (claveActual) {
        resultado[claveActual] = valorAcumulado.trim();
      }
      claveActual = matchClave[1].toLowerCase();
      valorAcumulado = matchClave[2] || '';
    } else if (claveActual && (linea.startsWith('  ') || linea.startsWith('\t'))) {
      valorAcumulado += ' ' + linea.trim();
    }
  }

  if (claveActual) {
    resultado[claveActual] = valorAcumulado.trim();
  }

  return resultado;
}

/**
 * Lee y procesa un archivo SKILL.md en una ruta dada.
 * @param {string} rutaSkillMd
 * @param {string} categoria
 * @param {string} origen
 * @param {boolean} [esCatalogo=false]
 * @returns {Promise<object|null>}
 */
async function procesarArchivoSkill(rutaSkillMd, categoria, origen, esCatalogo = false) {
  try {
    const contenido = await fs.readFile(rutaSkillMd, 'utf8');
    const carpetaSkill = path.dirname(rutaSkillMd);
    const nombreCarpeta = path.basename(carpetaSkill);
    const metadatos = extraerFrontmatter(contenido);

    const nombre = metadatos.name || nombreCarpeta;
    const descripcion = metadatos.description || 'Sin descripcion disponible.';
    const esLocal = origen === 'Propia' || (typeof origen === 'string' && origen.startsWith('Workspace'));
    const categoriaDefecto = esLocal ? 'Local' : 'Global';
    const categoriaFinal = metadatos.category || categoria || categoriaDefecto;

    const config = vscode.workspace.getConfiguration('skillsManager');
    const prefijo = config.get('mentionPrefix', '/');
    const comandoMencion = `${prefijo}${nombre}`;

    return {
      id: `${origen}:${categoriaFinal}:${nombre}`,
      nombre,
      descripcion,
      categoria: categoriaFinal,
      origen,
      esCatalogo,
      esLocal,
      rutaCarpeta: carpetaSkill,
      rutaSkillMd,
      comandoMencion
    };
  } catch (error) {
    console.error(`Error al leer skill en ${rutaSkillMd}:`, error);
    return null;
  }
}

/**
 * Determina si una carpeta debe ignorarse durante el escaneo.
 * @param {string} nombre
 * @returns {boolean}
 */
function esCarpetaIgnorada(nombre) {
  const nombreMin = nombre.toLowerCase();
  if (nombreMin.includes('backup')) return true;
  if (nombreMin === 'node_modules' || nombreMin === '.git' || nombreMin === 'dist' || nombreMin === 'release') return true;
  if (nombreMin.startsWith('.') && !['.agent', '.agents', '.gemini', '.claude'].includes(nombreMin)) return true;
  return false;
}

/**
 * Determina la categoria tematica basada en las carpetas intermedias.
 * Omite nombres genericos como 'skills' o 'skill'.
 * @param {string} directorioBase
 * @param {string} dirActual
 * @param {string} [origen='']
 * @returns {string}
 */
function determinarCategoria(directorioBase, dirActual, origen = '') {
  const rel = path.relative(directorioBase, dirActual);
  const partes = rel.split(path.sep).filter(Boolean);
  const intermedias = partes.slice(0, -1);
  const categoriasValidas = intermedias.filter(
    (p) => !['skills', 'skill', '.', '..'].includes(p.toLowerCase())
  );
  if (categoriasValidas.length > 0) {
    return categoriasValidas[categoriasValidas.length - 1];
  }
  if (origen === 'Propia' || (typeof origen === 'string' && origen.startsWith('Workspace'))) {
    return 'Local';
  }
  return 'Global';
}

/**
 * Escanea recursivamente un directorio en busca de archivos SKILL.md
 * @param {string} directorioBase
 * @param {string} origen
 * @param {boolean} [esCatalogo=false]
 * @param {number} [profundidadMaxima=5]
 * @returns {Promise<Array<object>>}
 */
async function escanearDirectorio(directorioBase, origen, esCatalogo = false, profundidadMaxima = 5) {
  const listaSkills = [];

  async function explorar(dirActual, nivel) {
    if (nivel > profundidadMaxima) return;

    try {
      const entradas = await fs.readdir(dirActual, { withFileTypes: true });

      // Comprobar si este directorio tiene SKILL.md
      const tieneSkillMd = entradas.find(
        (e) => e.isFile() && e.name.toLowerCase() === 'skill.md'
      );

      if (tieneSkillMd) {
        const rutaSkillMd = path.join(dirActual, tieneSkillMd.name);
        const categoria = determinarCategoria(directorioBase, dirActual, origen);
        const skill = await procesarArchivoSkill(rutaSkillMd, categoria, origen, esCatalogo);
        if (skill) {
          listaSkills.push(skill);
        }
        return;
      }

      // Explorar subdirectorios
      for (const entrada of entradas) {
        if (entrada.isDirectory()) {
          if (esCarpetaIgnorada(entrada.name)) {
            continue;
          }

          const subRuta = path.join(dirActual, entrada.name);
          await explorar(subRuta, nivel + 1);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Error al escanear directorio ${dirActual}:`, error);
      }
    }
  }

  await explorar(directorioBase, 1);
  return listaSkills;
}

/**
 * Carga todas las skills clasificadas por origen:
 * - propias: Habilidades personales y en uso (en .agents/skills o configurada)
 * - globales: Habilidades globales de maquina (~/.gemini/config/skills)
 * - catalogo: Repositorio remoto de GitHub (en ./skills-remotas)
 * - workspace: Habilidades detectadas en carpetas locales (.agent/skills, etc.)
 * @returns {Promise<{ propias: Array<object>, globales: Array<object>, catalogo: Array<object>, workspace: Array<object>, todas: Array<object> }>}
 */
async function cargarTodasLasSkills() {
  const rutaPropias = resolverRutaPropia();
  const rutaGlobal = resolverRutaGlobal();
  const rutaRemota = resolverRutaRemota();
  const rutaBackup = resolverRutaBackup();

  const config = vscode.workspace.getConfiguration('skillsManager');
  const carpetasWorkspace = config.get('workspaceFolders', [
    '.agents/skills',
    '.agent/skills',
    '.gemini/skills',
    '.claude/skills'
  ]);

  let skillsPropias = [];
  let skillsGlobales = [];
  let skillsCatalogo = [];
  let skillsWorkspace = [];
  let skillsBackup = [];

  // 1. Cargar Skills Propias (Workspace o configurada)
  try {
    const statsPropias = await fs.stat(rutaPropias);
    if (statsPropias.isDirectory()) {
      skillsPropias = await escanearDirectorio(rutaPropias, 'Propia', false);
    }
  } catch (error) {
    // La carpeta aun no existe
  }

  // 2. Cargar Skills Globales de la maquina (universal, agentes activos y especificas de IDEs)
  const agentesConfig = config.get('agentesActivos', ['auto']);
  const agentesActivos = obtenerAgentesActivos(agentesConfig);
  const rutasAgentes = agentesActivos.map((a) => a.rutaGlobal);

  const carpetasGlobalesConfig = config.get('globalSearchFolders', [
    '~/.agents/skills',
    '~/.gemini/config/skills',
    '~/.claude/skills',
    '~/.cursor/skills'
  ]);
  const listaRutasGlobales = Array.from(
    new Set([rutaGlobal, ...rutasAgentes, ...carpetasGlobalesConfig])
  ).map((r) => expandirTilde(r));

  const rutasGlobalesEscaneadas = new Set();
  for (const dirGlobal of listaRutasGlobales) {
    const rutaNorm = path.resolve(dirGlobal);
    if (rutasGlobalesEscaneadas.has(rutaNorm)) continue;
    rutasGlobalesEscaneadas.add(rutaNorm);

    try {
      const statsGlobal = await fs.stat(rutaNorm);
      if (statsGlobal.isDirectory()) {
        const skillsDeRuta = await escanearDirectorio(rutaNorm, 'Global', false);
        skillsGlobales.push(...skillsDeRuta);
      }
    } catch (error) {
      // La carpeta global no existe o no es accesible
    }
  }

  // 3. Cargar Catalogo Remoto (GitHub)
  try {
    const statsRemota = await fs.stat(rutaRemota);
    if (statsRemota.isDirectory()) {
      skillsCatalogo = await escanearDirectorio(rutaRemota, 'Catalogo Remoto', true);
    }
  } catch (error) {
    // La carpeta de catalogo aun no se ha clonado
  }

  // 4. Cargar Skills del Workspace actual
  const carpetasActivas = vscode.workspace.workspaceFolders || [];
  for (const carpetaTrabajo of carpetasActivas) {
    const raizWorkspace = carpetaTrabajo.uri.fsPath;

    for (const relDir of carpetasWorkspace) {
      const rutaAbsoluta = path.join(raizWorkspace, relDir);
      if (path.resolve(rutaAbsoluta) === path.resolve(rutaPropias)) {
        continue;
      }
      try {
        const stats = await fs.stat(rutaAbsoluta);
        if (stats.isDirectory()) {
          const skillsEncontradas = await escanearDirectorio(
            rutaAbsoluta,
            `Workspace (${relDir})`,
            false
          );
          skillsWorkspace.push(...skillsEncontradas);
        }
      } catch (error) {
        // Carpeta no existe en este workspace
      }
    }
  }

  // 5. Cargar Skills del Baul de Backup
  try {
    const statsBackup = await fs.stat(rutaBackup);
    if (statsBackup.isDirectory()) {
      skillsBackup = await escanearDirectorio(rutaBackup, 'Backup', false);
      for (const s of skillsBackup) {
        s.esBackup = true;
      }
    }
  } catch (error) {
    // La carpeta de backup aun no existe
  }

  // Lista combinada unica para el buscador rapido QuickPick y enriquecimiento de agentes
  const todasColecciones = [...skillsPropias, ...skillsGlobales, ...skillsWorkspace, ...skillsCatalogo, ...skillsBackup];
  for (const s of todasColecciones) {
    if (!s.agentes) {
      s.agentes = obtenerAgentesConSkill(s.id, agentesActivos).map((a) => a.nombre);
    }
  }

  const mapaUnico = new Map();
  const todas = [];

  for (const s of todasColecciones) {
    if (!mapaUnico.has(s.id)) {
      mapaUnico.set(s.id, s);
      todas.push(s);
    }
  }

  return {
    propias: skillsPropias,
    globales: skillsGlobales,
    catalogo: skillsCatalogo,
    workspace: skillsWorkspace,
    backup: skillsBackup,
    todas
  };
}

module.exports = {
  cargarTodasLasSkills,
  resolverRutaPropia,
  resolverRutaGlobal,
  resolverRutaClaude,
  resolverRutaClaudeGlobal,
  resolverRutaRemota,
  resolverRutaBackup,
  extraerFrontmatter,
  procesarArchivoSkill,
  escanearDirectorio,
  expandirTilde
};
