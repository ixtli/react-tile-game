import * as THREE from "three";

export default class MapLight {
  /**
   *
   * @type {number}
   */
  static LIGHT_Z = 1;

  /**
   *
   * @type {number}
   */
  static MAX_ACTIVE_SHADOW_CASTING_LIGHTS = 10;

  /**
   *
   * @type {number}
   */
  static currentShadowCastingLightCount = 0;

  /**
   *
   * @type {Color}
   */
  static REVEAL_COLOR = new THREE.Color();

  /**
   *
   * @type {Light}
   * @private
   */
  _light = null;

  /**
   *
   * @type {boolean}
   * @private
   */
  _tint = false;

  /**
   *
   * @type {boolean}
   * @private
   */
  _reveal = true;

  /**
   *
   * @type {Color}
   * @private
   */
  _color = new THREE.Color();

  /**
   *
   * @type {number}
   * @private
   */
  _intensity = 0;

  /**
   *
   * @type {number}
   * @private
   */
  _worldX = 0;

  /**
   *
   * @type {number}
   * @private
   */
  _worldY = 0;

  /**
   *
   * @type {boolean}
   * @private
   */
  _shouldCastShadow = false;

  /**
   *
   * @param color {string|number=} [color=0x000000]
   * @param intensity {number=} [intensity=1]
   * @param distance {number=} [distance=0]
   * @constructor
   */
  static NewPoint(color, intensity, distance) {
    const light = new THREE.PointLight(
      color || new THREE.Color(),
      intensity,
      distance
    );
    light.position.set(0, 0, this.LIGHT_Z);
    return new MapLight(light);
  }

  constructor(light) {
    this._intensity = light.intensity;
    this._color = light.color;
    this._light = light;
  }

  /**
   *
   * @param shouldCastShadow {?boolean} Whether or not it should cast a shadow
   * @return {boolean|MapLight}
   */
  shadow(shouldCastShadow) {
    if (shouldCastShadow === undefined) {
      return this._shouldCastShadow;
    }

    if (shouldCastShadow === this._shouldCastShadow) {
      return this;
    }

    if (!shouldCastShadow) {
      this._light.castShadow = false;
      this._shouldCastShadow = false;
      console.assert(MapLight.currentShadowCastingLightCount > 0);
      MapLight.currentShadowCastingLightCount--;
      return this;
    }

    if (
      MapLight.currentShadowCastingLightCount >=
      MapLight.MAX_ACTIVE_SHADOW_CASTING_LIGHTS
    ) {
      console.error("Too many active shadow-casting lights. Skipping.");
      return this;
    }

    MapLight.currentShadowCastingLightCount++;

    this._shouldCastShadow = true;
    this._light.castShadow = true;
    this._light.shadow.mapSize.x = 64;
    this._light.shadow.mapSize.y = 64;
    return this;
  }

  /**
   *
   * @param shouldTint {?boolean}
   * @return {boolean|MapLight}
   */
  tint(shouldTint) {
    if (shouldTint !== undefined) {
      this._tint = !!shouldTint;
      return this;
    }

    return this._tint;
  }

  /**
   *
   * @param shouldReveal {?boolean}
   * @return {boolean|MapLight}
   */
  reveal(shouldReveal) {
    if (shouldReveal !== undefined) {
      this._reveal = !!shouldReveal;
      return this;
    }

    return this._reveal;
  }

  /**
   *
   * @return {Light}
   */
  light() {
    return this._light;
  }

  /**
   *
   * @param x {number=} [x]
   * @param y {number=} [y]
   * @return {MapLight|{x: number, y: number, z: number}}
   */
  position(x, y) {
    if (x === undefined || y === undefined) {
      return this._light.position;
    }

    this._light.position.x = x;
    this._light.position.y = y;
    return this;
  }

  /**
   *
   * @param newValue {number}
   * @return {number|MapLight}
   */
  intensity(newValue) {
    if (newValue !== undefined) {
      this._light.intensity = this._intensity = newValue;
      return this;
    }

    return this._light.intensity;
  }

  /**
   *
   * @param newColor {?Color}
   * @return {Color|MapLight}
   */
  color(newColor) {
    if (newColor !== undefined) {
      this._light.color = this._color = newColor;
      return this;
    }

    return this._color;
  }

  /**
   *
   * @return {MapLight}
   */
  hide() {
    this._light.intensity = 0;
    return this;
  }

  /**
   *
   * @return {MapLight}
   */
  show() {
    this._light.intensity = this._intensity;
    return this;
  }

  /**
   *
   * @param on {boolean} True if we're going into tint mode
   */
  tintMode(on) {
    if (on) {
      // We hide if we're not meant to tint
      if (this._tint) {
        this._light.color = this._color;
        this.show();
      } else {
        this.hide();
      }
    } else {
      if (this._reveal) {
        this._light.color = MapLight.REVEAL_COLOR;
        this.show();
      } else {
        this.hide();
      }
    }
  }
}
