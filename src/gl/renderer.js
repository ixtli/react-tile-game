import * as THREE from "three";
import { listenForResize, stopListeningForResize } from "./resize";
import { listenForKeydown, stopListeningForKeydown } from "./keydown";
import ChunkRenderer from "./map/map-chunk-renderer";
import { MAP_TILES_HIGH, MAP_TILES_WIDE } from "../config";

function isWebGL2Available() {
  try {
    const canvas = document.createElement("canvas");
    // noinspection JSUnresolvedVariable
    return !!(window.WebGL2RenderingContext && canvas.getContext("webgl2"));
  } catch (e) {
    return false;
  }
}

if (!isWebGL2Available()) {
  throw new Error("WebGL 2.0 is required.");
}

export default class Renderer {
  /**
   *
   * @type {number}
   * @private
   */
  static _rendererCount = 0;

  static KEY_JUMP_SIZE = 25;

  constructor(canvas) {
    /**
     * @type {HTMLElement}
     * @private
     */
    this._canvas = canvas;

    /**
     *
     * @type {WebGLRenderingContext | CanvasRenderingContext2D}
     * @private
     */
    this._context = this._canvas.getContext("webgl2");

    /**
     *
     * @type {WebGLRenderer}
     * @private
     */
    this._renderer = new THREE.WebGLRenderer({
      canvas,
      context: this._context,
      stencilBuffer: false
    });

    /**
     *
     * @type {Scene}
     * @private
     */
    this._scene = new THREE.Scene();

    /**
     *
     * @type {OrthographicCamera}
     * @private
     */
    this._camera = new THREE.OrthographicCamera(1, 1, 1, 1, 0, 10);
    this._camera.position.z = 1;
    this._camera.position.x = 0;
    this._camera.position.y = 0;

    /**
     *
     * @type {number}
     * @private
     */
    this._index = Renderer._rendererCount++;

    /**
     *
     * @type {Int8Array}
     * @private
     */
    this._map = new Int8Array(MAP_TILES_WIDE * MAP_TILES_HIGH);

    /**
     *
     * @type {boolean}
     * @private
     */
    this._dirty = true;

    /**
     *
     * @type {ChunkRenderer}
     * @private
     */
    this._chunkRenderer = new ChunkRenderer();
  }

  /**
   *
   * @return {string}
   */
  listenerName() {
    return "renderer-" + this._index;
  }

  generateMap() {
    const map = this._map;
    const size = map.length;
    const materialCount = this._chunkRenderer.materialsCount();
    for (let i = size; i >= 0; i--) {
      map[i] = Math.floor(Math.random() * materialCount);
    }
  }

  /**
   *
   * @param width {number}
   * @param height {number}
   */
  resize = (width, height) => {
    this._renderer.setSize(width, height);
    this._camera.left = 0;
    this._camera.right = width;
    this._camera.top = height;
    this._camera.bottom = 0;

    this._chunkRenderer.windowResized(width, height, this._scene);

    this._dirty = true;
  };

  destroy() {
    stopListeningForResize(this.listenerName());
    stopListeningForKeydown(this.listenerName());
  }

  keydown = key => {
    let delta = false;
    switch (key) {
      case "w":
        this._camera.position.y += Renderer.KEY_JUMP_SIZE;
        delta = true;
        break;
      case "s":
        this._camera.position.y -= Renderer.KEY_JUMP_SIZE;
        delta = true;
        break;
      case "a":
        this._camera.position.x -= Renderer.KEY_JUMP_SIZE;
        delta = true;
        break;
      case "d":
        this._camera.position.x += Renderer.KEY_JUMP_SIZE;
        delta = true;
        break;
      default:
        break;
    }

    if (delta) {
      this._dirty = true;
    }
  };

  start() {
    listenForResize(this.listenerName(), this.resize);
    listenForKeydown(this.listenerName(), this.keydown);

    this._chunkRenderer.refreshChunks(this._renderer, 0, 0, this._map);

    this.render();
  }

  render = () => {
    requestAnimationFrame(this.render);

    if (!this._dirty) {
      return;
    }

    this._camera.updateProjectionMatrix();
    this._renderer.render(this._scene, this._camera);

    this._dirty = false;
  };
}
