import Chunk from "./map-chunk";
import * as THREE from "three";
import { CHUNK_PIXEL_LENGTH, CHUNK_TILE_LENGTH } from "../../config";

export default class ChunkRenderer {
  /**
   *
   * @type {OrthographicCamera}
   * @private
   */
  _camera = new THREE.OrthographicCamera(
    0,
    CHUNK_PIXEL_LENGTH,
    CHUNK_PIXEL_LENGTH,
    0,
    -1,
    2000
  );

  /**
   *
   * @type {Chunk[]}
   * @private
   */
  _chunks = [];

  /**
   *
   * @type {number}
   * @private
   */
  _chunksWide = 0;

  /**
   *
   * @type {number}
   * @private
   */
  _chunksHigh = 0;

  /**
   *
   * @type {number}
   * @private
   */
  _lastLeft = -1;

  /**
   *
   * @type {number}
   * @private
   */
  _lastTop = -1;

  /**
   *
   * @type {SpriteMaterial[]}
   * @private
   */
  _materialArray = [];

  /**
   *
   * @param materials {TileMaterialManager}
   */
  constructor(materials) {
    this._camera.position.z = 1;
    this._camera.position.x = 0;
    this._camera.position.y = 0;
    this._camera.updateProjectionMatrix();
    this._materialArray = materials.getMaterialArray();
  }

  /**
   *
   * @param chunksWide {number}
   * @param begin {number}
   * @private
   */
  _reorientChunks(chunksWide, begin) {
    const chunks = this._chunks;
    const chunkCount = chunks.length;
    for (let i = begin; i < chunkCount; i++) {
      const mesh = chunks[i].getMesh();
      const x = i % chunksWide;
      const y = Math.floor(i / chunksWide);
      mesh.position.set(x * CHUNK_PIXEL_LENGTH, y * CHUNK_PIXEL_LENGTH, 0);
    }
  }

  /**
   *
   * @param width {number}
   * @param height {number}
   * @param parentScene {Scene}
   */
  windowResized(width, height, parentScene) {
    const chunksWide = Math.ceil(width / CHUNK_PIXEL_LENGTH) + 4;
    const chunksHigh = Math.ceil(height / CHUNK_PIXEL_LENGTH) + 4;
    const oldChunkCount = this._chunks.length;
    const newChunkCount = chunksWide * chunksHigh;

    this._chunksHigh = chunksHigh;
    this._chunksWide = chunksWide;

    if (oldChunkCount === newChunkCount) {
      return;
    }

    const difference = Math.abs(oldChunkCount - newChunkCount);

    console.time("windowResized()");

    if (oldChunkCount > newChunkCount) {
      // trash old chunks
      for (let i = newChunkCount; i < oldChunkCount; i++) {
        parentScene.remove(this._chunks[i].getMesh());
        this._chunks[i].dispose();
      }

      this._chunks.splice(newChunkCount, difference);
      this._reorientChunks(chunksWide, 0);

      // reorient new chunks
      console.timeEnd("windowResized()");
      console.log("Destroyed", difference, "chunks (", newChunkCount, ")");
      return;
    }

    for (let i = oldChunkCount; i < newChunkCount; i++) {
      const newChunk = new Chunk();
      this._chunks.push(newChunk);
      parentScene.add(newChunk.getMesh());
    }

    this._reorientChunks(chunksWide, oldChunkCount);

    console.timeEnd("windowResized()");
    console.log("Created", difference, "chunks (", newChunkCount, ")");
  }

  /**
   *
   * @param left {number} the X index of the start chunk
   * @param top {number} the Y index of the start chunk
   * @param map {Int16Array}
   * @param renderer {WebGLRenderer}
   */
  refreshChunks(left, top, map, renderer) {
    console.time("refreshChunks()");

    const chunksWide = this._chunksWide;
    const chunksHigh = this._chunksHigh;
    const textures = this._materialArray;
    const camera = this._camera;

    let idx = 0;
    for (let y = 0; y < chunksHigh; y++) {
      for (let x = 0; x < chunksWide; x++) {
        this._chunks[idx++]
          .update(x * CHUNK_TILE_LENGTH, y * CHUNK_TILE_LENGTH, map, textures)
          .render(renderer, camera);
      }
    }

    this._lastLeft = left;
    this._lastTop = top;

    renderer.setRenderTarget(null);

    console.timeEnd("refreshChunks()");
  }

  dispose() {
    this._chunks.forEach(chunk => chunk.dispose());
  }
}
