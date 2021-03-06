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
import { TileMaterialManager } from "./map/tile-materials-manager";
import TWEEN from "@tweenjs/tween.js";
import { SparseObjectManager } from "./map/sparse-object-manager";
import ObjectMaterialManager from "./map/object-materials-manager";
import MapObject from "./map/map-object";
import MapLighting from "./map/map-light-overlay";
import MapLight from "./map/map-light";

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
  static KEY_JUMP_SIZE = CHUNK_PIXEL_LENGTH;

  /**
   * The WebGLRenderer options
   *
   * @type {Object.<String, *>}
   */
  static RENDERER_OPTIONS = {
    antialias: false,
    stencil: false
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
   * @type {MapObject}
   * @private
   */
  _tileHighlighter = null;

  /**
   *
   * @type {MapObject}
   * @private
   */
  _tileSelector = null;

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
   *
   * @type {TWEEN.Tween}
   * @private
   */
  _cameraTween = null;

  /**
   *
   * @type {ObjectMaterialManager}
   * @private
   */
  _objectMaterials = new ObjectMaterialManager();

  /**
   *
   * @type {SparseObjectManager}
   * @private
   */
  _objects = new SparseObjectManager();

  /**
   *
   * @type {MapLighting}
   * @private
   */
  _lighting = new MapLighting();

  /**
   *
   * @type {boolean}
   * @private
   */
  _showLighting = true;

  /**
   * Constructs the renderer and sets initial values like the Z position of the
   * camera that shouldn't really ever change through the life of the renderer.
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
    this._renderer.shadowMap.type = THREE.PCFShadowMap;
    this._camera.position.z = 100;

    // Add sparse object groups
    this._scene.add(this._objects.group());
    this._scene.add(this._lighting.colorObject());
    this._scene.add(this._lighting.shadowObject());

    this._initTileMaterials();
    this._initSparseObjects();


    this.addManyRandomLights();
  }

  _initTileMaterials() {
    const count = 9;
    for (let i = 0; i < count; i += 1) {
      this._tileMaterials.greenTile(i * 0.02);
    }
  }

  _initSparseObjects() {
    const hMat = this._objectMaterials.newMaterial({
      color: 0xffff00,
      opacity: 0.55,
      transparent: true
    });
    this._tileHighlighter = new MapObject(5);
    this._tileHighlighter.material(hMat).setWorldPosition(0, 0);
    this._objects.add(this._tileHighlighter);

    const mat = this._objectMaterials.newMaterial({
      color: 0x0000ff,
      opacity: 0.55,
      transparent: true
    });
    this._tileSelector = new MapObject(3);
    this._tileSelector.material(mat).setWorldPosition(0, 0);
    this._objects.add(this._tileSelector);
  }

  addManyRandomBlueObjects() {
    const mat = this._objectMaterials.newMaterial({
      color: 0x0000ff,
      opacity: 0.55,
      transparent: true
    });
    for (let i = 0; i < 1600; i++) {
      this._objects.add(
        new MapObject(2)
          .material(mat)
          .setWorldPosition(
            Math.floor(Math.random() * MAP_TILES_WIDE),
            Math.floor(Math.random() * MAP_TILES_HIGH)
          )
      );
    }
  }

  addManyRandomLights() {
    for (let i = 0; i < 5; i++) {
      const light = MapLight.NewPoint(0,1,0);
      light.shadow(true);
      this._lighting.addLight(light);
    }
  }

  windowOffsetToSceneCoordinate(offsetX, offsetY) {
    const sceneX = this._camera.position.x + offsetX;
    const sceneY = this._camera.position.y + this.height() - offsetY;
    return { sceneX, sceneY };
  }

  _mouseMoveHandler = ({ offsetX, offsetY }) => {
    if (this._mouseDownLocation && this._allowMapDragWithMouse) {
      this.stopCurrentCameraTween();
      this._cameraDelta.x += this._mouseDownLocation.x - offsetX;
      this._cameraDelta.y += offsetY - this._mouseDownLocation.y;
      this._mouseDownLocation.x = offsetX;
      this._mouseDownLocation.y = offsetY;
      return;
    }

    const { sceneX, sceneY } = this.windowOffsetToSceneCoordinate(
      offsetX,
      offsetY
    );

    this._lighting.lightPos(sceneX + this.width(), sceneY + this.height());

    const { x, y } = this.worldTileForSceneCoordinate(sceneX, sceneY);
    // noinspection JSSuspiciousNameCombination
    this._tileHighlighter.setWorldPosition(Math.floor(x), Math.floor(y));
  };

  _mouseDownHandler = ({ offsetX, offsetY }) => {
    this._mouseDownLocation = { x: offsetX, y: offsetY };
  };

  _mouseUpHandler = () => {
    this._mouseDownLocation = null;
  };

  _clickHandler = ({ offsetX, offsetY }) => {
    const { sceneX, sceneY } = this.windowOffsetToSceneCoordinate(
      offsetX,
      offsetY
    );
    const { x, y } = this.worldTileForSceneCoordinate(sceneX, sceneY);
    // noinspection JSSuspiciousNameCombination
    this._tileSelector.setWorldPosition(Math.floor(x), Math.floor(y));
  };

  _doubleClickHandler = ({ offsetX, offsetY }) => {
    const { sceneX, sceneY } = this.windowOffsetToSceneCoordinate(
      offsetX,
      offsetY
    );

    console.log(
      "Picked tile:",
      this.worldTileForSceneCoordinate(sceneX, sceneY)
    );

    const tileCenterX =
      sceneX - (sceneX % TILE_PIXEL_LENGTH) + TILE_PIXEL_LENGTH / 2;
    const tileCenterY =
      sceneY - (sceneY % TILE_PIXEL_LENGTH) + TILE_PIXEL_LENGTH / 2;

    const to = {
      x: tileCenterX - this.width() / 2,
      y: tileCenterY - this.height() / 2
    };

    this.tweenCameraToSceneCoordinate(to);
  };

  stopCurrentCameraTween() {
    if (this._cameraTween) {
      // noinspection JSUnresolvedFunction
      this._cameraTween.stop();
      this._cameraTween = null;
    }
  }

  /**
   *
   * @param to {{x: number, y: number}}
   */
  tweenCameraToSceneCoordinate(to) {
    this._cameraDelta.x = 0;
    this._cameraDelta.y = 0;

    this.stopCurrentCameraTween();

    const coords = {
      x: this._camera.position.x,
      y: this._camera.position.y
    };

    const last = { ...coords };

    this._cameraTween = new TWEEN.Tween(coords)
      .to(to, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        this._cameraDelta.x += coords.x - last.x;
        this._cameraDelta.y += coords.y - last.y;
        last.x = coords.x;
        last.y = coords.y;
      })
      .start();
  }

  /**
   * Register all event listeners
   */
  listenForMouseEvents() {
    this._canvas.addEventListener("mousemove", this._mouseMoveHandler);
    this._canvas.addEventListener("mousedown", this._mouseDownHandler);
    this._canvas.addEventListener("mouseup", this._mouseUpHandler);
    this._canvas.addEventListener("click", this._clickHandler);
    this._canvas.addEventListener("dblclick", this._doubleClickHandler);
  }

  /**
   * De-register all mouse event listeners
   */
  stopListeningForMouseEvents() {
    this._canvas.removeEventListener("mousemove", this._mouseMoveHandler);
    this._canvas.removeEventListener("mousedown", this._mouseDownHandler);
    this._canvas.removeEventListener("mouseup", this._mouseUpHandler);
    this._canvas.removeEventListener("dblclick", this._doubleClickHandler);
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
   * @param windowWidth {number}
   * @param windowHeight {number}
   */
  resize = (windowWidth, windowHeight) => {
    this._renderer.setSize(windowWidth, windowHeight);
    this._camera.left = 0;
    this._camera.right = windowWidth;
    this._camera.top = windowHeight;
    this._camera.bottom = 0;
    this._camera.near = -1;
    this._camera.far = 2000;

    // Three requires us to call this whenever the cameras shape is updated.
    this._camera.updateProjectionMatrix();

    // Resize the chunks themselves.
    this._chunkRenderer.resize(windowWidth, windowHeight, this._scene);
    this._objects.offsetForChunkRenderer(this._chunkRenderer);

    const { width, height } = this._chunkRenderer.sceneDimensions();

    this._lighting.resize(width, height);

    // How far the camera can move from the center of the scene before chunks
    // have to be shimmied around
    this._panBoundary.offset = CHUNK_PIXEL_LENGTH;
    this._panBoundary.top = height - windowHeight;
    this._panBoundary.bottom = 0;
    this._panBoundary.left = 0;
    this._panBoundary.right = width - windowWidth;

    // Resize the boundary away from which you're allowed to pan off the maps
    // edges.
    const boundary = this._distanceAllowedToPanOffMap;
    this._offMapBoundary.left = -boundary;
    this._offMapBoundary.right = width - (windowWidth - boundary);
    this._offMapBoundary.top = height - (windowHeight - boundary);
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
    this._objects.dispose();
    this._objectMaterials.dispose();
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
    let cy = 0;
    let cx = 0;

    switch (key) {
      case "8":
      case "w":
        cy += Renderer.KEY_JUMP_SIZE;
        break;
      case "2":
      case "s":
        cy -= Renderer.KEY_JUMP_SIZE;
        break;
      case "4":
      case "a":
        cx -= Renderer.KEY_JUMP_SIZE;
        break;
      case "6":
      case "d":
        cx += Renderer.KEY_JUMP_SIZE;
        break;
      case "7":
        cy += Renderer.KEY_JUMP_SIZE;
        cx -= Renderer.KEY_JUMP_SIZE;
        break;
      case "9":
        cy += Renderer.KEY_JUMP_SIZE;
        cx += Renderer.KEY_JUMP_SIZE;
        break;
      case "1":
        cy -= Renderer.KEY_JUMP_SIZE;
        cx -= Renderer.KEY_JUMP_SIZE;
        break;
      case "3":
        cy -= Renderer.KEY_JUMP_SIZE;
        cx += Renderer.KEY_JUMP_SIZE;
        break;
      case "l":
        this._showLighting = !this._showLighting;
        if (this._showLighting) {
          this._scene.add(this._lighting.shadowObject());
        } else {
          this._scene.remove(this._lighting.shadowObject());
        }
        break;
      case "+":
        this._lighting.offsetAmbientLightIntensity(.25);
        break;
      case "-":
        this._lighting.offsetAmbientLightIntensity(-0.25);
        break;
      case " ":
        this.toggleRendering();
        break;
      default:
        console.debug("Unhandled key", key);
        break;
    }

    if (cx || cy) {
      this.stopCurrentCameraTween();
      this._cameraDelta.x += cx;
      this._cameraDelta.y += cy;
    }
  };

  /**
   * Center the camera on a world map tile (x, y)
   *
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

    const sceneChunksWide = this._chunkRenderer.chunksWide();
    const sceneChunksHigh = this._chunkRenderer.chunksHigh();

    // Find the (left, top) chunk such that the pixel we're trying to center on
    // is in the middle of the scene.
    const left = Math.min(
      Math.max(0, chunkX - Math.floor(sceneChunksWide / 2)),
      MAP_CHUNKS_WIDE
    );

    const top = Math.min(
      Math.max(0, chunkY - Math.floor(sceneChunksHigh / 2)),
      MAP_TILES_HIGH
    );

    this._chunkRenderer.setLeftTop(left, top);
    this._objects.offsetForChunkRenderer(this._chunkRenderer);

    // This function is a camera movement
    this._cameraDelta.x = 0;
    this._cameraDelta.y = 0;

    // Set the world tile that the camera is looking at
    this._cameraWorldTile.x = x;
    this._cameraWorldTile.y = y;

    // Place the camera
    const { sceneX, sceneY } = this.sceneCoordinateForWorldTile(x, y);
    this._camera.position.x = sceneX - Math.round(this.width() / 2);
    this._camera.position.y = sceneY - Math.round(this.height() / 2);
  }

  /**
   * Return scene (x,y) pixel coordinates for a world tile coordinate
   *
   * @param x {number}
   * @param y {number}
   * @return {{sceneY: number, sceneX: number}}
   */
  sceneCoordinateForWorldTile(x, y) {
    const left = this._chunkRenderer.left();
    const top = this._chunkRenderer.top();
    const worldPixelX = x * TILE_PIXEL_LENGTH;
    const worldPixelY = y * TILE_PIXEL_LENGTH;
    const sceneX = worldPixelX - left * CHUNK_PIXEL_LENGTH;
    const sceneY = worldPixelY - top * CHUNK_PIXEL_LENGTH;
    return { sceneX, sceneY };
  }

  /**
   * Return a world tile coordinate (as a float) for a scene pixel coordinate.
   *
   * @param sceneX {number}
   * @param sceneY {number}
   * @return {{x: number, y: number}}
   */
  worldTileForSceneCoordinate(sceneX, sceneY) {
    const left = this._chunkRenderer.left() * CHUNK_PIXEL_LENGTH;
    const top = this._chunkRenderer.top() * CHUNK_PIXEL_LENGTH;
    const x = (sceneX + left) / TILE_PIXEL_LENGTH;
    const invert = this._chunkRenderer.sceneDimensions().height - sceneY;
    const y = (invert + top) / TILE_PIXEL_LENGTH;
    return { x, y };
  }

  /**
   * Toggle frame rendering.
   */
  toggleRendering() {
    if (!this._rendering) {
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
      this._objects.offsetForChunkRenderer(this._chunkRenderer);
    }
  }

  /**
   * Basically the boilerplate to set up the scene and call render() on the
   * Three.JS renderer. This function shouldn't be called directly and should
   * instead be passed to WebGLRenderer#setAntimationLoop
   *
   * @param time {number} The current frame time
   */
  render = time => {
    if (!this._rendering) {
      this._renderer.setAnimationLoop(null);
      console.log("Rendering stopped.");
    }

    stats.begin();

    // noinspection JSUnresolvedFunction
    TWEEN.update(time);

    this._applyCameraDelta();
    this._lighting.render(this._renderer);
    this._chunkRenderer.update(this._renderer);

    this._renderer.setRenderTarget(null);
    this._renderer.render(this._scene, this._camera);

    stats.end();
  };
}
