import * as THREE from "three";
import { listenForResize, stopListeningForResize } from "./resize";
import { listenForKeydown, stopListeningForKeydown } from "./keydown";
import ChunkRenderer from "./map/map-chunk";
import { TILE_PIXEL_LENGTH } from "../config";

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
  static MAP_WIDTH = 100;
  static MAP_HEIGHT = 100;

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
    this._map = new Int8Array(Renderer.MAP_WIDTH * Renderer.MAP_HEIGHT);

    /**
     *
     * @type {boolean}
     * @private
     */
    this._dirty = true;

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

    // this._regenerateTileArray(tilesWide, tilesHigh);

    this._chunkRenderer.windowResized(width, height);

    this._dirty = true;
  };

  _regenerateTileArray(tilesWide, tilesHigh) {
    const oldLength = this._tiles.length;
    const newLength = tilesWide * tilesHigh;

    if (oldLength === newLength) {
      return;
    }

    const oldTiles = this._tiles;
    const newTiles = new Array(newLength);

    const copyTarget = Math.min(newLength, oldLength);
    for (let i = 0; i < copyTarget; i++) {
      const y = Math.floor(i / tilesWide);
      const x = i % tilesWide;
      const sprite = oldTiles[i];
      sprite.position.set(x * TILE_PIXEL_LENGTH, y * TILE_PIXEL_LENGTH, 1);
      newTiles[i] = sprite;
    }

    if (copyTarget < newLength) {
      for (let i = copyTarget; i < newLength; i++) {
        var sprite = new THREE.Sprite();
        const y = Math.floor(i / tilesWide);
        const x = i % tilesWide;
        sprite.center.set(0, 0);
        sprite.scale.set(TILE_PIXEL_LENGTH, TILE_PIXEL_LENGTH, 1);
        sprite.position.set(x * TILE_PIXEL_LENGTH, y * TILE_PIXEL_LENGTH, 1);
        sprite.material = this._materials[this._map[i]];
        this._scene.add(sprite);
        newTiles[i] = sprite;
      }
    } else {
      for (let i = copyTarget; i < oldLength; i++) {
        this._scene.remove(oldTiles[i]);
      }
    }

    this._tiles = newTiles;

    console.log(
      "regenerated",
      newLength,
      "tiles (",
      tilesWide,
      "x",
      tilesHigh,
      ")"
    );
  }

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

    const map = this._chunkRenderer.renderChunk(
      this._renderer,
      0,
      0,
      Renderer.MAP_WIDTH,
      this._map
    );

    var m = new THREE.SpriteMaterial({ map: map.texture });
    var s = new THREE.Sprite();
    s.center.set(0,0);
    s.scale.set(map.width, map.height, 1);
    s.position.set(0,0,1);
    s.material = m;
    this._scene.add(s);

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
