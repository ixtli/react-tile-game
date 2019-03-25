import Chunk from "./map-chunk";
import * as THREE from "three";
import { CHUNK_PIXEL_LENGTH, PRE_RENDER_CHUNKS } from "../../config";

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
  _materialArray = null;

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
      const x = i % chunksWide;
      const y = Math.floor(i / chunksWide);
      chunks[i].setChunkLocation(x, y);
    }
  }

  /**
   *
   * @param width {number}
   * @param height {number}
   * @param parentScene {Scene}
   */
  windowResized(width, height, parentScene) {
    const chunksWide =
      Math.ceil(width / CHUNK_PIXEL_LENGTH) + PRE_RENDER_CHUNKS * 2;
    const chunksHigh =
      Math.ceil(height / CHUNK_PIXEL_LENGTH) + PRE_RENDER_CHUNKS * 2;
    const oldChunkCount = this._chunks.length;
    const newChunkCount = chunksWide * chunksHigh;

    this._chunksHigh = chunksHigh;
    this._chunksWide = chunksWide;

    if (oldChunkCount === newChunkCount) {
      return;
    }

    const difference = Math.abs(oldChunkCount - newChunkCount);

    console.time(`windowResized()`);

    if (oldChunkCount > newChunkCount) {
      // trash old chunks
      for (let i = newChunkCount; i < oldChunkCount; i++) {
        parentScene.remove(this._chunks[i].getMesh());
        this._chunks[i].dispose();
      }

      this._chunks.splice(newChunkCount, Math.abs(difference));
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
    console.time(`refreshChunks(${left}, ${top})`);

    const chunksWide = this.chunksWide();
    const chunksHigh = this.chunksHigh();
    const materials = this._materialArray;
    const camera = this._camera;

    let idx = 0;
    for (let y = top; y < top + chunksHigh; y++) {
      for (let x = left; x < left + chunksWide; x++) {
        this._chunks[idx++]
          .update(x, y, map, materials)
          .render(renderer, camera);
      }
    }

    this._lastLeft = left;
    this._lastTop = top;

    renderer.setRenderTarget(null);

    console.timeEnd(`refreshChunks(${left}, ${top})`);
  }

  dispose() {
    this._chunks.forEach(chunk => chunk.dispose());
  }

  chunksWide() {
    return this._chunksWide;
  }

  chunksHigh() {
    return this._chunksHigh;
  }
}
