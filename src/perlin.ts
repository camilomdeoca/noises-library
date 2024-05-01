import { Vector2 } from 'vectors-typescript';
import seedrandom from 'seedrandom';

const SQRT_OF_2 = Math.sqrt(2);

export class Perlin {
  private octaveWeights: number[];
  private seededPermutation: number[]; // Seeded permutation
  private scale: Vector2; // Scale in x and in y

  constructor(
    octavesWeights: number[],
    seed?: number,
    options?: {
      scale?: Vector2;
    }
  ) {
    this.octaveWeights = octavesWeights;
    this.scale = options?.scale || new Vector2(1, 1);
    if (seed != undefined)
    {
      let rng = seedrandom.alea(seed.toString());
      let perm = [...Perlin.permutation];
      this.seededPermutation = [];
      while (perm.length > 0)
      {
        let index = Math.floor(rng.quick() * perm.length);
        this.seededPermutation.push(perm[index]);
        perm.splice(index, 1);
      }
    }
    else
    {
      this.seededPermutation = [...Perlin.permutation];
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

  private static readonly gradients: Vector2[] = [
    new Vector2(0, 1), new Vector2(0, -1),
    new Vector2(1, 0), new Vector2(-1, 0),
    new Vector2(SQRT_OF_2, SQRT_OF_2), new Vector2(-SQRT_OF_2, -SQRT_OF_2),
    new Vector2(SQRT_OF_2, -SQRT_OF_2), new Vector2(-SQRT_OF_2, SQRT_OF_2)
  ];

  // the number of unique gradients on a side (the last one is equal to the first)
  private gridSizeForOctaveIndex(index: number): number
  {
    return 2**(index + 1);
  }

  private hash(ix: number, iy: number)
  {
    return this.seededPermutation[(this.seededPermutation[ix % this.seededPermutation.length] + iy) % this.seededPermutation.length];
  }

  at(position: Vector2): number {
    let intensity = 0;
    for (let octaveIndex = 0; octaveIndex < this.octaveWeights.length; octaveIndex++)
    {
      if (this.octaveWeights[octaveIndex] === 0)
        continue;

      const gridSize = this.gridSizeForOctaveIndex(octaveIndex);
      const gridSizeScaled = new Vector2(gridSize*this.scale.x, gridSize*this.scale.y);

      // x, y from 0 to gridSize
      let inGridPos = new Vector2(position.x * gridSizeScaled.x, position.y * gridSizeScaled.y);

      let x0 = Math.floor(inGridPos.x);
      let y0 = Math.floor(inGridPos.y);
      let x1 = x0 + 1;
      let y1 = y0 + 1;

      let sx = inGridPos.x - x0;
      let sy = inGridPos.y - y0;

      let n0: number, n1: number, ix0: number, ix1: number;

      let dotGridGradient = (ix: number, iy: number, x: number, y:number): number => {
        const gradient = Perlin.gradients[this.hash(ix % gridSizeScaled.x, iy % gridSizeScaled.y) % Perlin.gradients.length];
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

      const contrast = 1.2;
      let value = interpolate(ix0, ix1, sy) * this.octaveWeights[octaveIndex] * contrast;
      if (value > 1) value = 1;
      if (value < -1) value = -1;
      intensity += value;
    }
    return (intensity + 1) * 0.5;
  }
}
