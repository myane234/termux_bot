const TikTokScraper = require("tiktok-scraper");
const fs = require("fs");
const path = require("path");
const https = require("https");

async function downloadTikTokMedia(url) {
  try {
    const downloadsDir = path.join(__dirname, "../downloads");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    console.log(`⬇️ Mengunduh media dari TikTok: ${url}`);

    // Ambil metadata dari TikTok
    const post = await TikTokScraper.getVideoMeta(url);

    if (!post || !post.collector || post.collector.length === 0) {
      throw new Error("Tidak ada media yang ditemukan di URL ini.");
    }

    const downloadedFiles = [];
    for (const item of post.collector) {
      const ext = item.videoUrl ? "mp4" : "jpg";
      const fileName = `tiktok_${Date.now()}.${ext}`;
      const filePath = path.join(downloadsDir, fileName);

      const mediaUrl = item.videoUrl || item.imageUrl;
      const file = fs.createWriteStream(filePath);
      await new Promise((resolve, reject) => {
        https.get(mediaUrl, (response) => {
          response.pipe(file);
          file.on("finish", () => file.close(resolve));
        }).on("error", (err) => {
          fs.unlinkSync(filePath);
          reject(err);
        });
      });

      downloadedFiles.push(filePath);
    }

    console.log(`✅ Media berhasil diunduh: ${downloadedFiles.join(", ")}`);
    return downloadedFiles;
  } catch (error) {
    console.error("❌ Gagal mengunduh media dari TikTok:", error);
    throw new Error("Gagal mengunduh media dari TikTok.");
  }
}

module.exports = { downloadTikTokMedia };