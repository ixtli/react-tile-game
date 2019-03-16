import * as THREE from "three";
import { listen, stopListening } from "./resize";

import hex from "./reference-hex-processed.png";
import { loadSpriteMaterial } from "./hex-sprite";

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

  static _mapWidth = 100;
  static _mapHeight = 100;

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
      context: this._context
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

    /**
     *
     * @type {number}
     * @private
     */
    this._index = Renderer._rendererCount++;

    const { width, height } = listen(this.listenerName(), this.resize);

    /**
     *
     * @type {number}
     * @private
     */
    this._screenWidth = width;

    /**
     *
     * @type {number}
     * @private
     */
    this._screenHeight = height;

    this._map = new Array(Renderer._mapWidth * Renderer._mapHeight);
  }

  /**
   *
   * @return {string}
   */
  listenerName() {
    return "renderer-" + this._index;
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
    this._camera.position.z = 1;
    this._camera.updateProjectionMatrix();
    this._screenWidth = width;
    this._screenHeight = height;

    this.render();
  };

  destroy() {
    stopListening(this.listenerName());
  }

  /**
   *
   * @param material
   * @return {Sprite}
   */
  static newHexSprite(material) {
    const width = material.map.image.width;
    const height = material.map.image.height;
    var sprite = new THREE.Sprite(material);
    sprite.center.set(0, 1);
    sprite.scale.set(width, height, 1);
    return sprite;
  }

  async start() {
    const material = await loadSpriteMaterial(hex);

    let even = false;
    let xOffset = 0;
    let yOffset = 0;
    for (let y = 0; y < Renderer._mapHeight; y++) {
      even = !even;
      xOffset = even ? 31 : 0;
      yOffset = y * (63 - 17);
      for (let x = 0; x < Renderer._mapWidth; x++) {
        const sprite = Renderer.newHexSprite(material);
        sprite.position.set(x * 62 + xOffset, yOffset, 1);
        this._scene.add(sprite);
        this._map[y * Renderer._mapHeight + x] = sprite;
      }
    }

    this.render();
  }

  render() {
    this._renderer.render(this._scene, this._camera);
  }
}
