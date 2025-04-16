const fs = require("fs");
const reminderFile = "grupreminder.json";

// Muat pengingat grup dari file
function loadReminders() {
  if (fs.existsSync(reminderFile)) {
    try {
      const fileContent = fs.readFileSync(reminderFile, "utf-8");
      return fileContent.trim() ? JSON.parse(fileContent) : {};
    } catch (error) {
      console.error("❌ Gagal memuat file groupReminders.json:", error);
      return {};
    }
  }
  return {};
}

// Simpan pengingat grup ke file
function saveReminders(reminders) {
  try {
    fs.writeFileSync(reminderFile, JSON.stringify(reminders, null, 2));
  } catch (error) {
    console.error("❌ Gagal menyimpan file groupReminders.json:", error);
  }
}

const groupReminders = loadReminders();

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

// Fungsi untuk mengatur pengingat custom
module.exports.setReminder = async function (sock, from, body) {
  const args = body.split(" ");
  const time = args[1]; // Format waktu: HH:mm
  const reminderText = args.slice(2).join(" ");

  if (!time || !reminderText) {
    await sock.sendMessage(from, {
      text: "❌ Format salah! Gunakan: !settime [HH:mm] [teks pengingat]",
    });
    return;
  }

  const [hour, minute] = time.split(":").map(Number);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    await sock.sendMessage(from, {
      text: "❌ Format waktu tidak valid! Gunakan format HH:mm (contoh: 06:00).",
    });
    return;
  }

  groupReminders[from] = groupReminders[from] || [];
  groupReminders[from].push({ time: `${hour}:${minute}`, text: reminderText });
  saveReminders(groupReminders);

  await sock.sendMessage(from, {
    text: `✅ Pengingat berhasil ditambahkan untuk jam ${time}: ${reminderText}`,
  });
};

// Fungsi untuk menampilkan daftar pengingat
module.exports.listReminders = async function (sock, from) {
  const reminders = groupReminders[from] || [];
  if (reminders.length === 0) {
    await sock.sendMessage(from, {
      text: "❌ Tidak ada pengingat yang aktif untuk grup ini.",
    });
    return;
  }

  const reminderList = reminders
    .map((r, i) => `${i + 1}. ⏰ ${r.time} - ${r.text}`)
    .join("\n");

  await sock.sendMessage(from, {
    text: `📋 *Daftar Pengingat Grup:*\n\n${reminderList}`,
  });
};

// Fungsi untuk memeriksa dan mengirim pengingat
module.exports.checkReminders = async function (sock) {
  const now = new Date();
  const currentTime = `${now.getHours()}:${now.getMinutes()}`;

  for (const [groupId, reminders] of Object.entries(groupReminders)) {
    reminders.forEach(async (reminder) => {
      if (reminder.time === currentTime) {
        try {
          await sock.sendMessage(groupId, {
            text: `⏰ Pengingat: ${reminder.text}`,
          });
        } catch (error) {
          console.error(`❌ Gagal mengirim pengingat ke grup ${groupId}:`, error);
        }
      }
    });
  }
};