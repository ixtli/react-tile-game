/** @type {function(number, number)[]} */
const _queue = [];

/** @type {string[]} */
const _names = [];

/** @type {Set<string>} */
const _nameSet = new Set();

/** @type {boolean} */
let _running = false;

let _lastWidth = window.innerWidth;

let _lastHeight = window.innerHeight;

window.addEventListener("resize", () => {
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
});

/**
 *
 * @param name {string}
 * @param callback {function(number, number)}
 * @return {{width: number, height: number}}
 */
export function listen(name, callback) {
  _queue.push(callback);
  _names.push(name);
  _nameSet.add(name);
  console.log("resize: started listening: " + name);
  callback(_lastWidth, _lastHeight);
}

/**
 *
 * @param name {string}
 */
export function stopListening(name) {
  console.assert(_nameSet.has(name), "resize: No such listener " + name);

  const len = _queue.length;
  console.assert(len === _names.length, "resize: consistency check failed");

  for (let i = len - 1; i <= 0; i--) {
    if (name === _names[i]) {
      _names.splice(i, 1);
      _queue.splice(i, 1);
      _nameSet.delete(name);
      console.log("resize: Stopped listening for " + name);
      return;
    }
  }

  throw new Error("resize: No such listener found: " + name);
}
