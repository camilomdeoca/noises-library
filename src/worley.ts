import { Vector2 } from "vectors-typescript";
import seedrandom from 'seedrandom';

const halton = (index: number, base: number): number => {
  var result = 0;
  var f = 1 / base;
  var i = index;
  while (i > 0) {
    result = result + f * (i % base);
    i = Math.floor(i / base);
    f = f / base;
  }
  return result;
};

export type PointGenerationAlgorithm = "random" | "halton" | "hammersley";
export type WorleyPointSelectionCriteria = "closest" | "second-closest" | "second-minus-closest";

const DEFAULT_WORLEY_NOISE_NUM_POINTS: number = 100;
const DEFAULT_WORLEY_NOISE_SEED: string = "defaultseed";
const DEFAULT_POINT_GENERATION_ALGORITHM: PointGenerationAlgorithm = "random";
const DEFAULT_POINT_SELECTION_CRITERIA: WorleyPointSelectionCriteria = "closest";

export class Worley {
  public constructor(
    options?: {
      seed?: string,
      numPoints?: number,
      pointGenAlgorithm?: PointGenerationAlgorithm,
      pointSelectionCriteria?: WorleyPointSelectionCriteria,
    },
  ) {
    this._seed = options?.seed ?? DEFAULT_WORLEY_NOISE_SEED;
    this._numPoints = options?.numPoints ?? DEFAULT_WORLEY_NOISE_NUM_POINTS;
    this._pointGenAlgorithm = options?.pointGenAlgorithm ?? DEFAULT_POINT_GENERATION_ALGORITHM;
    this._pointSelectionCriteria = options?.pointSelectionCriteria ?? DEFAULT_POINT_SELECTION_CRITERIA;

    if (this._pointGenAlgorithm == "random")
      this.generateRandomPoints();
    else if (this._pointGenAlgorithm == "halton")
      this.generateHaltonPoints();
    else if (this._pointGenAlgorithm == "hammersley")
      this.generateHammersleyPoints();

    if (this._pointSelectionCriteria === "closest") {
      this._pointSelectionFunction = this.distanceToClosest;
    } else if (this._pointSelectionCriteria === "second-closest") {
      this._pointSelectionFunction = this.distanceToSecondClosest;
    } else if (this._pointSelectionCriteria === "second-minus-closest") {
      this._pointSelectionFunction = this.distanceToSecondClosestMinusDistanceToClosest;
    }
  }

  private generateRandomPoints() {
    let rng = seedrandom.alea(this._seed);
    const side = Math.ceil(Math.sqrt(this._numPoints));
    this._dots = Array<Array<Array<Vector2>>>(side);
    for (let y = 0; y < this._dots.length; y++) {
      this._dots[y] = Array<Array<Vector2>>(side);
      for (let x = 0; x < this._dots[y].length; x++) {
        this._dots[y][x] = [new Vector2(rng.quick(), rng.quick())];
      }
    }
  }

  private generateHaltonPoints() {
    const side = Math.ceil(Math.sqrt(this._numPoints));
    this._dots = Array<Array<Array<Vector2>>>(side);
    for (let y = 0; y < this._dots.length; y++) {
      this._dots[y] = Array<Array<Vector2>>(side);
      for (let x = 0; x < this._dots[y].length; x++) {
        this._dots[y][x] = [];
      }
    }
    for (let i = 0; i < this._numPoints; i++) {
      const point = new Vector2(halton(i, 2), halton(i, 3)).times(side);
      const ix = Math.floor(point.x);
      const iy = Math.floor(point.y);
      const xOffset = point.x % 1;
      const yOffset = point.y % 1;
      this._dots[iy][ix].push(new Vector2(xOffset, yOffset));
    }
  }

  private generateHammersleyPoints() {
    const side = Math.ceil(Math.sqrt(this._numPoints));
    this._dots = Array<Array<Array<Vector2>>>(side);
    for (let y = 0; y < this._dots.length; y++) {
      this._dots[y] = Array<Array<Vector2>>(side);
      for (let x = 0; x < this._dots[y].length; x++) {
        this._dots[y][x] = [];
      }
    }
    const step = 1 / this._numPoints;
    for (let i = 0; i < this._numPoints; i++) {
      const point = new Vector2(i * step, halton(i, 2)).times(side);
      const ix = Math.floor(point.x);
      const iy = Math.floor(point.y);
      const xOffset = point.x % 1;
      const yOffset = point.y % 1;
      this._dots[iy][ix].push(new Vector2(xOffset, yOffset));
    }
  }

  public at(position: Vector2): number {
    const side = Math.ceil(Math.sqrt(this._numPoints));
    const gridSpacePos = new Vector2(position.x * side, position.y * side);
    const igridSpacePos = new Vector2(Math.floor(gridSpacePos.x), Math.floor(gridSpacePos.y));

    let searchRadious: number;
    if (this._pointSelectionCriteria === "closest")
      searchRadious = 1;
    else if (this._pointSelectionCriteria === "second-closest" || this._pointSelectionCriteria === "second-minus-closest")
      searchRadious = 2;

    let closestPoints: Vector2[] = [];
    for (let yOffset = -searchRadious; yOffset <= searchRadious; yOffset++) {
      const y = (side + ((igridSpacePos.y + yOffset) % side)) % side;
      for (let xOffset = -searchRadious; xOffset <= searchRadious; xOffset++) {
        const x = (side + ((igridSpacePos.x + xOffset) % side)) % side;
        for (let point of this._dots[y][x]) {
          closestPoints.push(Vector2.add(new Vector2(igridSpacePos.x + xOffset, igridSpacePos.y + yOffset), point));
        }
      }
    }

    return this._pointSelectionFunction(gridSpacePos, closestPoints);
  }

  private distanceToClosest(gridSpacePos: Vector2, closestPoints: Vector2[]): number {
    let minDistance = Infinity;
    for (let point of closestPoints) {
      const distance = Vector2.subtract(gridSpacePos, point).length();
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private distanceToSecondClosest(gridSpacePos: Vector2, closestPoints: Vector2[]): number {
    let secondClosestDistance = Math.max(
      Vector2.subtract(gridSpacePos, closestPoints[0]).length(),
      Vector2.subtract(gridSpacePos, closestPoints[1]).length()
    );
    let closestDistance = Infinity;
    for (let point of closestPoints) {
      const distance = Vector2.subtract(gridSpacePos, point).length();
      if (distance < closestDistance) {
        secondClosestDistance = closestDistance;
        closestDistance = distance;
      } else if (distance < secondClosestDistance) {
        secondClosestDistance = distance;
      }
    }
    return secondClosestDistance;
  }

  private distanceToSecondClosestMinusDistanceToClosest(gridSpacePos: Vector2, closestPoints: Vector2[]): number {
    let secondClosestDistance = Math.max(
      Vector2.subtract(gridSpacePos, closestPoints[0]).length(),
      Vector2.subtract(gridSpacePos, closestPoints[1]).length()
    );
    let closestDistance = Infinity;
    for (let point of closestPoints) {
      const distance = Vector2.subtract(gridSpacePos, point).length();
      if (distance < closestDistance) {
        secondClosestDistance = closestDistance;
        closestDistance = distance;
      } else if (distance < secondClosestDistance) {
        secondClosestDistance = distance;
      }
    }
    return secondClosestDistance - closestDistance;
  }

  private _numPoints: number;
  private _dots: Vector2[][][]; // positions in their cell
  private _seed: string;
  private _pointGenAlgorithm: PointGenerationAlgorithm;
  private _pointSelectionCriteria: WorleyPointSelectionCriteria;
  private _pointSelectionFunction: (gridSpacePos: Vector2, closestPoints: Vector2[]) => number = undefined;
};
