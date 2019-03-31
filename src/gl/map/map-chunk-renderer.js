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
      chunks[i].setSceneLocation(x, y);
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
    const chunksWide = this.chunksWide();
    const chunksHigh = this.chunksHigh();
    const total = chunksWide * chunksHigh;
    const timer = `refreshChunks(${left}, ${top}) : ${total}`;
    console.time(timer);

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

    console.timeEnd(timer);
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

    const start = chunksWide * (chunksHigh - 1);

    console.time("panUp()");
    // select the last row
    const temp = this._chunks.splice(start, chunksWide);
    for (let x = 0; x < chunksWide; x++) {
      temp[x].update(left + x, newTop, map, materials).render(renderer, camera);
    }

    this._chunks = temp.concat(this._chunks);

    renderer.setRenderTarget(null);
    this._topLeftChunkCoordinate.top = newTop;
    this._reorientChunks(0);
    console.timeEnd("panUp()");
  }

  /**
   *
   * @param map {Int16Array}
   * @param renderer {WebGLRenderer}
   */
  panDown(map, renderer) {
    const chunksWide = this.chunksWide();
    const materials = this._materialArray;
    const camera = this._camera;
    const newTop = this._topLeftChunkCoordinate.top + 1;
    const left = this._topLeftChunkCoordinate.left;

    console.time("panDown()");

    // Select the first row
    const temp = this._chunks.splice(0, chunksWide);
    for (let x = 0; x < chunksWide; x++) {
      temp[x].update(left + x, newTop, map, materials).render(renderer, camera);
    }

    this._chunks = this._chunks.concat(temp);

    renderer.setRenderTarget(null);
    this._topLeftChunkCoordinate.top = newTop;
    this._reorientChunks(0);
    console.timeEnd("panDown()");
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
    const right = newLeft + chunksWide - 1;

    console.time("panRight()");
    for (let y = 0; y < chunksHigh; y++) {
      const idx = y * chunksWide;
      const temp = chunks[idx]
        .update(right, top + y, map, materials)
        .render(renderer, camera);

      chunks.splice(idx, 1);
      chunks.splice(idx + (chunksWide - 1), 0, temp);
    }

    renderer.setRenderTarget(null);
    this._topLeftChunkCoordinate.left = newLeft;
    this._reorientChunks(0);

    console.timeEnd("panRight()");
  }

  /**
   *
   * @param map {Int16Array}
   * @param renderer {WebGLRenderer}
   */
  panLeft(map, renderer) {
    const chunksWide = this.chunksWide();
    const chunksHigh = this.chunksHigh();
    const materials = this._materialArray;
    const camera = this._camera;
    const top = this._topLeftChunkCoordinate.top;
    const newLeft = this._topLeftChunkCoordinate.left - 1;

    const chunks = this._chunks;

    console.time("panLeft()");
    for (let y = 0; y < chunksHigh; y++) {
      const idx = y * chunksWide + (chunksWide - 1);
      const temp = chunks[idx]
        .update(newLeft, top + y, map, materials)
        .render(renderer, camera);

      chunks.splice(idx, 1);
      chunks.splice(y * chunksWide, 0, temp);
    }

    renderer.setRenderTarget(null);
    this._topLeftChunkCoordinate.left = newLeft;
    this._reorientChunks(0);

    console.timeEnd("panLeft()");
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
