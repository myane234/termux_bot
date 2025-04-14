// Konfigurasi anti-link global
const antiLinkConfig = {}; // Objek untuk menyimpan status anti-link per grup

// Daftar kata-kata terlarang
const forbiddenWords = ["bokep", "promosi", "judi", "porn", "sex", "AI", "ELARA", "elara", "𝐄𝐥𝐚𝐫𝐚", "𝐀𝐢", "GRUP", "TAI", "DANA GRATIS", "http", "STOK", "POLOSAN", "stok", "ANGKUT", "angkut"]; // Tambahkan kata-kata lain di sini

module.exports = {
  handleAntiLink: async function (sock, msg, body, isGroup, senderId) {
    const groupMetadata = isGroup
      ? await sock.groupMetadata(msg.key.remoteJid)
      : null;

    // Regex untuk mendeteksi tautan WhatsApp (grup, broadcast, wa.me)
    const waGroupLinkRegex = /https?:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+/; // Grup WhatsApp
    const waBroadcastLinkRegex = /https?:\/\/whatsapp\.com\/channel\/[a-zA-Z0-9]+/; // Broadcast WhatsApp
    const waMeLinkRegex = /https?:\/\/wa\.me\/[0-9]+(\?text=[^ ]+)?/; // wa.me dengan atau tanpa query

    // Gabungkan semua regex
    const allWhatsAppLinksRegex = new RegExp(
      `${waGroupLinkRegex.source}|${waBroadcastLinkRegex.source}|${waMeLinkRegex.source}`
    );

    // Deteksi tautan WhatsApp
    if (isGroup && allWhatsAppLinksRegex.test(body)) {
      const isAdmin = groupMetadata.participants.some(
        (p) =>
          p.id === senderId &&
          (p.admin === "admin" || p.admin === "superadmin")
      );

      // Periksa apakah anti-link diaktifkan untuk grup ini
      if (antiLinkConfig[msg.key.remoteJid]) {
        if (!isAdmin) {
          // Hapus pesan
          await sock.sendMessage(msg.key.remoteJid, {
            delete: {
              remoteJid: msg.key.remoteJid,
              fromMe: false,
              id: msg.key.id,
              participant: senderId,
            },
          });

          // Kirim peringatan
          await sock.sendMessage(msg.key.remoteJid, {
            text: `⚠️ @${senderId.split("@")[0]}, mengirim tautan WhatsApp tidak diperbolehkan di grup ini.`,
            mentions: [senderId],
          });

          console.log(`❌ Pesan dengan link WhatsApp dihapus dari ${senderId}`);
        } else {
          console.log(`✅ Admin ${senderId} mengirim link WhatsApp, diabaikan.`);
        }
      }
    }

    // Deteksi kata-kata terlarang
    if (isGroup && forbiddenWords.some((word) => body.toLowerCase().includes(word))) {
      const isAdmin = groupMetadata.participants.some(
        (p) =>
          p.id === senderId &&
          (p.admin === "admin" || p.admin === "superadmin")
      );

      if (!isAdmin) {
        // Hapus pesan
        await sock.sendMessage(msg.key.remoteJid, {
          delete: {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: msg.key.id,
            participant: senderId,
          },
        });

        // Kirim peringatan
        await sock.sendMessage(msg.key.remoteJid, {
          text: `⚠️ @${senderId.split("@")[0]}, kata-kata yang Anda gunakan tidak diperbolehkan di grup ini.`,
          mentions: [senderId],
        });

        console.log(`❌ Pesan dengan kata terlarang dihapus dari ${senderId}`);
      } else {
        console.log(`✅ Admin ${senderId} mengirim pesan dengan kata terlarang, diabaikan.`);
      }
    }
  },
  antiLinkConfig, // Ekspor antiLinkConfig
};