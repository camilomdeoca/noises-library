import { Vector2 } from 'vectors-typescript';
import seedrandom from 'seedrandom';

const DEFAULT_PERLIN_NOISE_STARTING_OCTAVE_INDEX: number = 4;
const DEFAULT_PERLIN_NOISE_WEIGHTS: number[] = [1, 0.5, 0.25, 0.125, 0.0625];

export class Perlin {
  public constructor(
    options?: {
      startingOctaveIndex?: number,
      octavesWeights?: number[],
      seed?: string,
      scale?: Vector2;
    }
  ) {
    this._startingOctaveIndex = options?.startingOctaveIndex ?? DEFAULT_PERLIN_NOISE_STARTING_OCTAVE_INDEX;
    this._octaveWeights = options?.octavesWeights !== undefined ? [...options.octavesWeights] : DEFAULT_PERLIN_NOISE_WEIGHTS;

    // Make weights sum 1
    const sum = this._octaveWeights.reduce((sum, elem) => sum + elem, 0);
    this._octaveWeights.forEach((_, index) => this._octaveWeights[index] /= sum);

    this._scale = options?.scale || new Vector2(1, 1);
    if (options.seed != undefined)
    {
      let rng = seedrandom.alea(options.seed);
      let perm = [...Perlin.permutation];
      this._seededPermutation = [];
      while (perm.length > 0)
      {
        let index = Math.floor(rng.quick() * perm.length);
        this._seededPermutation.push(perm[index]);
        perm.splice(index, 1);
      }
    }
    else
    {
      this._seededPermutation = [...Perlin.permutation];
    }
  }

  private static readonly permutation: number[] = [
    151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
  ];

  //private static readonly gradients: Vector2[] = [
  //  new Vector2(0, 1), new Vector2(0, -1),
  //  new Vector2(1, 0), new Vector2(-1, 0),
  //  new Vector2(SQRT_OF_2, SQRT_OF_2), new Vector2(-SQRT_OF_2, -SQRT_OF_2),
  //  new Vector2(SQRT_OF_2, -SQRT_OF_2), new Vector2(-SQRT_OF_2, SQRT_OF_2)
  //];
  private static readonly gradients: Vector2[] = (() => {
    const numOfGradients = 16;
    const gradients = new Array(numOfGradients);
    for (let i = 0; i < numOfGradients; i++)
    {
      let angle = (i / numOfGradients) * Math.PI * 2;
      gradients[i] = new Vector2(Math.cos(angle), Math.sin(angle));
    }
    return gradients;
  })();

  // the number of unique gradients on a side (the last one is equal to the first)
  private gridSizeForOctaveIndex(index: number): number
  {
    return 2**(index + 1);
  }

  private hash(ix: number, iy: number)
  {
    return this._seededPermutation[(this._seededPermutation[ix % this._seededPermutation.length] + iy) % this._seededPermutation.length];
  }

  public at(position: Vector2): number {
    let intensity = 0;
    for (let octaveIndex = this._startingOctaveIndex; octaveIndex - this._startingOctaveIndex < this._octaveWeights.length; octaveIndex++)
    {
      if (this._octaveWeights[octaveIndex - this._startingOctaveIndex] === 0)
        continue;

      const gridSize = this.gridSizeForOctaveIndex(octaveIndex);
      const gridSizeScaled = new Vector2(Math.ceil(gridSize*this._scale.x), Math.ceil(gridSize*this._scale.y));

      // x, y from 0 to gridSize
      let inGridPos = new Vector2(
        position.x * gridSize * this._scale.x,
        position.y * gridSize * this._scale.y
      );

      let x0 = Math.floor(inGridPos.x);
      let y0 = Math.floor(inGridPos.y);
      let x1 = x0 + 1;
      let y1 = y0 + 1;

      let sx = inGridPos.x - x0;
      let sy = inGridPos.y - y0;

      let n0: number, n1: number, ix0: number, ix1: number;

      let dotGridGradient = (ix: number, iy: number, x: number, y:number): number => {
        // calculate the hash of the integer coords ix, iy wrapping them in range [0, gridSize]
        // so sampling with x and y in [0, 2] makes it 4 tiles
        const hash = this.hash(
          (gridSizeScaled.x + (ix % gridSizeScaled.x)) % gridSizeScaled.x,
          (gridSizeScaled.y + (iy % gridSizeScaled.y)) % gridSizeScaled.y
        );
        const gradient = Perlin.gradients[hash % Perlin.gradients.length];
        const delta = new Vector2(x - ix, y - iy);
        return Vector2.dot(gradient, delta);
      }

      let interpolate = (val1: number, val2: number, factor: number) => {
        return (val2 - val1) * (factor**3)*(factor*(factor*6 - 15) + 10) + val1;
      }

      n0 = dotGridGradient(x0, y0, inGridPos.x, inGridPos.y);
      n1 = dotGridGradient(x1, y0, inGridPos.x, inGridPos.y);
      ix0 = interpolate(n0, n1, sx);

      n0 = dotGridGradient(x0, y1, inGridPos.x, inGridPos.y);
      n1 = dotGridGradient(x1, y1, inGridPos.x, inGridPos.y);
      ix1 = interpolate(n0, n1, sx);

      let value = interpolate(ix0, ix1, sy) * this._octaveWeights[octaveIndex - this._startingOctaveIndex];
      if (value > 1) value = 1;
      if (value < -1) value = -1;
      intensity += value;
    }
    return (intensity + 1) * 0.5;
  }

  private _startingOctaveIndex: number;
  private _octaveWeights: number[];
  private _seededPermutation: number[]; // Seeded permutation
  private _scale: Vector2; // Scale in x and in y
}
