import * as THREE from "three";
import { listen, stopListening } from "./resize";

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
     * @type {PerspectiveCamera}
     * @private
     */
    this._camera = new THREE.PerspectiveCamera(45, 1, 1, 500);

    /**
     *
     * @type {number}
     * @private
     */
    this._index = Renderer._rendererCount++;

    listen(this.listenerName(), this.resize);
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
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
  };

  destroy() {
    stopListening(this.listenerName());
  }

  start() {
    let material = new THREE.LineBasicMaterial({color: 0x000ff});
    let geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(-10, 0,0));
    geometry.vertices.push(new THREE.Vector3(0, 10,0));
    geometry.vertices.push(new THREE.Vector3(10, 0,0));

    const line = new THREE.Line(geometry, material);
    this._scene.add(line);

    this._camera.position.set(0,0,100);
    this._camera.lookAt(0,0,0);
    this._renderer.render(this._scene, this._camera);
  }
}
