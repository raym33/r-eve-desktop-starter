const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 54;
const TOP = 744;
const LINE_HEIGHT = 15;
const MAX_CHARS = 86;

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function plainTextPdf(title: string, text: string): Uint8Array {
  const lines = wrapText(`${title}\n\n${text}`);
  const linesPerPage = Math.floor((TOP - 54) / LINE_HEIGHT);
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(pageStream(lines.slice(i, i + linesPerPage)));
  }

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_page, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  ];

  pages.forEach((stream, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObject} 0 R >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
  });

  return new TextEncoder().encode(renderPdf(objects));
}

function pageStream(lines: string[]) {
  const commands = ["BT", "/F1 10 Tf", `${LEFT} ${TOP} Td`];
  lines.forEach((line, index) => {
    if (index > 0) {
      commands.push(`0 -${LINE_HEIGHT} Td`);
    }
    commands.push(`(${escapePdf(line)}) Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

function renderPdf(objects: string[]) {
  const chunks = ["%PDF-1.4\n"];
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf8"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });
  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  offsets.slice(1).forEach((offset) => {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return chunks.join("");
}

function wrapText(text: string): string[] {
  const output: string[] = [];
  text.split("\n").forEach((line) => {
    const words = line.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      output.push("");
      return;
    }
    let current = "";
    words.forEach((word) => {
      if (`${current} ${word}`.trim().length > MAX_CHARS) {
        output.push(current);
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    });
    if (current) {
      output.push(current);
    }
  });
  return output;
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
