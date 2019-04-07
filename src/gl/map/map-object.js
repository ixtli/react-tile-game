import * as THREE from "three";
import {
  HALF_TILE_PIXEL_LENGTH,
  MAP_PIXELS_HIGH,
  MAP_TILES_HIGH,
  MAP_TILES_WIDE,
  TILE_PIXEL_LENGTH
} from "../../config";

export default class MapObject {
  /**
   *
   * @type {PlaneBufferGeometry}
   */
  static SINGLE_TILE_GEOMETRY = new THREE.PlaneBufferGeometry(
    TILE_PIXEL_LENGTH,
    TILE_PIXEL_LENGTH
  );

  /**
   *
   * @type {{x: number, y: number}}
   * @private
   */
  _worldPosition = { x: -1, y: -1 };

  /**
   *
   * @type {Mesh}
   * @private
   */
  _mesh = new THREE.Mesh(MapObject.SINGLE_TILE_GEOMETRY);

  /**
   *
   * @param z {?number} The z position
   */
  constructor(z) {
    this._mesh.position.z = z && z > 2 ? z : 2;
  }

  /**
   *
   * @param newValue {?number}
   * @return {MapObject|number}
   */
  z(newValue) {
    if (!newValue || newValue < 2) {
      return this._mesh.position.z;
    }

    this._mesh.position.z = newValue;

    return this;
  }

  /**
   *
   * @param newTexture {Texture}
   * @return {MapObject|Texture}
   */
  texture(newTexture) {
    if (newTexture) {
      this.material().map = newTexture;
      return this;
    }

    return this.material().map;
  }

  /**
   *
   * @param newMaterial
   * @return {MapObject|Material}
   */
  material(newMaterial) {
    if (newMaterial) {
      this._mesh.material = newMaterial;
      return this;
    }

    return this._mesh.material;
  }

  /**
   *
   * @param x {number}
   * @param y {number}
   * @return {MapObject}
   */
  setWorldPosition(x, y) {
    console.assert(x >= 0 && x < MAP_TILES_WIDE);
    console.assert(y >= 0 && y < MAP_TILES_HIGH);
    this._worldPosition.x = x;
    this._worldPosition.y = y;
    this._mesh.position.x = x * TILE_PIXEL_LENGTH + HALF_TILE_PIXEL_LENGTH;
    this._mesh.position.y =
      MAP_PIXELS_HIGH - y * TILE_PIXEL_LENGTH - HALF_TILE_PIXEL_LENGTH;
    return this;
  }

  /**
   *
   * @return {{x: number, y: number}}
   */
  getWorldPosition() {
    return this._worldPosition;
  }

  /**
   *
   * @return {Mesh}
   */
  mesh() {
    return this._mesh;
  }

  worldMapArrayIndex() {
    return this._worldPosition.y * MAP_TILES_WIDE + this._worldPosition.x;
  }

  dispose() {
    if (this._mesh.geometry !== MapObject.SINGLE_TILE_GEOMETRY) {
      this._mesh.geometry.dispose();
    }
    this._mesh = null;
  }
}
