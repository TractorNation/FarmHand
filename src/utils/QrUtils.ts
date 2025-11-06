export function EmbedDataInSvg(code: QrCode) {
  let svgToSave = code.image;
  if (svgToSave && code.data) {
    const cdataPayload = `<![CDATA[${code.data}]]>`;
    const descRegex = /<desc>.*?<\/desc>/s;

    // Check if a <desc> tag already exists.
    if (descRegex.test(svgToSave)) {
      svgToSave = svgToSave.replace(descRegex, `<desc>${cdataPayload}</desc>`);
    } else {
      // Otherwise, insert a new <desc> tag inside the <svg> element.
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

export function GetDescFromSvg(contents: string) {
  const match = contents.match(/<desc><!\[CDATA\[(.*?)\]\]><\/desc>/s);
  const data = match ? match[1] : "";
  
  return data;
}
