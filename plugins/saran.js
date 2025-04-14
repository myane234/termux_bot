const mutedUsers = {}; // Objek untuk menyimpan daftar pengguna yang dimute per grup
const antiMuteUsers = {}; // Objek untuk menyimpan daftar pengguna yang tidak bisa dimute per grup
const botNumber = "6285721829539@s.whatsapp.net"; // Ganti dengan nomor bot Anda

module.exports = async function handleGroupCommands(sock, msg, body, isGroup, senderId) {
  const from = msg.key.remoteJid;

  if (!isGroup) {
    await sock.sendMessage(from, {
      text: "❌ Perintah ini hanya dapat digunakan di grup.",
    });
    return;
  }

  const groupMetadata = await sock.groupMetadata(from);
  const isAdmin = groupMetadata.participants.some(
    (p) =>
      p.id === senderId &&
      (p.admin === "admin" || p.admin === "superadmin")
  );

  if (!isAdmin) {
    await sock.sendMessage(from, {
      text: "❌ Perintah ini hanya dapat digunakan oleh admin grup.",
    });
    return;
  }
  
  // Perintah !add [nomor telepon]
if (body.startsWith("!add")) {
  console.log("✅ Perintah !add diterima, memproses...");
  try {
    const args = body.split(" ");
    if (args.length < 2) {
      await sock.sendMessage(from, {
        text: "❌ Format salah! Gunakan: !add [nomor telepon tanpa + atau dengan +].",
      });
      return;
    }

    let phoneNumber = args[1].replace(/[^0-9+]/g, ""); // Ambil angka dan tanda +
    if (phoneNumber.startsWith("+")) {
      phoneNumber = phoneNumber.replace("+", ""); // Hapus tanda +
    }

    const jid = `${phoneNumber}@s.whatsapp.net`;

    await sock.groupParticipantsUpdate(from, [jid], "add");
    console.log(`✅ Berhasil menambahkan anggota: ${jid}`);

    await sock.sendMessage(from, {
      text: `✅ Berhasil menambahkan anggota dengan nomor ${phoneNumber}.`,
    });
  } catch (error) {
    console.error("❌ Gagal memproses perintah !add:", error);
    await sock.sendMessage(from, {
      text: "❌ Terjadi kesalahan saat memproses perintah !add.",
    });
  }
}

if (body.startsWith("!kick")) {
  console.log("✅ Perintah !kick diterima, memproses...");
  try {
    const mentionedJid =
      msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

    if (!mentionedJid || mentionedJid.length === 0) {
      await sock.sendMessage(from, {
        text: "❌ Harap tag anggota yang ingin dikeluarkan.",
      });
      return;
    }

    for (const jid of mentionedJid) {
      await sock.groupParticipantsUpdate(from, [jid], "remove");
      console.log(`✅ Berhasil mengeluarkan anggota: ${jid}`);
    }

    await sock.sendMessage(from, {
      text: `✅ Berhasil mengeluarkan anggota yang ditandai.`,
    });
  } catch (error) {
    console.error("❌ Gagal memproses perintah !kick:", error);
    await sock.sendMessage(from, {
      text: "❌ Terjadi kesalahan saat memproses perintah !kick.",
    });
  }
}
  // Perintah !listmute
if (body.startsWith("!listmute")) {
  console.log("✅ Perintah !listmute diterima, memproses...");
  try {
    if (!mutedUsers[from] || Object.keys(mutedUsers[from]).length === 0) {
      await sock.sendMessage(from, {
        text: "✅ Tidak ada anggota yang dimute di grup ini.",
      });
      return;
    }

    const mutedList = Object.keys(mutedUsers[from])
      .map((jid, index) => `${index + 1}. @${jid.split("@")[0]}`)
      .join("\n");

    await sock.sendMessage(from, {
      text: `🔇 *Daftar anggota yang dimute:*\n${mutedList}`,
      mentions: Object.keys(mutedUsers[from]),
    });
  } catch (error) {
    console.error("❌ Gagal memproses perintah !listmute:", error);
    await sock.sendMessage(from, {
      text: "❌ Terjadi kesalahan saat memproses perintah !listmute.",
    });
  }
}

  // Perintah !mute [@tag atau nomor]
  if (body.startsWith("!mute")) {
    console.log("✅ Perintah !mute diterima, memproses...");
    try {
      const mentionedJid =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

      if (!mentionedJid || mentionedJid.length === 0) {
        await sock.sendMessage(from, {
          text: "❌ Harap tag anggota yang ingin dimute.",
        });
        return;
      }

      for (const jid of mentionedJid) {
        // Abaikan jika pengguna adalah bot
        if (jid === botNumber) {
          console.log(`❌ Pengguna ${jid} adalah bot dan tidak dapat dimute.`);
          await sock.sendMessage(from, {
            text: `❌ Pengguna @${jid.split("@")[0]} adalah bot dan tidak dapat dimute.`,
            mentions: [jid],
          });
          continue;
        }

        // Abaikan jika pengguna ada di daftar anti-mute
        if (antiMuteUsers[from] && antiMuteUsers[from][jid]) {
          console.log(`❌ Pengguna ${jid} tidak dapat dimute karena ada di daftar anti-mute.`);
          await sock.sendMessage(from, {
            text: `❌ Pengguna @${jid.split("@")[0]} tidak dapat dimute karena ada di daftar anti-mute.`,
            mentions: [jid],
          });
          continue;
        }

        if (!mutedUsers[from]) mutedUsers[from] = {};
        mutedUsers[from][jid] = true; // Tambahkan pengguna ke daftar mute
        console.log(`✅ Pengguna ${jid} telah dimute.`);
      }

      await sock.sendMessage(from, {
        text: `✅ Pengguna yang ditandai telah dimute. Pesan mereka akan dihapus.`,
      });
    } catch (error) {
      console.error("❌ Gagal memproses perintah !mute:", error);
      await sock.sendMessage(from, {
        text: "❌ Terjadi kesalahan saat memproses perintah !mute.",
      });
    }
  }

  // Perintah !unmute [@tag atau nomor]
  if (body.startsWith("!unmute")) {
    console.log("✅ Perintah !unmute diterima, memproses...");
    try {
      const mentionedJid =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

      if (!mentionedJid || mentionedJid.length === 0) {
        await sock.sendMessage(from, {
          text: "❌ Harap tag anggota yang ingin di-unmute.",
        });
        return;
      }

      for (const jid of mentionedJid) {
        if (mutedUsers[from] && mutedUsers[from][jid]) {
          delete mutedUsers[from][jid]; // Hapus pengguna dari daftar mute
          console.log(`✅ Pengguna ${jid} telah di-unmute.`);
        }
      }

      await sock.sendMessage(from, {
        text: `✅ Pengguna yang ditandai telah di-unmute.`,
      });
    } catch (error) {
      console.error("❌ Gagal memproses perintah !unmute:", error);
      await sock.sendMessage(from, {
        text: "❌ Terjadi kesalahan saat memproses perintah !unmute.",
      });
    }
  }

  // Perintah !antimute [@tag atau nomor]
  if (body.startsWith("!antimute")) {
    console.log("✅ Perintah !antimute diterima, memproses...");
    try {
      const mentionedJid =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

      if (!mentionedJid || mentionedJid.length === 0) {
        await sock.sendMessage(from, {
          text: "❌ Harap tag anggota yang ingin ditambahkan ke daftar anti-mute.",
        });
        return;
      }

      for (const jid of mentionedJid) {
        if (!antiMuteUsers[from]) antiMuteUsers[from] = {};
        antiMuteUsers[from][jid] = true; // Tambahkan pengguna ke daftar anti-mute
        console.log(`✅ Pengguna ${jid} telah ditambahkan ke daftar anti-mute.`);
      }

      await sock.sendMessage(from, {
        text: `✅ Pengguna yang ditandai telah ditambahkan ke daftar anti-mute.`,
      });
    } catch (error) {
      console.error("❌ Gagal memproses perintah !antimute:", error);
      await sock.sendMessage(from, {
        text: "❌ Terjadi kesalahan saat memproses perintah !antimute.",
      });
    }
  }

  // Perintah !unantimute [@tag atau nomor]
  if (body.startsWith("!unantimute")) {
    console.log("✅ Perintah !unantimute diterima, memproses...");
    try {
      const mentionedJid =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

      if (!mentionedJid || mentionedJid.length === 0) {
        await sock.sendMessage(from, {
          text: "❌ Harap tag anggota yang ingin dihapus dari daftar anti-mute.",
        });
        return;
      }

      for (const jid of mentionedJid) {
        if (antiMuteUsers[from] && antiMuteUsers[from][jid]) {
          delete antiMuteUsers[from][jid]; // Hapus pengguna dari daftar anti-mute
          console.log(`✅ Pengguna ${jid} telah dihapus dari daftar anti-mute.`);
        }
      }

      await sock.sendMessage(from, {
        text: `✅ Pengguna yang ditandai telah dihapus dari daftar anti-mute.`,
      });
    } catch (error) {
      console.error("❌ Gagal memproses perintah !unantimute:", error);
      await sock.sendMessage(from, {
        text: "❌ Terjadi kesalahan saat memproses perintah !unantimute.",
      });
    }
  }
};

// Fungsi untuk memeriksa dan menghapus pesan dari pengguna yang dimute
module.exports.checkMutedUsers = async function (sock, msg, isGroup) {
  if (!isGroup) return;

  const from = msg.key.remoteJid;
  const senderId = msg.key.participant || from;

  // Abaikan jika pengirim adalah bot
  if (senderId === botNumber) return;

  if (mutedUsers[from] && mutedUsers[from][senderId]) {
    console.log(`🔇 Pesan dari ${senderId} dihapus karena pengguna dimute.`);
    await sock.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: false,
        id: msg.key.id,
        participant: senderId,
      },
    });
  }
};