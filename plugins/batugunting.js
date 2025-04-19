const fs = require("fs");
const suitFile = "suit.json";

// Fungsi untuk memuat data room dari file JSON
function loadSuitData() {
  if (fs.existsSync(suitFile)) {
    return JSON.parse(fs.readFileSync(suitFile, "utf-8"));
  }
  return {};
}

// Fungsi untuk menyimpan data room ke file JSON
function saveSuitData(data) {
    try {
      fs.writeFileSync(suitFile, JSON.stringify(data, null, 2));
      console.log("✅ Data room berhasil disimpan ke suit.json:", data);
    } catch (error) {
      console.error("❌ Gagal menyimpan data room ke suit.json:", error);
    }
  }

// Fungsi untuk menentukan pemenang
function determineWinner(player1Choice, player2Choice) {
  if (player1Choice === player2Choice) return "draw";
  if (
    (player1Choice === "batu" && player2Choice === "gunting") ||
    (player1Choice === "gunting" && player2Choice === "kertas") ||
    (player1Choice === "kertas" && player2Choice === "batu")
  ) {
    return "player1";
  }
  return "player2";
}

// Mode melawan bot
async function handleSuitBot(sock, from, senderId, body, userData, saveUserData) {
  const args = body.split(" ");
  if (args.length < 3) {
    await sock.sendMessage(from, {
      text: "❌ Format salah! Gunakan: !suit [taruhan] [batu/gunting/kertas]",
    });
    return;
  }

  const bet = parseInt(args[1]);
  const playerChoice = args[2].toLowerCase();

  if (isNaN(bet) || bet <= 0) {
    await sock.sendMessage(from, {
      text: "❌ Taruhan harus berupa angka positif.",
    });
    return;
  }

  if (!["batu", "gunting", "kertas"].includes(playerChoice)) {
    await sock.sendMessage(from, {
      text: "❌ Pilihan harus batu, gunting, atau kertas.",
    });
    return;
  }

  if (!userData[senderId] || userData[senderId].money < bet) {
    await sock.sendMessage(from, {
      text: "❌ Uang Anda tidak cukup untuk taruhan ini.",
    });
    return;
  }

  const botChoice = ["batu", "gunting", "kertas"][
    Math.floor(Math.random() * 3)
  ];
  const result = determineWinner(playerChoice, botChoice);

  let message = `🤖 Bot memilih: ${botChoice}\n`;
  if (result === "draw") {
    message += "⚖️ Hasil: Seri!";
  } else if (result === "player1") {
    userData[senderId].money += bet;
    userData[senderId].winrate = userData[senderId].winrate || { win: 0, lose: 0 };
    userData[senderId].winrate.win += 1;
    message += `🎉 Anda menang! Anda mendapatkan $${bet}.`;
  } else {
    userData[senderId].money -= bet;
    userData[senderId].winrate = userData[senderId].winrate || { win: 0, lose: 0 };
    userData[senderId].winrate.lose += 1;
    message += `❌ Anda kalah! Anda kehilangan $${bet}.`;
  }

  saveUserData();
  await sock.sendMessage(from, { text: message });
}

// Membuat room duel
async function handleCreateSuit(sock, from, senderId, body, userData) {
  const args = body.split(" ");
  if (args.length < 3) {
    await sock.sendMessage(from, {
      text: "❌ Format salah! Gunakan: !crsuit [nama-room] [taruhan]",
    });
    return;
  }

  const roomName = args[1];
  const bet = parseInt(args[2]);

  if (isNaN(bet) || bet <= 0) {
    await sock.sendMessage(from, {
      text: "❌ Taruhan harus berupa angka positif.",
    });
    return;
  }

  if (!userData[senderId] || userData[senderId].money < bet) {
    await sock.sendMessage(from, {
      text: "❌ Uang Anda tidak cukup untuk taruhan ini.",
    });
    return;
  }

  const suitData = loadSuitData();

  if (suitData[roomName]) {
    await sock.sendMessage(from, {
      text: "❌ Room dengan nama tersebut sudah ada. Gunakan nama lain.",
    });
    return;
  }

  suitData[roomName] = {
    roomName,
    groupId: from,
    player1: senderId,
    player2: null,
    bet,
    player1Choice: null,
    player2Choice: null,
  };

  saveSuitData(suitData);

  await sock.sendMessage(from, {
    text: `✅ Room "${roomName}" berhasil dibuat dengan taruhan $${bet}. Pemain lain dapat bergabung dengan mengetik !acc ${roomName}.`,
  });
}

// Pemain kedua bergabung
async function handleAcceptSuit(sock, from, senderId, body, userData) {
  const args = body.split(" ");
  if (args.length < 2) {
    await sock.sendMessage(from, {
      text: "❌ Format salah! Gunakan: !acc [nama-room]",
    });
    return;
  }

  const roomName = args[1];
  const suitData = loadSuitData();
  const room = suitData[roomName];

  if (!room) {
    await sock.sendMessage(from, {
      text: "❌ Room tidak ditemukan.",
    });
    return;
  }

  if (room.player2) {
    await sock.sendMessage(from, {
      text: "❌ Room ini sudah penuh.",
    });
    return;
  }

  if (!userData[senderId] || userData[senderId].money < room.bet) {
    await sock.sendMessage(from, {
      text: "❌ Uang Anda tidak cukup untuk taruhan ini.",
    });
    return;
  }

  room.player2 = senderId;
saveSuitData(suitData);
console.log("✅ Pemain kedua bergabung ke room:", suitData[roomName]);

  // Kirim pesan ke personal chat kedua pemain
  await sock.sendMessage(room.player1, {
    text: `🎮 Anda berada di room "${roomName}". Lawan Anda adalah ${senderId.replace(
      "@s.whatsapp.net",
      ""
    )}. Silakan kirim pilihan Anda (batu/gunting/kertas) dengan mengetik *!s [pilihan]*.`,
  });
  await sock.sendMessage(room.player2, {
    text: `🎮 Anda berada di room "${roomName}". Lawan Anda adalah ${room.player1.replace(
      "@s.whatsapp.net",
      ""
    )}. Silakan kirim pilihan Anda (batu/gunting/kertas) dengan mengetik *!s [pilihan]*.`,
  });

  await sock.sendMessage(from, {
    text: `✅ Anda telah bergabung ke room "${roomName}". Silakan kirim pilihan Anda melalui chat pribadi bot.`,
  });
}

// Pemain mengirimkan pilihan
async function handlePlayerChoice(sock, senderId, body, userData) {
  const suitData = loadSuitData();
  const room = Object.values(suitData).find(
    (r) => r.player1 === senderId || r.player2 === senderId
  );

  if (!room) {
    await sock.sendMessage(senderId, {
      text: "❌ Anda tidak sedang berada di room mana pun.",
    });
    return;
  }

  const choice = body.trim().toLowerCase();
  if (!["batu", "gunting", "kertas"].includes(choice)) {
    await sock.sendMessage(senderId, {
      text: "❌ Pilihan tidak valid! Gunakan: batu, gunting, atau kertas.",
    });
    return;
  }

  if (room.player1 === senderId) {
    if (room.player1Choice) {
      await sock.sendMessage(senderId, {
        text: "❌ Anda sudah memilih. Menunggu pemain lain...",
      });
      return;
    }
    room.player1Choice = choice;
  } else if (room.player2 === senderId) {
    if (room.player2Choice) {
      await sock.sendMessage(senderId, {
        text: "❌ Anda sudah memilih. Menunggu pemain lain...",
      });
      return;
    }
    room.player2Choice = choice;
  }

  saveSuitData(suitData);

  // Jika kedua pemain sudah memilih, proses hasil duel
  if (room.player1Choice && room.player2Choice) {
    await processDuelResult(sock, room.roomName, userData);
  }
}

// Proses hasil duel
async function processDuelResult(sock, roomName, userData) {
  const suitData = loadSuitData();
  const room = suitData[roomName];

  if (!room || !room.player1Choice || !room.player2Choice) return;

  const result = determineWinner(room.player1Choice, room.player2Choice);
  let message = `🎮 *Hasil duel di room "${roomName}":*\n`;
  message += `👤 Pemain 1 (${room.player1}): ${room.player1Choice}\n`;
  message += `👤 Pemain 2 (${room.player2}): ${room.player2Choice}\n`;

  if (result === "draw") {
    message += "⚖️ Hasil: Seri!";
  } else if (result === "player1") {
    userData[room.player1].money += room.bet;
    userData[room.player2].money -= room.bet;
    message += `🎉 Pemenang: Pemain 1 (${room.player1})!`;
  } else {
    userData[room.player1].money -= room.bet;
    userData[room.player2].money += room.bet;
    message += `🎉 Pemenang: Pemain 2 (${room.player2})!`;
  }

  saveUserData();
  await sock.sendMessage(room.groupId, { text: message });

  // Hapus room setelah selesai
  delete suitData[roomName];
  saveSuitData(suitData);
}

// Cek daftar room
async function handleRoomList(sock, from) {
    const suitData = loadSuitData();
    console.log("ℹ️ Data room yang dimuat dari suit.json:", suitData);
  
    const roomList = Object.keys(suitData)
      .map((roomName) => `- ${roomName} (Taruhan: $${suitData[roomName].bet})`)
      .join("\n");
  
    const message = roomList
      ? `📜 *Daftar Room yang Tersedia:*\n${roomList}`
      : "❌ Tidak ada room yang tersedia.";
  
    await sock.sendMessage(from, { text: message });
  }

// Cek winrate
async function handleCheckWinrate(sock, from, senderId, body, userData) {
  const args = body.split(" ");
  let targetId = senderId;

  if (args.length > 1) {
    const mentionedId = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (mentionedId) targetId = mentionedId;
  }

  if (!userData[targetId] || !userData[targetId].winrate) {
    await sock.sendMessage(from, {
      text: "❌ Pengguna ini belum memiliki data winrate.",
    });
    return;
  }

  const { win, lose } = userData[targetId].winrate;
  const total = win + lose;
  const winrate = total > 0 ? ((win / total) * 100).toFixed(2) : 0;

  await sock.sendMessage(from, {
    text: `📊 Winrate ${targetId.replace("@s.whatsapp.net", "")}:\nMenang: ${win}\nKalah: ${lose}\nWinrate: ${winrate}%`,
  });
}

module.exports = {
  handleSuitBot,
  handleCreateSuit,
  handleAcceptSuit,
  handlePlayerChoice,
  processDuelResult,
  handleRoomList,
  handleCheckWinrate,
};