import QRCode from "qrcode";

export function qrPng(text: string, width = 600): Promise<Buffer> {
  return QRCode.toBuffer(text, { errorCorrectionLevel: "M", margin: 2, width, color: { dark: "#000000", light: "#ffffff" } });
}

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#000000", light: "#ffffff" } });
}
