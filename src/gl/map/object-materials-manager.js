import * as THREE from "three";

export default class ObjectMaterialManager {
  static MAX_TEXTURE_COUNT = 16384;

  static OPTIONS = {
    side: THREE.FrontSide
  };

  /**
   *
   * @type {Set<Material>}
   * @private
   */
  _materialSet = new Set();

  addMaterial(newMaterial) {
    if (this._materialSet.has(newMaterial)) {
      return this;
    }

    console.assert(
      this._materialSet.size < ObjectMaterialManager.MAX_TEXTURE_COUNT
    );

    this._materialSet.add(newMaterial);

    return this;
  }

  newMaterial(options) {
    const mat = new THREE.MeshBasicMaterial({
      ...options,
      ...ObjectMaterialManager.OPTIONS
    });

    this.addMaterial(mat);

    return mat;
  }

  dispose() {
    this._materialSet.forEach(material => {
      if (material.hasOwnProperty("map") && material.map) {
        material.map.dispose();
      }
    });
    this._materialSet = null;
  }
}
