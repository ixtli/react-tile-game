// Existential
export const TILE_PIXEL_LENGTH = 32;

// Map size
export const MAP_CHUNKS_WIDE = 32;
export const MAP_CHUNKS_HIGH = 32;

// Performance
/**
 * The length of a side of a chunk, in tiles. Larger means more work less often,
 * and fewer means less work more often when panning.
 *
 * @type {number}
 */
export const CHUNK_TILE_LENGTH = 16;

/**
 * How many chunks outside of the visible area to render. The idea is that you
 * do more work when panning in order to be able to pan more without having to
 * recalculate chunks.
 *
 * @type {number}
 */
export const PRE_RENDER_CHUNKS = 1;

// Computed
export const TILES_PER_CHUNK = CHUNK_TILE_LENGTH * CHUNK_TILE_LENGTH;
export const CHUNK_PIXEL_LENGTH = TILE_PIXEL_LENGTH * CHUNK_TILE_LENGTH;
export const MAP_TILES_WIDE = MAP_CHUNKS_WIDE * CHUNK_TILE_LENGTH;
export const MAP_TILES_HIGH = MAP_CHUNKS_HIGH * CHUNK_TILE_LENGTH;
export const MAP_PIXELS_WIDE = MAP_TILES_WIDE * TILE_PIXEL_LENGTH;
export const MAP_PIXELS_HIGH = MAP_TILES_HIGH * TILE_PIXEL_LENGTH;
export const HALF_CHUNK_PIXEL_LENGTH = Math.floor(CHUNK_PIXEL_LENGTH / 2);

console.debug("MAP_TILES_WIDE", MAP_TILES_WIDE);
console.debug("CHUNK_PIXEL_LENGTH", CHUNK_PIXEL_LENGTH);
