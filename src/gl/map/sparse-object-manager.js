import {
  CHUNK_PIXEL_LENGTH,
  MAP_PIXELS_HIGH,
  MAP_TILES_HIGH,
  MAP_TILES_WIDE
} from "../../config";
import * as THREE from "three";

export class SparseObjectManager {
  /**
   *
   * @type {Array.<MapObject>}
   * @private
   */
  _array = null;

  /**
   *
   * @type {Set<MapObject>}
   * @private
   */
  _set = new Set();

  /**
   *
   * @type {Group}
   * @private
   */
  _group = new THREE.Group();

  constructor() {
    this._array = new Array(MAP_TILES_WIDE * MAP_TILES_HIGH);
    this._group.position.set(0, 0, 2);
  }

  /**
   *
   * @return {Group}
   */
  group() {
    return this._group;
  }

  /**
   *
   * @param mapObject {MapObject}
   */
  add(mapObject) {
    this._set.add(mapObject);
    this._group.add(mapObject.mesh());
  }

  /**
   *
   * @param mapObject {MapObject}
   * @return {boolean} true if the object was removed
   */
  remove(mapObject) {
    if (this._set.delete(mapObject)) {
      this._array[mapObject.worldMapArrayIndex()] = undefined;
      this._group.remove(mapObject.mesh());
      mapObject.dispose();
      return true;
    }

    return false;
  }

  /**
   * @param {ChunkRenderer} chunkRenderer
   * @return {SparseObjectManager}
   */
  offsetForChunkRenderer(chunkRenderer) {
    const xOffset = -chunkRenderer.left() * CHUNK_PIXEL_LENGTH;

    const bottom =
      chunkRenderer.top() * CHUNK_PIXEL_LENGTH +
      chunkRenderer.sceneDimensions().height;

    const yOffset = MAP_PIXELS_HIGH - bottom;

    this._group.position.x = xOffset;
    this._group.position.y = -yOffset;

    return this;
  }

  /**
   *
   * @param newValue {?number}
   * @return {SparseObjectManager|number}
   */
  z(newValue) {
    if (!newValue || newValue < 2) {
      return this._group.position.z;
    }

    if (newValue === this._group.position.z) {
      return this;
    }

    this._set.forEach(obj => obj.z(newValue));
    this._group.position.z = newValue;

    return this;
  }

  dispose() {
    this._set.forEach(obj => this.remove(obj));
    this._set = null;
    this._array = null;
  }
}
