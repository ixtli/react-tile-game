import * as THREE from "three";
import {
  CHUNK_PIXEL_LENGTH,
  CHUNK_TILE_LENGTH,
  HALF_CHUNK_PIXEL_LENGTH,
  MAP_TILES_WIDE,
  TILE_PIXEL_LENGTH,
  TILES_PER_CHUNK
} from "../../config";

export default class Chunk {
  static CHUNK_DEBUG_SPACING = 0;

  static MATERIAL_OPTIONS = {
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    side: THREE.FrontSide
  };

  static RENDER_TARGET_OPTIONS = {
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
    format: THREE.RGBFormat,
    depthBuffer: false,
    stencilBuffer: false
  };

  /**
   *
   * @type {Sprite[]}
   * @private
   */
  _sprites = new Array(TILES_PER_CHUNK);

  /**
   *
   * @type {Scene}
   * @private
   */
  _scene = new THREE.Scene();

  /**
   *
   * @type {WebGLRenderTarget}
   * @private
   */
  _texture = new THREE.WebGLRenderTarget(
    CHUNK_PIXEL_LENGTH,
    CHUNK_PIXEL_LENGTH,
    Chunk.RENDER_TARGET_OPTIONS
  );

  /**
   *
   * @type {PlaneBufferGeometry}
   * @private
   */
  _geometry = new THREE.PlaneBufferGeometry(
    CHUNK_PIXEL_LENGTH,
    CHUNK_PIXEL_LENGTH
  );

  /**
   *
   * @type {MeshBasicMaterial}
   * @private
   */
  _material = new THREE.MeshBasicMaterial({
    map: this._texture.texture,
    ...Chunk.MATERIAL_OPTIONS
  });

  /**
   *
   * @type {Mesh}
   * @private
   */
  _mesh = new THREE.Mesh(this._geometry, this._material);

  /**
   *
   * @type {{x: number, y: number}}
   * @private
   */
  _currentSceneLocation = { x: -1, y: -1 };

  /**
   *
   * @type {{x: number, y: number}}
   * @private
   */
  _currentMapLocation = { x: -1, y: -1 };

  /**
   *
   * @type {boolean}
   * @private
   */
  _dirty = false;

  constructor() {
    this._texture.texture.generateMipmaps = false;
    this._fill();
  }

  _fill() {
    const sprites = this._sprites;
    let idx = 0;
    for (let y = 0; y < CHUNK_TILE_LENGTH; y++) {
      for (let x = 0; x < CHUNK_TILE_LENGTH; x++) {
        const sprite = new THREE.Sprite();
        sprite.center.set(0, 0);
        sprite.scale.set(TILE_PIXEL_LENGTH, TILE_PIXEL_LENGTH, 1);
        sprite.position.set(x * TILE_PIXEL_LENGTH, y * TILE_PIXEL_LENGTH, 1);
        this._scene.add(sprite);
        sprites[idx++] = sprite;
      }
    }
  }

  /**
   *
   * @param startChunkX {number}
   * @param startChunkY {number}
   * @param map {Int16Array}
   * @param materials {SpriteMaterial[]}
   * @return {Chunk}
   */
  update(startChunkX, startChunkY, map, materials) {
    if (
      this._currentMapLocation.x === startChunkX &&
      this._currentMapLocation.y === startChunkY
    ) {
      return this;
    }

    const tileStartY = startChunkY * (MAP_TILES_WIDE * CHUNK_TILE_LENGTH);
    const tileStartX = startChunkX * CHUNK_TILE_LENGTH;
    const sprites = this._sprites;

    let mapIdx;
    let spritesIdx = 0;
    for (let y = 0; y < CHUNK_TILE_LENGTH; y++) {
      mapIdx = tileStartY + tileStartX + y * MAP_TILES_WIDE;
      for (let x = 0; x < CHUNK_TILE_LENGTH; x++) {
        const sprite = sprites[spritesIdx++];
        const material = materials[map[mapIdx++]];
        if (sprite.material !== material) {
          sprite.material = material;
          this._dirty = true;
        }
      }
    }

    this._currentMapLocation.x = startChunkX;
    this._currentMapLocation.y = startChunkY;

    return this;
  }

  /**
   *
   * @param renderer {WebGLRenderer}
   * @param camera {OrthographicCamera}
   * @returns {boolean}
   */
  render(renderer, camera) {
    if (!this._dirty) {
      return false;
    }

    renderer.setRenderTarget(this._texture);
    renderer.render(this._scene, camera);
    this._dirty = false;
    return true;
  }

  /**
   *
   * @return {Mesh}
   */
  getMesh() {
    return this._mesh;
  }

  /**
   *
   * @param x {number}
   * @param y {number}
   * @param sceneHeight {number}
   * @returns {Chunk}
   */
  setSceneLocation(x, y, sceneHeight) {
    if (this._currentSceneLocation.x !== x) {
      this._currentSceneLocation.x = x;
      this._mesh.position.x =
        x * (CHUNK_PIXEL_LENGTH + Chunk.CHUNK_DEBUG_SPACING) +
        HALF_CHUNK_PIXEL_LENGTH;
    }

    if (this._currentSceneLocation.y !== y) {
      this._currentSceneLocation.y = y;
      this._mesh.position.y =
        sceneHeight +
        HALF_CHUNK_PIXEL_LENGTH -
        (y + 1) * (CHUNK_PIXEL_LENGTH + Chunk.CHUNK_DEBUG_SPACING);
    }

    return this;
  }

  dispose() {
    this._texture.dispose();
    this._geometry.dispose();
    this._material.dispose();
    this._texture = null;
    this._material = null;
    this._geometry = null;
    this._mesh = null;
    this._scene = null;

    // Note that we do not own the tile materials, so do NOT dispose of them.
    this._sprites = null;
  }
}
