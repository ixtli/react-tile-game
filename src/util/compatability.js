const OFFSCREEN_CANVAS = window.hasOwnProperty("OffscreenCanvas");

const WEBGL = (() => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch (e) {
    return false;
  }
})();

const WEBGL2 = (() => {
  try {
    const canvas = document.createElement("canvas");
    // noinspection JSUnresolvedVariable
    return !!(window.WebGL2RenderingContext && canvas.getContext("webgl2"));
  } catch (e) {
    return false;
  }
})();

export function warn() {
  if (!OFFSCREEN_CANVAS) {
    console.warn("OffscreenCanvas() not found!");
  }

  if (!WEBGL2) {
    console.warn("WebGL 2.0 not supported!");
  }
}

export function canRun() {
  if (!WEBGL) {
    console.error("WebGL not supported.");
    return false;
  }

  return true;
}

/**
 *
 * @param width {number}
 * @param height {number}
 * @return {HTMLCanvasElement}
 */
export function newOffscreenCanvas(width, height) {
  if (OFFSCREEN_CANVAS) {
    // noinspection JSUnresolvedFunction
    return new OffscreenCanvas(width, height);
  } else {
    // noinspection JSValidateTypes
    return document.createElement("canvas");
  }
}

/**
 *
 * @param canvas {HTMLCanvasElement}
 * @return {WebGLRenderingContext}
 */
export function getWebGLContextFromCanvas(canvas) {
  return canvas.getContext(WEBGL2 ? "webgl2" : "webgl");
}
