import Chunk from "./map-chunk";
import * as THREE from "three";
import { CHUNK_PIXEL_LENGTH, TILE_PIXEL_LENGTH } from "../../config";

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
      this._greenTile(0.1),
      this._greenTile(0.2),
      this._greenTile(0.3),
      this._greenTile(0.4),
      this._greenTile(0.5),
      this._greenTile(0.6),
      this._greenTile(0.7)
    ];

    /**
     *
     * @type {Chunk[]}
     * @private
     */
    this._chunks = [];
  }

  windowResized(width, height) {
    const chunksWide = Math.ceil(width / CHUNK_PIXEL_LENGTH) + 2;
    const chunksHigh = Math.ceil(height / CHUNK_PIXEL_LENGTH) + 2;
    const oldChunkCount = this._chunks.length;
    const newChunkCount = chunksWide * chunksHigh;

    if (oldChunkCount === newChunkCount) {
      return;
    }

    if (oldChunkCount > newChunkCount) {
      const difference = oldChunkCount - newChunkCount;
      for (let i = newChunkCount; i < oldChunkCount; i++) {
        this._chunks[i].dispose();
      }
      this._chunks.splice(newChunkCount, difference);
      console.log("Destroyed", difference, "chunks (", newChunkCount, ")");
      return;
    }

    for (let i = oldChunkCount; i < newChunkCount; i++) {
      const newChunk = new Chunk();
      this._chunks.push(newChunk);
    }
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
    const canvas = new OffscreenCanvas(TILE_PIXEL_LENGTH, TILE_PIXEL_LENGTH);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, TILE_PIXEL_LENGTH, TILE_PIXEL_LENGTH);
    var map = new THREE.CanvasTexture(canvas);
    return new THREE.SpriteMaterial({ map });
  }

  _greenTile(lightness) {
    return ChunkRenderer.generateTileMaterial(
      0,
      100 + Math.floor(150 * lightness),
      0
    );
  }

  /**
   *
   * @param renderer {WebGLRenderer}
   * @param leftStart {number}
   * @param topStart {number}
   * @param mapWidth {number}
   * @param map {Int8Array}
   * @returns {WebGLRenderTarget}
   */
  renderChunk(renderer, leftStart, topStart, mapWidth, map) {
    const idx = 0;
    const ret = this._textures[idx];
    ret.setSize(CHUNK_PIXEL_LENGTH, CHUNK_PIXEL_LENGTH);
    const scene = this._chunks[idx]
      .update(leftStart, topStart, mapWidth, map, this._materials)
      .scene();
    renderer.setRenderTarget(ret);
    renderer.render(scene, this._camera);
    renderer.setRenderTarget(null);
    return ret;
  }

  /**
   *
   * @param renderer {WebGLRenderer}
   * @param topLeft {number} The top left
   * @param topRight
   * @param mapWidth
   * @param map
   */
  refreshChunks(renderer, topLeft, topRight, mapWidth, map) {}
}
