import * as THREE from "three";
import { listenForResize, stopListeningForResize } from "./resize";
import { listenForKeydown, stopListeningForKeydown } from "./keydown";
import ChunkRenderer from "./map/map-chunk-renderer";
import {
  CHUNK_PIXEL_LENGTH,
  MAP_PIXELS_HIGH,
  MAP_PIXELS_WIDE,
  MAP_TILES_HIGH,
  MAP_TILES_WIDE
} from "../config";
import { stats } from "../util/stats-wrapper";
import { getWebGLContextFromCanvas } from "../util/compatability";
import { TileMaterialManager } from "./tile-materials-manager";

export default class Renderer {
  /**
   *
   * @type {number}
   * @private
   */
  static _rendererCount = 0;

  /**
   *
   * @type {number}
   */
  static KEY_JUMP_SIZE = 32;

  /**
   *
   * @type {Object.<String, *>}
   */
  static RENDERER_OPTIONS = {
    stencil: false
  };

  /**
   *
   * @type {Scene}
   * @private
   */
  _scene = new THREE.Scene();

  /**
   *
   * @type {OrthographicCamera}
   * @private
   */
  _camera = new THREE.OrthographicCamera(1, 1, 1, 1, 0, 1);

  /**
   *
   * @type {number}
   * @private
   */
  _index = Renderer._rendererCount++;

  /**
   *
   * @type {boolean}
   * @private
   */
  _rendering = false;

  /**
   *
   * @type {number}
   * @private
   */
  _cameraDeltaX = 0;

  /**
   *
   * @type {number}
   * @private
   */
  _cameraDeltaY = 0;

  /**
   *
   * @type {TileMaterialManager}
   * @private
   */
  _tileMaterials = new TileMaterialManager();

  /**
   *
   * @type {ChunkRenderer}
   * @private
   */
  _chunkRenderer = new ChunkRenderer(this._tileMaterials);

  /**
   *
   * @type {Int16Array}
   * @private
   */
  _map = new Int16Array(MAP_TILES_WIDE * MAP_TILES_HIGH);

  /**
   *
   * @type {WebGLRenderer}
   * @private
   */
  _renderer = null;

  /**
   *
   * @type {WebGLRenderingContext}
   * @private
   */
  _context = null;

  /**
   * @type {HTMLCanvasElement}
   * @private
   */
  _canvas = null;

  /**
   *
   * @type {{x: number, y: number}}
   * @private
   */
  _cameraWorldPixel = {
    x: Math.floor(MAP_PIXELS_WIDE / 2),
    y: Math.floor(MAP_PIXELS_HIGH / 2)
  };

  /**
   *
   * @param canvas {HTMLCanvasElement}
   */
  constructor(canvas) {
    this._canvas = canvas;
    this._context = getWebGLContextFromCanvas(this._canvas);
    this._renderer = new THREE.WebGLRenderer({
      canvas,
      context: this._context,
      ...Renderer.RENDERER_OPTIONS
    });

    this._renderer.setPixelRatio(window.devicePixelRatio);

    // @TODO: Is this faster?
    // this._renderer.autoClear = true;

    this._camera.position.set(0, 0, 100);

    for (let i = 0; i < 1; i += 0.1) {
      this._tileMaterials.greenTile(i);
    }
  }

  /**
   *
   * @return {string}
   */
  name() {
    return "renderer-" + this._index;
  }

  generateMap() {
    const map = this._map;
    const size = map.length;
    const materialCount = this._tileMaterials.size();
    for (let i = size; i >= 0; i--) {
      //map[i] = Math.floor(Math.random() * materialCount);
      map[i] = i % materialCount;
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
    this._camera.near = -1;
    this._camera.far = 2000;
    this._camera.updateProjectionMatrix();

    this._chunkRenderer.windowResized(width, height, this._scene);
  };

  destroy() {
    this._rendering = false;

    stopListeningForResize(this.name());
    stopListeningForKeydown(this.name());
    this._chunkRenderer.dispose();
    this._tileMaterials.dispose();
    this._renderer.dispose();

    this._map = null;
    this._chunkRenderer = null;
    this._scene = null;
    this._renderer = null;
  }

  keydown = key => {
    switch (key) {
      case "w":
        this._cameraDeltaY += Renderer.KEY_JUMP_SIZE;
        break;
      case "s":
        this._cameraDeltaY -= Renderer.KEY_JUMP_SIZE;
        break;
      case "a":
        this._cameraDeltaX -= Renderer.KEY_JUMP_SIZE;
        break;
      case "d":
        this._cameraDeltaX += Renderer.KEY_JUMP_SIZE;
        break;
      case " ":
        this._rendering = !this._rendering;
        if (this._rendering) {
          this.render();
          console.log("Rendering enabled.");
        } else {
          console.log("Rendering disabled.");
        }
        break;
      default:
        console.log(key);
        break;
    }
  };

  _centerAroundCamera() {
    const { x, y } = this._cameraWorldPixel;

    // What chunk in the map is (x,y) in?
    const chunkX = Math.floor(x / CHUNK_PIXEL_LENGTH);
    const chunkY = Math.floor(y / CHUNK_PIXEL_LENGTH);

    const sceneChunksWide = this._chunkRenderer.chunksWide();
    const sceneChunksHigh = this._chunkRenderer.chunksHigh();
    const scenePixelsWide = sceneChunksWide * CHUNK_PIXEL_LENGTH;
    const scenePixelsHigh = sceneChunksHigh * CHUNK_PIXEL_LENGTH;

    // This represents the top left of the view into the map
    const left = Math.max(0, chunkX - Math.floor(sceneChunksWide / 2));
    const top = Math.max(0, chunkY - Math.floor(sceneChunksHigh / 2));

    this._camera.position.x =
      Math.floor(scenePixelsWide / 2) - Math.floor(this._camera.right / 2);
    this._camera.position.y =
      Math.floor(scenePixelsHigh / 2) - Math.floor(this._camera.top / 2);

    this._camera.updateProjectionMatrix();

    this._chunkRenderer.refreshChunks(left, top, this._map, this._renderer);
  }

  start() {
    listenForResize(this.name(), this.resize);
    listenForKeydown(this.name(), this.keydown);
    this._centerAroundCamera();
    this._rendering = true;
    this.render();
  }

  _applyCameraDelta() {
    const dX = this._cameraDeltaX;
    const dY = this._cameraDeltaY;

    if (!dX && !dY) {
      return;
    }

    this._camera.position.x += dX;
    this._camera.position.y += dY;
    this._camera.updateProjectionMatrix();
    this._cameraDeltaX = 0;
    this._cameraDeltaY = 0;
  }

  render = () => {
    if (!this._rendering) {
      return;
    }

    requestAnimationFrame(this.render);

    stats.begin();

    this._applyCameraDelta();
    this._renderer.render(this._scene, this._camera);

    stats.end();
  };
}
