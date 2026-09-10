let vscode;
try {
  vscode = require('vscode');
} catch (e) {
  vscode = {
    TreeItem: class {
      constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
      }
    },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    ThemeIcon: class { constructor(id, color) { this.id = id; this.color = color; } },
    ThemeColor: class { constructor(id) { this.id = id; } },
    MarkdownString: class { constructor(val) { this.value = val; } },
    EventEmitter: class {
      constructor() { this.event = () => {}; }
      fire() {}
    }
  };
}
const path = require('path');
const { cargarTodasLasSkills } = require('./skills_loader');
const {
  esFavorita,
  esInactiva,
  debeOcultarInactivas
} = require('./skills_state');

/**
 * Representa un nodo en el arbol de skills.
 */
class SkillTreeItem extends vscode.TreeItem {
  /**
   * @param {string} etiqueta
   * @param {vscode.TreeItemCollapsibleState} estadoColapsado
   * @param {string} tipo - 'grupoFavoritas' | 'grupoPropias' | 'grupoCatalogo' | 'grupoWorkspace' | 'categoria' | 'skill' | 'info'
   * @param {object} [datosExtra]
   */
  constructor(etiqueta, estadoColapsado, tipo, datosExtra = {}) {
    super(etiqueta, estadoColapsado);
    this.tipo = tipo;
    this.datosExtra = datosExtra;

    if (tipo === 'grupoFavoritas') {
      this.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
      this.contextValue = 'grupoFavoritas';
    } else if (tipo === 'grupoPropias') {
      this.iconPath = new vscode.ThemeIcon('tools');
      this.contextValue = 'grupoPropias';
    } else if (tipo === 'grupoCatalogo') {
      this.iconPath = new vscode.ThemeIcon('cloud');
      this.contextValue = 'grupoCatalogo';
    } else if (tipo === 'grupoWorkspace') {
      this.iconPath = new vscode.ThemeIcon('folder-library');
      this.contextValue = 'grupoWorkspace';
    } else if (tipo === 'categoria') {
      this.iconPath = new vscode.ThemeIcon('folder');
      this.contextValue = 'categoria';
    } else if (tipo === 'skill') {
      const skill = datosExtra.skill;
      const esFav = esFavorita(skill.id);
      const esInact = esInactiva(skill.id);
      const esCatalogo = Boolean(skill.esCatalogo);

      // Iconos y descriptores
      if (esFav) {
        this.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
        this.description = `⭐ ${skill.comandoMencion}`;
      } else if (esInact) {
        this.iconPath = new vscode.ThemeIcon('circle-slash');
        this.description = `${skill.comandoMencion}  (Inactiva)`;
      } else if (esCatalogo) {
        this.iconPath = new vscode.ThemeIcon('package');
        this.description = skill.comandoMencion;
      } else {
        this.iconPath = new vscode.ThemeIcon('symbol-keyword');
        this.description = skill.comandoMencion;
      }

      // ContextValue para botones de accion dinamicos
      const sufijoFav = esFav ? 'fav' : 'nofav';
      const sufijoAct = esInact ? 'inactiva' : 'activa';
      const prefijoTipo = esCatalogo ? 'skillItem_catalogo' : (skill.origen === 'Propia' ? 'skillItem_propia' : 'skillItem_workspace');
      this.contextValue = `${prefijoTipo}_${sufijoFav}_${sufijoAct}`;

      // Informacion detallada en el tooltip
      const estadoTexto = esInact ? 'Inactiva' : 'Activa';
      const favoritaTexto = esFav ? ' | ⭐ Favorita' : '';
      const notaCatalogo = esCatalogo ? '\n\n*(Catálogo remoto: pulsa + para añadir a tus skills)*' : '';

      this.tooltip = new vscode.MarkdownString(
        `### ${skill.nombre}\n\n` +
        `**Comando:** \`${skill.comandoMencion}\`\n\n` +
        `**Categoría:** ${skill.categoria}\n\n` +
        `**Origen:** ${skill.origen}\n\n` +
        `**Estado:** ${estadoTexto}${favoritaTexto}\n\n` +
        `---\n\n` +
        `${skill.descripcion}${notaCatalogo}\n\n` +
        `*Haz clic para copiar la mención al portapapeles.*`
      );
      this.tooltip.isTrusted = true;

      this.command = {
        command: 'skills-manager.copiarMencion',
        title: 'Copiar mención',
        arguments: [skill]
      };
    }
  }
}

/**
 * Proveedor de datos para la vista en arbol de Skills.
 */
class SkillsTreeProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.datosSkills = null;
  }

  /**
   * Fuerza la recarga del arbol.
   */
  recargar() {
    this.datosSkills = null;
    this._onDidChangeTreeData.fire();
  }

  /**
   * @param {SkillTreeItem} element
   * @returns {vscode.TreeItem}
   */
  getTreeItem(element) {
    return element;
  }

  /**
   * Obtiene la lista actual de skills cargadas en memoria.
   * @returns {Array<object>}
   */
  obtenerSkillsActuales() {
    return (this.datosSkills && this.datosSkills.todas) || [];
  }

  /**
   * @param {SkillTreeItem} [element]
   * @returns {Promise<SkillTreeItem[]>}
   */
  async getChildren(element) {
    if (!this.datosSkills) {
      this.datosSkills = await cargarTodasLasSkills();
    }

    const ocultarInactivas = debeOcultarInactivas();

    // Nivel raiz
    if (!element) {
      const items = [];
      const todas = this.datosSkills.todas;

      // 1. Grupo Favoritas
      const skillsFavoritas = todas.filter((s) => esFavorita(s.id));
      const favVisibles = ocultarInactivas
        ? skillsFavoritas.filter((s) => !esInactiva(s.id))
        : skillsFavoritas;

      if (favVisibles.length > 0) {
        items.push(
          new SkillTreeItem(
            `⭐ Favoritas (${favVisibles.length})`,
            vscode.TreeItemCollapsibleState.Expanded,
            'grupoFavoritas',
            { skills: favVisibles }
          )
        );
      }

      // 2. Grupo Mis Habilidades (Unifica propias y de workspace)
      const todasEnUso = [...(this.datosSkills.propias || []), ...(this.datosSkills.workspace || [])];
      const mapaEnUso = new Map();
      for (const s of todasEnUso) {
        if (!mapaEnUso.has(s.id)) {
          mapaEnUso.set(s.id, s);
        }
      }
      const listaEnUso = Array.from(mapaEnUso.values());
      const visiblesEnUso = ocultarInactivas
        ? listaEnUso.filter((s) => !esInactiva(s.id))
        : listaEnUso;

      items.push(
        new SkillTreeItem(
          `⚡ Mis Habilidades (${visiblesEnUso.length})`,
          visiblesEnUso.length > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed,
          'grupoPropias',
          { skills: visiblesEnUso }
        )
      );

      // 3. Grupo Catálogo Remoto (GitHub)
      const catalogoVisibles = ocultarInactivas
        ? (this.datosSkills.catalogo || []).filter((s) => !esInactiva(s.id))
        : (this.datosSkills.catalogo || []);

      items.push(
        new SkillTreeItem(
          `🌐 Catálogo Remoto GitHub (${catalogoVisibles.length})`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'grupoCatalogo',
          { skills: catalogoVisibles }
        )
      );

      return items;
    }

    // Nivel 1: Contenido de Favoritas
    if (element.tipo === 'grupoFavoritas') {
      const skills = element.datosExtra.skills || [];
      skills.sort((a, b) => a.nombre.localeCompare(b.nombre));

      return skills.map(
        (skill) =>
          new SkillTreeItem(
            skill.nombre,
            vscode.TreeItemCollapsibleState.None,
            'skill',
            { skill }
          )
      );
    }

    // Nivel 1: Categorias dentro de Propias, Catalogo o Workspace
    if (['grupoPropias', 'grupoCatalogo', 'grupoWorkspace'].includes(element.tipo)) {
      const skillsGrupo = element.datosExtra.skills || [];

      if (skillsGrupo.length === 0) {
        if (element.tipo === 'grupoPropias') {
          const itemVacio = new SkillTreeItem(
            'Sin habilidades en uso. Añade desde el catálogo (+) o pulsa "Nueva Skill".',
            vscode.TreeItemCollapsibleState.None,
            'info'
          );
          itemVacio.iconPath = new vscode.ThemeIcon('info');
          return [itemVacio];
        }

        if (element.tipo === 'grupoCatalogo') {
          const itemVacio = new SkillTreeItem(
            'Catálogo no descargado. Pulsa el botón Sincronizar en la cabecera.',
            vscode.TreeItemCollapsibleState.None,
            'info'
          );
          itemVacio.iconPath = new vscode.ThemeIcon('cloud-download');
          itemVacio.command = {
            command: 'skills-manager.sincronizar',
            title: 'Sincronizar Catálogo'
          };
          return [itemVacio];
        }

        const itemVacio = new SkillTreeItem(
          'Sin skills en carpetas locales (.agent, .gemini, .claude)',
          vscode.TreeItemCollapsibleState.None,
          'info'
        );
        itemVacio.iconPath = new vscode.ThemeIcon('info');
        return [itemVacio];
      }

      // Agrupar por categoría
      const categoriasMap = new Map();
      for (const skill of skillsGrupo) {
        const cat = skill.categoria || 'General';
        if (!categoriasMap.has(cat)) {
          categoriasMap.set(cat, []);
        }
        categoriasMap.get(cat).push(skill);
      }

      const itemsCategorias = [];
      const categoriasOrdenadas = Array.from(categoriasMap.keys()).sort();

      for (const cat of categoriasOrdenadas) {
        const listaCat = categoriasMap.get(cat);
        const itemCat = new SkillTreeItem(
          `${cat} (${listaCat.length})`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'categoria',
          {
            categoria: cat,
            skills: listaCat
          }
        );
        itemsCategorias.push(itemCat);
      }

      return itemsCategorias;
    }

    // Nivel 2: Skills dentro de una categoria
    if (element.tipo === 'categoria') {
      const listaSkills = element.datosExtra.skills || [];
      listaSkills.sort((a, b) => a.nombre.localeCompare(b.nombre));

      return listaSkills.map(
        (skill) =>
          new SkillTreeItem(
            skill.nombre,
            vscode.TreeItemCollapsibleState.None,
            'skill',
            { skill }
          )
      );
    }

    return [];
  }
}

module.exports = {
  SkillsTreeProvider,
  SkillTreeItem
};
