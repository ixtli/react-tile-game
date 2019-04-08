import * as THREE from "three";
import { TILE_PIXEL_LENGTH } from "../../config";

export default class MapLighting {
  static RENDER_TARGET_OPTIONS = {
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
    antialias: false
  };

  /**
   *
   * @type {PlaneBufferGeometry}
   * @private
   */
  _geom = null;

  /**
   *
   * @type {WebGLRenderTarget}
   * @private
   */
  _target = null;

  /**
   *
   * @type {Mesh}
   * @private
   */
  _mesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(1, 1),
    new THREE.MeshPhongMaterial({ shininess: 0, flatShading: true })
  );

  /**
   *
   * @type {Scene}
   * @private
   */
  _scene = new THREE.Scene();

  /**
   *
   * @type {OrthographicCamera}
   * @private
   */
  _camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 10);

  /**
   *
   * @type {boolean}
   * @private
   */
  _dirty = false;

  /**
   *
   * @type {AmbientLight}
   * @private
   */
  _ambientLight = new THREE.AmbientLight("white", 0.75);

  /**
   *
   * @type {Mesh}
   * @private
   */
  _sceneObject = new THREE.Mesh();

  constructor() {
    this._mesh.position.set(0, 0, 0);
    this._mesh.receiveShadow = true;
    this._mesh.castShadow = false;
    this._scene.add(this._mesh);

    this._camera.position.set(0, 0, 5);
    this._camera.lookAt(0, 0, 5);

    this._light = new THREE.PointLight("white", 0.75, 20);
    this._light.castShadow = true;
    this._scene.add(this._light);
    this._scene.add(this._ambientLight);

    const block = new THREE.BoxBufferGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: "blue" });
    const cube = new THREE.Mesh(block, mat);
    cube.castShadow = true;
    this._cube = cube;
    this._scene.add(cube);

    this._sceneObject.material = new THREE.MeshBasicMaterial({
      side: THREE.FrontSide,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneMinusDstAlphaFactor,
      blendDst: THREE.SrcColorFactor

    });

    this.resize(64, 64);
  }

  /**
   *
   * @param offset {number}
   */
  offsetAmbientLightIntensity(offset) {
    this._ambientLight.intensity += offset;
    this._dirty = true;
  }

  /**
   * Change the size of the shadow plane
   * @param width {number}
   * @param height {number}
   */
  resize(width, height) {
    const rWidth = Math.ceil(width / TILE_PIXEL_LENGTH);
    const rHeight = Math.ceil(height / TILE_PIXEL_LENGTH);

    if (this._target) {
      this._target.dispose();
    }

    this._target = new THREE.WebGLRenderTarget(
      rWidth,
      rHeight,
      MapLighting.RENDER_TARGET_OPTIONS
    );

    this._target.texture.generateMipmaps = false;

    this._mesh.geometry.dispose();
    this._mesh.geometry = new THREE.PlaneBufferGeometry(rWidth, rHeight);
    this._mesh.position.x = rWidth;
    this._mesh.position.y = rHeight;

    this._cube.position.set(rWidth - 2, rHeight - 2, 0);
    this._light.position.set(rWidth, rHeight, 15);

    this._camera.right = rWidth;
    this._camera.top = rHeight;
    this._camera.position.x = rWidth / 2;
    this._camera.position.y = rHeight / 2;
    this._camera.updateProjectionMatrix();

    this._sceneObject.geometry.dispose();
    this._sceneObject.geometry = new THREE.PlaneBufferGeometry(width, height);
    this._sceneObject.material.map = this._target.texture;
    this._sceneObject.position.set(width / 2, height / 2, 100);
    this._dirty = true;
  }

  lightPos(x, y) {
    this._light.position.set(x / TILE_PIXEL_LENGTH, y / TILE_PIXEL_LENGTH, 1);
    this._dirty = true;
  }

  /**
   *
   * @param renderer {WebGLRenderer}
   */
  render(renderer) {
    if (!this._dirty) {
      return;
    }

    renderer.setRenderTarget(this._target);
    renderer.shadowMap.enabled = true;
    renderer.render(this._scene, this._camera);
    renderer.shadowMap.enabled = false;
    this._dirty = false;
  }

  dispose() {
    this._geom.dispose();
    this._target.dispose();
    this._geom = null;
    this._target = null;
  }

  sceneObject() {
    return this._sceneObject;
  }
}
