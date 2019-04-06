import * as THREE from "three";
import { listenForResize, stopListeningForResize } from "./resize";
import { listenForKeydown, stopListeningForKeydown } from "./keydown";
import ChunkRenderer from "./map/map-chunk-renderer";
import {
  CHUNK_PIXEL_LENGTH,
  CHUNK_TILE_LENGTH,
  MAP_CHUNKS_WIDE,
  MAP_TILES_HIGH,
  MAP_TILES_WIDE,
  TILE_PIXEL_LENGTH
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
    stencil: false,
    antialias: false
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
   * @type {Int16Array}
   * @private
   */
  _map = new Int16Array(MAP_TILES_WIDE * MAP_TILES_HIGH);

  /**
   *
   * @type {ChunkRenderer}
   * @private
   */
  _chunkRenderer = new ChunkRenderer(this._map, this._tileMaterials);

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
  _cameraWorldTile = { x: 0, y: 0 };

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
   * @type {Mesh}
   * @private
   */
  _tileHighlighter = null;

  /**
   *
   * @type {boolean}
   * @private
   */
  _allowMapDragWithMouse = true;

  /**
   *
   * @type {?{x: number, y: number}}
   * @private
   */
  _mouseDownLocation = null;

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

    const geom = new THREE.PlaneBufferGeometry(
      TILE_PIXEL_LENGTH,
      TILE_PIXEL_LENGTH
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      opacity: 0.85,
      transparent: true,
      side: THREE.FrontSide
    });
    this._tileHighlighter = new THREE.Mesh(geom, material);
    this._tileHighlighter.position.set(0, 0, 2);
    this._scene.add(this._tileHighlighter);
  }

  _mouseMoveHandler = ({ offsetX, offsetY }) => {
    if (this._mouseDownLocation) {
      this._cameraDeltaX += (this._mouseDownLocation.x - offsetX);
      this._cameraDeltaY += (offsetY - this._mouseDownLocation.y);
      this._mouseDownLocation.x = offsetX;
      this._mouseDownLocation.y = offsetY;
      return;
    }

    const sceneX = this._camera.position.x + offsetX;
    const sceneY = this._camera.position.y + this.height() - offsetY;
    this._tileHighlighter.position.x =
      sceneX - (sceneX % TILE_PIXEL_LENGTH) + Math.floor(TILE_PIXEL_LENGTH / 2);
    this._tileHighlighter.position.y =
      sceneY - (sceneY % TILE_PIXEL_LENGTH) + Math.floor(TILE_PIXEL_LENGTH / 2);
  };

  _mouseDownHandler = ({ offsetX, offsetY }) => {
    this._mouseDownLocation = { x: offsetX, y: offsetY };
  };

  _mouseUpHandler = () => {
    this._mouseDownLocation = null;
  };

  listenForMouseEvents() {
    this._canvas.addEventListener("mousemove", this._mouseMoveHandler);
    this._canvas.addEventListener("mousedown", this._mouseDownHandler);
    this._canvas.addEventListener("mouseup", this._mouseUpHandler);
  }

  stopListeningForMouseEvents() {
    this._canvas.removeEventListener("mousemove", this._mouseMoveHandler);
    this._canvas.removeEventListener("mousedown", this._mouseDownHandler);
    this._canvas.removeEventListener("mouseup", this._mouseUpHandler);
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
    this.stopListeningForMouseEvents();
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

  centerCameraOnTile(x, y) {
    console.assert(x >= 0);
    console.assert(y >= 0);
    console.assert(x < MAP_TILES_WIDE);
    console.assert(y < MAP_TILES_HIGH);

    // What chunk in the map is (x,y) in?
    const chunkX = Math.floor(x / CHUNK_TILE_LENGTH);
    const chunkY = Math.floor(y / CHUNK_TILE_LENGTH);

    console.debug(`Camera moved to (${x}, ${y}) (chunk ${chunkX}, ${chunkY}).`);

    const sceneChunksWide = this._chunkRenderer.chunksWide();
    const sceneChunksHigh = this._chunkRenderer.chunksHigh();

    // This represents the top left of the view into the map
    const left = Math.min(
      Math.max(0, chunkX - Math.floor(sceneChunksWide / 2)),
      MAP_CHUNKS_WIDE
    );

    const top = Math.min(
      Math.max(0, chunkY - Math.floor(sceneChunksHigh / 2)),
      MAP_TILES_HIGH
    );

    this._chunkRenderer.setLeftTop(left, top);

    this._cameraDeltaX = 0;
    this._cameraDeltaY = 0;
    this._cameraWorldTile.x = x;
    this._cameraWorldTile.y = y;

    // @TODO: This needs to put the center of the camera over the pixel (x,y)
    // translate the world space into screen space
    const worldPixelX = x * TILE_PIXEL_LENGTH;
    const worldPixelY = y * TILE_PIXEL_LENGTH;
    const sceneX = worldPixelX - left * CHUNK_PIXEL_LENGTH;
    const sceneY = worldPixelY - top * CHUNK_PIXEL_LENGTH;
    this._camera.position.x = sceneX - Math.round(this.width() / 2);
    this._camera.position.y = sceneY - Math.round(this.height() / 2);

    this._tileHighlighter.position.x =
      sceneX - Math.floor(TILE_PIXEL_LENGTH / 2);
    this._tileHighlighter.position.y =
      sceneY + Math.floor(TILE_PIXEL_LENGTH / 2);
  }

  start() {
    listenForResize(this.name(), this.resize);
    listenForKeydown(this.name(), this.keydown);
    this.listenForMouseEvents();

    const midX = Math.floor(MAP_TILES_WIDE / 2);
    const midY = Math.floor(MAP_TILES_HIGH / 2);
    this.centerCameraOnTile(midX, midY);
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
    this._cameraWorldTile.x += Math.floor(dX);
    // This really is absurd:
    // noinspection JSSuspiciousNameCombination
    this._cameraWorldTile.y += Math.floor(dY);

    let delta = false;
    if (this._camera.position.y > this._panBoundary.top) {
      if (this._chunkRenderer.panUp()) {
        this._camera.position.y -= this._panBoundary.offset;
        delta = true;
      }
    } else if (this._camera.position.y < this._panBoundary.bottom) {
      if (this._chunkRenderer.panDown()) {
        this._camera.position.y += this._panBoundary.offset;
        delta = true;
      }
    }

    if (this._camera.position.x > this._panBoundary.right) {
      if (this._chunkRenderer.panRight()) {
        this._camera.position.x -= this._panBoundary.offset;
        delta = true;
      }
    } else if (this._camera.position.x < this._panBoundary.left) {
      if (this._chunkRenderer.panLeft()) {
        this._camera.position.x += this._panBoundary.offset;
        delta = true;
      }
    }

    if (delta) {
      this._chunkRenderer.reorientChunks();
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
