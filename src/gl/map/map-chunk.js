import * as THREE from "three";
import {
  CHUNK_PIXEL_LENGTH,
  CHUNK_TILE_LENGTH,
  MAP_TILES_WIDE,
  TILE_PIXEL_LENGTH,
  TILES_PER_CHUNK
} from "../../config";

export default class Chunk {
  static MATERIAL_OPTIONS = {
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    side: THREE.FrontSide
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

  constructor() {
    this._texture.texture.generateMipmaps = false;
    this._fill();
  }

  _fill() {
    const sprites = this._sprites;
    let idx = 0;
    for (let y = 0; y < CHUNK_TILE_LENGTH; y++) {
      for (let x = 0; x < CHUNK_TILE_LENGTH; x++) {
        var sprite = new THREE.Sprite();
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
   * @param startX {number}
   * @param startY {number}
   * @param map {Int8Array}
   * @param materials {SpriteMaterial[]}
   * @return {Chunk}
   */
  update(startX, startY, map, materials) {
    const sprites = this._sprites;
    const endY = startY + CHUNK_TILE_LENGTH;
    let mapIdx = 0;
    let spriteIdx = 0;
    for (let y = startY; y < endY; y++) {
      mapIdx = startX + y * MAP_TILES_WIDE;
      for (let i = 0; i < CHUNK_TILE_LENGTH; i++) {
        sprites[spriteIdx++].material = materials[map[mapIdx++]];
      }
    }

    return this;
  }

  /**
   *
   * @param renderer {WebGLRenderer}
   * @param camera {OrthographicCamera}
   * @returns {Chunk}
   */
  render(renderer, camera) {
    renderer.setRenderTarget(this._texture);
    renderer.render(this._scene, camera);
    return this;
  }

  /**
   *
   * @return {Mesh}
   */
  getMesh() {
    return this._mesh;
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
