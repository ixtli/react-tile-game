import * as THREE from "three";
import { listenForResize, stopListeningForResize } from "./resize";
import { listenForKeydown, stopListeningForKeydown } from "./keydown";
import ChunkRenderer from "./map/map-chunk-renderer";
import {
  CHUNK_PIXEL_LENGTH,
  CHUNK_TILE_LENGTH,
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
  _cameraWorldPixel = { x: 0, y: 0 };

  /**
   *
   * @type {{offset: number, top: number, bottom: number, left: number, right:
   *   number}}
   * @private
   */
  _panBoundary = {
    offset: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
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

    const count = 9;
    for (let i = 0; i < count; i += 1) {
      this._tileMaterials.greenTile(i / count);
    }
  }

  /**
   *
   * @return {string}
   */
  name() {
    return "renderer-" + this._index;
  }

  generateTestMap() {
    const map = this._map;
    const size = map.length;
    for (let i = size; i >= 0; i--) {
      const x = i % MAP_TILES_WIDE;
      const y = Math.floor(i / MAP_TILES_WIDE);
      const chunkY = y % CHUNK_TILE_LENGTH;
      const chunkX = x % CHUNK_TILE_LENGTH;

      if (chunkY === 0 || chunkY === CHUNK_TILE_LENGTH - 1) {
        map[i] = 0;
      } else if (chunkX === 0 || chunkX === CHUNK_TILE_LENGTH - 1) {
        map[i] = 4;
      } else {
        map[i] = 8;
      }
    }
  }

  generateMap() {
    const map = this._map;
    const size = map.length;
    const materialCount = this._tileMaterials.size();
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
    this._camera.near = -1;
    this._camera.far = 2000;
    this._camera.updateProjectionMatrix();

    this._chunkRenderer.windowResized(width, height, this._scene);

    // How far the camera can move from the center of the scene before chunks
    // have to be shimmied around
    const sceneDimensions = this._chunkRenderer.sceneDimensions();
    this._panBoundary.offset = CHUNK_PIXEL_LENGTH;
    this._panBoundary.top = sceneDimensions.height - height;
    this._panBoundary.bottom = 0;
    this._panBoundary.left = 0;
    this._panBoundary.right = sceneDimensions.width - width;
  };

  width() {
    return this._camera.right;
  }

  height() {
    return this._camera.top;
  }

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
      case "8":
      case "w":
        this._cameraDeltaY += Renderer.KEY_JUMP_SIZE;
        break;
      case "2":
      case "s":
        this._cameraDeltaY -= Renderer.KEY_JUMP_SIZE;
        break;
      case "4":
      case "a":
        this._cameraDeltaX -= Renderer.KEY_JUMP_SIZE;
        break;
      case "6":
      case "d":
        this._cameraDeltaX += Renderer.KEY_JUMP_SIZE;
        break;
      case "7":
        this._cameraDeltaY += Renderer.KEY_JUMP_SIZE;
        this._cameraDeltaX -= Renderer.KEY_JUMP_SIZE;
        break;
      case "9":
        this._cameraDeltaY += Renderer.KEY_JUMP_SIZE;
        this._cameraDeltaX += Renderer.KEY_JUMP_SIZE;
        break;
      case "1":
        this._cameraDeltaY -= Renderer.KEY_JUMP_SIZE;
        this._cameraDeltaX -= Renderer.KEY_JUMP_SIZE;
        break;
      case "3":
        this._cameraDeltaY -= Renderer.KEY_JUMP_SIZE;
        this._cameraDeltaX += Renderer.KEY_JUMP_SIZE;
        break;
      case " ":
        this._rendering = !this._rendering;
        if (this._rendering) {
          this._renderer.setAnimationLoop(this.render);
          console.log("Rendering enabled.");
        } else {
          console.log("Rendering disabled.");
        }
        break;
      default:
        console.debug("Unhandled key", key);
        break;
    }
  };

  centerCameraOnWorldPixel(x, y) {
    console.assert(x >= 0);
    console.assert(y >= 0);
    console.assert(x < MAP_PIXELS_WIDE);
    console.assert(y < MAP_PIXELS_HIGH);

    // What chunk in the map is (x,y) in?
    const chunkX = Math.floor(x / CHUNK_PIXEL_LENGTH);
    const chunkY = Math.floor(y / CHUNK_PIXEL_LENGTH);

    console.debug(`Camera moved to ${x}, ${y} (chunk ${chunkX}, ${chunkY}).`);

    const sceneChunksWide = this._chunkRenderer.chunksWide();
    const sceneChunksHigh = this._chunkRenderer.chunksHigh();

    // This represents the top left of the view into the map
    const left = Math.min(
      Math.max(0, chunkX - Math.floor(sceneChunksWide / 2)),
      sceneChunksWide
    );

    const top = Math.min(
      Math.max(0, chunkY - Math.floor(sceneChunksHigh / 2)),
      sceneChunksHigh
    );

    this._chunkRenderer.setLeftTop(left, top, this._map);

    this._cameraDeltaX = 0;
    this._cameraDeltaY = 0;
    this._cameraWorldPixel.x = x;
    this._cameraWorldPixel.y = y;

    // @TODO: This needs to put the center of the camera over the pixel (x,y)
    // translate the world space into screen space
    // const sceneLeft = x - left * CHUNK_PIXEL_LENGTH;
    // const sceneTop = top * CHUNK_PIXEL_LENGTH - y;
    // this._camera.position.x = sceneLeft - Math.round(this.width() / 2);
    // this._camera.position.y = sceneTop - Math.round(this.height() / 2);
  }

  start() {
    listenForResize(this.name(), this.resize);
    listenForKeydown(this.name(), this.keydown);
    this.centerCameraOnWorldPixel(MAP_PIXELS_WIDE / 2, MAP_PIXELS_WIDE / 2);
    this._rendering = true;
    this._renderer.setAnimationLoop(this.render);
  }

  _applyCameraDelta() {
    const dX = this._cameraDeltaX;
    const dY = this._cameraDeltaY;

    if (!dX && !dY) {
      return;
    }

    this._camera.position.x += dX;
    this._camera.position.y += dY;
    this._cameraDeltaX = 0;
    this._cameraDeltaY = 0;
    this._cameraWorldPixel.x += Math.floor(dX);
    // This really is absurd:
    // noinspection JSSuspiciousNameCombination
    this._cameraWorldPixel.y += Math.floor(dY);

    if (this._camera.position.y > this._panBoundary.top) {
      if (this._chunkRenderer.panUp(this._map)) {
        this._camera.position.y -= this._panBoundary.offset;
      }
    } else if (this._camera.position.y < this._panBoundary.bottom) {
      if (this._chunkRenderer.panDown(this._map)) {
        this._camera.position.y += this._panBoundary.offset;
      }
    }

    if (this._camera.position.x > this._panBoundary.right) {
      if (this._chunkRenderer.panRight(this._map)) {
        this._camera.position.x -= this._panBoundary.offset;
      }
    } else if (this._camera.position.x < this._panBoundary.left) {
      if (this._chunkRenderer.panLeft(this._map)) {
        this._camera.position.x += this._panBoundary.offset;
      }
    }
  }

  render = () => {
    if (!this._rendering) {
      this._renderer.setAnimationLoop(null);
    }

    stats.begin();

    this._applyCameraDelta();
    this._chunkRenderer.update(this._renderer);

    this._renderer.setRenderTarget(null);
    this._renderer.render(this._scene, this._camera);

    stats.end();
  };
}
