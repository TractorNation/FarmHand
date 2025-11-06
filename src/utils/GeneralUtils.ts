import { invoke } from "@tauri-apps/api/core";

export function isFieldInvalid(
  required: boolean,
  type: string,
  defaultValue: any,
  value: any
) {
  return (
    required &&
    (value === "" ||
      (type === "checkbox" && value === false) ||
      (type === "counter" && value === defaultValue))
  );
}

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

export function GetDescFromSvg(contents: string) {
  const match = contents.match(/<desc><!\[CDATA\[(.*?)\]\]><\/desc>/s);
  return match ? match[1] : "";
}

export async function createSchemaHash(schema: Schema): Promise<string> {
  const schemaHash = await invoke<string>("hash_schema", {
    schema: JSON.stringify(schema),
  });
  return schemaHash;
}

/**
 * Encode object into base64
 * @param data the data to encode
 * @returns the encoded data string
 */
export function encodeData(data: any): string {
  return btoa(JSON.stringify(data));
}

/**
 * Decode Base64 string back to its original object
 * @param encoded the encoded Base64 string
 * @returns the original object
 */
export function decodeData(encoded: string): any {
  return JSON.parse(atob(encoded));
}
