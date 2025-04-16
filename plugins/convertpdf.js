// plugins/convertpdf.js
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = async function handleConvert(sock, msg, body) {
  const isReply = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
  const quoted = msg.message.extendedTextMessage?.contextInfo;

  if (!isReply || !body.startsWith("!convert")) return;

  const args = body.trim().split(" ");
  const targetFormat = args[1];
  if (!targetFormat)
    return sock.sendMessage(msg.key.remoteJid, { text: "❌ Format tujuan tidak boleh kosong!" }, { quoted: msg });

  const mediaMsg = quoted.quotedMessage;
  const mimeType = mediaMsg.documentMessage?.mimetype || "";
  const ext = mimeType.split("/")[1] || "bin";
  const fileName = `media/input_${Date.now()}.${ext}`;
  const outputName = `media/output_${Date.now()}.${targetFormat}`;

  try {
    const stream = await downloadMediaMessage(
      { message: mediaMsg },
      "buffer",
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    );

    fs.writeFileSync(fileName, stream);

    const cmd = `libreoffice --headless --convert-to ${targetFormat} --outdir media ${fileName}`;
    exec(cmd, async (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Gagal mengonversi dokumen." }, { quoted: msg });
      }

      const convertedFile = fs.readdirSync("media").find(f => f.includes("input_") && f.endsWith(`.${targetFormat}`));
      if (!convertedFile) {
        return sock.sendMessage(msg.key.remoteJid, { text: `❌ Gagal menemukan file hasil.` }, { quoted: msg });
      }

      const buffer = fs.readFileSync(path.join("media", convertedFile));
      await sock.sendMessage(msg.key.remoteJid, {
        document: buffer,
        fileName: `converted.${targetFormat}`,
        mimetype: `application/${targetFormat}`
      }, { quoted: msg });

      // Hapus file sementara
      fs.unlinkSync(fileName);
      fs.unlinkSync(path.join("media", convertedFile));
    });
  } catch (e) {
    console.error(e);
    sock.sendMessage(msg.key.remoteJid, { text: "❌ Terjadi kesalahan saat mengunduh file." }, { quoted: msg });
  }
};
