/**
 * @type {function(number, number)[]}
 * @private
 */
const _queue = [];

/**
 * @type {Object<string, number>}
 * @private
 */
const _names = {};

/**
 * @type {number}
 * @private
 */
let _lastWidth = window.innerWidth;

/**
 * @type {number}
 * @private
 */
let _lastHeight = window.innerHeight;

/**
 * @type {boolean}
 * @private
 */
let _running = false;

function nativeResizeCallback() {
  if (!_running) {
    _running = true;
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("optimizedResize"));
      _lastWidth = window.innerWidth;
      _lastHeight = window.innerHeight;
      const len = _queue.length;
      for (let i = 0; i < len; i++) {
        _queue[i](_lastWidth, _lastHeight);
      }
      _running = false;
    });
  }
}

window.addEventListener("resize", nativeResizeCallback);

/**
 *
 * @param name {string}
 * @param callback {function(number, number)}
 * @return {{width: number, height: number}}
 */
export function listen(name, callback) {
  _queue.push(callback);
  _names[name] = _queue.length - 1;
  console.log("Started listening: " + name);
  callback(_lastWidth, _lastHeight);
  return { width: _lastWidth, height: _lastHeight };
}

/**
 *
 * @param name {string}
 */
export function stopListening(name) {
  const idx = _names[name];
  console.assert(idx, "No such listener: " + name);
  _queue.splice(idx, 1);
  delete _names[name];
  console.log("Stopped listening for " + name);
}
