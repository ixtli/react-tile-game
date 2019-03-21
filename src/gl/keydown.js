/**
 * @type {function(string)[]}
 * @private
 */
const _queue = [];

/**
 * @type {Object<string, number>}
 * @private
 */
const _names = {};

function nativeKeydownCallback({ key }) {
  const len = _queue.length;
  for (let i = 0; i < len; i++) {
    _queue[i](key);
  }
}

window.addEventListener("keydown", nativeKeydownCallback);

/**
 *
 * @param name {string}
 * @param callback {function(string)}
 */
export function listenForKeydown(name, callback) {
  _queue.push(callback);
  _names[name] = _queue.length - 1;
  console.log("Started listening: " + name);
}

/**
 *
 * @param name {string}
 */
export function stopListeningForKeydown(name) {
  const idx = _names[name];
  console.assert(idx, "No such listener: " + name);
  _queue.splice(idx, 1);
  delete _names[name];
  console.log("Stopped listening for " + name);
}
