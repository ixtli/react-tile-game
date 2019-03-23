import * as THREE from "three";
import { TILE_PIXEL_LENGTH } from "../config";
import { newOffscreenCanvas } from "../util/compatability";

export class TileMaterialManager {
  static MAX_TEXTURE_COUNT = 65535;

  /**
   *
   * @type {SpriteMaterial[]}
   * @private
   */
  _material = new Array(TileMaterialManager.MAX_TEXTURE_COUNT);

  _currentArrayPosition = 0;

  /**
   *
   * @type {Set<SpriteMaterial>}
   * @private
   */
  _materialSet = new Set();

  /**
   *
   * @param canvas {HTMLCanvasElement}
   * @private
   */
  newCanvasTexture(canvas) {
    var map = new THREE.CanvasTexture(
      canvas,
      THREE.UVMapping,
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.NearestFilter,
      THREE.NearestFilter,
      THREE.RGBFormat,
      THREE.UnsignedByteType,
      1
    );

    map.generateMipmaps = false;

    var material = new THREE.SpriteMaterial({ map });

    this._material[this._currentArrayPosition++] = material;
    this._materialSet.add(material);

    return material;
  }

  /**
   *
   * @param r {number}
   * @param g {number}
   * @param b {number}
   * @return {SpriteMaterial}
   */
  newTileForColor(r, g, b) {
    const canvas = newOffscreenCanvas(TILE_PIXEL_LENGTH, TILE_PIXEL_LENGTH);
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, TILE_PIXEL_LENGTH, TILE_PIXEL_LENGTH);
    return this.newCanvasTexture(canvas);
  }

  /**
   *
   * @param lightness {number}
   * @return {SpriteMaterial}
   */
  greenTile(lightness) {
    return this.newTileForColor(0, 100 + Math.floor(150 * lightness), 0);
  }

  /**
   *
   * @return {SpriteMaterial[]}
   */
  getMaterialArray() {
    return this._material;
  }

  /**
   *
   * @return {number}
   */
  size() {
    return this._materialSet.size;
  }

  dispose() {
    this._materialSet.forEach(material => material.map.dispose());
    this._materialSet = null;
    this._material = null;
  }
}
