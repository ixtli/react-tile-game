import Stats from "stats-js";

/**
 * @type {{begin: function(), end: function(), showPanel: function(number):
 *   void, dom: HTMLElement}}
 */
export const stats = new Stats();

export function show() {
  stats.showPanel(0);
  document.body.append(stats.dom);
}
