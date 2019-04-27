import * as THREE from "three";
import { TILE_PIXEL_LENGTH } from "../../config";
import MapLight from "./map-light";

export default class MapLighting {
  static SHADOW_TARGET_OPTIONS = {
    magFilter: THREE.NearestFilter,
    format: THREE.RGBFormat,
    stencilBuffer: false,
    depthBuffer: false,
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
   * @type {WebGLRenderTarget}
   * @private
   */
  _colorTarget = null;

  /**
   *
   * @type {Mesh}
   * @private
   */
  _mesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(1, 1),
    new THREE.MeshPhongMaterial({
      shininess: 0,
      flatShading: true,
      specular: 0,
      reflectivity: 0,
      color: "white"
    })
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
  _ambientLight = new THREE.AmbientLight("white", 0.0);

  /**
   *
   * @type {Mesh}
   * @private
   */
  _object = new THREE.Mesh();

  /**
   *
   * @type {Mesh}
   * @private
   */
  _colorObject = new THREE.Mesh();

  /**
   *
   * @type {MapLight[]}
   * @private
   */
  _lights = [];

  /**
   *
   * @type {number}
   * @private
   */
  _width = 0;

  /**
   *
   * @type {number}
   * @private
   */
  _height = 0;

  static _defaultVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
  `;

  static _customFragShader = `
uniform sampler2D inct;
varying vec2 vUv;

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

void main() {
  vec4 original = texture2D(inct, vUv);
  vec3 hsv = rgb2hsv(original.rgb);
  gl_FragColor.a = max(0.0, (1.0 - hsv.z));
}`;

  /**
   *
   * @param width
   * @param height
   * @return {Mesh}
   * @private
   */
  static _generateWall(width, height) {
    const block = new THREE.BoxBufferGeometry(width, height, 10);
    const mat = new THREE.MeshBasicMaterial({ color: "blue" });
    const cube = new THREE.Mesh(block, mat);
    cube.castShadow = true;
    cube.receiveShadow = false;
    return cube;
  }

  /**
   *
   * @param light {MapLight}
   * @return {MapLight}
   */
  addLight(light) {
    this._lights.push(light);
    this._scene.add(light.light());
    return light;
  }

  makeTestLights() {
    if (window.TESTLIGHTS) {
      return;
    }

    console.log("adding test lights");

    window.TESTLIGHTS = true;

    this.addLight(MapLight.NewPoint("white", 5, 0).tint(false));
    this.addLight(MapLight.NewPoint("red", 1, 0).tint(true));
    this.addLight(MapLight.NewPoint("purple", 1, 0).tint(true));
  }

  constructor() {
    this._mesh.position.set(0, 0, 0);
    this._mesh.receiveShadow = true;
    this._mesh.castShadow = false;
    this._scene.add(this._mesh);

    this._camera.position.set(0, 0, 5);

    this._scene.add(this._ambientLight);

    this._cube = MapLighting._generateWall(10, 1);
    this._scene.add(this._cube);

    /**
     *
     * @type {ShaderMaterial}
     */
    this._object.material = new THREE.ShaderMaterial({
      vertexShader: MapLighting._defaultVertexShader,
      fragmentShader: MapLighting._customFragShader,
      uniforms: { inct: { value: null } },
      transparent: true
    });

    this._colorObject.material = new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.75
    });
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
      this._colorTarget.dispose();
    }

    this._target = new THREE.WebGLRenderTarget(
      rWidth,
      rHeight,
      MapLighting.SHADOW_TARGET_OPTIONS
    );

    this._colorTarget = new THREE.WebGLRenderTarget(
      rWidth,
      rHeight,
      MapLighting.SHADOW_TARGET_OPTIONS
    );

    this.makeTestLights();

    this._object.material.uniforms = {
      inct: { value: this._target.texture }
    };

    this._colorObject.material.map = this._colorTarget.texture;

    console.log("Shadow render target: ", rWidth, "x", rHeight);

    this._target.texture.generateMipmaps = false;
    this._colorTarget.texture.generateMipmaps = false;

    this._mesh.geometry.dispose();
    this._mesh.geometry = new THREE.PlaneBufferGeometry(rWidth, rHeight);
    this._mesh.position.x = rWidth;
    this._mesh.position.y = rHeight;

    this._cube.position.set(rWidth - 2, rHeight - 2, 0);

    this._lights.forEach((light, i) =>
      light.position(rWidth + (i - 1) * 5, rHeight + (i - 1) * 5)
    );

    this._camera.right = rWidth;
    this._camera.top = rHeight;
    this._camera.position.x = rWidth / 2;
    this._camera.position.y = rHeight / 2;
    this._camera.updateProjectionMatrix();

    this._object.geometry.dispose();
    this._object.geometry = new THREE.PlaneBufferGeometry(width, height);
    this._object.position.set(width / 2, height / 2, 100);

    this._colorObject.geometry = this._object.geometry;
    this._colorObject.position.set(width / 2, height / 2, 99);

    this._dirty = true;
  }

  lightPos(x, y) {
    const fx = x / TILE_PIXEL_LENGTH;
    const fy = y / TILE_PIXEL_LENGTH;
    for (let i = 0; i < this._lights.length; i++) {
      this._lights[i].position(fx + (i - 1) * 5, fy + (i - 1) * 5);
    }
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

    // Reveal and shadow pass
    this._lights.forEach(light => light.tintMode(false));
    this._ambientLight.visible = true;

    renderer.setRenderTarget(this._target);
    renderer.shadowMap.enabled = true;
    renderer.render(this._scene, this._camera);
    renderer.shadowMap.enabled = false;

    // Tint pass
    this._lights.forEach(light => light.tintMode(true));
    this._ambientLight.visible = false;

    renderer.setRenderTarget(this._colorTarget);
    renderer.render(this._scene, this._camera);

    this._dirty = false;
  }

  dispose() {
    this._geom.dispose();
    this._target.dispose();
    this._geom = null;
    this._target = null;
    this._dirty = false;
  }

  shadowObject() {
    return this._object;
  }

  colorObject() {
    return this._colorObject;
  }
}
