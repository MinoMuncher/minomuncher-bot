import { createGraph, Theme, type GraphType, type PlayerCumulativeStats } from "minomuncher-core"

import { JSDOM } from "jsdom"

import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js"


export function renderSvgData(svg: string, scale: number = 1) {
  const opts: ResvgRenderOptions = {
    background: Theme.defaultScheme.b_med,
    fitTo: { mode: "width", value: 500 * scale },
    font: {
      fontFiles: ['./src/assets/Martel-Bold.ttf'], // Load custom fonts.
      loadSystemFonts: false, // It will be faster to disable loading system fonts.
      defaultFontFamily: 'Martel Bold',
    },
  }
  const resvg = new Resvg(svg, opts)
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()
  return pngBuffer
}


export function graphToSvgData(graphType: GraphType, stats: PlayerCumulativeStats) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="rootDiv"></div></body></html>`, {
    contentType: 'image/svg+xml',
  })
  const root = dom.window.document.getElementById("rootDiv")!
  createGraph(root, graphType, stats)
  return dom.window.document.getElementById("rootDiv")!.innerHTML
}

export function combineSvgData(svgData: string[]) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="rootDiv"></div></body></html>`, {
    contentType: 'image/svg+xml',
  });

  const document = dom.window.document;

  const [numX, _numY] = factorClosestPair(svgData.length);
  let dx = 0;
  let dy = 0;

  let maxX = 0;
  let maxY = 0;
  let currMaxHeight = 0;

  const baseSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  baseSvg.setAttribute("id", "baseSvg");
  document.getElementById("rootDiv")!.appendChild(baseSvg);

  for (let i = 0; i < svgData.length; i++) {
    const fragment = JSDOM.fragment(svgData[i]!);
    const svgElement = fragment.firstChild as SVGSVGElement;

    const width = parseFloat(svgElement.getAttribute("width") || "0");
    const height = parseFloat(svgElement.getAttribute("height") || "0");

    svgElement.setAttribute("x", dx.toString());
    svgElement.setAttribute("y", dy.toString());

    dx += width;
    maxX = Math.max(maxX, dx);
    currMaxHeight = Math.max(currMaxHeight, height);

    if ((i + 1) % numX === 0) {
      dx = 0;
      dy += currMaxHeight;
      maxY = Math.max(maxY, dy);
      currMaxHeight = 0;
    }

    baseSvg.appendChild(svgElement);
  }

  // Ensure final row height is added if not multiple of numX
  if (svgData.length % numX !== 0) {
    maxY = dy + currMaxHeight;
  }

  baseSvg.setAttribute("width", maxX.toString());
  baseSvg.setAttribute("height", maxY.toString());

  return document.getElementById("rootDiv")!.innerHTML;
}

function factorClosestPair(n: number): [number, number] {
  if (n <= 0 || !Number.isInteger(n)) {
    throw new Error("Input must be a positive whole number.");
  }

  let a = Math.floor(Math.sqrt(n));
  while (a > 0) {
    if (n % a === 0) {
      return [a, n / a];
    }
    a--;
  }

  return [1, n];
}
