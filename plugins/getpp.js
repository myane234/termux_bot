module.exports = async function handleGetPP(sock, msg, body) {
    try {
      const from = msg.key.remoteJid;
      const args = body.split(" ");
      let targetId;
  
      // Periksa apakah ada tag atau nomor
      if (
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0
      ) {
        targetId =
          msg.message.extendedTextMessage.contextInfo.mentionedJid[0]; // Ambil ID dari tag
      } else if (args.length > 1 && /^\d+$/.test(args[1])) {
        targetId = args[1] + "@s.whatsapp.net"; // Ambil ID dari nomor
      } else {
        await sock.sendMessage(from, {
          text: "❌ Format salah! Gunakan: !getpp [@tag atau nomor]",
        });
        return;
      }
  
      console.log(`🔍 Mendapatkan PP untuk ID: ${targetId}`);
  
      // Ambil profile picture
      let profilePictureUrl;
      try {
        profilePictureUrl = await sock.profilePictureUrl(targetId, "image");
      } catch {
        profilePictureUrl = "https://via.placeholder.com/150"; // Gambar default jika tidak ada PP
      }
  
      // Kirim PP ke pengguna
      await sock.sendMessage(from, {
        image: { url: profilePictureUrl },
        caption: `🖼️ Profile Picture untuk ${targetId.replace(
          "@s.whatsapp.net",
          ""
        )}`,
      });
  
      console.log(`✅ PP berhasil dikirim untuk ID: ${targetId}`);
    } catch (error) {
      console.error("❌ Gagal memproses perintah !getpp:", error);
      const from = msg.key.remoteJid;
      await sock.sendMessage(from, {
        text: "❌ Terjadi kesalahan saat memproses perintah !getpp.",
      });
    }
  };