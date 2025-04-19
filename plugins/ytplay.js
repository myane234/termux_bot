const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

async function searchYouTube(query) {
  const ytsr = require("ytsr");
  try {
    const searchResults = await ytsr(query, { limit: 20 });
    const videos = searchResults.items.filter((item) => item.type === "video");
    return videos.map((video, index) => ({
      index: index + 1,
      title: video.title,
      url: video.url,
      duration: video.duration,
      views: video.views,
      thumbnail: video.bestThumbnail.url,
    }));
  } catch (error) {
    console.error("❌ Gagal mencari video di YouTube:", error);
    throw new Error("Gagal mencari video di YouTube.");
  }
}

async function downloadYouTube(url, format = "audio") {
  try {
    const downloadsDir = path.join(__dirname, "../downloads");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const outputFileName = `${Date.now()}.${format === "audio" ? "mp3" : "mp4"}`;
    const outputPath = path.join(downloadsDir, outputFileName);

    console.log(`⬇️ Mengunduh ke: ${outputPath}`);

    const command = `yt-dlp -f ${
      format === "audio" ? "bestaudio" : "bestvideo+bestaudio"
    } --output "${outputPath}" "${url}"`;

    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Gagal mengunduh file:", stderr);
          reject(new Error(stderr));
        } else {
          console.log(`✅ File berhasil diunduh: ${outputPath}`);
          resolve();
        }
      });
    });

    // Validasi apakah file berhasil dibuat
    if (!fs.existsSync(outputPath)) {
      throw new Error("File tidak ditemukan setelah diunduh.");
    }

    return outputPath;
  } catch (error) {
    console.error("❌ Gagal mengunduh:", error);
    throw new Error(`Gagal mengunduh: ${error.message}`);
  }
}

module.exports = { searchYouTube, downloadYouTube };