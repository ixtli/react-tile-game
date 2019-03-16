import * as THREE from "three";

/**
 *
 * @type {TextureLoader}
 * @private
 */
var _textureLoader = new THREE.TextureLoader();

/**
 *
 * @param url {string}
 * @return {Promise<SpriteMaterial>}
 */
export function loadSpriteMaterial(url) {
  return new Promise((resolve, reject) => {
    _textureLoader.load(
      url,
      map => resolve(new THREE.SpriteMaterial({ map })),
      null,
      error => reject(error)
    );
  });
}

