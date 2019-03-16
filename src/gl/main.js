import Renderer from "./renderer";

/**
 *
 * @type {null|Renderer}
 * @private
 */
let _renderer = null;

export function destroy() {
  if (_renderer) {
    _renderer.destroy();
  }
}

export function attach(canvas) {
  if (_renderer) {
    console.warn("Overriding renderer.");
  }

  _renderer = new Renderer(canvas);
  _renderer.start();
}
