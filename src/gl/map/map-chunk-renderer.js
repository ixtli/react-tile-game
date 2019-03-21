import Chunk from "./map-chunk";
import * as THREE from "three";
import {
  CHUNK_PIXEL_LENGTH,
  CHUNK_TILE_LENGTH,
  TILE_PIXEL_LENGTH
} from "../../config";

/**
 *
 * @param width {number}
 * @param height {number}
 * @return {HTMLElement | OffscreenCanvas}
 */
function getOffscreenCanvas(width, height) {
  if (window.hasOwnProperty("OffscreenCanvas")) {
    return new window.OffscreenCanvas(width, height);
  } else {
    return document.createElement("canvas");
  }
}

export default class ChunkRenderer {
  constructor() {
    /**
     *
     * @type {OrthographicCamera}
     * @private
     */
    this._camera = new THREE.OrthographicCamera(
      0,
      CHUNK_PIXEL_LENGTH,
      CHUNK_PIXEL_LENGTH,
      0,
      0,
      10
    );
    this._camera.position.z = 1;
    this._camera.position.x = 0;
    this._camera.position.y = 0;
    this._camera.updateProjectionMatrix();

    /**
     *
     * @type {SpriteMaterial[]}
     * @private
     */
    this._materials = [
      ChunkRenderer._greenTile(0.1),
      ChunkRenderer._greenTile(0.2),
      ChunkRenderer._greenTile(0.3),
      ChunkRenderer._greenTile(0.4),
      ChunkRenderer._greenTile(0.5),
      ChunkRenderer._greenTile(0.6),
      ChunkRenderer._greenTile(0.7)
    ];

    /**
     *
     * @type {Chunk[]}
     * @private
     */
    this._chunks = [];

    /**
     *
     * @type {number}
     * @private
     */
    this._chunksWide = 0;

    /**
     *
     * @type {number}
     * @private
     */
    this._chunksHigh = 0;

    /**
     *
     * @type {number}
     * @private
     */
    this._lastLeft = -1;

    /**
     *
     * @type {number}
     * @private
     */
    this._lastTop = -1;
  }

  /**
   *
   * @param width {number}
   * @param height {number}
   * @param parentScene {Scene}
   */
  windowResized(width, height, parentScene) {
    const chunksWide = Math.ceil(width / CHUNK_PIXEL_LENGTH) + 2;
    const chunksHigh = Math.ceil(height / CHUNK_PIXEL_LENGTH) + 2;
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
      for (let i = newChunkCount; i < oldChunkCount; i++) {
        parentScene.remove(this._chunks[i].getSprite());
        this._chunks[i].dispose();
      }
      this._chunks.splice(newChunkCount, difference);
      console.timeEnd("windowResized()");
      console.log("Destroyed", difference, "chunks (", newChunkCount, ")");
      return;
    }

    for (let i = oldChunkCount; i < newChunkCount; i++) {
      const newChunk = new Chunk();
      this._chunks.push(newChunk);
      parentScene.add(newChunk.getSprite());
    }

    console.timeEnd("windowResized()");
    console.log("Created", difference, "chunks (", newChunkCount, ")");
  }

  materialsCount() {
    return this._materials.length;
  }

  /**
   *
   * @param r {number}
   * @param g {number}
   * @param b {number}
   * @return {SpriteMaterial}
   */
  static generateTileMaterial(r, g, b) {
    const canvas = getOffscreenCanvas(TILE_PIXEL_LENGTH, TILE_PIXEL_LENGTH);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, TILE_PIXEL_LENGTH, TILE_PIXEL_LENGTH);
    var map = new THREE.CanvasTexture(canvas);
    return new THREE.SpriteMaterial({ map });
  }

  static _greenTile(lightness) {
    return ChunkRenderer.generateTileMaterial(
      0,
      100 + Math.floor(150 * lightness),
      0
    );
  }

  /**
   *
   * @param renderer {WebGLRenderer}
   * @param left {number} the X index of the start chunk
   * @param top {number} the Y index of the start chunk
   * @param map
   */
  refreshChunks(renderer, left, top, map) {
    console.time("refreshChunks()");

    const chunksWide = this._chunksWide;
    const chunksHigh = this._chunksHigh;
    const materials = this._materials;
    const camera = this._camera;

    let idx = 0;
    for (let y = 0; y < chunksHigh; y++) {
      for (let x = 0; x < chunksWide; x++) {
        const sprite = this._chunks[idx++]
          .update(x * CHUNK_TILE_LENGTH, y * CHUNK_TILE_LENGTH, map, materials)
          .render(renderer, camera)
          .getSprite();

        sprite.position.set(x * CHUNK_PIXEL_LENGTH, y * CHUNK_PIXEL_LENGTH, 1);
      }
    }

    renderer.setRenderTarget(null);
    this._lastLeft = left;
    this._lastTop = top;

    console.timeEnd("refreshChunks()");
  }
}
