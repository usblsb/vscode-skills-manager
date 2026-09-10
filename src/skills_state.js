// Modulo de gestion de estado persistente para favoritas e inactivas.
// Cumple con la regla de identificadores: sin tildes ni enes en variables, funciones o comentarios.

let contextoExtension = null;

const CLAVE_FAVORITAS = 'skillsManager.favoritas';
const CLAVE_INACTIVAS = 'skillsManager.inactivas';
const CLAVE_OCULTAR_INACTIVAS = 'skillsManager.ocultarInactivas';

// Memoria interna para pruebas unitarias cuando no hay contexto vscode disponible
const memoriaInterna = {
  favoritas: [],
  inactivas: [],
  ocultarInactivas: false
};

/**
 * Inicializa el contexto de la extension para acceder a globalState.
 * @param {object} context
 */
function inicializarEstado(context) {
  contextoExtension = context;
}

/**
 * Obtiene el listado de IDs de skills marcadas como favoritas.
 * @returns {string[]}
 */
function obtenerFavoritas() {
  if (contextoExtension && contextoExtension.globalState) {
    return contextoExtension.globalState.get(CLAVE_FAVORITAS, []);
  }
  return memoriaInterna.favoritas;
}

/**
 * Comprueba si una skill es favorita.
 * @param {string} id
 * @returns {boolean}
 */
function esFavorita(id) {
  const lista = obtenerFavoritas();
  return lista.includes(id);
}

/**
 * Conmuta el estado de favorita de una skill.
 * @param {string} id
 * @returns {Promise<boolean>} Nuevo estado (true si ahora es favorita)
 */
async function conmutarFavorita(id) {
  const lista = obtenerFavoritas();
  const indice = lista.indexOf(id);
  let nuevoEstado = false;

  let nuevaLista;
  if (indice >= 0) {
    nuevaLista = lista.filter((item) => item !== id);
    nuevoEstado = false;
  } else {
    nuevaLista = [...lista, id];
    nuevoEstado = true;
  }

  if (contextoExtension && contextoExtension.globalState) {
    await contextoExtension.globalState.update(CLAVE_FAVORITAS, nuevaLista);
  } else {
    memoriaInterna.favoritas = nuevaLista;
  }

  return nuevoEstado;
}

/**
 * Obtiene el listado de IDs de skills inactivas.
 * @returns {string[]}
 */
function obtenerInactivas() {
  if (contextoExtension && contextoExtension.globalState) {
    return contextoExtension.globalState.get(CLAVE_INACTIVAS, []);
  }
  return memoriaInterna.inactivas;
}

/**
 * Comprueba si una skill esta marcada como inactiva.
 * @param {string} id
 * @returns {boolean}
 */
function esInactiva(id) {
  const lista = obtenerInactivas();
  return lista.includes(id);
}

/**
 * Conmuta el estado activo/inactivo de una skill.
 * @param {string} id
 * @returns {Promise<boolean>} Nuevo estado inactivo (true si ahora esta inactiva)
 */
async function conmutarActiva(id) {
  const lista = obtenerInactivas();
  const indice = lista.indexOf(id);
  let estaInactiva = false;

  let nuevaLista;
  if (indice >= 0) {
    nuevaLista = lista.filter((item) => item !== id);
    estaInactiva = false;
  } else {
    nuevaLista = [...lista, id];
    estaInactiva = true;
  }

  if (contextoExtension && contextoExtension.globalState) {
    await contextoExtension.globalState.update(CLAVE_INACTIVAS, nuevaLista);
  } else {
    memoriaInterna.inactivas = nuevaLista;
  }

  return estaInactiva;
}

/**
 * Indica si el usuario ha decidido ocultar las skills inactivas del arbol.
 * @returns {boolean}
 */
function debeOcultarInactivas() {
  if (contextoExtension && contextoExtension.globalState) {
    return contextoExtension.globalState.get(CLAVE_OCULTAR_INACTIVAS, false);
  }
  return memoriaInterna.ocultarInactivas;
}

/**
 * Conmuta la visibilidad de skills inactivas en el arbol.
 * @returns {Promise<boolean>} Nuevo valor
 */
async function conmutarOcultarInactivas() {
  const actual = debeOcultarInactivas();
  const nuevo = !actual;

  if (contextoExtension && contextoExtension.globalState) {
    await contextoExtension.globalState.update(CLAVE_OCULTAR_INACTIVAS, nuevo);
  } else {
    memoriaInterna.ocultarInactivas = nuevo;
  }

  return nuevo;
}

/**
 * Reinicia la memoria interna (util para pruebas unitarias).
 */
function reiniciarMemoriaPruebas() {
  contextoExtension = null;
  memoriaInterna.favoritas = [];
  memoriaInterna.inactivas = [];
  memoriaInterna.ocultarInactivas = false;
}

module.exports = {
  inicializarEstado,
  obtenerFavoritas,
  esFavorita,
  conmutarFavorita,
  obtenerInactivas,
  esInactiva,
  conmutarActiva,
  debeOcultarInactivas,
  conmutarOcultarInactivas,
  reiniciarMemoriaPruebas
};
