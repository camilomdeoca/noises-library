import { Vector2 } from 'vectors-typescript';

function getRandomUnitVector2(): Vector2 {
    let theta = Math.random() * 2 * Math.PI;
    return new Vector2(Math.cos(theta), Math.sin(theta));
}

export class Perlin {
  size: number;
  channels: number;
  gradients: Vector2[][][];
  octaveWeights: number[];

  constructor(
    size: number,
    channels: number,
    octavesWeights: number[]
  ) {
    this.size = size;
    this.channels = channels;
    this.octaveWeights = octavesWeights;

    // Generate random gradients
    this.gradients = new Array(this.octaveWeights.length);
    for (let octaveIndex = 0; octaveIndex < this.octaveWeights.length; octaveIndex++)
    {
      let gridSize = this.gridSizeForOctaveIndex(octaveIndex);
      this.gradients[octaveIndex] = new Array(gridSize);
      for (let y = 0; y < gridSize; y++)
      {
        this.gradients[octaveIndex][y] = new Array(2**(octaveIndex + 1));
        for (let x = 0; x < gridSize; x++)
        {
          // generate random scalar for each coordinate with normal distribution
          this.gradients[octaveIndex][y][x] = getRandomUnitVector2();
        }
      }
    }
  }

  // the number of unique gradients on a side (the last one is equal to the first)
  private gridSizeForOctaveIndex(index: number): number
  {
    return 2**(index + 1);
  }

  at(position: Vector2): number {
    let intensity = 0;
    for (let octaveIndex = 0; octaveIndex < this.octaveWeights.length; octaveIndex++)
    {
      let gridSize = this.gridSizeForOctaveIndex(octaveIndex);
      let x0 = Math.floor(position.x*gridSize);
      let y0 = Math.floor(position.y*gridSize);
      let x1 = x0 + 1;
      let y1 = y0 + 1;
      //console.log(position);
      //console.log(x0, y0);
      //console.log(x1, y1);

      let sx = position.x*gridSize - x0;
      let sy = position.y*gridSize - y0;

      let n0: number, n1: number, ix0: number, ix1: number;

      let dotGridGradient = (ix: number, iy: number, x: number, y:number): number => {
        const gradient = this.gradients[octaveIndex][iy % gridSize][ix % gridSize];
        const delta = new Vector2(x - ix, y - iy);
        return Vector2.dot(gradient, delta);
      }

      let lerp = (val1: number, val2: number, factor: number) => {
        return (val2 - val1) * (3.0 - factor * 2.0) * factor * factor + val1;
      }

      n0 = dotGridGradient(x0, y0, position.x*gridSize, position.y*gridSize);
      n1 = dotGridGradient(x1, y0, position.x*gridSize, position.y*gridSize);
      ix0 = lerp(n0, n1, sx);

      n0 = dotGridGradient(x0, y1, position.x*gridSize, position.y*gridSize);
      n1 = dotGridGradient(x1, y1, position.x*gridSize, position.y*gridSize);
      ix1 = lerp(n0, n1, sx);

      intensity += lerp(ix0, ix1, sy) * this.octaveWeights[octaveIndex];
    }
    return intensity * 0.5 + 0.5;
  }
}
