const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");


async function downloadMedia(url, format, downloadDir) {
  return new Promise((resolve, reject) => {
    const fileName = `download_${Date.now()}.${format}`;
    const filePath = path.join(downloadDir, fileName);


    const formatOption = format === "mp3" ? "-f bestaudio --extract-audio --audio-format mp3" : '-f "best[ext=mp4]"';


    exec(
      `yt-dlp ${formatOption} --restrict-filenames -o "${filePath}" "${url}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Gagal mengunduh media:", error.message);
          console.error("Detail error:", stderr);
          reject(new Error("Gagal mengunduh media. Pastikan URL valid."));
          return;
        }

        console.log(`✅ Media berhasil diunduh (${format}):`, filePath);
        console.log("Output yt-dlp:", stdout);
        resolve(filePath); 
      }
    );
  });
}


async function handleDownloadCommand(sock, from, body) {
  try {
    const args = body.split(" ");
    const format = args[1]?.toLowerCase(); 
    const url = args[2]; 

    if (!format || !url || (format !== "mp3" && format !== "mp4")) {
      await sock.sendMessage(from, {
        text: "❌ Format atau URL tidak valid. Gunakan perintah:\n- !dwd mp3 [URL] untuk audio\n- !dwd mp4 [URL] untuk video",
      });
      return;
    }


    const downloadDir = path.join(__dirname, "downloads");
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }

 
    const filePath = await downloadMedia(url, format, downloadDir);


    if (!fs.existsSync(filePath)) {
      console.error("❌ File tidak ditemukan setelah diunduh:", filePath);
      await sock.sendMessage(from, {
        text: "❌ File tidak ditemukan setelah diunduh. Coba lagi nanti.",
      });
      return;
    }

  
    if (format === "mp3") {
      await sock.sendMessage(from, {
        audio: { url: filePath },
        mimetype: "audio/mpeg",
        ptt: false, 
      });
    } else if (format === "mp4") {
      await sock.sendMessage(from, {
        video: { url: filePath },
        caption: "📥 Video berhasil diunduh!",
      });
    }


    fs.unlinkSync(filePath);
    console.log("✅ File sementara berhasil dihapus:", filePath);
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat mengunduh media:", error);
    await sock.sendMessage(from, {
      text: "❌ Terjadi kesalahan saat mengunduh media. Coba lagi nanti.",
    });
  }
}

module.exports = { handleDownloadCommand };