import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

/**
 * Fetch all analyses from the analyses directory
 */
export async function fetchAnalyses(): Promise<Analysis[]> {
  // Create directory if it doesn't exist
  const folderExists = await exists("analyses", {
    baseDir: BaseDirectory.AppLocalData,
  });

  if (!folderExists) {
    await mkdir("analyses", {
      baseDir: BaseDirectory.AppLocalData,
      recursive: true,
    });
    return [];
  }

  const files = await readDir("analyses", {
    baseDir: BaseDirectory.AppLocalData,
  });

  const analysisFiles = files.filter((f) => f.name.endsWith(".json"));

  const results = await Promise.all(
    analysisFiles.map(async (file) => {
      try {
        const contents = await readTextFile(`analyses/${file.name}`, {
          baseDir: BaseDirectory.AppLocalData,
        });

        const analysis = JSON.parse(contents) as Analysis;
        return analysis;
      } catch (error) {
        console.error(`Failed to load analysis from ${file.name}:`, error);
        return null;
      }
    })
  );

  // Filter out any failed loads and sort by creation date (newest first)
  const validAnalyses = results.filter((a): a is Analysis => a !== null);

  // Sort by creation date (newest first)
  validAnalyses.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  return validAnalyses;
}

/**
 * Save an analysis to a JSON file
 */
export async function saveAnalysis(analysis: Analysis): Promise<void> {
  await mkdir("analyses", {
    baseDir: BaseDirectory.AppLocalData,
    recursive: true,
  });

  // Use analysis ID as filename for consistency
  const fileName = `analysis-${analysis.id}.json`;
  const filePath = await resolve(await appLocalDataDir(), "analyses", fileName);

  const analysisToSave = JSON.stringify(analysis, null, 2);

  // Reuse the schema save command (it's just a generic file write)
  await invoke("save_schema", {
    schema: analysisToSave,
    filePath,
  });
}

/**
 * Delete an analysis file
 */
export async function deleteAnalysis(analysisId: number): Promise<void> {
  const fileName = `analysis-${analysisId}.json`;
  const filePath = await resolve(await appLocalDataDir(), "analyses", fileName);

  // Reuse the schema delete command (it's just a generic file delete)
  await invoke("delete_schema", { path: filePath });
}

/**
 * Extract SVG from a chart container element
 * @param containerElement The container element that holds the chart
 * @returns The SVG string or null if not found
 */
export function extractSvgFromChart(containerElement: HTMLElement | null): string | null {
  if (!containerElement) return null;

  // Find the SVG element within the container
  const svgElement = containerElement.querySelector("svg");
  if (!svgElement) return null;

  // Clone the SVG to avoid modifying the original
  const clonedSvg = svgElement.cloneNode(true) as SVGElement;
  
  // Get the actual rendered dimensions of the SVG
  const rect = svgElement.getBoundingClientRect();
  const renderedWidth = rect.width;
  const renderedHeight = rect.height;
  
  // Get existing viewBox - Nivo charts should have this
  let viewBox = clonedSvg.getAttribute("viewBox");
  const existingWidth = clonedSvg.getAttribute("width");
  const existingHeight = clonedSvg.getAttribute("height");
  
  // If no viewBox exists, try to create one from existing dimensions or rendered size
  if (!viewBox) {
    let vbWidth = renderedWidth;
    let vbHeight = renderedHeight;
    
    // Try to use existing width/height attributes if they're numeric
    if (existingWidth && !isNaN(parseFloat(existingWidth))) {
      vbWidth = parseFloat(existingWidth);
    }
    if (existingHeight && !isNaN(parseFloat(existingHeight))) {
      vbHeight = parseFloat(existingHeight);
    }
    
    if (vbWidth > 0 && vbHeight > 0) {
      viewBox = `0 0 ${vbWidth} ${vbHeight}`;
      clonedSvg.setAttribute("viewBox", viewBox);
    }
  }
  
  // Remove fixed width/height attributes - let CSS control the size
  // This allows the SVG to scale properly within its container
  clonedSvg.removeAttribute("width");
  clonedSvg.removeAttribute("height");
  
  // Ensure preserveAspectRatio is set for proper scaling
  if (!clonedSvg.hasAttribute("preserveAspectRatio")) {
    clonedSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  // Serialize the SVG to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(clonedSvg);
}

