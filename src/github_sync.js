let vscode;
try {
  vscode = require('vscode');
} catch (e) {
  vscode = {
    workspace: {
      getConfiguration: () => ({
        get: (key, defaultValue) => defaultValue
      })
    },
    window: {
      showInformationMessage: () => {},
      showErrorMessage: () => {},
      showWarningMessage: () => {},
      withProgress: async (opts, task) => {
        return task({ report: () => {} });
      }
    },
    ProgressLocation: { Notification: 1 }
  };
}
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { resolverRutaRemota } = require('./skills_loader');

/**
 * Ejecuta un comando en la shell y devuelve una promesa.
 * @param {string} comando
 * @param {string} cwd
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
function ejecutarComando(comando, cwd) {
  return new Promise((resolve, reject) => {
    exec(comando, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Sincroniza el catalogo remoto de skills con GitHub en ./skills-remotas.
 * Si no existe, lo clona. Si ya existe, ejecuta git pull.
 * @param {Function} alFinalizarCallback - Callback opcional al completar la sincronizacion
 */
async function sincronizarRepositorioGlobal(alFinalizarCallback) {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const rutaDestino = resolverRutaRemota();
  const repoUrl = config.get('githubRepoUrl', 'https://github.com/davidondrej/skills.git');

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Sincronizando Catálogo Remoto con GitHub...',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: 'Comprobando directorio local...' });

        let directorioExiste = false;
        let esRepoGit = false;

        try {
          const stats = await fs.stat(rutaDestino);
          directorioExiste = stats.isDirectory();
          if (directorioExiste) {
            const gitStats = await fs.stat(path.join(rutaDestino, '.git'));
            esRepoGit = gitStats.isDirectory();
          }
        } catch (e) {
          directorioExiste = false;
        }

        if (!directorioExiste) {
          const carpetaPadre = path.dirname(rutaDestino);
          await fs.mkdir(carpetaPadre, { recursive: true });

          progress.report({ message: `Clonando catálogo en ${rutaDestino}...` });
          await ejecutarComando(`git clone "${repoUrl}" "${rutaDestino}"`, carpetaPadre);
          vscode.window.showInformationMessage(`Catálogo remoto clonado con éxito en: ${rutaDestino}`);
        } else if (esRepoGit) {
          progress.report({ message: 'Actualizando catálogo remoto (git pull)...' });
          const { stdout } = await ejecutarComando('git pull', rutaDestino);
          vscode.window.showInformationMessage(`Catálogo actualizado: ${stdout.trim() || 'Al día'}`);
        } else {
          const eleccion = await vscode.window.showWarningMessage(
            `La carpeta ${rutaDestino} ya existe pero no es un repositorio Git. ¿Deseas clonar en otra carpeta?`,
            'Clonar de nuevo',
            'Cancelar'
          );

          if (eleccion === 'Clonar de nuevo') {
            await ejecutarComando(`git clone "${repoUrl}" "${rutaDestino}_nuevo"`, path.dirname(rutaDestino));
            vscode.window.showInformationMessage(`Clonado en ${rutaDestino}_nuevo`);
          } else {
            return;
          }
        }

        if (typeof alFinalizarCallback === 'function') {
          alFinalizarCallback();
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error al sincronizar con GitHub: ${error.message}`);
    console.error('Error sincronizando catalogo de skills:', error);
  }
}

module.exports = {
  sincronizarRepositorioGlobal
};
