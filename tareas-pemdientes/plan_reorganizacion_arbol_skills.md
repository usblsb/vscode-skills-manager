# Plan de Trabajo: Reorganizacion del Arbol de Habilidades y Unificacion de Iconos de Accion

## 1. Resumen de lo Solicitado

### A. Renombrado de categoria "General" a "Global"
* **Situacion actual:** En la vista del arbol *SKILLS IA: HABILIDADES DISPONIBLES*, las habilidades sin categoria definida se agrupan bajo la etiqueta `General` (por ejemplo: `General (26)` en *Mis Habilidades* y `General (27)` en *Baul de Referencia*).
* **Cambio solicitado:** Cambiar la etiqueta `General` por `Global` tanto en *Mis Habilidades* como en *Baul de Referencia*, ya que son habilidades globales y el termino "General" resulta confuso.

### B. Desglose explicito de habilidades "Global" y "Local" en "Mis Habilidades"
* **Situacion actual:** *Mis Habilidades* combina todas las habilidades activas (globales y de workspace) en una lista unificada agrupada unicamente por categorias tematicas (`General`, `toolchain`, etc.).
* **Cambio solicitado:** Permitir ver dentro de *Mis Habilidades* el nodo o categoria `Local` para mostrar las habilidades activas exclusivas del proyecto localmente, junto a `Global` y el resto de categorias especificas (ejemplo: `toolchain`).
* **Estructura objetivo en "Mis Habilidades":**
  ```text
  ▼ ⚡ Mis Habilidades (27)
    ▶ 🌐 Global (26)
    ▶ 📁 Local (0)     <-- Nuevo nodo para habilidades del proyecto actual
    ▶ 📁 toolchain (1)
  ```

### C. Unificacion de iconos y acciones para todas las habilidades
* **Situacion actual:**
  * En el *Baul de Referencia*, las habilidades disponen de iconos en linea para:
    * Copiar a Local
    * Copiar a Global
    * Marcar como favorita
    * Copiar mencion
    * Ver documentacion
    * Eliminar skill
  * En *Mis Habilidades*, los botones en linea `Copiar a Local` y `Copiar a Global` no aparecen para todas las habilidades (estan restringidos en `package.json` mediante condiciones `viewItem`).
* **Cambio solicitado:** Que todas las habilidades (tanto en *Mis Habilidades* [Globales o Locales] como en el *Baul de Referencia*) dispongan de la misma botonera de acciones e iconos:
  1. `Copiar a Local` (`skills-manager.copiarALocal`)
  2. `Copiar a Global` (`skills-manager.copiarAGlobal`)
  3. `Marcar / Desmarcar como favorita` (`skills-manager.marcarFavorita` / `desmarcarFavorita`)
  4. `Copiar mencion de la Skill` (`skills-manager.copiarMencion`)
  5. `Ver documentacion` (`skills-manager.abrirSkill`)
  6. `Eliminar skill` (`skills-manager.eliminarSkill`)

---

## 2. Comprobacion Tecnica en el Codigo Actual

Tras inspeccionar los ficheros del proyecto, se ha verificado lo siguiente:

1. **Origen de la etiqueta "General":**
   * En `src/skills_loader.js` (lineas 150 y 203), la funcion `determinarCategoria` y el procesado de `SKILL.md` asignan por defecto el valor `'General'` si la habilidad no pertenece a una subcarpeta tematica.
   * En `src/skills_tree_provider.js` (linea 318), se usa `skill.categoria || 'General'`.
   * En `src/skills_actions.js` (lineas 532 y 534), existe logica de seleccion de categorias con `'General'`.

2. **Carga y separacion de Local vs Global:**
   * En `src/skills_loader.js`, `cargarTodasLasSkills()` ya detecta y clasifica por separado:
     * `globales`: Habilidades en `~/.agents/skills`, `~/.gemini/config/skills`, etc.
     * `propias` y `workspace`: Habilidades del proyecto local (`.agents/skills`, `.agent/skills`, etc.).
   * En `src/skills_tree_provider.js`, actualmente `grupoPropias` mezcla todo en un solo array `visiblesEnUso` sin distinguir un nodo `Local` diferenciado.
   * Para implementar el nodo `Local`, se puede estructurar el arbol de *Mis Habilidades* para que presente explicitamente los nodos `Global` (con las globales) y `Local` (con las de `.agents/skills` o carpetas del workspace), ademas de mantener las subcategorias adicionales como `toolchain`.

3. **Visibilidad de iconos en package.json:**
   * En `package.json`, la seccion `menus -> view/item/context` tiene filtros `when`:
     * `skills-manager.copiarALocal` tiene `viewItem =~ /^skillItem_backup/`.
     * `skills-manager.copiarAGlobal` tiene `viewItem =~ /^skillItem_backup/`.
   * Al ampliar la condicion `when` para incluir tambien `skillItem_global`, `skillItem_propia` y `skillItem_workspace`, los botones inline apareceran de forma homogenea en todas las habilidades.
   * Los comandos `copiarSkillALocal` y `copiarSkillAGlobal` en `src/skills_actions.js` y `extension.js` ya estan implementados y son totalmente operativos.

---

## 3. Ficheros que se Modificaran (Pendiente de tu aprobacion)

* `src/skills_loader.js`: Actualizar la categoria por defecto a `Global` y garantizar la correcta asociacion de origen.
* `src/skills_tree_provider.js`:
  * Modificar la agrupacion en `grupoPropias` para exponer el elemento `Local` con las habilidades de proyecto, junto a `Global` y categorias especiales.
  * Cambiar la etiqueta por defecto de agrupacion de `General` a `Global`.
* `package.json`:
  * Ajustar las condiciones de visibilidad (`when`) en `view/item/context` para los comandos `copiarALocal` y `copiarAGlobal`, de modo que esten disponibles en todas las habilidades de *Mis Habilidades* y *Baul de Referencia*.
* `src/skills_actions.js`:
  * Adaptar referencias a la categoria por defecto si aplica.
* `test/test_loader.js`:
  * Actualizar pruebas unitarias para reflejar el nuevo nombre y estructura.

---

## 4. Estado de la Implementacion

- **Estado:** ✅ Completado y verificado con pruebas unitarias y de integracion.
- **Pruebas ejecutadas:** `npm test` superado al 100% (8/8 pruebas de arbol y loader).
- **Ficheros modificados:**
  - `src/skills_loader.js`: Categoria por defecto cambiada a `Global` y clasificacion por ambito local/global.
  - `src/skills_tree_provider.js`: Estructura del arbol con nodos explicitos `Global`, `Local` y categorias tematicas; asignacion de iconos `globe` y `folder-active`.
  - `package.json`: Iconos en linea unificados para todas las habilidades (`Copiar a Local`, `Copiar a Global`, `Favorita`, `Mencion`, `Documentacion`, `Eliminar`).
  - `src/skills_actions.js`: Categorias de creacion sincronizadas con `Global`.
  - `test/test_tree_and_quickpick.js`: Pruebas de integracion actualizadas y anadidas para el arbol `Global`/`Local`.