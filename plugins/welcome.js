module.exports = async function handleWelcome(sock, update, welcomeConfig) {
  const { id, participants, action } = update;

  // Cek apakah fitur welcome aktif di grup ini
  const config = welcomeConfig[id];
  if (!config || !config.enabled) {
    console.log(`❌ Welcome & event dimatikan untuk grup ${id}`);
    return;
  }

  for (const participant of participants) {
    const tag = `@${participant.split("@")[0]}`;
    let message = "";
    let profilePictureUrl = "https://via.placeholder.com/150";

    try {
      profilePictureUrl = await sock.profilePictureUrl(participant, "image");
    } catch {}

    if (action === "add") {
      const welcomeText = config.text || `
Welcome @tag to the group! 🎉
Semoga betah di sini!
Jangan lupa untuk memperkenalkan diri!

*RULES:*
1. Jaga sikap dan perilaku
2. Gore, PORN, dan hal-hal yang tidak pantas dilarang
3. Jangan spam
4. VIRTEX 
5. Jika ada yang melanggar, silakan laporkan ke admin
6. Admin friendly, santai aja yang penting sopan
7. *DONT SPAM CALL n SPAM ADMIN*
8. *DONT SHARE LINK GROUP/BROADCAST*
9. *WORD BANNED: ISRAEL, JUDI, PORN, dll*
      `;
      message = welcomeText.replace(/@tag/g, tag);
    }

    if (action === "remove") {
      message = `👋 ${tag} telah keluar dari grup. Semoga sukses di jalanmu!`;
    }

    if (action === "promote") {
      message = `🎉 ${tag} sekarang jadi admin! Hormat broo! 👑`;
    }

    if (action === "demote") {
      message = `😅 ${tag} dicopot dari admin. Terima kasih atas jasamu.`;
    }

    if (message) {
      try {
        await sock.sendMessage(id, {
          image: { url: profilePictureUrl },
          caption: message,
          mentions: [participant],
        });
        console.log(`✅ Pesan ${action} dikirim ke ${tag}`);
      } catch (error) {
        console.error(`❌ Gagal mengirim pesan ${action} ke ${tag}:`, error);
      }
    }
  }
};
