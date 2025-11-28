import fs from "fs";
import { PDFParse } from "pdf-parse";

export async function extractTextFromPDF(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

export function isPDFFile(filename: string) {
  const ext = filename.toLowerCase().split(".").pop();
  return ext === "pdf";
}
