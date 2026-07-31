/**
 * A saved QR code is an SVG with its own source string embedded in a `<desc>` CDATA
 * block, so the file is both the picture and the data. These two functions are the
 * only places that contract is expressed.
 */

export function EmbedDataInSvg(code: QrCode) {
  let svgToSave = code.image;
  if (svgToSave && code.data) {
    const cdataPayload = `<![CDATA[${code.data}]]>`;
    const descRegex = /<desc>.*?<\/desc>/s;

    if (descRegex.test(svgToSave)) {
      svgToSave = svgToSave.replace(descRegex, `<desc>${cdataPayload}</desc>`);
    } else {
      const dataPayload = `<desc>${cdataPayload}</desc>`;
      const svgTagIndex = svgToSave.indexOf("<svg");
      if (svgTagIndex !== -1) {
        const endOfOpeningSvgTag = svgToSave.indexOf(">", svgTagIndex);
        if (endOfOpeningSvgTag !== -1) {
          svgToSave =
            svgToSave.slice(0, endOfOpeningSvgTag + 1) +
            dataPayload +
            svgToSave.slice(endOfOpeningSvgTag + 1);
        }
      }
    }
  }
  return svgToSave;
}

/** Reads the embedded QR string back out of a saved SVG. */
export function GetDescFromSvg(contents: string) {
  const match = contents.match(/<desc><!\[CDATA\[(.*?)\]\]><\/desc>/s);
  return match ? match[1] : "";
}
