
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeInMemoryStore,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const axios = require("axios");
const qrcode = require("qrcode-terminal");
const path = require("path");
const { exec } = require("child_process");
const { handleDownloadCommand } = require("./downloadHandler");
const kerang = require("./plugins/kerang");
const kontol = require('./plugins/kontol');
const { handleAntiLink, antiLinkConfig } = require("./plugins/antilink");
const handleGroupCommands = require("./plugins/saran");
const handleToImg = require("./plugins/toimg");

const MAX_MONEY = 1000000000; // Batas maksimum uang ($1 miliar)
const assetDataFile = "assets.json";

// File untuk menyimpan data pengguna
const userDataFile = "userData.json";

// Muat data pengguna
let userData = {};
if (fs.existsSync(userDataFile)) {
  try {
    const fileContent = fs.readFileSync(userDataFile, "utf-8");
    userData = fileContent.trim() ? JSON.parse(fileContent) : {};
  } catch (error) {
    console.error("❌ Gagal memuat file userData.json:", error);
    userData = {}; // Reset ke objek kosong jika terjadi error
  }
} else {
  // Inisialisasi file jika belum ada
  fs.writeFileSync(userDataFile, JSON.stringify({}, null, 2));
}

// Fungsi untuk menyimpan data pengguna
function saveUserData() {
  try {
    fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
  } catch (error) {
    console.error("❌ Gagal menyimpan file userData.json:", error);
  }
}

let assets = [
  { name: "Dogecoin", price: 6, previousPrice: 25, history: [] },
  { name: "Bitcoin", price: 90, previousPrice: 90, history: [] },
  { name: "Emas", price: 30, previousPrice: 30, history: [] },
  { name: "Ethereum", price: 50, previousPrice: 50, history: [] },
  { name: "Litecoin", price: 25, previousPrice: 25, history: [] },
  { name: "USD", price: 1, previousPrice: 1, history: [] }, // Tambahkan USD
  { name: "IDR", price: 15000, previousPrice: 15000, history: [] }, // Tambahkan IDR
  { name: "JPY", price: 1500, previousPrice: 1500, history: [] }, // Tambahkan JPY
  { name: "CNY", price: 2000, previousPrice: 2000, history: [] }, // Tambahkan CNY
  {name: "SGD", price: 2000, previousPrice: 2000, history: []}, // Tambahkan SGD
];

const jobConfig = {
  "Tukang Sampah": { absencesPerDay: 1, salaryPerAbsence: 10 },
  "Petugas Kebersihan": { absencesPerDay: 2, salaryPerAbsence: 13 },
  Kurir: { absencesPerDay: 3, salaryPerAbsence: 15 },
  Kasir: { absencesPerDay: 1, salaryPerAbsence: 20 },
  Penjual: { absencesPerDay: 2, salaryPerAbsence: 25 },
  "Asisten Kantor": { absencesPerDay: 3, salaryPerAbsence: 10 },
};
function getExpForNextLevel(level) {
  return level * 100;
}
// Muat harga aset dari file jika ada
if (fs.existsSync(assetDataFile)) {
  try {
    const fileContent = fs.readFileSync(assetDataFile, "utf-8");
    const loadedAssets = JSON.parse(fileContent);
    assets.forEach((asset, index) => {
      if (loadedAssets[index]) {
        asset.price = loadedAssets[index].price;
      }
    });
    console.log("✅ Harga aset berhasil dimuat dari file.");
  } catch (error) {
    console.error("❌ Gagal memuat harga aset dari file:", error);
  }
}


  
async function fetchRealTimePrices() {
    try {
     
      const cryptoResponse = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        {
          params: {
            ids: "dogecoin,bitcoin,ethereum,litecoin", 
            vs_currencies: "usd", 
          },
        }
      );
  
      const cryptoPrices = cryptoResponse.data;
  
     
      const forexResponse = await axios.get(
        "https://api.exchangerate-api.com/v4/latest/USD"
      );
  
      const forexRates = forexResponse.data.rates;
  
      // Update harga aset
      assets.forEach((asset) => {
        const id = asset.name.toLowerCase();
  
        if (cryptoPrices[id]) {

          asset.previousPrice = asset.price;
          asset.price = cryptoPrices[id].usd;
        } else if (id === "usd") {
    
          asset.previousPrice = asset.price;
          asset.price = 1;
        } else if (id === "idr") {
          
          asset.previousPrice = asset.price;
          asset.price = forexRates.IDR; 
        } else if (id === "jpy") {
            asset.previousPrice = asset.price;
            asset.price = forexRates.JPY; 
        } else if (id === "cny") {
            asset.previousPrice = asset.price;
            asset.price = forexRates.CNY; 
        } else if (id === "sgd") {
            asset.previousPrice = asset.price;
            asset.price = forexRates.SGD; 
        }
  
     
        if (!asset.history) {
          asset.history = [];
        }
        asset.history.push(asset.price);
  
        
        if (asset.history.length > 10) {
          asset.history.shift();
        }
      });
  
      console.log("✅ Harga aset diperbarui secara real-time:", assets);
    } catch (error) {
      console.error("❌ Gagal memperbarui harga aset secara real-time:", error);
    }
  }

function saveAssetPrices() {
  try {
    fs.writeFileSync(assetDataFile, JSON.stringify(assets, null, 2));
    console.log("✅ Harga aset dan riwayat berhasil disimpan ke file.");
  } catch (error) {
    console.error("❌ Gagal menyimpan harga aset ke file:", error);
  }
}

function formatMoney(amount) {
  return `$${amount.toLocaleString("en-US")}`;
}

//werewolf
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class WerewolfGame {
  constructor() {
    this.resetGame();
  }

  resetGame() {
    this.roomActive = false;
    this.players = {};
    this.werewolf = null;
    this.seer = null;
    this.villager = [];
    this.night = false;
    this.votes = {};
    this.timer = null;
    this.phase = "";
    this.usernameMap = {}; 
    this.actions = { kill: false, check: false }; 
  }

  getPlayerList() {
    const alivePlayers = Object.entries(this.players)
      .filter(([_, player]) => player.alive)
      .map(([id, player], i) => {
        const phoneNumber = id.replace("@s.whatsapp.net", ""); // Ambil nomor telepon
        return `${i + 1}. ✅ ${this.usernameMap[id]} (${phoneNumber})`;
      });
  
    const deadPlayers = Object.entries(this.players)
      .filter(([_, player]) => !player.alive)
      .map(([id, player], i) => {
        const phoneNumber = id.replace("@s.whatsapp.net", ""); // Ambil nomor telepon
        return `${i + 1}. ❌ ${this.usernameMap[id]} (${phoneNumber})`;
      });
  
    return `📜 *Daftar Pemain:*\n\n🟢 *Hidup:*\n${alivePlayers.join("\n")}\n\n⚫ *Mati:*\n${deadPlayers.join("\n")}`;
  }

  async startRoom(sock, chatId) {
    if (this.roomActive)
      return sock.sendMessage(chatId, {
        text: "❌ Game sedang berlangsung.",
      });
    this.resetGame();
    this.roomActive = true;
    await sock.sendMessage(chatId, {
      text: "🎮 Room Werewolf telah dibuat! Ketik *!join [username]* untuk ikut bermain.",
    });
  }

  async joinGame(sock, chatId, senderId, pushName, args, userData) {
    if (!this.roomActive) {
      return sock.sendMessage(chatId, {
        text: "❌ Belum ada room yang aktif. Ketik *!werewolf* untuk membuat room.",
      });
    }
  
    if (this.players[senderId]) {
      return sock.sendMessage(chatId, {
        text: "❌ Kamu sudah bergabung.",
      });
    }
  
    // Validasi akun
    if (!userData[senderId]) {
      return sock.sendMessage(chatId, {
        text: "❌ Kamu belum memiliki akun. Gunakan perintah *!create* untuk membuat akun.",
      });
    }
  
    const name = args.join(" ");
  
    // Validasi nama
    if (!/^[a-z]{1,6}$/.test(name)) {
      return sock.sendMessage(chatId, {
        text: "❌ Nama tidak valid. Nama harus terdiri dari huruf kecil (a-z), tanpa spasi, dan maksimal 6 karakter.",
      });
    }
  
    const isNameTaken = Object.values(this.usernameMap).some(
      (existingName) => existingName.toLowerCase() === name.toLowerCase()
    );
  
    if (isNameTaken) {
      return sock.sendMessage(chatId, {
        text: "❌ Nama sudah digunakan oleh pemain lain. Silakan pilih nama lain.",
      });
    }
  
    // Tambahkan pemain ke daftar
    this.players[senderId] = { name, alive: true };
    this.usernameMap[senderId] = name;
  
    // Ambil nomor telepon dari senderId
    const phoneNumber = senderId.replace("@s.whatsapp.net", "");
  
    await sock.sendMessage(chatId, {
      text: `✅ ${name} (${phoneNumber}) telah bergabung dalam permainan.`,
    });
  }

  async startGame(sock, chatId) {
    if (!this.roomActive) {
      return sock.sendMessage(chatId, {
        text: "❌ Tidak ada room aktif. Ketik *!werewolf* untuk membuat room.",
      });
    }
  
    if (this.phase !== "") {
      return sock.sendMessage(chatId, {
        text: "❌ Game sudah dimulai. Tidak bisa memulai ulang.",
      });
    }
  
    const playerIds = Object.keys(this.players);
    if (playerIds.length < 4) {
      return sock.sendMessage(chatId, {
        text: "❌ Minimal 4 pemain untuk memulai.",
      });
    }
  
    const shuffled = shuffle(playerIds);
    this.werewolf = shuffled[0];
    this.seer = shuffled[1];
    this.joker = shuffled[2]; // Tambahkan Joker
    this.villager = shuffled.slice(3);
  
    await sock.sendMessage(chatId, {
      text: `🎲 Game dimulai! Total pemain: ${playerIds.length}`,
    });
  
    await sock.sendMessage(this.werewolf, {
      text: "🐺 Kamu adalah *Werewolf*!",
    });
    await sock.sendMessage(this.seer, { text: "🔮 Kamu adalah *Seer*!" });
    await sock.sendMessage(this.joker, { text: "🤡 Kamu adalah *Joker*! Tugasmu adalah membuat pemain lain mem-vote kamu untuk menang!" });
    for (let id of this.villager) {
      await sock.sendMessage(id, { text: "👨‍🌾 Kamu adalah *Villager*!" });
    }
  
    this.night = true;
    this.phase = "night";
    await this.startNightPhase(sock, chatId);
  }

  async startNightPhase(sock, chatId) {
    this.votes = {};
    this.phase = "night";
    this.actions = { kill: false, check: false };
  
    // Cek jika hanya tersisa 2 pemain
    const alivePlayers = Object.entries(this.players)
      .filter(([_, player]) => player.alive)
      .map(([id]) => id);
  
    if (alivePlayers.length === 2) {
      await sock.sendMessage(chatId, {
        text: `🎉 Game selesai! Pemenang: Werewolf 🐺`,
      });
      return this.resetGame();
    }
  
    const mentions = alivePlayers;
  
    await sock.sendMessage(chatId, {
      text: `🌙 *Malam tiba!* Werewolf silakan kirim *!kill [nama]* di chat pribadi bot.
  Seer silakan kirim *!check [nama]* untuk melihat peran seseorang.`,
      mentions,
    });
  
    this.timer = setTimeout(() => this.startDayPhase(sock, chatId), 90000);
  }

  async startDayPhase(sock, chatId) {
    clearTimeout(this.timer);
    this.phase = "day";
    this.night = false;
  
    // Cek jika hanya tersisa 2 pemain
    const alivePlayers = Object.entries(this.players)
      .filter(([_, player]) => player.alive)
      .map(([id]) => id);
  
    if (alivePlayers.length === 2) {
      await sock.sendMessage(chatId, {
        text: `🎉 Game selesai! Pemenang: Werewolf 🐺`,
      });
      return this.resetGame();
    }
  
    const mentions = alivePlayers;
  
    await sock.sendMessage(chatId, {
      text: `☀️ *Siang tiba!* Diskusikan dan ketik *!vote [nomor]* untuk voting.`,
      mentions,
    });
  
    this.timer = setTimeout(() => this.endDayPhase(sock, chatId), 90000);
  }

  //end day phase
  async endDayPhase(sock, chatId, userData) {
    const voteCounts = Object.values(this.votes).reduce((acc, targetId) => {
      acc[targetId] = (acc[targetId] || 0) + 1;
      return acc;
    }, {});
  
    const voteResults = Object.entries(voteCounts)
      .map(
        ([targetId, count]) => `${this.usernameMap[targetId]} = ${count} suara`
      )
      .join("\n");
  
    await sock.sendMessage(chatId, {
      text: `📊 *Hasil Voting:*\n${voteResults}`,
    });
  
    const result = Object.entries(voteCounts).reduce(
      (a, b) => (b[1] > a[1] ? b : a),
      [null, 0]
    );
  
    if (result[0]) {
      this.players[result[0]].alive = false;
      await sock.sendMessage(chatId, {
        text: `⚰️ ${this.usernameMap[result[0]]} telah dieliminasi.`,
      });
  
      // Cek apakah Joker dieliminasi
      if (result[0] === this.joker) {
        await sock.sendMessage(chatId, {
          text: `🎉 Game selesai! Pemenang: Joker 🤡`,
        });
  
        // Berikan hadiah kepada Joker
        if (userData[result[0]]) {
          const rewardMoney = 100;
          const rewardExp = 50;
          userData[result[0]].money += rewardMoney;
          userData[result[0]].exp += rewardExp;
  
          await sock.sendMessage(chatId, {
            text: `💰 Joker (${this.usernameMap[result[0]]}) mendapatkan hadiah $${rewardMoney} dan ${rewardExp} EXP!`,
          });
        }
  
        return this.resetGame();
      }
    } else {
      await sock.sendMessage(chatId, {
        text: `😶 Tidak ada yang dieliminasi.`,
      });
    }
  
    const aliveWerewolf = this.players[this.werewolf]?.alive;
    const aliveVillagers = Object.values(this.players).filter(
      (p) => p.alive && p !== this.players[this.werewolf]
    );
    if (!aliveWerewolf || aliveVillagers.length === 0) {
      const winner = aliveWerewolf ? "Werewolf 🐺" : "Villager 👨‍🌾";
      await sock.sendMessage(chatId, {
        text: `🎉 Game selesai! Pemenang: ${winner}`,
      });
  
      // Berikan hadiah kepada pemenang
      const winners = aliveWerewolf
        ? [this.werewolf]
        : Object.keys(this.players).filter((id) => this.players[id].alive);
  
      for (const winnerId of winners) {
        if (userData[winnerId]) {
          const rewardMoney = 100;
          const rewardExp = 50;
          userData[winnerId].money += rewardMoney;
          userData[winnerId].exp += rewardExp;
  
          await sock.sendMessage(chatId, {
            text: `💰 ${this.usernameMap[winnerId]} mendapatkan hadiah $${rewardMoney} dan ${rewardExp} EXP!`,
          });
        }
      }
  
      return this.resetGame();
    }
  
    await this.startNightPhase(sock, chatId);
  }

  //kill player
  async killPlayer(sock, senderId, targetName) {
    if (this.phase !== "night") {
      return sock.sendMessage(senderId, {
        text: "❌ Kamu hanya bisa membunuh saat malam.",
      });
    }

    if (senderId !== this.werewolf) {
      return sock.sendMessage(senderId, {
        text: "❌ Kamu bukan Werewolf.",
      });
    }

    if (this.actions.kill) {
      return sock.sendMessage(senderId, {
        text: "❌ Kamu sudah membunuh seseorang malam ini.",
      });
    }

    const targetId = Object.keys(this.usernameMap).find(
      (id) => this.usernameMap[id].toLowerCase() === targetName.toLowerCase()
    );

    if (!targetId || !this.players[targetId]?.alive) {
      return sock.sendMessage(senderId, {
        text: `❌ Target tidak valid atau sudah mati.\n\n${this.getPlayerList()}`,
      });
    }

    this.players[targetId].alive = false;
    this.actions.kill = true; 
    await sock.sendMessage(senderId, {
      text: `🩸 Kamu membunuh ${this.usernameMap[targetId]}.`,
    });
  }
  //check player
  async checkPlayer(sock, senderId, targetName) {
    if (this.phase !== "night") {
      return sock.sendMessage(senderId, {
        text: "❌ Kamu hanya bisa memeriksa saat malam.",
      });
    }

    if (senderId !== this.seer) {
      return sock.sendMessage(senderId, { text: "❌ Kamu bukan Seer." });
    }

    if (this.actions.check) {
      return sock.sendMessage(senderId, {
        text: "❌ Kamu sudah memeriksa seseorang malam ini.",
      });
    }

    const targetId = Object.keys(this.usernameMap).find(
      (id) => this.usernameMap[id].toLowerCase() === targetName.toLowerCase()
    );

    if (!targetId || !this.players[targetId]?.alive) {
      return sock.sendMessage(senderId, {
        text: `❌ Target tidak valid atau sudah mati.\n\n${this.getPlayerList()}`,
      });
    }

    const role =
      targetId === this.werewolf
        ? "Werewolf 🐺"
        : targetId === this.seer
        ? "Seer 🔮"
        : "Villager 👨‍🌾";

    this.actions.check = true; 
    await sock.sendMessage(senderId, {
      text: `🔎 ${this.usernameMap[targetId]} adalah ${role}.`,
    });
  }

  //player list
  async sendPlayerList(sock, chatId) {
    const playerList = this.getPlayerList();
    await sock.sendMessage(chatId, {
      text: playerList,
    });
  }

  //vote player
  async vote(sock, chatId, voterId, targetName) {
    if (this.phase !== "day") {
      return sock.sendMessage(chatId, {
        text: "❌ Voting hanya bisa dilakukan saat siang.",
      });
    }
  
    if (!this.players[voterId]?.alive) {
      return sock.sendMessage(chatId, { text: "❌ Kamu sudah mati." });
    }
  
    if (this.votes[voterId]) {
      return sock.sendMessage(chatId, {
        text: "❌ Kamu sudah memberikan suara.",
      });
    }
  
    const targetId = Object.keys(this.usernameMap).find(
      (id) => this.usernameMap[id].toLowerCase() === targetName.toLowerCase()
    );
  
    if (!targetId || !this.players[targetId]?.alive) {
      return sock.sendMessage(chatId, {
        text: `❌ Target tidak valid atau sudah mati.\n\n${this.getPlayerList()}`,
      });
    }
  
    this.votes[voterId] = targetId; // vote
    console.log(
      `✅ ${this.usernameMap[voterId]} memberikan vote kepada ${this.usernameMap[targetId]}`
    );
    await sock.sendMessage(chatId, {
      text: `✅ Vote kamu diberikan kepada ${this.usernameMap[targetId]}.`,
    });
  
    // Cek apakah semua pemain sudah vote
    const alivePlayers = Object.keys(this.players).filter(
      (id) => this.players[id].alive
    );
    if (Object.keys(this.votes).length === alivePlayers.length) {
      console.log("✅ Semua pemain sudah vote. Eksekusi langsung hasil voting.");
      await this.endDayPhase(sock, chatId);
    }
  }
}
const game = new WerewolfGame();

async function startBot() {
  console.log("🚀 Memulai bot...");

  // session
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  let currentQuestion = null;
  let currentAnswer = null;

  // pesan masuk
  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message) return;

      const from = msg.key.remoteJid;
      const body =
        msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const isGroup = from.endsWith("@g.us");
      const senderId = msg.key.participant || from;

      console.log(
        `📩 Pesan dari: ${from} | Grup: ${
          isGroup ? "Ya" : "Tidak"
        } | Isi: ${body}`
      );

      // werewolf
      if (body.startsWith("!werewolf")) {
        console.log("🟢 Memulai room baru...");
        await game.startRoom(sock, from);
      } else if (body.startsWith("!join")) {
        console.log("🟢 Pemain join:", senderId);
        await game.joinGame(
          sock,
          from,
          senderId,
          msg.pushName,
          body.split(" ").slice(1),
          userData
        );
      } else if (body.startsWith("!startwolf")) {
        console.log("🟢 Game dimulai...");
        await game.startGame(sock, from);
      } else if (body.startsWith("!kill")) {
        if (from === senderId) {
          const targetName = body.split(" ").slice(1).join(" ");
          console.log(
            `🗡️ ${senderId} mencoba kill player dengan nama: ${targetName}`
          );
          await game.killPlayer(sock, senderId, targetName);
        } else {
          console.log("❌ Perintah !kill harus lewat private chat.");
          await sock.sendMessage(from, {
            text: "❌ Perintah ini hanya bisa dilakukan melalui private chat.",
          });
        }
      } else if (body.startsWith("!check")) {
        if (from === senderId) {
          const targetName = body.split(" ").slice(1).join(" ");
          console.log(
            `🔍 ${senderId} mencoba check player dengan nama: ${targetName}`
          );
          await game.checkPlayer(sock, senderId, targetName);
        } else {
          await sock.sendMessage(from, {
            text: "❌ Perintah ini hanya bisa dilakukan melalui chat pribadi dengan bot.",
          });
        }
      } else if (body.startsWith("!vote")) {
        const targetName = body.split(" ").slice(1).join(" ");
        console.log(
          `🗳️ ${senderId} mencoba vote player dengan nama: ${targetName}`
        );
        await game.vote(sock, from, senderId, targetName);
      } else if (body.startsWith("!players")) {
        await game.sendPlayerList(sock, from);
      } else if (body.startsWith("!help")) {
        await sock.sendMessage(from, {
          text: `📜 *Perintah Game Werewolf:*\n
!werewolf - Buat ruang permainan
!join [username] - Gabung ke game
!startwolf - Mulai permainan
!players - Lihat daftar pemain
!vote [nomor] - Voting pemain siang hari
(PM Bot) !kill [nomor] - Werewolf membunuh
(PM Bot) !check [nomor] - Seer memeriksa pemain`,
        });
      }

      // !menu
      if (body.startsWith("!menu")) {
        console.log("✅ Perintah !menu diterima, memproses...");
        try {
          const imageBuffer = fs.readFileSync("assets/menu-img.jpg");
      
          // Periksa status anti-link untuk grup ini
          const antiLinkStatus = isGroup
            ? antiLinkConfig[from]
              ? "Aktif ✅"
              : "Nonaktif ❌"
            : "Tidak berlaku (bukan grup)";
      
          const menuText = `🤖 *Siesta Bot* 🤖
      Perkenalkan, saya adalah Dafitra_Bot. Silakan lihat daftar menu di bawah ini untuk mengetahui berbagai fitur yang dapat saya lakukan.
      
      「  I N F O  B O T  」
      ִֶָ☾. Name : Siesta Bot
      ִֶָ☾. Owner : (Myane)
      ִֶָ☾. Link Group : 9882
      ִֶָ☾. Total Command : 7 Command
      ִֶָ☾. Prefix : ( Prefix_Bot )
      ִֶָ☾. Language : Bahasa Indonesia
      ִֶָ☾. Library : Baileys
      ִֶָ☾. Runtime : Node.js
      ִֶָ☾. Version : 1.0.0
      
      「  F I T U R  B O T  」
      ִֶָ☾. !menu
      ִֶָ☾. !nsfw [Query]
      ִֶָ☾ !create → Untuk membuat akun
      ☾ Pekerjaan*:
         - !listjob → Melihat daftar pekerjaan yang tersedia.
         - !job [nomor] → Memilih pekerjaan.
         - !work → Absen harian untuk mendapatkan gaji.
      
      ִֶָ☾ *Investasi*:
         - !harga → Melihat harga aset saat ini.
         - !beli [nomor aset] [jumlah] → Membeli aset.
         - !jual [nomor aset] [jumlah] → Menjual aset.
         - !riwayat [nomor aset] → Melihat riwayat harga aset.
         - !tfm [jumlah] [@tag atau nomor] → Transfer uang ke pengguna lain.
         - !tfa [jumlah] [@tag atau nomor] → Transfer aset ke pengguna lain.
      
      ִֶָ☾ *Judi*:
         - !judi [jumlah taruhan] [head/tail] → Bermain judi lempar koin.
         - !togel [jumlah taruhan] [angka (2-4 digit)] → Bermain togel.
      
      ִֶָ☾ *Status*:
         - !status → Melihat status akun Anda (level, uang, aset, dll.).
      
      ִֶָ☾ *Game*:
         - !mtk → Bermain tebak-tebakan matematika.
         - !a [jawaban] → Menjawab tebak-tebakan matematika.
         - !cekkontol [@tag] → Melihat ukuran kontol pengguna lain.
         - !kerang [pertanyaan] → Tanya kerang ajaib.
      
      ִֶָ☾ *Fitur*:
         - !dwd [url] → Download video dari URL yang diberikan.
         - .s → Mengubah gambar atau video menjadi stiker.
      
      ִֶָ☾ *Admin*:
         - !topup [jumlah] [@tag atau nomor] → Menambahkan uang ke akun pengguna (admin saja).
         -!antilink [on/off] → Mengatur status anti-link grup (admin saja).
          -!kick [@tag] → Mengeluarkan pengguna dari grup (admin saja).
      
      「  A N T I - L I N K  」
      Status Anti-Link: ${antiLinkStatus}
      Gunakan perintah *!antilink [on/off]* untuk mengatur fitur ini (admin saja).
      `;
      
          await sock.sendMessage(from, {
            image: imageBuffer,
            caption: menuText,
          });
      
          console.log("✅ Menu berhasil dikirim!");
        } catch (error) {
          console.error("❌ Gagal mengirim menu:", error);
        }
      }

      if (body.startsWith(".s") || body.startsWith(".S")) {
        console.log("✅ Perintah !s diterima, memproses...");
        try {
          // Periksa apakah pesan adalah reply
          const isReply = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
          const mediaMessage = isReply
            ? msg.message.extendedTextMessage.contextInfo.quotedMessage
            : msg.message;
      
          // Periksa apakah media adalah gambar atau video
          const isImage = mediaMessage?.imageMessage;
          const isVideo = mediaMessage?.videoMessage;
      
          if (!isImage && !isVideo) {
            await sock.sendMessage(from, {
              text: "❌ Harap reply gambar atau video (maksimal 10 detik) dengan perintah *.s* untuk dijadikan stiker.",
            });
            return;
          }
      
          // Ambil caption jika ada
          const caption =
            mediaMessage?.imageMessage?.caption ||
            mediaMessage?.videoMessage?.caption ||
            "";
      
          console.log(`📩 Caption pada media: ${caption}`);
      
          // Unduh media
          const media = await downloadMediaMessage(
            isReply
              ? { message: mediaMessage }
              : msg, // Jika reply, gunakan mediaMessage
            "buffer",
            {},
            { logger: P({ level: "silent" }) }
          );
      
          if (!media) {
            await sock.sendMessage(from, {
              text: "❌ Tidak dapat mengunduh media. Pastikan media tersedia dan coba lagi.",
            });
            return;
          }
      
          const outputFile = `sticker_${Date.now()}.webp`;
      
          if (isImage) {
            // Proses gambar menjadi stiker menggunakan FFmpeg tanpa padding hitam
            const tempFile = `temp_${Date.now()}.jpg`;
            fs.writeFileSync(tempFile, media);
          
            await new Promise((resolve, reject) => {
              ffmpeg(tempFile)
                .inputFormat("image2")
                .outputOptions([
                  "-vf scale=512:512:force_original_aspect_ratio=decrease", // Skala gambar tanpa padding
                  "-c:v libwebp",
                  "-q:v 50",
                  "-loop 0",
                  "-preset default",
                ])
                .save(outputFile)
                .on("end", () => {
                  fs.unlinkSync(tempFile); // Hapus file sementara
                  resolve();
                })
                .on("error", (err) => {
                  reject(err);
                });
            });
          } else if (isVideo) {
            // Proses video menjadi stiker tanpa padding hitam
            const tempFile = `temp_${Date.now()}.mp4`;
            fs.writeFileSync(tempFile, media);
          
            await new Promise((resolve, reject) => {
              ffmpeg(tempFile)
                .inputFormat("mp4")
                .outputOptions([
                  "-vf scale=512:512:force_original_aspect_ratio=decrease", // Skala video tanpa padding
                  "-c:v libwebp",
                  "-q:v 50",
                  "-loop 0",
                  "-preset default",
                  "-an",
                  "-vsync 0",
                  "-t 10", // Batas durasi video 10 detik
                ])
                .save(outputFile)
                .on("end", () => {
                  fs.unlinkSync(tempFile); // Hapus file sementara
                  resolve();
                })
                .on("error", (err) => {
                  reject(err);
                });
            });
          }
              
          // Kirim stiker ke WhatsApp
await sock.sendMessage(from, {
  sticker: { url: outputFile },
  mimetype: "image/webp",
  fileName: "sticker.webp",
  contextInfo: {
    externalAdReply: {
      title: "myane_bot",
      body: "Dibuat oleh myane_bot", 
      mediaType: 2,
      mediaUrl: "https://chat.whatsapp.com/GtRPYZzsWiXEh5SkRsbIIP",
      sourceUrl: "https://chat.whatsapp.com/GtRPYZzsWiXEh5SkRsbIIP",
    },
  },
});
      
          console.log("✅ Stiker berhasil dibuat dan dikirim!");
          fs.unlinkSync(outputFile); 
        } catch (error) {
          console.error("❌ Gagal membuat stiker:", error);
          await sock.sendMessage(from, {
            text: "❌ Terjadi kesalahan saat membuat stiker. Coba lagi nanti.",
          });
        }
      }


     
      if (body.startsWith('!kerang')) {
        await kerang(sock, msg, body); // kerang
    }

    if (body.toLowerCase().startsWith('!cekkontol')) {
      await kontol(sock, msg, body);
  }

// Tangani perintah !mute, !unmute, !kick, !add, dan !listmute
if (
  body.startsWith("!mute") ||
  body.startsWith("!unmute") ||
  body.startsWith("!kick") ||
  body.startsWith("!add") ||
  body.startsWith("!listmute") ||
  body.startsWith("!antimute") ||
  body.startsWith("!unantimute")
) {
  await handleGroupCommands(sock, msg, body, isGroup, senderId);
}

if (body.startsWith("!toimg")) {
  console.log("✅ Perintah !toimg diterima, memproses...");
  await handleToImg(sock, msg, from);
}
// Periksa dan hapus pesan dari pengguna yang dimute
await handleGroupCommands.checkMutedUsers(sock, msg, isGroup);
  
if (isGroup) {
  await handleAntiLink(sock, msg, body, isGroup, senderId); // Panggil plugin anti-link
}
if (body.startsWith("!antilink")) {
  console.log("✅ Perintah !antilink diterima, memproses...");
  try {
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

    const args = body.split(" ");
    if (args.length < 2) {
      await sock.sendMessage(from, {
        text: "❌ Format salah! Gunakan: !antilink [on/off]",
      });
      return;
    }

    const status = args[1].toLowerCase();
    if (status === "on") {
      antiLinkConfig[from] = true;
      await sock.sendMessage(from, {
        text: "✅ Fitur anti-link telah diaktifkan untuk grup ini.",
      });
    } else if (status === "off") {
      antiLinkConfig[from] = false;
      await sock.sendMessage(from, {
        text: "✅ Fitur anti-link telah dinonaktifkan untuk grup ini.",
      });
    } else {
      await sock.sendMessage(from, {
        text: "❌ Format salah! Gunakan: !antilink [on/off]",
      });
    }
  } catch (error) {
    console.error("❌ Gagal memproses perintah !antilink:", error);
    await sock.sendMessage(from, {
      text: "❌ Terjadi kesalahan saat memproses perintah !antilink.",
    });
  }
}


      // Perintah !tagall (hanya di grup)
      if (isGroup && body.startsWith("!tagall")) {
        console.log("✅ Perintah !tagall diterima, memproses...");
        try {
          const groupMetadata = await sock.groupMetadata(from);
          if (!groupMetadata)
            return console.log("❌ Gagal mendapatkan metadata grup.");

          const senderId = msg.key.participant || msg.key.remoteJid;
          const isAdmin = groupMetadata.participants.some(
            (p) =>
              p.id === senderId &&
              (p.admin === "admin" || p.admin === "superadmin")
          );

          if (!isAdmin) {
            return console.log(
              "❌ Perintah !tagall hanya dapat digunakan oleh admin grup."
            );
          }

          const members = groupMetadata.participants.map((p) => p.id);
          if (members.length === 0)
            return console.log("❌ Grup kosong, tidak ada yang bisa ditag.");

          const mentions = members
            .map((m) => `@${m.replace(/@s\.whatsapp\.net$/, "")}`)
            .join(" ");
          await sock.sendMessage(from, {
            text: `👥 Tagall:\n${mentions}`,
            mentions: members,
          });

          console.log("✅ Tagall berhasil dikirim!");
        } catch (error) {
          console.error("❌ Gagal mengirim tag all:", error);
        }
      }

    

      // Perintah !dwd
      if (body.startsWith("!dwd")) {
        console.log("✅ Perintah !dwd diterima, memproses...");
        await handleDownloadCommand(sock, from, body);
      }
      // Perintah !tebakmtk
      if (body.startsWith("!mtk")) {
        console.log("✅ Perintah !tebakmtk diterima, memproses...");
        try {
          const num1 = Math.floor(Math.random() * 10) + 1;
          const num2 = Math.floor(Math.random() * 10) + 1;
          const operator = ["+", "-", "*", "/"][Math.floor(Math.random() * 4)];
          let question, answer;

          switch (operator) {
            case "+":
              question = `${num1} + ${num2}`;
              answer = num1 + num2;
              break;
            case "-":
              question = `${num1} - ${num2}`;
              answer = num1 - num2;
              break;
            case "*":
              question = `${num1} * ${num2}`;
              answer = num1 * num2;
              break;
            case "/":
              question = `${num1} / ${num2}`;
              answer = (num1 / num2).toFixed(2);
              break;
          }

          currentQuestion = question;
          currentAnswer = answer;

          await sock.sendMessage(from, {
            text: `🤔 Tebak-tebakan Matematika:\n${question}\nJawab dengan benar menggunakan perintah !a [jawaban]`,
          });

          console.log("✅ Tebak-tebakan Matematika berhasil dikirim!");
        } catch (error) {
          console.error("❌ Gagal mengirim tebak-tebakan matematika:", error);
        }
      }

      // Perintah !answer
      if (body.startsWith(".a")) {
        console.log("✅ Perintah .a jawab diterima, memproses...");
        try {
          const userAnswer = parseFloat(body.split(" ")[1]);

          if (userAnswer === parseFloat(currentAnswer)) {
            await sock.sendMessage(from, {
              text: `🎉 Jawaban benar! ${currentQuestion} = ${currentAnswer}`,
            });
          } else {
            await sock.sendMessage(from, {
              text: `❌ Jawaban salah. Coba lagi! ${currentQuestion} = ${currentAnswer}`,
            });
          }

          // Reset current question and answer
          currentQuestion = null;
          currentAnswer = null;

          console.log("✅ Jawaban berhasil diproses!");
        } catch (error) {
          console.error("❌ Gagal memproses jawaban:", error);
        }
      }


      // Perintah !gelbooru
      if (body.startsWith("!nsfw")) {
        console.log("✅ Perintah !gelbooru diterima, memproses...");
        try {
          // Periksa apakah ini grup
          if (!isGroup) {
            await sock.sendMessage(from, {
              text: "❌ Perintah ini hanya dapat digunakan di grup.",
            });
            return;
          }

          // Ambil metadata grup
          const groupMetadata = await sock.groupMetadata(from);
          if (!groupMetadata) {
            console.log("❌ Gagal mendapatkan metadata grup.");
            await sock.sendMessage(from, {
              text: "❌ Gagal mendapatkan metadata grup.",
            });
            return;
          }

          // Periksa apakah pengirim adalah admin
          const senderId = msg.key.participant || msg.key.remoteJid;
          const isAdmin = groupMetadata.participants.some(
            (p) =>
              p.id === senderId &&
              (p.admin === "admin" || p.admin === "superadmin")
          );

          if (!isAdmin) {
            console.log(
              "❌ Perintah ini hanya dapat digunakan oleh admin grup."
            );
            await sock.sendMessage(from, {
              text: "❌ Perintah ini hanya dapat digunakan oleh admin grup.",
            });
            return;
          }

          const query = body.split(" ")[1];
          if (!query) {
            await sock.sendMessage(from, {
              text: "❌ Harap sertakan query pencarian.",
            });
            return;
          }

          const response = await axios.get("https://gelbooru.com/index.php", {
            params: {
              page: "dapi",
              s: "post",
              q: "index",
              json: 1,
              tags: query,
              limit: 1,
            },
          });

          const posts = response.data.post;
          if (posts && posts.length > 0) {
            const post = posts[0];
            const imageUrl = post.file_url;

            await sock.sendMessage(from, { image: { url: imageUrl } }); //, caption: `🔍 Hasil pencarian dari Gelbooru: ${imageUrl}`
          } else {
            await sock.sendMessage(from, {
              text: "❌ Tidak ada gambar yang ditemukan untuk query Anda.",
            });
          }
        } catch (error) {
          console.error("❌ Gagal mengambil gambar dari Gelbooru:", error);
          await sock.sendMessage(from, {
            text: "❌ Terjadi kesalahan saat mengambil gambar dari Gelbooru.",
          });
        }
      }
      //fitur maitance

      //maintance
      if (body.startsWith("!create")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda sudah memiliki akun!",
          });
          return;
        }

        userData[senderId] = {
          level: 1,
          exp: 0, //add exp
          money: 0,
          job: null,
          lastWork: null,
          missedDays: 0,
        };

        saveUserData();
        await sock.sendMessage(from, {
          text: "✅ Akun berhasil dibuat! Anda sekarang berada di level 1 dengan uang $0.",
        });
        return;
      }

      if (body.startsWith("!listjob")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (!userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }

        const level = userData[senderId].level;
        const jobs = {
          1: ["Tukang Sampah", "Petugas Kebersihan", "Kurir"],
          2: ["Kasir", "Penjual", "Asisten Kantor"],
        };

        if (!jobs[level]) {
          await sock.sendMessage(from, {
            text: "❌ Tidak ada pekerjaan yang tersedia untuk level Anda.",
          });
          return;
        }

        const jobList = jobs[level]
          .map((job, index) => `${index + 1}. ${job}`)
          .join("\n");
        await sock.sendMessage(from, {
          text: `Pekerjaan yang tersedia untuk level ${level}:\n${jobList}\n\nGunakan perintah !job [nomor] untuk memilih pekerjaan.`,
        });
        return;
      }

      // job
      if (body.startsWith("!job")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (!userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }

        const level = userData[senderId].level;
        const jobs = {
          1: ["Tukang Sampah", "Petugas Kebersihan", "Kurir"],
          2: ["Kasir", "Penjual", "Asisten Kantor"],
        };

        if (!jobs[level]) {
          await sock.sendMessage(from, {
            text: "❌ Tidak ada pekerjaan yang tersedia untuk level Anda.",
          });
          return;
        }

        const args = body.split(" ");
        if (args.length === 1) {
          await sock.sendMessage(from, {
            text: "❌ Harap masukkan nomor pekerjaan. Gunakan perintah !listjob untuk melihat daftar pekerjaan.",
          });
          return;
        }

        const jobIndex = parseInt(args[1]) - 1;
        if (isNaN(jobIndex) || jobIndex < 0 || jobIndex >= jobs[level].length) {
          await sock.sendMessage(from, {
            text: "❌ Pilihan pekerjaan tidak valid. Gunakan perintah !listjob untuk melihat daftar pekerjaan.",
          });
          return;
        }

        const selectedJob = jobs[level][jobIndex];
        userData[senderId].job = selectedJob;
        saveUserData();

        await sock.sendMessage(from, {
          text: `✅ Anda telah memilih pekerjaan: ${selectedJob}. Jangan lupa absen harian dengan mengetik !work.`,
        });
        return;
      }

      if (body.startsWith("!work")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (!userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }

        const user = userData[senderId];
        if (!user.job) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki pekerjaan. Gunakan perintah !job untuk memilih pekerjaan.",
          });
          return;
        }

        const now = new Date();
        const today = now.toDateString();
        const jobDetails = jobConfig[user.job];

        if (!jobDetails) {
          await sock.sendMessage(from, {
            text: "❌ Konfigurasi pekerjaan tidak ditemukan. Hubungi admin bot.",
          });
          return;
        }

        if (!user.absenDate || user.absenDate !== today) {
          user.absenDate = today;
          user.absenCount = 0;
          user.dailyEarnings = 0;
        }

        if (user.absenCount >= jobDetails.absencesPerDay) {
          await sock.sendMessage(from, {
            text: `❌ Anda sudah menyelesaikan semua absen hari ini (${jobDetails.absencesPerDay} kali). Coba lagi besok.`,
          });
          return;
        }

        const salaryPerAbsence = jobDetails.salaryPerAbsence;
        const maxDailyEarnings = jobDetails.absencesPerDay * salaryPerAbsence;

        if (user.dailyEarnings + salaryPerAbsence > maxDailyEarnings) {
          await sock.sendMessage(from, {
            text: `❌ Anda sudah mencapai batas gaji harian maksimum sebesar $${maxDailyEarnings}. Coba lagi besok.`,
          });
          return;
        }

        // Tambahkan gaji, EXP, n absen
        user.money += salaryPerAbsence;
        user.dailyEarnings += salaryPerAbsence;
        user.absenCount += 1;

        const expGained = 10; // +10 exp
        user.exp += expGained;

        const expForNextLevel = getExpForNextLevel(user.level);
        if (user.exp >= expForNextLevel) {
          user.level += 1;
          user.exp -= expForNextLevel; // Sisa EXP setelah naik level
          await sock.sendMessage(from, {
            text: `🎉 Selamat! Anda naik ke level ${user.level}!`,
          });
        }

        saveUserData();
        await sock.sendMessage(from, {
          text: `✅ Anda telah absen sebagai ${user.job} (${user.absenCount}/${jobDetails.absencesPerDay}). Anda mendapatkan $${salaryPerAbsence} dan ${expGained} EXP. Total uang Anda: $${user.money}.`,
        });

        // if absen done
        if (user.absenCount === jobDetails.absencesPerDay) {
          await sock.sendMessage(from, {
            text: `🎉 Anda telah menyelesaikan semua absen hari ini sebagai ${user.job}. Kerja bagus!`,
          });
        }

        return;
      }
      // Perintah !status
      if (body.startsWith("!status")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        const args = body.split(" ");
        let targetId = senderId; // Default: cek status diri sendiri

        if (args.length > 1) {
          // Jika ada mention atau nomor
          if (
            msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length >
            0
          ) {
            targetId =
              msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
          } else if (/^\d+$/.test(args[1])) {
            targetId = args[1] + "@s.whatsapp.net";
          } else {
            await sock.sendMessage(from, {
              text: "❌ Format salah! Gunakan: !status [@tag atau nomor]",
            });
            return;
          }
        }

        if (!userData[targetId]) {
          await sock.sendMessage(from, {
            text: "❌ Pengguna tidak ditemukan. Pastikan pengguna sudah memiliki akun.",
          });
          return;
        }

        const user = userData[targetId];
        const jobDetails = jobConfig[user.job] || {};
        const absencesPerDay = jobDetails.absencesPerDay || 0;
        const maxDailyEarnings =
          (jobDetails.salaryPerAbsence || 0) * absencesPerDay;
        const expForNextLevel = getExpForNextLevel(user.level);

        // Tampilkan aset
        let assetList = "📦 Aset:\n";
        if (user.assets && Object.keys(user.assets).length > 0) {
          for (const [assetName, amount] of Object.entries(user.assets)) {
            assetList += `- ${assetName}: ${amount}\n`;
          }
        } else {
          assetList += "Belum memiliki aset.\n";
        }

        const targetName =
          targetId === senderId
            ? "Anda"
            : targetId.replace("@s.whatsapp.net", "");

        await sock.sendMessage(from, {
          text:
            `📊 Status ${targetName}:\n` +
            `Level: ${user.level}\n` +
            `EXP: ${user.exp}/${expForNextLevel}\n` +
            `Uang: ${formatMoney(user.money)}\n` +
            `Pekerjaan: ${user.job || "Belum ada"}\n` +
            `Hari terakhir bekerja: ${
              user.lastWork || "Belum pernah bekerja"
            }\n` +
            `Hari bolos: ${user.missedDays}\n` +
            `Absen hari ini: ${user.absenCount || 0}/${absencesPerDay}\n` +
            `Gaji harian: $${
              user.dailyEarnings || 0
            }/$${maxDailyEarnings}\n\n` +
            assetList,
        });
        return;
      }

      if (body.startsWith("!judi")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (!userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }

        const user = userData[senderId];
        const args = body.split(" ");
        if (args.length < 3) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !judi [jumlah taruhan] [head/tail]",
          });
          return;
        }

        const betAmount = parseInt(args[1]);
        const choice = args[2].toLowerCase();

        if (isNaN(betAmount) || betAmount <= 0) {
          await sock.sendMessage(from, {
            text: "❌ Jumlah taruhan harus berupa angka positif.",
          });
          return;
        }

        if (betAmount > user.money) {
          await sock.sendMessage(from, {
            text: `❌ Uang Anda tidak cukup! Anda hanya memiliki $${user.money}.`,
          });
          return;
        }

        if (choice !== "head" && choice !== "tail") {
          await sock.sendMessage(from, {
            text: "❌ Pilihan harus 'head' atau 'tail'.",
          });
          return;
        }

        // flip coin
        const outcomes = ["head", "tail"];
        const result = outcomes[Math.floor(Math.random() * outcomes.length)];

        if (choice === result) {
          const winnings = betAmount * 2;
          user.money += winnings;
          await sock.sendMessage(from, {
            text: `🎉 Selamat! Koin menunjukkan ${result}. Anda menang $${winnings}. Total uang Anda: $${user.money}.`,
          });
        } else {
          user.money -= betAmount;
          await sock.sendMessage(from, {
            text: `❌ Sayang sekali! Koin menunjukkan ${result}. Anda kalah $${betAmount}. Total uang Anda: $${user.money}.`,
          });
        }

        saveUserData();
        return;
      }

      if (body.startsWith("!togel")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (!userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }

        const user = userData[senderId];
        const args = body.split(" ");
        if (args.length < 3) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !togel [jumlah taruhan] [angka (2-4 digit)]",
          });
          return;
        }

        const betAmount = parseInt(args[1]);
        const chosenNumber = args[2];

        if (isNaN(betAmount) || betAmount <= 0) {
          await sock.sendMessage(from, {
            text: "❌ Jumlah taruhan harus berupa angka positif.",
          });
          return;
        }

        if (betAmount > user.money) {
          await sock.sendMessage(from, {
            text: `❌ Uang Anda tidak cukup! Anda hanya memiliki $${user.money}.`,
          });
          return;
        }

        if (!/^\d{2,4}$/.test(chosenNumber)) {
          await sock.sendMessage(from, {
            text: "❌ Angka harus berupa 2 hingga 4 digit (contoh: 12, 123, 1234).",
          });
          return;
        }

        const randomNumber = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0"); // 4 digit angka acak
        console.log(`🎲 Angka yang diundi: ${randomNumber}`);

        // Hitung jumlah digit yang cocok tanpa memperhatikan urutan
        let matchCount = 0;
        let tempRandom = randomNumber; // Salinan untuk menghindari double count
        for (let digit of chosenNumber) {
          if (tempRandom.includes(digit)) {
            matchCount++;
            tempRandom = tempRandom.replace(digit, ""); // Hindari hitungan ganda
          }
        }

        // Hitung kemenangan berdasarkan jumlah kecocokan digit
        let winnings = 0;
        if (matchCount === 4) {
          winnings = betAmount * 100;
        } else if (matchCount === 3) {
          winnings = betAmount * 50;
        } else if (matchCount === 2) {
          winnings = betAmount * 10;
        } else if (matchCount === 1) {
          winnings = betAmount * 5;
        }

        // Menampilkan hasil kepada pemain
        if (winnings > 0) {
          user.money += winnings;
          await sock.sendMessage(from, {
            text: `🎉 Selamat! Angka yang diundi: ${randomNumber}\n Cocok: ${matchCount}\n Anda menang $${winnings}\n Total uang Anda: $${user.money}.`,
          });
        } else {
          user.money -= betAmount;
          await sock.sendMessage(from, {
            text: `❌ Sayang sekali! Angka yang diundi: ${randomNumber}\n Anda kalah $${betAmount}\n Total uang Anda: $${user.money}.`,
          });
        }

        saveUserData();
        return;
      }

      if (body.startsWith("!topup")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        // check if at group
        if (!isGroup) {
          await sock.sendMessage(from, {
            text: "❌ Perintah ini hanya dapat digunakan di grup.",
          });
          return;
        }

        // checck admin
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

        const args = body.split(" ");
        if (args.length < 3) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !topup [jumlah] [@tag atau nomor]",
          });
          return;
        }

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
          await sock.sendMessage(from, {
            text: "❌ Jumlah top-up harus berupa angka positif.",
          });
          return;
        }

        if (amount > MAX_MONEY) {
          await sock.sendMessage(from, {
            text: `❌ Jumlah top-up tidak boleh lebih dari $${MAX_MONEY}.`,
          });
          return;
        }

        let targetId;
        if (
          msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0
        ) {
          // if tag at group
          targetId =
            msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (/^\d+$/.test(args[2])) {
          // if number tp
          targetId = args[2] + "@s.whatsapp.net";
        } else {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !topup [jumlah] [@tag atau nomor]",
          });
          return;
        }

        if (!userData[targetId]) {
          await sock.sendMessage(from, {
            text: "❌ Pengguna tidak ditemukan. Pastikan pengguna sudah memiliki akun.",
          });
          return;
        }

        if ((userData[targetId].money || 0) + amount > MAX_MONEY) {
          await sock.sendMessage(from, {
            text: `❌ Total uang pengguna tidak boleh lebih dari $${MAX_MONEY}.`,
          });
          return;
        }

        // add money
        userData[targetId].money = (userData[targetId].money || 0) + amount;
        saveUserData();

        await sock.sendMessage(from, {
          text: `✅ Berhasil menambahkan $${amount} ke akun ${targetId.replace(
            "@s.whatsapp.net",
            ""
          )}.`,
        });
        await sock.sendMessage(targetId, {
          text: `💰 Anda telah menerima top-up sebesar $${amount} dari admin.`,
        });
      }

      if (body.startsWith("!harga")) {
        let priceList = "📊 Harga Aset Saat Ini:\n";
        assets.forEach((asset, index) => {
          priceList += `${index + 1}. ${asset.name}: ${formatMoney(
            asset.price
          )}\n`;
        });
        await sock.sendMessage(from, { text: priceList });
        return;
      }
      if (body.startsWith("!beli")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (!userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }

        const args = body.split(" ");
        if (args.length < 3) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !beli [nomor aset] [jumlah]",
          });
          return;
        }

        const assetIndex = parseInt(args[1]) - 1;
        const amount = args[2];

        const user = userData[senderId];

        if (amount.toLowerCase() === "all") {
          // Jika memilih 'all', beli sebanyak yang bisa dibeli dengan seluruh uang
          const asset = assets[assetIndex];
          const totalAmount = Math.floor(user.money / asset.price); // Hitung jumlah aset yang bisa dibeli
          if (totalAmount === 0) {
            await sock.sendMessage(from, {
              text: `❌ Uang Anda tidak cukup untuk membeli ${asset.name}.`,
            });
            return;
          }

          user.money -= totalAmount * asset.price;
          user.assets = user.assets || {};
          user.assets[asset.name] =
            (user.assets[asset.name] || 0) + totalAmount;

          saveUserData();
          await sock.sendMessage(from, {
            text: `✅ Anda berhasil membeli ${totalAmount} ${asset.name} dengan seluruh uang Anda.`,
          });
          return;
        }

        const amountParsed = parseInt(amount);
        if (isNaN(amountParsed) || amountParsed <= 0) {
          await sock.sendMessage(from, {
            text: "❌ Jumlah harus berupa angka positif.",
          });
          return;
        }

        const asset = assets[assetIndex];
        const totalCost = asset.price * amountParsed;

        if (user.money < totalCost) {
          await sock.sendMessage(from, {
            text: `❌ Uang Anda tidak cukup! Total biaya: $${totalCost}. Uang Anda: $${user.money}.`,
          });
          return;
        }

        user.money -= totalCost;
        user.assets = user.assets || {};
        user.assets[asset.name] = (user.assets[asset.name] || 0) + amountParsed;

        saveUserData();
        await sock.sendMessage(from, {
          text: `✅ Anda berhasil membeli ${amountParsed} ${asset.name} dengan total biaya $${totalCost}.`,
        });
        return;
      }

      if (body.startsWith("!jual")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (!userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }

        const args = body.split(" ");
        if (args.length < 3) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !jual [nomor aset] [jumlah]",
          });
          return;
        }

        const assetIndex = parseInt(args[1]) - 1;
        const amount = args[2];

        const user = userData[senderId];

        if (amount.toLowerCase() === "all") {
          // Jika memilih 'all', jual semua aset yang dimiliki
          const asset = assets[assetIndex];
          if (!user.assets || !user.assets[asset.name]) {
            await sock.sendMessage(from, {
              text: `❌ Anda tidak memiliki ${asset.name} untuk dijual.`,
            });
            return;
          }

          const totalAmount = user.assets[asset.name]; // Ambil semua aset yang dimiliki
          const totalEarnings = asset.price * totalAmount;

          // Kurangi aset pengguna dan tambah uang
          delete user.assets[asset.name];
          user.money += totalEarnings;

          saveUserData();
          await sock.sendMessage(from, {
            text: `✅ Anda berhasil menjual ${totalAmount} ${asset.name} dan mendapatkan $${totalEarnings}.`,
          });
          return;
        }

        const amountParsed = parseInt(amount);
        if (isNaN(amountParsed) || amountParsed <= 0) {
          await sock.sendMessage(from, {
            text: "❌ Jumlah harus berupa angka positif.",
          });
          return;
        }

        const asset = assets[assetIndex];
        if (
          !user.assets ||
          !user.assets[asset.name] ||
          user.assets[asset.name] < amountParsed
        ) {
          await sock.sendMessage(from, {
            text: `❌ Anda tidak memiliki cukup ${asset.name} untuk dijual.`,
          });
          return;
        }

        const totalEarnings = asset.price * amountParsed;

        // Kurangi aset pengguna dan tambah uang
        user.assets[asset.name] -= amountParsed;
        if (user.assets[asset.name] === 0) delete user.assets[asset.name];
        user.money += totalEarnings;

        saveUserData();
        await sock.sendMessage(from, {
          text: `✅ Anda berhasil menjual ${amountParsed} ${asset.name} dan mendapatkan $${totalEarnings}.`,
        });
        return;
      }
      if (body.startsWith("!riwayat")) {
        const args = body.split(" ");
        if (args.length < 2) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !riwayat [nomor aset]",
          });
          return;
        }

        const assetIndex = parseInt(args[1]) - 1;
        if (
          isNaN(assetIndex) ||
          assetIndex < 0 ||
          assetIndex >= assets.length
        ) {
          await sock.sendMessage(from, {
            text: "❌ Nomor aset tidak valid. Gunakan perintah !harga untuk melihat daftar aset.",
          });
          return;
        }

        const asset = assets[assetIndex];
        const history = asset.history.slice(-10).map(formatMoney).join(", "); // Ambil 10 harga terakhir

        await sock.sendMessage(from, {
          text: `📊 Riwayat harga ${asset.name} (300 dtk terakhir):\n${history}`,
        });
        return;
      }

      // Perintah !transferuang
      if (body.startsWith("!tfm")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (!userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }

        const args = body.split(" ");
        if (args.length < 3) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !transferuang [jumlah] [@tag atau nomor]",
          });
          return;
        }

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
          await sock.sendMessage(from, {
            text: "❌ Jumlah transfer harus berupa angka positif.",
          });
          return;
        }

        if (amount > userData[senderId].money) {
          await sock.sendMessage(from, {
            text: `❌ Uang Anda tidak cukup! Anda hanya memiliki $${userData[senderId].money}.`,
          });
          return;
        }

        let targetId;
        if (
          msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0
        ) {
          targetId =
            msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (/^\d+$/.test(args[2])) {
          targetId = args[2] + "@s.whatsapp.net";
        } else {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !transferuang [jumlah] [@tag atau nomor]",
          });
          return;
        }

        if (!userData[targetId]) {
          await sock.sendMessage(from, {
            text: "❌ Pengguna tidak ditemukan. Pastikan pengguna sudah memiliki akun.",
          });
          return;
        }

        // Transfer uang
        userData[senderId].money -= amount;
        userData[targetId].money = (userData[targetId].money || 0) + amount;
        saveUserData();

        await sock.sendMessage(from, {
          text: `✅ Anda berhasil mentransfer $${amount} ke ${targetId.replace(
            "@s.whatsapp.net",
            ""
          )}.`,
        });
        await sock.sendMessage(targetId, {
          text: `💰 Anda menerima transfer sebesar $${amount} dari ${senderId.replace(
            "@s.whatsapp.net",
            ""
          )}.`,
        });
        return;
      }

      // Perintah !transferaset
      if (body.startsWith("!tfa")) {
        const senderId = msg.key.participant || msg.key.remoteJid;

        if (!userData[senderId]) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }

        const args = body.split(" ");
        if (args.length < 4) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !transferaset [nomor aset] [jumlah] [@tag atau nomor]",
          });
          return;
        }

        const assetIndex = parseInt(args[1]) - 1;
        const amount = parseInt(args[2]);

        if (
          isNaN(assetIndex) ||
          assetIndex < 0 ||
          assetIndex >= assets.length
        ) {
          await sock.sendMessage(from, {
            text: "❌ Nomor aset tidak valid. Gunakan perintah !harga untuk melihat daftar aset.",
          });
          return;
        }

        if (isNaN(amount) || amount <= 0) {
          await sock.sendMessage(from, {
            text: "❌ Jumlah transfer harus berupa angka positif.",
          });
          return;
        }

        const asset = assets[assetIndex];
        if (
          !userData[senderId].assets ||
          !userData[senderId].assets[asset.name] ||
          userData[senderId].assets[asset.name] < amount
        ) {
          await sock.sendMessage(from, {
            text: `❌ Anda tidak memiliki cukup ${asset.name} untuk ditransfer.`,
          });
          return;
        }

        let targetId;
        if (
          msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0
        ) {
          targetId =
            msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (/^\d+$/.test(args[3])) {
          targetId = args[3] + "@s.whatsapp.net";
        } else {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !transferaset [nomor aset] [jumlah] [@tag atau nomor]",
          });
          return;
        }

        if (!userData[targetId]) {
          await sock.sendMessage(from, {
            text: "❌ Pengguna tidak ditemukan. Pastikan pengguna sudah memiliki akun.",
          });
          return;
        }

        // Transfer aset
        userData[senderId].assets[asset.name] -= amount;
        if (userData[senderId].assets[asset.name] === 0) {
          delete userData[senderId].assets[asset.name];
        }

        userData[targetId].assets = userData[targetId].assets || {};
        userData[targetId].assets[asset.name] =
          (userData[targetId].assets[asset.name] || 0) + amount;

        saveUserData();

        await sock.sendMessage(from, {
          text: `✅ Anda berhasil mentransfer ${amount} ${
            asset.name
          } ke ${targetId.replace("@s.whatsapp.net", "")}.`,
        });
        await sock.sendMessage(targetId, {
          text: `📦 Anda menerima transfer ${amount} ${
            asset.name
          } dari ${senderId.replace("@s.whatsapp.net", "")}.`,
        });
        return;
      }
    } catch (error) {
      console.error("❌ Error di event messages.upsert:", error);
    }
  });

  //(handle reconnect otomatis)
  sock.ev.on("connection.update", (update) => {
    console.log("🔄 Update koneksi:", update);
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log("✅ Bot berhasil terhubung!");
    } else if (connection === "close") {
      console.log("⚠️ Koneksi terputus! Mencoba reconnect...");
      if (lastDisconnect?.error?.output?.statusCode !== 401) {
        startBot();
      } else {
        console.log(
          "❌ Autentikasi gagal, hapus folder 'session' lalu coba scan ulang."
        );
      }
    }
  });

  sock.ev.on("qr", (qr) => {
    console.log("📸 Scan QR ini untuk login!");
  });

  setInterval(fetchRealTimePrices, 50000); // 30 detik
  setInterval(saveAssetPrices, 50000); //simpan harga 30detik 1x
}

startBot();