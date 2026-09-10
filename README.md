<p align="center">
  <img src="media/icon.png" width="120" alt="Gestor de Skills IA" />
</p>

<h1 align="center">Gestor de Skills IA para Visual Studio Code</h1>

<p align="center">
  <a href="https://code.visualstudio.com/"><img src="https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visualstudiocode&logoColor=white" alt="VS Code" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/AI%20Assisted-Gemini%203.8%20Flash-4285F4?logo=google&logoColor=white" alt="AI Assisted" /></a>
</p>

Extensión para **Visual Studio Code** diseñada para explorar, gestionar, crear y copiar rápidamente menciones de habilidades (`@skill`) para agentes de codificación autónomos y asistentes de IA (Antigravity, Claude Code, Cursor, Codex, Gemini CLI, etc.).

---

## ¿Por qué este proyecto? La necesidad detrás de la extensión

El trabajo diario con asistentes y agentes de inteligencia artificial ha evolucionado: ya no basta con escribir prompts sencillos. Hoy en día, las **habilidades o skills** estructuradas (archivos `SKILL.md` con instrucciones precisas, guías de estilo y flujos de trabajo) son la forma estándar de darle superpoderes y contexto a la IA.

Sin embargo, esta metodología presenta un problema real en el día a día:
1. **Sobrecarga de memoria:** El catálogo de habilidades crece rápidamente (decenas o cientos de habilidades comunitarias y personalizadas). Acordarse de memoria del nombre exacto de cada una, qué hace, en qué carpeta está y cómo invocarla se vuelve inviable.
2. **Fricción en el flujo de trabajo:** Salir del editor para abrir terminales, buscar archivos en carpetas remotas o copiar y pegar rutas interrumpe la concentración y hace perder tiempo valioso.
3. **Falta de organización personal:** No todas las habilidades del mundo se usan a diario. Se necesitaba una forma de elegir cuáles tener a mano, marcar favoritas, ocultar las que estorben y mantener a salvo las creadas por uno mismo sin que se mezclen o borren al sincronizar repositorios externos.

**Gestor de Skills IA** nació para resolver esta necesidad exacta: integrar un panel visual y un buscador ultra-rápido en VS Code para que usar cualquier habilidad sea cuestión de un par de clics o un atajo de teclado.

---

## Guía de Uso Rápido (Paso a Paso)

Usar la extensión es directo y está pensado para no interrumpir tu programación:

### 1. Abrir el panel lateral
Haz clic en el icono de robot (**Skills IA**) en la barra de actividad izquierda de VS Code. Verás tu árbol organizado en:
- **⭐ Favoritas:** Tus habilidades más usadas siempre arriba.
- **⚡ Mis Habilidades (En Uso):** Tu repertorio activo local (`skills-propias/`).
- **🌐 Catálogo Remoto GitHub:** Catálogo de consulta descargado de la comunidad.
- **📂 Workspace Actual:** Habilidades locales detectadas en el proyecto abierto (`.agent/skills`, `.gemini/skills`, etc.).

### 2. Copiar una mención al vuelo
Haz **un solo clic** sobre cualquier habilidad del árbol. La extensión copiará automáticamente su mención (por ejemplo `@goal-loop` o `@seo-audit`) al portapapeles. Solo tienes que pulsar `Cmd+V` o `Ctrl+V` en la ventana de chat de tu agente.

### 3. Consultar la documentación sin salir del código
Haz clic en el icono de documento junto a cualquier habilidad. Se abrirá su archivo `SKILL.md` en una columna al lado de tu código para que puedas leer sus instrucciones y ejemplos de uso de inmediato.

### 4. Buscar instantáneamente con el teclado
Pulsa `Cmd+Shift+K` (macOS) o `Ctrl+Shift+K` (Windows/Linux) para abrir el buscador rápido. Empieza a escribir y filtra en tiempo real por nombre, categoría o descripción. Al pulsar `Enter`, copiarás su mención al portapapeles.

### 5. Gestionar tu repertorio
- **Añadir a tus habilidades:** En el Catálogo Remoto, pulsa el botón inline **`+`** de cualquier habilidad para instalarla en tu carpeta de habilidades en uso.
- **Marcar favorita:** Pulsa la estrella **`⭐`** de cualquier habilidad para fijarla en la parte superior.
- **Crear una nueva habilidad:** Pulsa el botón **`+`** de la barra superior del explorador para generar una nueva habilidad con plantilla YAML lista para rellenar.
- **Eliminar:** Pulsa la papelera **`🗑️`** en tus habilidades propias para borrarla con confirmación.

---

## ⚠️ Advertencia Importante: Fuentes y Flujo de Habilidades

Es fundamental comprender de dónde vienen las habilidades y cómo interactúan con GitHub:

```
[ GitHub Remoto ] (Fuente única de descarga)
       │  (Botón Sincronizar / git pull)
       ▼
[ ./skills-remotas/ ] (Catálogo de consulta - Solo Lectura)
       │
       │  (Botón inline '+' para instalar)
       ▼
[ ./skills-propias/ ] <─────> [ Creación manual o con botón '+' ]
       │
       ▼  (Control de versiones / git push)
[ Tu propio repositorio GitHub ] (Compartir tus habilidades con la comunidad)
```

1. **Descarga desde una sola fuente de GitHub:**
   - Actualmente, la sincronización automática de la extensión descarga y actualiza el catálogo remoto desde **un único repositorio central de GitHub** (por defecto el repositorio comunitario de David Ondrej: `https://github.com/davidondrej/skills.git`, configurable en `settings.json`).
   - Las habilidades descargadas en `./skills-remotas/` son de consulta. No debes editarlas directamente allí para evitar conflictos de Git al sincronizar.

2. **Habilidades manuales y propias:**
   - Tus habilidades de trabajo residen en `./skills-propias/`.
   - Puedes añadirlas **manualmente** creando una carpeta con su `SKILL.md` o usando el botón **Crear nueva habilidad** de la extensión.
   - Si borras una habilidad de tus habilidades en uso, se borra físicamente de tu disco y **no volverá a descargarse en tu lista activa** aunque vuelvas a sincronizar con GitHub.

3. **Habilidades compartidas desde este proyecto hacia GitHub:**
   - Las habilidades que crees, adaptes o perfecciones en este proyecto están preparadas para ser compartidas hacia tu propio repositorio de GitHub mediante Git (`git add`, `git commit`, `git push`), permitiéndote distribuir tus propias creaciones a la comunidad o a tu equipo de trabajo.

---

## Origen del Proyecto y Créditos

- **Idea Original y Autor:** Concebido y diseñado por **Juan Luis Martel** ([@usblsb](https://github.com/usblsb)) ante la necesidad de poner orden, recordar y agilizar el uso de habilidades en flujos de trabajo con agentes autónomos.
- **Catálogo Base de Skills:** Repositorio comunitario de **David Ondrej**: [github.com/davidondrej/skills](https://github.com/davidondrej/skills), catálogo de referencia para agentes y LLMs.
- **Desarrollo y Programación:** Desarrollado íntegramente en sesión de *pair programming* asistida por la tecnología de IA de **Google**, utilizando el modelo **Gemini 3.8 Flash (Medium)** en el entorno de desarrollo agéntico **Antigravity**.

---

## Atajos de Teclado y Comandos

| Comando | Atajo (macOS) | Atajo (Win/Linux) | Descripción |
| :--- | :--- | :--- | :--- |
| `skills-manager.buscar` | `Cmd+Shift+K` | `Ctrl+Shift+K` | Abre el buscador rápido con selector instantáneo. |
| `skills-manager.crearSkill` | — | — | Crea una nueva habilidad con plantilla estructurada. |
| `skills-manager.instalarSkill` | — | — | Copia una habilidad del catálogo remoto a tus habilidades. |
| `skills-manager.eliminarSkill` | — | — | Elimina una habilidad de tus habilidades (con confirmación). |
| `skills-manager.sincronizar` | — | — | Actualiza el catálogo remoto desde GitHub (`git pull`). |
| `skills-manager.recargar` | — | — | Reescanea las carpetas y actualiza la vista del árbol. |
| `skills-manager.abrirSkill` | — | — | Abre el fichero `SKILL.md` al lado del editor. |
| `skills-manager.copiarMencion` | — | — | Copia la mención `@nombre-skill` al portapapeles. |
| `skills-manager.copiarRuta` | — | — | Copia la ruta absoluta de la carpeta de la skill. |
| `skills-manager.marcarFavorita` | — | — | Añade la habilidad a la lista de favoritas. |
| `skills-manager.desmarcarFavorita` | — | — | Quita la habilidad de la lista de favoritas. |
| `skills-manager.desactivarSkill` | — | — | Marca la habilidad como inactiva (la atenúa en la lista). |
| `skills-manager.activarSkill` | — | — | Marca la habilidad como activa. |
| `skills-manager.ocultarInactivas` | — | — | Oculta del árbol las habilidades desactivadas. |
| `skills-manager.mostrarInactivas` | — | — | Vuelve a mostrar las habilidades desactivadas. |

---

## Configuración (`settings.json`)

Puedes personalizar las rutas y el comportamiento de la extensión desde la configuración de VS Code:

```json
{
  // Carpeta donde se guardan tus habilidades en uso (relativa o absoluta)
  "skillsManager.ownSkillsPath": "skills-propias",

  // Carpeta donde se descarga el catalogo remoto de GitHub
  "skillsManager.remoteSkillsPath": "skills-remotas",

  // URL del repositorio GitHub para sincronizar el catalogo remoto
  "skillsManager.githubRepoUrl": "https://github.com/davidondrej/skills.git",

  // Carpetas relativas dentro de proyectos donde buscar skills de workspace
  "skillsManager.workspaceFolders": [
    ".agent/skills",
    ".agents/skills",
    ".gemini/skills",
    ".claude/skills"
  ],

  // Prefijo utilizado al copiar la mencion (por defecto '@')
  "skillsManager.mentionPrefix": "@"
}
```

---

## Estructura de una Skill

Cada habilidad se almacena en su propio directorio con un archivo `SKILL.md` que incluye encabezado YAML (*frontmatter*):

```markdown
---
name: mi-habilidad
description: Breve explicacion de que hace la habilidad y cuando debe utilizarse.
---

# Titulo de la habilidad

Instrucciones detalladas de ejecucion, contexto y prompts para el agente de IA.

## Cuando usar esta habilidad
- Casos de uso principales.

## Ejemplos de prompt
- Invocacion con @mi-habilidad.
```

---

## Licencia

Distribuido bajo la Licencia [MIT](LICENSE.md).
