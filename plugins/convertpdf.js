const fs = require("fs");
const pdfParse = require("pdf-parse");
const { Document, Packer, Paragraph } = require("docx");

async function convertPdfToWord(filePath, outputPath) {
  try {
    // Baca file PDF
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(pdfBuffer);

    // Ekstrak teks dari PDF
    const paragraphs = pdfData.text
      .split("\n")
      .filter((line) => line.trim() !== "") // Hapus baris kosong
      .map((line) => new Paragraph(line));

    // Buat dokumen Word
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    // Simpan file Word
    const wordBuffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, wordBuffer);

    console.log("✅ Konversi berhasil:", outputPath);
    return outputPath;
  } catch (err) {
    console.error("❌ Error konversi:", err.message);
    return null;
  }
}

module.exports = { convertPdfToWord };