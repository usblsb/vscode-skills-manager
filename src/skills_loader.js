const fs = require('fs').promises;
const path = require('path');
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
 * Resuelve una ruta que puede ser absoluta o relativa a la raiz del proyecto abierto.
 * @param {string} rutaConfigurada
 * @param {string} rutaDefecto
 * @returns {string}
 */
function resolverRuta(rutaConfigurada, rutaDefecto) {
  const ruta = rutaConfigurada || rutaDefecto;
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
 * Obtiene la ruta absoluta de las skills propias en uso.
 * @returns {string}
 */
function resolverRutaPropia() {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const rutaConfig = config.get('ownSkillsPath', 'skills-propias');
  return resolverRuta(rutaConfig, 'skills-propias');
}

/**
 * Obtiene la ruta absoluta del catalogo remoto de GitHub.
 * @returns {string}
 */
function resolverRutaRemota() {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const rutaConfig = config.get('remoteSkillsPath') || config.get('globalSkillsPath', 'skills-remotas');
  return resolverRuta(rutaConfig, 'skills-remotas');
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
    const descripcion = metadatos.description || 'Sin descripción disponible.';

    const config = vscode.workspace.getConfiguration('skillsManager');
    const prefijo = config.get('mentionPrefix', '@');
    const comandoMencion = `${prefijo}${nombre}`;

    return {
      id: `${origen}:${categoria}:${nombre}`,
      nombre,
      descripcion,
      categoria: categoria || 'General',
      origen,
      esCatalogo,
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
 * @returns {string}
 */
function determinarCategoria(directorioBase, dirActual) {
  const rel = path.relative(directorioBase, dirActual);
  const partes = rel.split(path.sep).filter(Boolean);
  const intermedias = partes.slice(0, -1);
  const categoriasValidas = intermedias.filter(
    (p) => !['skills', 'skill', '.', '..'].includes(p.toLowerCase())
  );
  if (categoriasValidas.length > 0) {
    return categoriasValidas[categoriasValidas.length - 1];
  }
  return 'General';
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
        const categoria = determinarCategoria(directorioBase, dirActual);
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
 * - propias: Habilidades personales y en uso (en ./skills-propias)
 * - catalogo: Repositorio remoto de GitHub (en ./skills-remotas)
 * - workspace: Habilidades detectadas en carpetas locales (.agent/skills, etc.)
 * @returns {Promise<{ propias: Array<object>, catalogo: Array<object>, workspace: Array<object>, todas: Array<object> }>}
 */
async function cargarTodasLasSkills() {
  const rutaPropias = resolverRutaPropia();
  const rutaRemota = resolverRutaRemota();

  const config = vscode.workspace.getConfiguration('skillsManager');
  const carpetasWorkspace = config.get('workspaceFolders', [
    '.agent/skills',
    '.agents/skills',
    '.gemini/skills',
    '.claude/skills'
  ]);

  let skillsPropias = [];
  let skillsCatalogo = [];
  let skillsWorkspace = [];

  // 1. Cargar Skills Propias (En Uso)
  try {
    const statsPropias = await fs.stat(rutaPropias);
    if (statsPropias.isDirectory()) {
      skillsPropias = await escanearDirectorio(rutaPropias, 'Propia', false);
    }
  } catch (error) {
    // La carpeta aún no existe
  }

  // 2. Cargar Catálogo Remoto (GitHub)
  try {
    const statsRemota = await fs.stat(rutaRemota);
    if (statsRemota.isDirectory()) {
      skillsCatalogo = await escanearDirectorio(rutaRemota, 'Catálogo Remoto', true);
    }
  } catch (error) {
    // La carpeta de catálogo aún no se ha clonado
  }

  // 3. Cargar Skills del Workspace actual
  const carpetasActivas = vscode.workspace.workspaceFolders || [];
  for (const carpetaTrabajo of carpetasActivas) {
    const raizWorkspace = carpetaTrabajo.uri.fsPath;

    for (const relDir of carpetasWorkspace) {
      const rutaAbsoluta = path.join(raizWorkspace, relDir);
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

  // Lista combinada única para el buscador rápido QuickPick
  const mapaUnico = new Map();
  const todas = [];

  for (const s of [...skillsPropias, ...skillsWorkspace, ...skillsCatalogo]) {
    if (!mapaUnico.has(s.id)) {
      mapaUnico.set(s.id, s);
      todas.push(s);
    }
  }

  return {
    propias: skillsPropias,
    catalogo: skillsCatalogo,
    workspace: skillsWorkspace,
    todas
  };
}

module.exports = {
  cargarTodasLasSkills,
  resolverRutaPropia,
  resolverRutaRemota,
  extraerFrontmatter,
  procesarArchivoSkill,
  escanearDirectorio
};
