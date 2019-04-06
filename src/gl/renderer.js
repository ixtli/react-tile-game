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
   * The total amount of renderers.
   *
   * @type {number}
   * @private
   */
  static _rendererCount = 0;

  /**
   * The amount of pixels to jump when a panning key is hit.
   *
   * @type {number}
   */
  static KEY_JUMP_SIZE = 32;

  /**
   * The WebGLRenderer options
   *
   * @type {Object.<String, *>}
   */
  static RENDERER_OPTIONS = {
    stencil: false,
    antialias: false
  };

  /**
   * Our rendered scene, displayed to the player.
   *
   * @type {Scene}
   * @private
   */
  _scene = new THREE.Scene();

  /**
   * The camera used to render this scene (initialized later.)
   *
   * @type {OrthographicCamera}
   * @private
   */
  _camera = new THREE.OrthographicCamera(1, 1, 1, 1, 0, 1);

  /**
   * Our renderer index, among the total global renderers.
   *
   * @type {number}
   * @private
   */
  _index = Renderer._rendererCount++;

  /**
   * Whether or not we should draw frames. Note that after this is changed from
   * {true} to {false} you need to call startRendering()
   *
   * @type {boolean}
   * @private
   */
  _rendering = false;

  /**
   * The amount the camera should move on the X, Y plane before next frame.
   *
   * @type {{x: number, y: number}}
   * @private
   */
  _cameraDelta = { x: 0, y: 0 };

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
   * @type {{top: number, left: number, bottom: number, right: number}}
   * @private
   */
  _offMapBoundary = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  };

  /**
   *
   * @type {number}
   * @private
   */
  _distanceAllowedToPanOffMap = TILE_PIXEL_LENGTH * 2;

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
   * The background of the scene beyond the map.
   *
   * @type {Color}
   * @private
   */
  _backgroundColor = new THREE.Color(0x51669a);

  /**
   * Constructs the renderer.
   * @TODO: Nothing should really happen here except the renderer construction.
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

    this._scene.background = this._backgroundColor;
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._camera.position.z = 100;

    const count = 9;
    for (let i = 0; i < count; i += 1) {
      this._tileMaterials.greenTile(i / count);
    }

    // @TODO: Move this away from here.
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
    if (this._mouseDownLocation && this._allowMapDragWithMouse) {
      this._cameraDelta.x += this._mouseDownLocation.x - offsetX;
      this._cameraDelta.y += offsetY - this._mouseDownLocation.y;
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

  /**
   * Register all event listeners
   */
  listenForMouseEvents() {
    this._canvas.addEventListener("mousemove", this._mouseMoveHandler);
    this._canvas.addEventListener("mousedown", this._mouseDownHandler);
    this._canvas.addEventListener("mouseup", this._mouseUpHandler);
  }

  /**
   * De-register all mouse event listeners
   */
  stopListeningForMouseEvents() {
    this._canvas.removeEventListener("mousemove", this._mouseMoveHandler);
    this._canvas.removeEventListener("mousedown", this._mouseDownHandler);
    this._canvas.removeEventListener("mouseup", this._mouseUpHandler);
  }

  /**
   * Theoretically you could have multiple of these objects so give them a semi-
   * unique name.
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
   * Resizes the scene. A very computationally intensive procedure so it must be
   * debounced.
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

    // Resize the chunks themselves.
    this._chunkRenderer.resize(width, height, this._scene);

    // How far the camera can move from the center of the scene before chunks
    // have to be shimmied around
    const sceneDimensions = this._chunkRenderer.sceneDimensions();
    this._panBoundary.offset = CHUNK_PIXEL_LENGTH;
    this._panBoundary.top = sceneDimensions.height - height;
    this._panBoundary.bottom = 0;
    this._panBoundary.left = 0;
    this._panBoundary.right = sceneDimensions.width - width;

    // Resize the boundary away from which you're allowed to pan off the maps
    // edges.
    const boundary = this._distanceAllowedToPanOffMap;
    this._offMapBoundary.left = -boundary;
    this._offMapBoundary.right = sceneDimensions.width - (width - boundary);
    this._offMapBoundary.top = sceneDimensions.height - (height - boundary);
    this._offMapBoundary.bottom = -boundary;
  };

  /**
   * The width of the rendered area in pixels.
   * @return {number}
   */
  width() {
    return this._camera.right;
  }

  /**
   * The height of the rendered area in pixels.
   * @return {number}
   */
  height() {
    return this._camera.top;
  }

  /**
   * Stop rendering and clean up all listeners and GL assets.
   */
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

  /**
   * DOM keydown event handler
   * @param key {string} The key pressed.
   */
  keydown = key => {
    switch (key) {
      case "8":
      case "w":
        this._cameraDelta.y += Renderer.KEY_JUMP_SIZE;
        break;
      case "2":
      case "s":
        this._cameraDelta.y -= Renderer.KEY_JUMP_SIZE;
        break;
      case "4":
      case "a":
        this._cameraDelta.x -= Renderer.KEY_JUMP_SIZE;
        break;
      case "6":
      case "d":
        this._cameraDelta.x += Renderer.KEY_JUMP_SIZE;
        break;
      case "7":
        this._cameraDelta.y += Renderer.KEY_JUMP_SIZE;
        this._cameraDelta.x -= Renderer.KEY_JUMP_SIZE;
        break;
      case "9":
        this._cameraDelta.y += Renderer.KEY_JUMP_SIZE;
        this._cameraDelta.x += Renderer.KEY_JUMP_SIZE;
        break;
      case "1":
        this._cameraDelta.y -= Renderer.KEY_JUMP_SIZE;
        this._cameraDelta.x -= Renderer.KEY_JUMP_SIZE;
        break;
      case "3":
        this._cameraDelta.y -= Renderer.KEY_JUMP_SIZE;
        this._cameraDelta.x += Renderer.KEY_JUMP_SIZE;
        break;
      case " ":
        this.toggleRendering();
        break;
      default:
        console.debug("Unhandled key", key);
        break;
    }
  };

  /**
   * Center the camera on a world map tile (x, y)
   * @param x {number}
   * @param y {number}
   */
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

    this._cameraDelta.x = 0;
    this._cameraDelta.y = 0;
    this._cameraWorldTile.x = x;
    this._cameraWorldTile.y = y;

    // translate the world space into screen space
    const { sceneX, sceneY } = this.sceneCoordinateForWorldCoordinate(x, y);
    this._camera.position.x = sceneX - Math.round(this.width() / 2);
    this._camera.position.y = sceneY - Math.round(this.height() / 2);
  }

  /**
   * Return scene X / Y coordinates for a world tile coordinate
   *
   * @param x {number}
   * @param y {number}
   * @return {{sceneY: number, sceneX: number}}
   */
  sceneCoordinateForWorldCoordinate(x, y) {
    const left = this._chunkRenderer.left();
    const top = this._chunkRenderer.top();
    const worldPixelX = x * TILE_PIXEL_LENGTH;
    const worldPixelY = y * TILE_PIXEL_LENGTH;
    const sceneX = worldPixelX - left * CHUNK_PIXEL_LENGTH;
    const sceneY = worldPixelY - top * CHUNK_PIXEL_LENGTH;
    return { sceneX, sceneY };
  }

  /**
   * Toggle frame rendering.
   */
  toggleRendering() {
    if (this._rendering) {
      this.startRendering();
    } else {
      this.stopRendering();
    }
  }

  /**
   * Start the renderer drawing frames.
   */
  startRendering() {
    if (this._rendering) {
      console.warn("Attempt to start rendering while already started.");
      return;
    }

    console.log("Rendering started.");
    this._rendering = true;
    this._renderer.setAnimationLoop(this.render);
  }

  /**
   * Stop the renderer from drawing frames. (It'll actually de-register itself
   * the next time getAnimationFrame() is called.)
   */
  stopRendering() {
    if (!this._rendering) {
      console.warn("Attempt to stop rendering twice.");
      return;
    }

    this._rendering = false;
  }

  /**
   * Start the engine! Registers window event listeners and begins rendering.
   */
  start() {
    listenForResize(this.name(), this.resize);
    listenForKeydown(this.name(), this.keydown);
    this.listenForMouseEvents();

    const midX = Math.floor(MAP_TILES_WIDE / 2);
    const midY = Math.floor(MAP_TILES_HIGH / 2);
    this.centerCameraOnTile(midX, midY);
    this.startRendering();
  }

  /**
   * Apply whatever delta X, Y has been queued up for the camera since the last
   * time a frame was rendered. This will check to make sure we dont pan too far
   * away from the map and further ensure that we pan the scene's map chunks to
   * maintain the illusion that the scene itself stretches on forever.
   *
   * @private
   */
  _applyCameraDelta() {
    const dX = this._cameraDelta.x;
    const dY = this._cameraDelta.y;

    // The easy out case
    if (!dX && !dY) {
      return;
    }

    let { x, y } = this._camera.position;
    x += dX;
    y += dY;

    // If this is true then we need to reorient chunks
    let delta = false;

    // If we've panned higher than the scene pan boundary
    if (y > this._panBoundary.top) {
      // Try to pan up in the world
      if (this._chunkRenderer.panUp()) {
        // If we panned up (i.e.: there was more map), adjust the camera down by
        // the offset to make it seem like we're panning smoothly. This is the
        // core pantomime that achieves the effect of "infinite" maps.
        y -= this._panBoundary.offset;
        // Mark the fact that we're going to need to reorient
        delta = true;
      } else if (y > this._offMapBoundary.top) {
        // If we get here, it means that we're off the map, so make sure we dont
        // scroll past a comfortable boundary.
        y = this._offMapBoundary.top;
      }
    } else if (y < this._panBoundary.bottom) {
      // Same tests as above, but for panning down.
      if (this._chunkRenderer.panDown()) {
        y += this._panBoundary.offset;
        delta = true;
      } else if (y < this._offMapBoundary.bottom) {
        y = this._offMapBoundary.bottom;
      }
    }

    // Same tests as above but for left and right
    if (x > this._panBoundary.right) {
      if (this._chunkRenderer.panRight()) {
        x -= this._panBoundary.offset;
        delta = true;
      } else if (x > this._offMapBoundary.right) {
        x = this._offMapBoundary.right;
      }
    } else if (x < this._panBoundary.left) {
      if (this._chunkRenderer.panLeft()) {
        x += this._panBoundary.offset;
        delta = true;
      } else if (x < this._offMapBoundary.left) {
        x = this._offMapBoundary.left;
      }
    }

    // Reset deltas now that they've been applied
    this._cameraDelta.x = 0;
    this._cameraDelta.y = 0;

    // Keep track of where in the world the camera is pointing.
    this._cameraWorldTile.x += dX / TILE_PIXEL_LENGTH;
    this._cameraWorldTile.y += dY / TILE_PIXEL_LENGTH;

    // Apply the new camera positions
    this._camera.position.x = x;
    this._camera.position.y = y;

    // If we happened to have successfully panned, reorient the map chunks.
    if (delta) {
      this._chunkRenderer.reorientChunks();
    }
  }

  /**
   * Basically the boilerplate to set up the scene and call render() on the
   * Three.JS renderer. This function shouldn't be called directly and should
   * instead be passed to WebGLRenderer#setAntimationLoop
   */
  render = () => {
    if (!this._rendering) {
      this._renderer.setAnimationLoop(null);
      console.log("Rendering stopped.");
    }

    stats.begin();

    this._applyCameraDelta();
    this._chunkRenderer.update(this._renderer);

    this._renderer.setRenderTarget(null);
    this._renderer.render(this._scene, this._camera);

    stats.end();
  };
}
