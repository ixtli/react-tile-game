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
   * @type {{top: number, left: number}}
   * @private
   */
  _topLeftChunkCoordinate = { top: -1, left: -1 };

  /**
   *
   * @type {SpriteMaterial[]}
   * @private
   */
  _materialArray = null;

  /**
   *
   * @type {{width: number, height: number}}
   * @private
   */
  _sceneDimensions = { width: 0, height: 0 };

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
   * @param begin {number}
   * @private
   */
  _reorientChunks(begin) {
    const chunksWide = this.chunksWide();
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
    this._sceneDimensions.width = chunksHigh * CHUNK_PIXEL_LENGTH;
    this._sceneDimensions.height = chunksWide * CHUNK_PIXEL_LENGTH;

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
      this._reorientChunks(0);

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

    this._reorientChunks(oldChunkCount);

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

    this._topLeftChunkCoordinate.left = left;
    this._topLeftChunkCoordinate.top = top;

    renderer.setRenderTarget(null);

    console.timeEnd(`refreshChunks(${left}, ${top})`);
  }

  /**
   *
   * @param map {Int16Array}
   * @param renderer {WebGLRenderer}
   */
  panUp(map, renderer) {
    const chunksWide = this.chunksWide();
    const chunksHigh = this.chunksHigh();
    const materials = this._materialArray;
    const camera = this._camera;
    const newTop = this._topLeftChunkCoordinate.top - 1;
    const left = this._topLeftChunkCoordinate.left;

    // select the last row
    const start = chunksWide * (chunksHigh - 1);
    const temp = this._chunks.splice(start, chunksWide);

    // recycle it into the beginning of the chunk array
    console.time("panUp()");
    for (let x = chunksWide - 1; x >= 0; x--) {
      const updated = temp[x]
        .update(left + x, newTop, map, materials)
        .render(renderer, camera)
        .setChunkLocation(x, 0);
      this._chunks.unshift(updated);
    }

    renderer.setRenderTarget(null);
    this._topLeftChunkCoordinate.top = newTop;
    this._reorientChunks(chunksWide);

    console.timeEnd("panUp()");
  }

  /**
   *
   * @param map {Int16Array}
   * @param renderer {WebGLRenderer}
   */
  panRight(map, renderer) {
    const chunksWide = this.chunksWide();
    const chunksHigh = this.chunksHigh();
    const materials = this._materialArray;
    const camera = this._camera;
    const top = this._topLeftChunkCoordinate.top;
    const newLeft = this._topLeftChunkCoordinate.left + 1;

    const chunks = this._chunks;
    const right = newLeft + chunksWide;

    // recycle it into the beginning of the chunk array
    console.time("panRight()");
    for (let y = 0; y < chunksHigh; y++) {
      const temp = chunks[y * chunksWide]
        .update(right, top + y, map, materials)
        .render(renderer, camera);

      chunks.splice(y * chunksWide, 1);
      chunks.splice(y * chunksWide - 1, 0, temp);
    }

    renderer.setRenderTarget(null);
    this._topLeftChunkCoordinate.left = newLeft;
    this._reorientChunks(0);

    console.timeEnd("panRight()");
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

  sceneDimensions() {
    return this._sceneDimensions;
  }
}
