import { Perlin } from '../dist/index.js';
import { Vector2 } from 'vectors-typescript';

let canvas = document.getElementsByTagName('canvas')[0];
const size = 512
canvas.width = size;
canvas.height = size;

let ctx = canvas.getContext('2d');
const imageData = ctx.createImageData(canvas.width, canvas.height);

const data = imageData.data;

let weights = [];
for (let i = 0; i < 12; i++) {
  weights.push(1 / 2 ** (i + 1));
}
//console.log(weights);

const createPerlinStart = Date.now();
let perlin = new Perlin(weights, Math.random());
console.log("creating Perlin noise object took " + (Date.now() - createPerlinStart) + "ms");

const startSamplingPerlinNoise = Date.now();
for (let y = 0; y < canvas.height; y++) {
  for (let x = 0; x < canvas.width; x++) {
    const value = perlin.at(new Vector2((x / canvas.width) % 1, (y / canvas.height) % 1)) * 255;

    data[(y * canvas.width + x) * 4 + 0] = value;
    data[(y * canvas.width + x) * 4 + 1] = value;
    data[(y * canvas.width + x) * 4 + 2] = value;
    data[(y * canvas.width + x) * 4 + 3] = 255;
  }
}
const endSamplingPerlinNoise = Date.now();
console.log('Rendered in ' + (endSamplingPerlinNoise - startSamplingPerlinNoise) + ' ms');

ctx.putImageData(imageData, 0, 0);

ctx.font = '16px sans-serif'
ctx.textAlign = 'center';
ctx.fillText('Rendered in ' + (endSamplingPerlinNoise - startSamplingPerlinNoise) + ' ms', canvas.width / 2, canvas.height - 20);


