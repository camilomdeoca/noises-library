import { Vector2 } from "vectors-typescript";
import seedrandom from 'seedrandom';

const halton = (index: number, base: number): number => {
  var result = 0;
  var f = 1 / base;
  var i = index;
  while(i > 0) {
     result = result + f * (i % base);
     i = Math.floor(i / base);
     f = f / base;
  }
  return result;
};

type PointGenerationAlgorithm = "random" | "halton" | "hammersley";

const DEFAULT_WORLEY_NOISE_NUM_POINTS: number = 100;
const DEFAULT_WORLEY_NOISE_SEED: string = "defaultseed";
const DEFAULT_POINT_GENERATION_ALGORITHM: PointGenerationAlgorithm = "random";

export class Worley {
  public constructor(
    options?: {
      seed?: string,
      numPoints?: number,
      pointGenAlgorithm?: PointGenerationAlgorithm;
    },
  ) {
    if (options !== undefined) {
      this.seed = options.seed !== undefined ? options.seed : DEFAULT_WORLEY_NOISE_SEED;
      this.numPoints = options.numPoints !== undefined ? options.numPoints : DEFAULT_WORLEY_NOISE_NUM_POINTS;
      this.pointGenAlgorithm = options.pointGenAlgorithm !== undefined ? options.pointGenAlgorithm : DEFAULT_POINT_GENERATION_ALGORITHM;
    }
    if (this.pointGenAlgorithm == "random")
      this.generateRandomPoints();
    else if (this.pointGenAlgorithm == "halton")
      this.generateHaltonPoints();
    else if (this.pointGenAlgorithm == "hammersley")
      this.generateHammersleyPoints();
  }

  private generateRandomPoints() {
    let rng = seedrandom.alea(this.seed);
    const side = Math.ceil(Math.sqrt(this.numPoints));
    this.dots = Array<Array<Array<Vector2>>>(side);
    for (let y = 0; y < this.dots.length; y++) {
      this.dots[y] = Array<Array<Vector2>>(side);
      for (let x = 0; x < this.dots[y].length; x++) {
        this.dots[y][x] = [new Vector2(rng.quick(), rng.quick())];
      }
    }
  }

  private generateHaltonPoints() {
    const side = Math.ceil(Math.sqrt(this.numPoints));
    this.dots = Array<Array<Array<Vector2>>>(side);
    for (let y = 0; y < this.dots.length; y++) {
      this.dots[y] = Array<Array<Vector2>>(side);
      for (let x = 0; x < this.dots[y].length; x++) {
        this.dots[y][x] = [];
      }
    }
    for (let i = 0; i < this.numPoints; i++) {
      const point = new Vector2(halton(i, 2), halton(i, 3)).times(side);
      const ix = Math.floor(point.x);
      const iy = Math.floor(point.y);
      const xOffset = point.x % 1;
      const yOffset = point.y % 1;
      this.dots[iy][ix].push(new Vector2(xOffset, yOffset));
    }
  }

  private generateHammersleyPoints() {
    const side = Math.ceil(Math.sqrt(this.numPoints));
    this.dots = Array<Array<Array<Vector2>>>(side);
    for (let y = 0; y < this.dots.length; y++) {
      this.dots[y] = Array<Array<Vector2>>(side);
      for (let x = 0; x < this.dots[y].length; x++) {
        this.dots[y][x] = [];
      }
    }
    const step = 1 / this.numPoints;
    for (let i = 0; i < this.numPoints; i++) {
      const point = new Vector2(i * step, halton(i, 2)).times(side);
      const ix = Math.floor(point.x);
      const iy = Math.floor(point.y);
      const xOffset = point.x % 1;
      const yOffset = point.y % 1;
      this.dots[iy][ix].push(new Vector2(xOffset, yOffset));
    }
  }

  public at(position: Vector2): number {
    const side = Math.ceil(Math.sqrt(this.numPoints));
    const gridSpacePos = new Vector2(position.x * side, position.y * side);
    const igridSpacePos = new Vector2(Math.floor(gridSpacePos.x), Math.floor(gridSpacePos.y));
    let closestPoints: Vector2[] = [];
    for (let yOffset = -1; yOffset <= 1; yOffset++) {
      const y = (side + igridSpacePos.y + yOffset) % side;
      for (let xOffset = -1; xOffset <= 1; xOffset++) {
        const x = (side + igridSpacePos.x + xOffset) % side;
        for (let point of this.dots[y][x]) {
          closestPoints.push(Vector2.add(new Vector2(igridSpacePos.x + xOffset, igridSpacePos.y + yOffset), point));
        }
      }
    }

    let minDistance = Infinity;
    for (let point of closestPoints) {
      const distance = Vector2.subtract(gridSpacePos, point).length();
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private numPoints: number;
  private dots: Vector2[][][]; // positions in their cell
  private seed: string;
  private pointGenAlgorithm: PointGenerationAlgorithm;
};
