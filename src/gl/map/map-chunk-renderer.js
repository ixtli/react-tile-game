import Chunk from "./map-chunk";
import * as THREE from "three";
import {
  CHUNK_PIXEL_LENGTH,
  MAP_CHUNKS_HIGH,
  MAP_CHUNKS_WIDE,
  PRE_RENDER_CHUNKS
} from "../../config";

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
   * @type {Int16Array}
   * @private
   */
  _map = null;

  /**
   *
   * @type {{width: number, height: number}}
   * @private
   */
  _sceneDimensions = { width: 0, height: 0 };

  /**
   *
   * @param map {Int16Array}
   * @param materials {TileMaterialManager}
   */
  constructor(map, materials) {
    this._camera.position.z = 1;
    this._camera.position.x = 0;
    this._camera.position.y = 0;
    this._camera.updateProjectionMatrix();
    this._materialArray = materials.getMaterialArray();
    this._map = map;
  }

  reorientChunks() {
    const chunksWide = this.chunksWide();
    const chunks = this._chunks;
    const chunkCount = chunks.length;
    const sceneHeight = this._sceneDimensions.height;
    const materials = this._materialArray;
    const map = this._map;
    for (let i = 0; i < chunkCount; i++) {
      const x = i % chunksWide;
      const y = Math.floor(i / chunksWide);
      chunks[i].update(map, materials).setSceneLocation(x, y, sceneHeight);
    }
  }

  /**
   *
   * @param width {number}
   * @param height {number}
   * @param parentScene {Scene}
   */
  resize(width, height, parentScene) {
    // Calculate the width and height of the scene in chunks
    const chunksWide =
      Math.ceil(width / CHUNK_PIXEL_LENGTH) + PRE_RENDER_CHUNKS * 2;
    const chunksHigh =
      Math.ceil(height / CHUNK_PIXEL_LENGTH) + PRE_RENDER_CHUNKS * 2;

    const oldChunkCount = this._chunks.length;
    const newChunkCount = chunksWide * chunksHigh;

    // Save dimension info.
    this._chunksHigh = chunksHigh;
    this._chunksWide = chunksWide;
    this._sceneDimensions.width = chunksWide * CHUNK_PIXEL_LENGTH;
    this._sceneDimensions.height = chunksHigh * CHUNK_PIXEL_LENGTH;

    if (oldChunkCount !== newChunkCount) {
      const difference = Math.abs(oldChunkCount - newChunkCount);

      // Are we destroying chunks?
      if (oldChunkCount > newChunkCount) {
        // If so clean up
        this._chunks.splice(newChunkCount, difference).forEach(chunk => {
          // Chunks don't know about their parent so this is our responsibility
          parentScene.remove(chunk.getMesh());

          // Call dispose on the chunk
          chunk.dispose();
        });

        console.log("Destroyed", difference, "chunks (", newChunkCount, ")");
      } else {
        // In this case we're adding chunks
        for (let i = oldChunkCount; i < newChunkCount; i++) {
          // Create a new one and add it to the scene and our list.
          const newChunk = new Chunk();
          this._chunks.push(newChunk);
          parentScene.add(newChunk.getMesh());
        }

        console.log("Created", difference, "chunks (", newChunkCount, ")");
      }
    }

    // No matter what we want to update all chunks because they could be in any
    // order. There is, theoretically, an optimization here to only update the
    // chunks that have moved out of order because it isn't the case that they
    // have all changed location, depending on how the size has changed.
    const { left, top } = this._topLeftChunkCoordinate;
    this.setLeftTop(left, top);
  }

  /**
   *
   * @param left {number} the X index of the start chunk
   * @param top {number} the Y index of the start chunk
   */
  setLeftTop(left, top) {
    const chunksWide = this.chunksWide();
    const chunksHigh = this.chunksHigh();
    const total = chunksWide * chunksHigh;
    const timer = `setLeftTop(${left}, ${top}) : ${total}`;
    console.time(timer);

    let idx = 0;
    for (let y = top; y < top + chunksHigh; y++) {
      for (let x = left; x < left + chunksWide; x++) {
        this._chunks[idx++].setChunkCoordinates(x, y);
      }
    }

    this._topLeftChunkCoordinate.left = left;
    this._topLeftChunkCoordinate.top = top;
    this.reorientChunks();

    console.timeEnd(timer);
  }

  /**
   *
   * @returns {boolean} True if the pan happened
   */
  panUp() {
    const newTop = this._topLeftChunkCoordinate.top - 1;

    if (newTop < 0) {
      return false;
    }

    const chunksWide = this.chunksWide();
    const chunksHigh = this.chunksHigh();
    const left = this._topLeftChunkCoordinate.left;

    const start = chunksWide * (chunksHigh - 1);

    // select the last row
    const temp = this._chunks.splice(start, chunksWide);
    for (let x = 0; x < chunksWide; x++) {
      temp[x].setChunkCoordinates(left + x, newTop);
    }

    this._chunks = temp.concat(this._chunks);
    this._topLeftChunkCoordinate.top = newTop;

    return true;
  }

  /**
   *
   * @returns {boolean} True if the pan happened
   */
  panDown() {
    const newTop = this._topLeftChunkCoordinate.top + 1;

    if (newTop + this.chunksHigh() >= MAP_CHUNKS_HIGH) {
      return false;
    }

    const chunksWide = this.chunksWide();
    const left = this._topLeftChunkCoordinate.left;

    // Select the first row
    const temp = this._chunks.splice(0, chunksWide);
    const bottom = newTop + this.chunksHigh() - 1;
    for (let x = 0; x < chunksWide; x++) {
      temp[x].setChunkCoordinates(left + x, bottom);
    }

    this._chunks = this._chunks.concat(temp);
    this._topLeftChunkCoordinate.top = newTop;

    return true;
  }

  /**
   *
   * @returns {boolean} True if the pan happened
   */
  panRight() {
    const chunksWide = this.chunksWide();
    const newLeft = this._topLeftChunkCoordinate.left + 1;

    if (chunksWide + newLeft >= MAP_CHUNKS_WIDE) {
      return false;
    }

    const chunksHigh = this.chunksHigh();
    const top = this._topLeftChunkCoordinate.top;
    const chunks = this._chunks;
    const right = newLeft + chunksWide - 1;

    for (let y = 0; y < chunksHigh; y++) {
      const idx = y * chunksWide;
      const temp = chunks[idx].setChunkCoordinates(right, top + y);

      chunks.splice(idx, 1);
      chunks.splice(idx + (chunksWide - 1), 0, temp);
    }

    this._topLeftChunkCoordinate.left = newLeft;

    return true;
  }

  /**
   *
   * @returns {boolean} True if the pan happened
   */
  panLeft() {
    const newLeft = this._topLeftChunkCoordinate.left - 1;

    if (newLeft < 0) {
      return false;
    }

    const chunksWide = this.chunksWide();
    const chunksHigh = this.chunksHigh();
    const top = this._topLeftChunkCoordinate.top;

    const chunks = this._chunks;

    for (let y = 0; y < chunksHigh; y++) {
      const idx = y * chunksWide + (chunksWide - 1);
      const temp = chunks[idx].setChunkCoordinates(newLeft, top + y);

      chunks.splice(idx, 1);
      chunks.splice(y * chunksWide, 0, temp);
    }

    this._topLeftChunkCoordinate.left = newLeft;

    return true;
  }

  /**
   *
   * @param renderer {WebGLRenderer}
   */
  update(renderer) {
    const start = performance.now();
    const chunks = this._chunks;
    const chunkCount = chunks.length;
    const camera = this._camera;
    let updateCount = 0;
    for (let i = 0; i < chunkCount; i++) {
      if (chunks[i].render(renderer, camera)) {
        updateCount++;
      }
    }

    if (updateCount) {
      const end = performance.now();
      console.log("Updated", updateCount, "chunks in", end - start, "ms");
    }
  }

  dispose() {
    this._chunks.forEach(chunk => chunk.dispose());
    this._chunks = null;
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

  top() {
    return this._topLeftChunkCoordinate.top;
  }

  left() {
    return this._topLeftChunkCoordinate.left;
  }
}
