const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Expande el caracter ~ al directorio home del usuario de forma segura.
 * @param {string} ruta
 * @returns {string}
 */
function expandirTilde(ruta) {
  if (!ruta) return '';
  if (ruta.startsWith('~/') || ruta === '~') {
    return path.join(os.homedir(), ruta.slice(1));
  }
  return ruta;
}

/**
 * Catalogo declarativo de agentes de IA y sus ubicaciones estandar de skills.
 */
const CATALOGO_AGENTES = [
  {
    id: 'universal',
    nombre: 'Universal (Amp / Estándar)',
    rutaGlobal: '~/.agents/skills',
    rutaDetectar: '~/.agents',
    icono: 'hubot'
  },
  {
    id: 'gemini',
    nombre: 'Antigravity / Gemini CLI',
    rutaGlobal: '~/.gemini/config/skills',
    rutaDetectar: '~/.gemini',
    icono: 'sparkle'
  },
  {
    id: 'claude',
    nombre: 'Claude Code',
    rutaGlobal: '~/.claude/skills',
    rutaDetectar: '~/.claude',
    icono: 'terminal'
  },
  {
    id: 'windsurf',
    nombre: 'Windsurf (Codeium)',
    rutaGlobal: '~/.codeium/windsurf/skills',
    rutaDetectar: '~/.codeium/windsurf',
    icono: 'flame'
  },
  {
    id: 'cursor',
    nombre: 'Cursor',
    rutaGlobal: '~/.cursor/skills',
    rutaDetectar: '~/.cursor',
    icono: 'code'
  },
  {
    id: 'continue',
    nombre: 'Continue',
    rutaGlobal: '~/.continue/skills',
    rutaDetectar: '~/.continue',
    icono: 'play'
  },
  {
    id: 'openhands',
    nombre: 'OpenHands',
    rutaGlobal: '~/.openhands/skills',
    rutaDetectar: '~/.openhands',
    icono: 'organization'
  },
  {
    id: 'devin',
    nombre: 'Devin for Terminal',
    rutaGlobal: '~/.config/devin/skills',
    rutaDetectar: '~/.config/devin',
    icono: 'device-desktop'
  },
  {
    id: 'goose',
    nombre: 'Goose',
    rutaGlobal: '~/.config/goose/skills',
    rutaDetectar: '~/.config/goose',
    icono: 'rocket'
  },
  {
    id: 'crush',
    nombre: 'Crush',
    rutaGlobal: '~/.config/crush/skills',
    rutaDetectar: '~/.config/crush',
    icono: 'zap'
  },
  {
    id: 'moltbot',
    nombre: 'Moltbot',
    rutaGlobal: '~/.moltbot/skills',
    rutaDetectar: '~/.moltbot',
    icono: 'circuit-board'
  },
  {
    id: 'aiderdesk',
    nombre: 'AiderDesk',
    rutaGlobal: '~/.aider-desk/skills',
    rutaDetectar: '~/.aider-desk',
    icono: 'comment-discussion'
  },
  {
    id: 'astrbot',
    nombre: 'AstrBot',
    rutaGlobal: '~/.astrbot/data/skills',
    rutaDetectar: '~/.astrbot',
    icono: 'star'
  },
  {
    id: 'autohand',
    nombre: 'Autohand Code CLI',
    rutaGlobal: '~/.autohand/skills',
    rutaDetectar: '~/.autohand',
    icono: 'tools'
  },
  {
    id: 'augment',
    nombre: 'Augment',
    rutaGlobal: '~/.augment/skills',
    rutaDetectar: '~/.augment',
    icono: 'plus'
  },
  {
    id: 'bob',
    nombre: 'IBM Bob',
    rutaGlobal: '~/.bob/skills',
    rutaDetectar: '~/.bob',
    icono: 'server'
  },
  {
    id: 'codearts',
    nombre: 'CodeArts Agent',
    rutaGlobal: '~/.codeartsdoer/skills',
    rutaDetectar: '~/.codeartsdoer',
    icono: 'mortar-board'
  },
  {
    id: 'codebuddy',
    nombre: 'CodeBuddy',
    rutaGlobal: '~/.codebuddy/skills',
    rutaDetectar: '~/.codebuddy',
    icono: 'person'
  },
  {
    id: 'codemaker',
    nombre: 'Codemaker',
    rutaGlobal: '~/.codemaker/skills',
    rutaDetectar: '~/.codemaker',
    icono: 'gear'
  },
  {
    id: 'codestudio',
    nombre: 'Code Studio',
    rutaGlobal: '~/.codestudio/skills',
    rutaDetectar: '~/.codestudio',
    icono: 'window'
  },
  {
    id: 'commandcode',
    nombre: 'Command Code',
    rutaGlobal: '~/.commandcode/skills',
    rutaDetectar: '~/.commandcode',
    icono: 'terminal'
  },
  {
    id: 'cortex',
    nombre: 'Cortex Code (Snowflake)',
    rutaGlobal: '~/.snowflake/cortex/skills',
    rutaDetectar: '~/.snowflake/cortex',
    icono: 'database'
  },
  {
    id: 'forge',
    nombre: 'ForgeCode',
    rutaGlobal: '~/.forge/skills',
    rutaDetectar: '~/.forge',
    icono: 'flame'
  },
  {
    id: 'fx',
    nombre: 'fx',
    rutaGlobal: '~/.fx/skills',
    rutaDetectar: '~/.fx',
    icono: 'symbol-function'
  },
  {
    id: 'grok',
    nombre: 'Grok Build',
    rutaGlobal: '~/.grok/skills',
    rutaDetectar: '~/.grok',
    icono: 'eye'
  },
  {
    id: 'hermes',
    nombre: 'Hermes Agent',
    rutaGlobal: '~/.hermes/skills',
    rutaDetectar: '~/.hermes',
    icono: 'send'
  },
  {
    id: 'inferencesh',
    nombre: 'inference.sh',
    rutaGlobal: '~/.inferencesh/skills',
    rutaDetectar: '~/.inferencesh',
    icono: 'cloud'
  },
  {
    id: 'jazz',
    nombre: 'Jazz',
    rutaGlobal: '~/.jazz/skills',
    rutaDetectar: '~/.jazz',
    icono: 'pulse'
  },
  {
    id: 'junie',
    nombre: 'Junie',
    rutaGlobal: '~/.junie/skills',
    rutaDetectar: '~/.junie',
    icono: 'heart'
  },
  {
    id: 'iflow',
    nombre: 'iFlow CLI',
    rutaGlobal: '~/.iflow/skills',
    rutaDetectar: '~/.iflow',
    icono: 'git-branch'
  },
  {
    id: 'kimchi',
    nombre: 'Kimchi',
    rutaGlobal: '~/.config/kimchi/harness/skills',
    rutaDetectar: '~/.config/kimchi',
    icono: 'beaker'
  },
  {
    id: 'kiro',
    nombre: 'Kiro CLI',
    rutaGlobal: '~/.kiro/skills',
    rutaDetectar: '~/.kiro',
    icono: 'key'
  },
  {
    id: 'kode',
    nombre: 'Kode',
    rutaGlobal: '~/.kode/skills',
    rutaDetectar: '~/.kode',
    icono: 'file-code'
  },
  {
    id: 'lingma',
    nombre: 'Lingma',
    rutaGlobal: '~/.lingma/skills',
    rutaDetectar: '~/.lingma',
    icono: 'globe'
  },
  {
    id: 'mcpjam',
    nombre: 'MCPJam',
    rutaGlobal: '~/.mcpjam/skills',
    rutaDetectar: '~/.mcpjam',
    icono: 'radio-tower'
  },
  {
    id: 'minimax',
    nombre: 'MiniMax Code',
    rutaGlobal: '~/.minimax/skills',
    rutaDetectar: '~/.minimax',
    icono: 'cpu'
  },
  {
    id: 'vibe',
    nombre: 'Mistral Vibe',
    rutaGlobal: '~/.vibe/skills',
    rutaDetectar: '~/.vibe',
    icono: 'zap'
  },
  {
    id: 'moxby',
    nombre: 'Moxby',
    rutaGlobal: '~/.moxby/skills',
    rutaDetectar: '~/.moxby',
    icono: 'package'
  },
  {
    id: 'mux',
    nombre: 'Mux',
    rutaGlobal: '~/.mux/skills',
    rutaDetectar: '~/.mux',
    icono: 'layers'
  },
  {
    id: 'ona',
    nombre: 'Ona',
    rutaGlobal: '~/.ona/skills',
    rutaDetectar: '~/.ona',
    icono: 'telescope'
  },
  {
    id: 'pi',
    nombre: 'Pi Agent',
    rutaGlobal: '~/.pi/agent/skills',
    rutaDetectar: '~/.pi',
    icono: 'symbol-constant'
  },
  {
    id: 'posit',
    nombre: 'Posit Assistant',
    rutaGlobal: '~/.posit/assistant/skills',
    rutaDetectar: '~/.posit',
    icono: 'graph'
  },
  {
    id: 'qoder',
    nombre: 'Qoder',
    rutaGlobal: '~/.qoder/skills',
    rutaDetectar: '~/.qoder',
    icono: 'code'
  },
  {
    id: 'qoder_cn',
    nombre: 'Qoder CN',
    rutaGlobal: '~/.qoder-cn/skills',
    rutaDetectar: '~/.qoder-cn',
    icono: 'code'
  },
  {
    id: 'qwen',
    nombre: 'Qwen Code',
    rutaGlobal: '~/.qwen/skills',
    rutaDetectar: '~/.qwen',
    icono: 'light-bulb'
  },
  {
    id: 'reasonix',
    nombre: 'Reasonix',
    rutaGlobal: '~/.reasonix/skills',
    rutaDetectar: '~/.reasonix',
    icono: 'law'
  },
  {
    id: 'rovodev',
    nombre: 'Rovo Dev',
    rutaGlobal: '~/.rovodev/skills',
    rutaDetectar: '~/.rovodev',
    icono: 'compass'
  },
  {
    id: 'roo',
    nombre: 'Roo Code',
    rutaGlobal: '~/.roo/skills',
    rutaDetectar: '~/.roo',
    icono: 'rocket'
  },
  {
    id: 'tabnine',
    nombre: 'Tabnine CLI',
    rutaGlobal: '~/.tabnine/agent/skills',
    rutaDetectar: '~/.tabnine',
    icono: 'dashboard'
  },
  {
    id: 'terramind',
    nombre: 'Terramind',
    rutaGlobal: '~/.terramind/skills',
    rutaDetectar: '~/.terramind',
    icono: 'server'
  },
  {
    id: 'tinycloud',
    nombre: 'Tinycloud',
    rutaGlobal: '~/.tinycloud/skills',
    rutaDetectar: '~/.tinycloud',
    icono: 'cloud'
  },
  {
    id: 'trae_cn',
    nombre: 'Trae CN',
    rutaGlobal: '~/.trae-cn/skills',
    rutaDetectar: '~/.trae-cn',
    icono: 'split-horizontal'
  },
  {
    id: 'zcode',
    nombre: 'ZCode',
    rutaGlobal: '~/.zcode/skills',
    rutaDetectar: '~/.zcode',
    icono: 'file-binary'
  },
  {
    id: 'zencoder',
    nombre: 'Zencoder',
    rutaGlobal: '~/.zencoder/skills',
    rutaDetectar: '~/.zencoder',
    icono: 'play-circle'
  },
  {
    id: 'neovate',
    nombre: 'Neovate',
    rutaGlobal: '~/.neovate/skills',
    rutaDetectar: '~/.neovate',
    icono: 'sparkle'
  },
  {
    id: 'pochi',
    nombre: 'Pochi',
    rutaGlobal: '~/.pochi/skills',
    rutaDetectar: '~/.pochi',
    icono: 'smiley'
  },
  {
    id: 'adal',
    nombre: 'AdaL',
    rutaGlobal: '~/.adal/skills',
    rutaDetectar: '~/.adal',
    icono: 'shield'
  },
  {
    id: 'cline',
    nombre: 'Cline',
    rutaGlobal: '~/.cline/skills',
    rutaDetectar: '~/.cline',
    icono: 'terminal'
  },
  {
    id: 'codex',
    nombre: 'Codex',
    rutaGlobal: '~/.codex/skills',
    rutaDetectar: '~/.codex',
    icono: 'book'
  },
  {
    id: 'droid',
    nombre: 'Droid',
    rutaGlobal: '~/.droid/skills',
    rutaDetectar: '~/.droid',
    icono: 'radio-tower'
  },
  {
    id: 'copilot',
    nombre: 'GitHub Copilot',
    rutaGlobal: '~/.copilot/skills',
    rutaDetectar: '~/.copilot',
    icono: 'github'
  },
  {
    id: 'kilo',
    nombre: 'Kilo Code',
    rutaGlobal: '~/.kilo/skills',
    rutaDetectar: '~/.kilo',
    icono: 'symbol-ruler'
  },
  {
    id: 'kimi',
    nombre: 'Kimi Code CLI',
    rutaGlobal: '~/.kimi/skills',
    rutaDetectar: '~/.kimi',
    icono: 'hubot'
  },
  {
    id: 'opencode',
    nombre: 'OpenCode',
    rutaGlobal: '~/.opencode/skills',
    rutaDetectar: '~/.opencode',
    icono: 'source-control'
  },
  {
    id: 'openclaw',
    nombre: 'OpenClaw',
    rutaGlobal: '~/.openclaw/skills',
    rutaDetectar: '~/.openclaw',
    icono: 'tag'
  },
  {
    id: 'warp',
    nombre: 'Warp',
    rutaGlobal: '~/.warp/skills',
    rutaDetectar: '~/.warp',
    icono: 'terminal'
  },
  {
    id: 'zed',
    nombre: 'Zed',
    rutaGlobal: '~/.config/zed/skills',
    rutaDetectar: '~/.config/zed',
    icono: 'edit'
  },
  {
    id: 'zenflow',
    nombre: 'Zenflow',
    rutaGlobal: '~/.zenflow/skills',
    rutaDetectar: '~/.zenflow',
    icono: 'flow'
  }
];

/**
 * Retorna todos los agentes definidos en el catalogo.
 * @returns {Array<object>}
 */
function obtenerCatalogoAgentes() {
  return CATALOGO_AGENTES;
}

/**
 * Busca un agente por su identificador unico.
 * @param {string} id
 * @returns {object|null}
 */
function obtenerAgentePorId(id) {
  if (!id) return null;
  const idBuscado = id.toLowerCase();
  return CATALOGO_AGENTES.find(a => a.id.toLowerCase() === idBuscado) || null;
}

/**
 * Comprueba si un agente esta presente en el sistema.
 * Un agente se considera presente si su carpeta de skills o su carpeta base existe.
 * @param {object} agente
 * @returns {boolean}
 */
function estaAgentePresente(agente) {
  if (!agente) return false;
  const rutaSkills = expandirTilde(agente.rutaGlobal);
  const rutaDetectar = expandirTilde(agente.rutaDetectar || agente.rutaGlobal);

  if (fs.existsSync(rutaSkills)) return true;
  if (rutaDetectar && fs.existsSync(rutaDetectar)) return true;
  return false;
}

/**
 * Obtiene la lista de agentes activos para la extension.
 * Si agentesConfig incluye 'auto' o esta vacio, detecta los instalados en disco.
 * @param {Array<string>} [agentesConfig=['auto']]
 * @returns {Array<object>}
 */
function obtenerAgentesActivos(agentesConfig = ['auto']) {
  const usarAuto = !agentesConfig || agentesConfig.length === 0 || agentesConfig.includes('auto');

  if (usarAuto) {
    // Retorna los agentes cuya carpeta base o de skills existe en el sistema
    const detectados = CATALOGO_AGENTES.filter(estaAgentePresente);
    // Garantizar que 'universal' siempre este disponible como destino basico
    if (!detectados.some(a => a.id === 'universal')) {
      const universal = obtenerAgentePorId('universal');
      if (universal) detectados.unshift(universal);
    }
    return detectados;
  }

  // Si el usuario especifico una lista fija de IDs en settings
  const activos = [];
  for (const id of agentesConfig) {
    const agente = obtenerAgentePorId(id);
    if (agente) {
      activos.push(agente);
    }
  }
  return activos;
}

/**
 * Determina en que agentes esta desplegada una habilidad.
 * @param {string} idSkill
 * @param {Array<object>} agentesActivos
 * @returns {Array<object>} lista de agentes donde existe la carpeta de la skill
 */
function obtenerAgentesConSkill(idSkill, agentesActivos) {
  if (!idSkill || !agentesActivos || agentesActivos.length === 0) return [];
  const encontrados = [];
  for (const agente of agentesActivos) {
    const rutaSkills = expandirTilde(agente.rutaGlobal);
    const rutaDirectorioSkill = path.join(rutaSkills, idSkill);
    try {
      if (fs.existsSync(rutaDirectorioSkill)) {
        encontrados.push(agente);
      }
    } catch (e) {
      // Ignorar rutas no accesibles
    }
  }
  return encontrados;
}

module.exports = {
  CATALOGO_AGENTES,
  expandirTilde,
  obtenerCatalogoAgentes,
  obtenerAgentePorId,
  estaAgentePresente,
  obtenerAgentesActivos,
  obtenerAgentesConSkill
};
