
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
const ffmpeg = require('fluent-ffmpeg');
const { handleAntiLink, antiLinkConfig } = require("./plugins/antilink");
const handleGroupCommands = require("./plugins/saran");
const handleWelcome = require("./plugins/welcome");
const  handleGetPP  = require("./plugins/getpp");
const { ping } = require("./plugins/ping");
const { convertPdfToWord } = require("./plugins/convertpdf");
const { searchYouTube, downloadYouTube } = require("./plugins/ytplay");
const { downloadTikTokMedia } = require("./plugins/tiktok");
const {
  handleSuitBot,
  handleCreateSuit,
  handleAcceptSuit,
  handlePlayerChoice,
  processDuelResult,
  handleRoomList,
  handleCheckWinrate,
  loadSuitData, // Tambahkan ini
  saveSuitData, // Tambahkan ini
} = require("./plugins/batugunting");

let youtubeSearchResults = {};

const MAX_BET_AMOUNT = 10000; // Batas maksimum taruhan ($10,000)

const houses = [
  { name: "Basic House", distance: "far", price: 5000, rent: 50 },
  { name: "Standard House", distance: "medium", price: 15000, rent: 150 },
  { name: "Luxury House", distance: "near", price: 50000, rent: 500 },
];

const rentalListFile = "rentalList.json";
const marketListFile = "marketList.json";

let rentalList = [];
let marketList = [];

// Muat daftar rumah yang disewakan
if (fs.existsSync(rentalListFile)) {
  try {
    const fileContent = fs.readFileSync(rentalListFile, "utf-8");
    rentalList = JSON.parse(fileContent);
    console.log("✅ Daftar rumah yang disewakan berhasil dimuat.");
  } catch (error) {
    console.error("❌ Gagal memuat rentalList.json:", error);
  }
}

// Muat daftar rumah yang dijual
if (fs.existsSync(marketListFile)) {
  try {
    const fileContent = fs.readFileSync(marketListFile, "utf-8");
    marketList = JSON.parse(fileContent);
    console.log("✅ Daftar rumah yang dijual berhasil dimuat.");
  } catch (error) {
    console.error("❌ Gagal memuat marketList.json:", error);
  }
}

function saveRentalList() {
  try {
    fs.writeFileSync(rentalListFile, JSON.stringify(rentalList, null, 2));
    console.log("✅ Daftar rumah yang disewakan berhasil disimpan.");
  } catch (error) {
    console.error("❌ Gagal menyimpan rentalList.json:", error);
  }
}

function saveMarketList() {
  try {
    fs.writeFileSync(marketListFile, JSON.stringify(marketList, null, 2));
    console.log("✅ Daftar rumah yang dijual berhasil disimpan.");
  } catch (error) {
    console.error("❌ Gagal menyimpan marketList.json:", error);
  }
}

const MAX_MONEY = 1000000000; // Batas maksimum uang ($1 miliar)
const assetDataFile = "assets.json";
const welcomeConfig = {};

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
  { name: "SGD", price: 2000, previousPrice: 2000, history: []}, // Tambahkan SGD
  { name: "Solana", price: 20, previousPrice: 20, history: [] },
];

const jobConfig = {
  "Tukang Sampah": { absencesPerDay: 1, salaryPerAbsence: 500 },
  "Petugas Kebersihan": { absencesPerDay: 2, salaryPerAbsence: 750 },
  Kurir: { absencesPerDay: 3, salaryPerAbsence: 1000 },
  Kasir: { absencesPerDay: 1, salaryPerAbsence: 1500 },
  Penjual: { absencesPerDay: 2, salaryPerAbsence: 2000 },
  "Asisten Kantor": { absencesPerDay: 3, salaryPerAbsence: 2500 },
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
    // Ambil harga crypto
    const cryptoResponse = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: "dogecoin,bitcoin,ethereum,litecoin,solana", // Tambahkan crypto lainnya jika perlu
          vs_currencies: "usd",
        },
      }
    );
    const cryptoPrices = cryptoResponse.data;

    // Ambil harga currency
    const forexResponse = await axios.get(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );
    const forexRates = forexResponse.data.rates;

    // Update harga aset
    assets.forEach((asset) => {
      const id = asset.name.toLowerCase();

      if (cryptoPrices[id]) {
        // Update harga crypto
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

      // Simpan riwayat harga
      if (!asset.history) {
        asset.history = [];
      }
      asset.history.push(asset.price);

      // Batasi riwayat harga hingga 10 entri
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
    const currentData = JSON.stringify(assets, null, 2);
    const previousData = fs.existsSync(assetDataFile)
      ? fs.readFileSync(assetDataFile, "utf-8")
      : "";

    if (currentData !== previousData) {
      fs.writeFileSync(assetDataFile, currentData);
      console.log("✅ Harga aset dan riwayat berhasil disimpan ke file.");
    } else {
      console.log("ℹ️ Tidak ada perubahan pada harga aset, tidak perlu menyimpan.");
    }
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
      console.log(`🔍 Memeriksa ID pemain: ${result[0]}`);
      if (!userData[result[0]]) {
        console.error(`❌ ID ${result[0]} tidak ditemukan di userData.`);
        await sock.sendMessage(chatId, {
          text: `❌ Data pemain dengan ID ${result[0]} tidak ditemukan.`,
        });
        return;
      }
  
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
        const rewardMoney = 100;
        const rewardExp = 50;
        userData[result[0]].money += rewardMoney;
        userData[result[0]].exp += rewardExp;
  
        await sock.sendMessage(chatId, {
          text: `💰 Joker (${this.usernameMap[result[0]]}) mendapatkan hadiah $${rewardMoney} dan ${rewardExp} EXP!`,
        });
  
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
        } else {
          console.log(`❌ Pemain ${winnerId} tidak memiliki akun.`);
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
        :targetId === this.joker
        ? "Joker 🤡"
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
  sock.ev.on("group-participants.update", async (update) => {
    console.log("🔔 Update peserta grup:", update);
    await handleWelcome(sock, update, welcomeConfig);
  });

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

      if (body.toLowerCase() === "!ping") {
        await ping(sock, from);  // Panggil plugin
        return;
      }

      // !menu
      if (body.startsWith("!menu")) {
        console.log("✅ Perintah !menu diterima, memproses...");
        try {
          const imageBuffer = fs.readFileSync("assets/menu-img.jpg");

          const welcomeStatus = isGroup
          ? welcomeConfig[from]?.enabled
            ? "Aktif ✅"
            : "Nonaktif ❌"
          : "Tidak berlaku (bukan grup)";
    
      
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
         -!listrumah → Melihat daftar rumah yang tersedia.
         -!belirumah [nomer]  → Membeli rumah.
          -!pilihrumah [nomer]  → Memilih rumah.
          -!sewarumah [nomer]  → Menyewa rumah.
          -!pasarrumah -→ Melihat daftar rumah yang dijual.
          -!rentlist → Melihat daftar rumah yang disewakan.
          -!rent [nomer]  → Menyewa rumah.
          -!buy [nomer]  → Membeli rumah di pasar rumah.
      
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
         - !mtk/hard → Bermain tebak-tebakan matematika.
         - .a [jawaban] → Menjawab tebak-tebakan matematika.
         - !cekkontol [@tag] → Melihat ukuran kontol pengguna lain.
         - !kerang [pertanyaan] → Tanya kerang ajaib.
         -!suit taruhan batu/gunting/kertas → Bermain suit.
      
      ִֶָ☾ *Fitur*:
         - !dwd [url] → Download video dari URL yang diberikan.
         -!play namalagu → !dl {nomer} → Download lagu dari query yang diberikan.
         - .s → Mengubah gambar atau video menjadi stiker.
         -!ig [url] → Mengambil foto/video dari URL yang diberikan.
         -!getpp @tag → Mengambil foto profil pengguna.
      
      ִֶָ☾ *Admin*:
         - !topup [jumlah] [@tag atau nomor] → Menambahkan uang ke akun pengguna (admin saja).
         -!wc on/off → Mengaktifkan/menonaktifkan welcome message (admin saja).
          -!antilink on/off → Mengaktifkan/menonaktifkan anti-link (admin saja).
          -!wc set [pesan] → Mengatur pesan welcome (admin saja).
          -!mute @tag → Mute pengguna (admin saja).
          -!unmute @tag → Unmute pengguna (admin saja).
          !antimute @tag → Anti mute pengguna (admin saja).
          -!listmute → Melihat daftar pengguna yang di-mute (admin saja).
          -!settime [jam] →
          -!timelist → Melihat daftar waktu yang diatur 
          -!convert
          -
          -!add 62 or +62 [nomor] → Menambahkan pengguna ke grup (admin saja).
          -!kick @tag → Mengeluarkan pengguna dari grup (admin saja).
      
     「  S T A T U S  」
- Welcome: ${welcomeStatus}
- Anti-Link: ${antiLinkStatus}
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

   
//convert pdf
if (body.startsWith("!convert")) {
  console.log("✅ Perintah !convert diterima, memproses...");
  try {
    // Periksa apakah pesan adalah reply
    const isReply = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!isReply) {
      await sock.sendMessage(from, {
        text: "❌ Harap reply ke file PDF dengan perintah *!convert*.",
      });
      return;
    }

    const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;

    // Periksa apakah file yang direply adalah PDF
    if (!quotedMsg?.documentMessage || !quotedMsg.documentMessage.mimetype.includes("pdf")) {
      await sock.sendMessage(from, {
        text: "❌ File yang direply harus berupa PDF.",
      });
      return;
    }
    
    const mediaBuffer = await downloadMediaMessage(
      { message: quotedMsg },
      "buffer",
      {},
      { logger: P({ level: "silent" }) }
    );
    
    if (!mediaBuffer) {
      await sock.sendMessage(from, {
        text: "❌ Gagal mengunduh file PDF. Pastikan file tersedia dan coba lagi.",
      });
      return;
    }
    // Simpan file PDF sementara
    const inputPath = "./temp/input.pdf";
    const outputPath = "./temp/output.docx";
    fs.writeFileSync(inputPath, mediaBuffer);

    // Konversi PDF ke Word
    const resultPath = await convertPdfToWord(inputPath, outputPath);
    if (resultPath) {
      await sock.sendMessage(from, {
        document: fs.readFileSync(resultPath),
        fileName: "converted.docx",
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }, { quoted: msg });

      // Hapus file sementara
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } else {
      await sock.sendMessage(from, {
        text: "❌ Gagal mengonversi PDF ke Word.",
      });
    }
  } catch (err) {
    console.error("❌ Error saat memproses perintah !convert:", err);
    await sock.sendMessage(from, {
      text: "❌ Terjadi kesalahan saat memproses file. Coba lagi nanti.",
    });
  }
}


    if (body.toLowerCase().startsWith('!cekkontol')) {
      await kontol(sock, msg, body);
  }


  if (body.startsWith("!wc")) {
    console.log("✅ Perintah !wc diterima, memproses...");
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
      if (args[1] === "on") {
        welcomeConfig[from] = welcomeConfig[from] || {};
        welcomeConfig[from].enabled = true;
        await sock.sendMessage(from, {
          text: "✅ Fitur welcome telah diaktifkan untuk grup ini.",
        });
      } else if (args[1] === "off") {
        welcomeConfig[from] = welcomeConfig[from] || {};
        welcomeConfig[from].enabled = false;
        await sock.sendMessage(from, {
          text: "✅ Fitur welcome telah dinonaktifkan untuk grup ini.",
        });
      } else if (args[1] === "set") {
        const customText = body.split(" ").slice(2).join(" ");
        if (!customText) {
          await sock.sendMessage(from, {
            text: "❌ Harap masukkan teks welcome yang baru.",
          });
          return;
        }
  
        welcomeConfig[from] = welcomeConfig[from] || {};
        welcomeConfig[from].text = customText;
        await sock.sendMessage(from, {
          text: "✅ Teks welcome berhasil diperbarui untuk grup ini.\n\nGunakan @tag untuk menandai anggota baru.",
        });
      } else {
        await sock.sendMessage(from, {
          text: "❌ Format salah! Gunakan: !wc [on/off/set] [teks]",
        });
      }
    } catch (error) {
      console.error("❌ Gagal memproses perintah !wc:", error);
      await sock.sendMessage(from, {
        text: "❌ Terjadi kesalahan saat memproses perintah !wc.",
      });
    }
  }

  if (body.startsWith("!settime")) {
    console.log("✅ Perintah !settime diterima, memproses...");
    try {
      await handleWelcome.setReminder(sock, from, body);
    } catch (error) {
      console.error("❌ Error saat memproses perintah !settime:", error);
      await sock.sendMessage(from, {
        text: "❌ Terjadi kesalahan saat memproses perintah !settime.",
      });
    }
  }
  
  // Handler untuk perintah !timelist
  if (body.startsWith("!timelist")) {
    console.log("✅ Perintah !timelist diterima, memproses...");
    try {
      await handleWelcome.listReminders(sock, from);
    } catch (error) {
      console.error("❌ Error saat memproses perintah !timelist:", error);
      await sock.sendMessage(from, {
        text: "❌ Terjadi kesalahan saat memproses perintah !timelist.",
      });
    }
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


// !getpp
if (body.startsWith("!getpp")) {
  console.log("✅ Perintah !getpp diterima, memproses...");
  await handleGetPP(sock, msg, body);
}

//yt search
if (body.startsWith("!play") || body.startsWith("!yt")) {
  console.log("✅ Perintah !play diterima, memproses...");
  try {
    const query = body.split(" ").slice(1).join(" ");
    if (!query) {
      await sock.sendMessage(from, {
        text: "❌ Harap masukkan kata kunci pencarian. Contoh: !play tentang kita",
      });
      return;
    }

    // Tampilkan pesan sedang mencari
    await sock.sendMessage(from, { 
      text: "🔍 Mencari video di YouTube... Mohon tunggu..." 
    });

    const results = await searchYouTube(query);
    if (results.length === 0) {
      await sock.sendMessage(from, {
        text: "❌ Tidak ada hasil pencarian untuk kata kunci tersebut.",
      });
      return;
    }

    // Simpan hasil pencarian
    youtubeSearchResults[from] = results;

    // Format hasil pencarian
    let resultText = "🎵 *Hasil Pencarian YouTube:*\n\n";
    results.slice(0, 10).forEach((video) => {
      resultText += `*${video.index}. ${video.title}*\n`;
      resultText += `⏱️ Durasi: ${video.duration || "Tidak diketahui"}\n`;
      resultText += `👁️ Views: ${video.views || "Tidak diketahui"}\n`;
      resultText += `🔗 [Link Video](${video.url})\n\n`;
    });
    resultText += "Ketik *!dl [nomor] [audio/video]* untuk mengunduh.\nContoh: !dl 1 audio";

    await sock.sendMessage(from, { 
      text: resultText,
      linkPreview: { 
        thumbnail: results[0].thumbnail,
        title: "Hasil Pencarian YouTube",
        description: `Menampilkan ${Math.min(results.length, 10)} hasil pencarian`
      }
    });
  } catch (error) {
    console.error("❌ Gagal memproses perintah !play:", error);
    await sock.sendMessage(from, {
      text: "❌ Gagal mencari video. Silakan coba lagi nanti.",
    });
  }
}

// YouTube Download Handler
if (body.startsWith("!dl") || body.startsWith("!download")) {
  console.log("✅ Perintah !dl diterima, memproses...");
  try {
    const args = body.split(" ");
    if (args.length < 3) {
      await sock.sendMessage(from, {
        text: "❌ Format salah! Gunakan: !dl [nomor] [audio/video]\nContoh: !dl 1 audio",
      });
      return;
    }

    const index = parseInt(args[1]) - 1;
    const format = args[2].toLowerCase();

    if (isNaN(index) || index < 0 || (format !== "audio" && format !== "video")) {
      await sock.sendMessage(from, {
        text: "❌ Format tidak valid!\nGunakan: !dl [nomor] [audio/video]\nContoh: !dl 1 video",
      });
      return;
    }

    const results = youtubeSearchResults[from];
    if (!results || !results[index]) {
      await sock.sendMessage(from, {
        text: "❌ Nomor tidak valid atau hasil pencarian kadaluarsa.\nGunakan !play terlebih dahulu.",
      });
      return;
    }

    const video = results[index];
    console.log(`⬇️ Mengunduh video: ${video.title} (${video.url})`);

    const filePath = await downloadYouTube(video.url, format);

    // Validasi apakah file ada
    if (!fs.existsSync(filePath)) {
      console.error("❌ File tidak ditemukan:", filePath);
      await sock.sendMessage(from, {
        text: "❌ File tidak ditemukan. Silakan coba lagi.",
      });
      return;
    }

    console.log(`📂 File ditemukan: ${filePath}`);

    // Kirim file yang sudah diunduh
    try {
      if (format === "audio") {
        console.log(`📤 Mengirim audio: ${filePath}`);
        await sock.sendMessage(from, {
          audio: { url: filePath },
          mimetype: "audio/mpeg",
          ptt: false,
        });
      } else if (format === "video") {
        console.log(`📤 Mengirim video: ${filePath}`);
        await sock.sendMessage(from, {
          video: { url: filePath },
          caption: `✅ Berhasil mengunduh video:\n*${video.title}*`,
        });
      }
      console.log(`✅ File berhasil dikirim: ${filePath}`);
    } catch (sendError) {
      console.error("❌ Gagal mengirim file:", sendError);
      await sock.sendMessage(from, {
        text: "❌ Terjadi kesalahan saat mengirim file. Silakan coba lagi.",
      });
      return;
    }

    // Hapus file setelah terkirim
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("🗑️ File berhasil dihapus:", filePath);
      }
    }, 30000);

  } catch (error) {
    console.error("❌ Gagal memproses perintah !dl:", error);
    await sock.sendMessage(from, {
      text: `❌ Gagal mengunduh: ${error.message}\nSilakan coba lagi atau gunakan video lain.`,
    });
  }
}



if (body.startsWith("!tiktok")) {
  console.log("✅ Perintah !tiktok diterima, memproses...");
  try {
    const url = body.split(" ")[1];
    if (!url) {
      await sock.sendMessage(from, {
        text: "❌ Harap sertakan URL TikTok. Contoh: !tiktok https://www.tiktok.com/@username/video/1234567890",
      });
      return;
    }

    // Tampilkan pesan sedang mengunduh
    await sock.sendMessage(from, {
      text: "🔍 Mengunduh media dari TikTok... Mohon tunggu...",
    });

    const downloadedFiles = await downloadTikTokMedia(url);

    // Kirim file yang sudah diunduh
    for (const filePath of downloadedFiles) {
      const isVideo = filePath.endsWith(".mp4");
      console.log(`📤 Mengirim ${isVideo ? "video" : "foto"}: ${filePath}`);
      await sock.sendMessage(from, {
        [isVideo ? "video" : "image"]: { url: filePath },
        caption: `✅ Media berhasil diunduh dari TikTok.`,
      });

      // Hapus file setelah terkirim
      fs.unlinkSync(filePath);
      console.log("🗑️ File berhasil dihapus:", filePath);
    }
  } catch (error) {
    console.error("❌ Gagal memproses perintah !tiktok:", error);
    await sock.sendMessage(from, {
      text: `❌ Terjadi kesalahan: ${error.message}`,
    });
  }
}

if (from.endsWith("@s.whatsapp.net")) {
  const suitData = loadSuitData(); // Muat data room dari file JSON
  const room = Object.values(suitData).find(
    (r) => r.player1 === senderId || r.player2 === senderId
  );

  if (room) {
    if (body.startsWith("!s ")) {
      const choice = body.slice(3).trim().toLowerCase();
      await handlePlayerChoice(sock, senderId, choice, userData);
    } else {
      await sock.sendMessage(from, {
        text: "❌ Format salah! Gunakan: !s [batu/gunting/kertas].",
      });
    }
    return;
  }

  await sock.sendMessage(from, {
    text: "❌ Anda tidak sedang berada di room mana pun.",
  });
}

if (body.startsWith("!suit ")) {
  await handleSuitBot(sock, from, senderId, body, userData, saveUserData);
} else if (body.startsWith("!crsuit ")) {
  await handleCreateSuit(sock, from, senderId, body, userData);
} else if (body.startsWith("!acc ")) {
  await handleAcceptSuit(sock, from, senderId, body, userData);
} else if (body.startsWith("!roomlist")) {
  await handleRoomList(sock, from);
} else if (from.endsWith("@s.whatsapp.net") && body.startsWith("!s ")) {
  const choice = body.slice(3).trim().toLowerCase();
  await handlePlayerChoice(sock, senderId, choice, userData);
} else if (body.startsWith("!cekwr")) {
  await handleCheckWinrate(sock, from, senderId, body, userData);
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

// Timer untuk soal
let mtkTimer = null;

// Perintah !mtk
if (body.startsWith("!mtk")) {
  console.log("✅ Perintah !mtk diterima, memproses...");
  try {
    if (mtkTimer) {
      await sock.sendMessage(from, {
        text: "❌ Masih ada soal yang belum selesai. Tunggu hingga soal selesai atau waktu habis.",
      });
      return;
    }

    const isHardMode = body.includes("hard");
    const questionTypes = isHardMode
      ? ["cerita", "logika", "kombinasi"]
      : ["faktorial", "prima", "linear", "berantai", "pola"];
    const selectedType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    let question, answer;

    switch (selectedType) {
      case "faktorial":
        const num = Math.floor(Math.random() * 6) + 3; // Angka 3-8
        question = `${num}! (faktorial)`;
        answer = Array.from({ length: num }, (_, i) => i + 1).reduce((a, b) => a * b, 1);
        break;

      case "prima":
        const primeCandidate = Math.floor(Math.random() * 50) + 1; // Angka 1-50
        question = `Apakah ${primeCandidate} bilangan prima? (Ya/Tidak)`;
        answer = isPrime(primeCandidate) ? "Ya" : "Tidak";
        break;

      case "linear":
        const a = Math.floor(Math.random() * 10) + 1; // Koefisien 1-10
        const b = Math.floor(Math.random() * 10) + 1; // Konstanta 1-10
        const x = Math.floor(Math.random() * 10) + 1; // Nilai x 1-10
        const c = a * x + b; // Hasil persamaan
        question = `${a}x + ${b} = ${c}, berapa x?`;
        answer = x;
        break;

      case "berantai":
        const nums = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10) + 1); // 3 angka acak 1-10
        question = `${nums.join(" × ")}`;
        answer = nums.reduce((a, b) => a * b, 1);
        break;

      case "pola":
        const start = Math.floor(Math.random() * 5) + 1; // Awal pola 1-5
        const multiplier = Math.floor(Math.random() * 3) + 2; // Kelipatan 2-4
        const sequence = Array.from({ length: 4 }, (_, i) => start * Math.pow(multiplier, i));
        question = `Berapa angka berikutnya dalam pola: ${sequence.slice(0, -1).join(", ")}?`;
        answer = sequence[sequence.length - 1];
        break;

        case "cerita":
          const ceritaQuestions = [
            {
              question: "Seorang petani memiliki 10 ayam. Setiap ayam bertelur 2 butir setiap hari. Berapa total telur dalam 5 hari?",
              answer: 10 * 2 * 5, // 100
            },
            {
              question: "Sebuah kereta api berjalan dengan kecepatan 60 km/jam selama 2 jam. Berapa jarak yang ditempuh kereta tersebut?",
              answer: 60 * 2, // 120
            },
            {
              question: "Di sebuah toko, harga 1 apel adalah $3. Jika seseorang membeli 4 apel, berapa total yang harus dibayar?",
              answer: 3 * 4, // 12
            },
            {
              question: "Seorang siswa membaca 20 halaman buku setiap hari. Jika buku tersebut memiliki 200 halaman, berapa hari yang dibutuhkan untuk menyelesaikan buku tersebut?",
              answer: 200 / 20, // 10
            },
            {
              question: "Sebuah kolam renang diisi dengan air menggunakan pompa yang mengalirkan 50 liter per menit. Berapa liter air yang akan terisi dalam 30 menit?",
              answer: 50 * 30, // 1500
            },
            {
              question: "Seorang pekerja menyelesaikan 5 tugas dalam 2 jam. Jika dia bekerja selama 8 jam, berapa banyak tugas yang dapat diselesaikan?",
              answer: (5 / 2) * 8, // 20
            },
            {
              question: "Di sebuah kebun, terdapat 15 pohon mangga. Setiap pohon menghasilkan 30 buah mangga. Berapa total buah mangga yang dihasilkan?",
              answer: 15 * 30, // 450
            },
            {
              question: "Sebuah mobil menghabiskan 8 liter bensin untuk menempuh jarak 100 km. Berapa liter bensin yang dibutuhkan untuk menempuh jarak 250 km?",
              answer: (8 / 100) * 250, // 20
            },
            {
              question: "Seorang guru memiliki 24 siswa di kelasnya. Jika setiap siswa mendapatkan 3 buku, berapa total buku yang dibutuhkan?",
              answer: 24 * 3, // 72
            },
            {
              question: "Sebuah toko menjual 12 botol air setiap jam. Berapa banyak botol air yang terjual dalam 6 jam?",
              answer: 12 * 6, // 72
            },
          ];
        
          const selectedCerita = ceritaQuestions[Math.floor(Math.random() * ceritaQuestions.length)];
          question = selectedCerita.question;
          answer = selectedCerita.answer;
          break;

          case "logika":
            const logikaQuestions = [
              {
                question: "Jika 3 apel + 2 jeruk = 10, dan 1 apel + 1 jeruk = 4, berapa nilai 1 apel?",
                answer: 2, // Dari persamaan logika
              },
              {
                question: "Jika 2x + 3 = 11, berapa nilai x?",
                answer: 4, // Dari persamaan linear
              },
              {
                question: "Jika 5x - 7 = 18, berapa nilai x?",
                answer: 5, // Dari persamaan linear
              },
              {
                question: "Jika 4 apel + 3 jeruk = 20, dan 2 apel + 1 jeruk = 8, berapa nilai 1 jeruk?",
                answer: 4, // Dari persamaan logika
              },
              {
                question: "Jika 2x + 5 = 15, berapa nilai x?",
                answer: 5, // Dari persamaan linear
              },
              {
                question: "Jika 6 apel + 2 jeruk = 24, dan 1 apel + 1 jeruk = 6, berapa nilai 1 apel?",
                answer: 4, // Dari persamaan logika
              },
            ];
          
            const selectedLogika = logikaQuestions[Math.floor(Math.random() * logikaQuestions.length)];
            question = selectedLogika.question;
            answer = selectedLogika.answer;
            break;

            case "kombinasi":
              const kombinasiQuestions = [
                {
                  question: "Berapa banyak cara memilih 2 orang dari 5 orang?",
                  answer: 10, // Kombinasi 5C2 = 10
                },
                {
                  question: "Berapa banyak cara memilih 3 orang dari 6 orang?",
                  answer: 20, // Kombinasi 6C3 = 20
                },
                {
                  question: "Berapa banyak cara memilih 4 orang dari 7 orang?",
                  answer: 35, // Kombinasi 7C4 = 35
                },
                {
                  question: "Berapa banyak cara memilih 2 orang dari 8 orang?",
                  answer: 28, // Kombinasi 8C2 = 28
                },
                {
                  question: "Berapa banyak cara memilih 3 orang dari 9 orang?",
                  answer: 84, // Kombinasi 9C3 = 84
                },
              ];
            
              const selectedKombinasi = kombinasiQuestions[Math.floor(Math.random() * kombinasiQuestions.length)];
              question = selectedKombinasi.question;
              answer = selectedKombinasi.answer;
              break;
    }

    currentQuestion = question;
    currentAnswer = answer;

    // Timer untuk soal
mtkTimer = setTimeout(() => {
  if (currentQuestion) {
    sock.sendMessage(from, {
      text: `⏰ Waktu habis! Soal: ${currentQuestion} tidak terjawab.`,
    });
  } else {
    sock.sendMessage(from, {
      text: "⏰ Waktu habis! Tidak ada soal aktif.",
    });
  }

  // Hapus soal setelah waktu habis
  currentQuestion = null;
  currentAnswer = null;
  mtkTimer = null;
}, isHardMode ? 180000 : 120000); // 60 detik untuk hard, 30 detik untuk normal

    await sock.sendMessage(from, {
      text: `🤔 Tebak-tebakan Matematika (${isHardMode ? "Hard" : "Normal"}):\n${question}\nJawab dengan benar menggunakan perintah .a [jawaban] (Waktu: ${isHardMode ? "2" : "1"} menit)`,
    });

    console.log("✅ Tebak-tebakan Matematika berhasil dikirim!");
  } catch (error) {
    console.error("❌ Gagal mengirim tebak-tebakan matematika:", error);
  }
}

// Fungsi untuk memeriksa bilangan prima
function isPrime(num) {
  if (num < 2) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
}

if (body.startsWith(".a")) {
  console.log("✅ Perintah .a diterima, memproses...");
  try {
    const senderId = msg.key.participant || msg.key.remoteJid;

    if (!userData[senderId]) {
      await sock.sendMessage(from, {
        text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
      });
      return;
    }

    if (!currentQuestion || !currentAnswer) {
      await sock.sendMessage(from, {
        text: "❌ Tidak ada soal aktif. Ketik !mtk untuk memulai.",
      });
      return;
    }

    const userAnswer = body.split(" ").slice(1).join(" ").trim();

    if (userAnswer.toLowerCase() === currentAnswer.toString().toLowerCase()) {
      // Tentukan kisaran reward berdasarkan mode
      const isHardMode = currentQuestion.includes("(Hard)");
      const reward = isHardMode
      ? Math.floor(Math.random() * (500 - 300 + 1)) + 400 // Kisaran 300-500
      : Math.floor(Math.random() * (300 - 200 + 1)) + 300; // Kisaran 200-300

      userData[senderId].money = (userData[senderId].money || 0) + reward;

      // Hentikan timer dan hapus soal
      clearTimeout(mtkTimer);
      mtkTimer = null;
      currentQuestion = null;
      currentAnswer = null;

      await sock.sendMessage(from, { 
        text: `🎉 Jawaban benar! Anda mendapatkan hadiah $${reward}. Total uang Anda: $${userData[senderId].money}.`,
      });

      saveUserData(); // Simpan data pengguna
    } else {
      await sock.sendMessage(from, {
        text: `❌ Jawaban salah. Coba lagi!`,
      });
    }
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
          exp: 0, // Tambahkan EXP
          money: 200,
          job: null,
          lastWork: null,
          missedDays: 0,
          houses: [], // Daftar rumah yang dimiliki
          currentHouse: null, // Rumah yang sedang digunakan
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

      if (body.startsWith("!belirumah")) {
        const args = body.split(" ");
        const houseIndex = parseInt(args[1]) - 1;
      
        if (isNaN(houseIndex) || houseIndex < 0 || houseIndex >= houses.length) {
          await sock.sendMessage(from, {
            text: "❌ Nomor rumah tidak valid. Gunakan perintah !listrumah untuk melihat daftar rumah.",
          });
          return;
        }
      
        const selectedHouse = houses[houseIndex];
        if (user.money < selectedHouse.price) {
          await sock.sendMessage(from, {
            text: `❌ Uang Anda tidak cukup untuk membeli ${selectedHouse.name}. Harga: $${selectedHouse.price}.`,
          });
          return;
        }
      
        user.money -= selectedHouse.price;
        user.houses.push(selectedHouse.name);
        saveUserData();
      
        await sock.sendMessage(from, {
          text: `✅ Anda berhasil membeli ${selectedHouse.name} seharga $${selectedHouse.price}.`,
        });
      }

      if (body.startsWith("!listrumah")) {
        let houseList = "🏠 Daftar Rumah:\n";
        houses.forEach((house, index) => {
          houseList += `${index + 1}. ${house.name} - Harga: $${house.price}, Jarak: ${house.distance}, Sewa: $${house.rent}/hari\n`;
        });
      
        await sock.sendMessage(from, { text: houseList });
      }

      if (body.startsWith("!pilihrumah")) {
        const args = body.split(" ");
        const houseName = args.slice(1).join(" ");
      
        if (!user.houses.includes(houseName)) {
          await sock.sendMessage(from, {
            text: `❌ Anda tidak memiliki rumah bernama ${houseName}.`,
          });
          return;
        }
      
        user.currentHouse = houseName;
        saveUserData();
      
        await sock.sendMessage(from, {
          text: `✅ Anda sekarang tinggal di ${houseName}.`,
        });
      }

      if (body.startsWith("!sewarumah")) {
        const args = body.split(" ");
        const houseName = args.slice(1).join(" ");
      
        if (!user.houses.includes(houseName)) {
          await sock.sendMessage(from, {
            text: `❌ Anda tidak memiliki rumah bernama ${houseName}.`,
          });
          return;
        }
      
        if (user.currentHouse === houseName) {
          await sock.sendMessage(from, {
            text: "❌ Anda tidak bisa menyewakan rumah yang sedang Anda gunakan.",
          });
          return;
        }
      
        const house = houses.find((h) => h.name === houseName);
        user.money += house.rent;
        saveUserData();
      
        await sock.sendMessage(from, {
          text: `✅ Anda berhasil menyewakan ${houseName} dan mendapatkan $${house.rent}.`,
        });
      }

      if (body.startsWith("!setrental")) {
        const args = body.split(" ");
        if (args.length < 3) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !setrental [nama rumah] [harga sewa]",
          });
          return;
        }
      
        const houseName = args[1];
        const rentPrice = parseInt(args[2]);
      
        if (isNaN(rentPrice) || rentPrice <= 0) {
          await sock.sendMessage(from, {
            text: "❌ Harga sewa harus berupa angka positif.",
          });
          return;
        }
      
        const user = userData[senderId];
        if (!user || !user.houses.includes(houseName)) {
          await sock.sendMessage(from, {
            text: `❌ Anda tidak memiliki rumah bernama ${houseName}.`,
          });
          return;
        }
      
        if (user.houses.length < 2) {
          await sock.sendMessage(from, {
            text: "❌ Anda harus memiliki minimal 2 rumah untuk menyewakan salah satunya.",
          });
          return;
        }
      
        if (user.currentHouse === houseName) {
          await sock.sendMessage(from, {
            text: "❌ Anda tidak bisa menyewakan rumah yang sedang Anda gunakan.",
          });
          return;
        }
      
        // Tambahkan rumah ke daftar rental
        rentalList.push({
          owner: senderId,
          houseName,
          rentPrice,
        });
      
        saveRentalList(); // Simpan ke file JSON
      
        await sock.sendMessage(from, {
          text: `✅ Rumah ${houseName} berhasil dimasukkan ke daftar rental dengan harga $${rentPrice}/hari.`,
        });
      }

      if (body.startsWith("!setjual")) {
        const args = body.split(" ");
        if (args.length < 3) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !setjual [nama rumah] [harga jual]",
          });
          return;
        }
      
        const houseName = args[1];
        const sellPrice = parseInt(args[2]);
      
        if (isNaN(sellPrice) || sellPrice <= 0) {
          await sock.sendMessage(from, {
            text: "❌ Harga jual harus berupa angka positif.",
          });
          return;
        }
      
        const user = userData[senderId];
        if (!user || !user.houses.includes(houseName)) {
          await sock.sendMessage(from, {
            text: `❌ Anda tidak memiliki rumah bernama ${houseName}.`,
          });
          return;
        }
      
        // Tambahkan rumah ke daftar pasar
        marketList.push({
          owner: senderId,
          houseName,
          sellPrice,
        });
      
        saveMarketList(); // Simpan ke file JSON
      
        // Hapus rumah dari daftar rumah pengguna
        user.houses = user.houses.filter((h) => h !== houseName);
        saveUserData();
      
        await sock.sendMessage(from, {
          text: `✅ Rumah ${houseName} berhasil dimasukkan ke pasar dengan harga $${sellPrice}.`,
        });
      }

      if (body.startsWith("!rentlist")) {
        if (rentalList.length === 0) {
          await sock.sendMessage(from, {
            text: "❌ Tidak ada rumah yang tersedia untuk disewa saat ini.",
          });
          return;
        }
      
        let list = "🏠 *Daftar Rumah yang Disewakan !rent[nomer]:*\n";
        rentalList.forEach((rental, index) => {
          list += `${index + 1}. Rumah: ${rental.houseName}\n   Harga: $${rental.rentPrice}/hari\n   Pemilik: ${rental.owner.replace(
            "@s.whatsapp.net",
            ""
          )}\n\n`;
        });
      
        await sock.sendMessage(from, { text: list });
      }

      if (body.startsWith("!rent")) {
        const args = body.split(" ");
        if (args.length < 2) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !rent [nomor]",
          });
          return;
        }
      
        const rentalIndex = parseInt(args[1]) - 1;
      
        if (isNaN(rentalIndex) || rentalIndex < 0 || rentalIndex >= rentalList.length) {
          await sock.sendMessage(from, {
            text: "❌ Nomor tidak valid. Gunakan perintah !rentlist untuk melihat daftar rumah yang disewakan.",
          });
          return;
        }
      
        const rental = rentalList[rentalIndex];
        const user = userData[senderId];
      
        if (!user) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }
      
        if (user.money < rental.rentPrice) {
          await sock.sendMessage(from, {
            text: `❌ Uang Anda tidak cukup untuk menyewa rumah ini. Biaya sewa: $${rental.rentPrice}.`,
          });
          return;
        }
      
        // Kurangi uang penyewa dan tambahkan ke pemilik
        user.money -= rental.rentPrice;
        const owner = userData[rental.owner];
        if (owner) {
          owner.money += rental.rentPrice;
        }
      
        saveUserData();
      
        await sock.sendMessage(from, {
          text: `✅ Anda berhasil menyewa rumah ${rental.houseName} dengan biaya $${rental.rentPrice}.`,
        });
      
        await sock.sendMessage(rental.owner, {
          text: `💰 Rumah Anda (${rental.houseName}) telah disewa oleh ${senderId.replace(
            "@s.whatsapp.net",
            ""
          )} dengan biaya $${rental.rentPrice}.`,
        });
      }

      if (body.startsWith("!pasarrumah")) {
        if (marketList.length === 0) {
          await sock.sendMessage(from, {
            text: "❌ Tidak ada rumah yang tersedia untuk dijual saat ini.",
          });
          return;
        }
      
        let list = "🏠 *Daftar Rumah yang Dijual beli dengan !buy [nomer]:*\n";
        marketList.forEach((market, index) => {
          list += `${index + 1}. Rumah: ${market.houseName}\n   Harga: $${market.sellPrice}\n   Penjual: ${market.owner.replace(
            "@s.whatsapp.net",
            ""
          )}\n\n`;
        });
      
        await sock.sendMessage(from, { text: list });
      }

      if (body.startsWith("!buy")) {
        const args = body.split(" ");
        if (args.length < 2) {
          await sock.sendMessage(from, {
            text: "❌ Format salah! Gunakan: !buy [nomor]",
          });
          return;
        }
      
        const marketIndex = parseInt(args[1]) - 1;
      
        if (isNaN(marketIndex) || marketIndex < 0 || marketIndex >= marketList.length) {
          await sock.sendMessage(from, {
            text: "❌ Nomor tidak valid. Gunakan perintah !pasarrumah untuk melihat daftar rumah yang dijual.",
          });
          return;
        }
      
        const market = marketList[marketIndex];
        const user = userData[senderId];
      
        if (!user) {
          await sock.sendMessage(from, {
            text: "❌ Anda belum memiliki akun. Gunakan perintah !create untuk membuat akun.",
          });
          return;
        }
      
        if (user.money < market.sellPrice) {
          await sock.sendMessage(from, {
            text: `❌ Uang Anda tidak cukup untuk membeli rumah ini. Harga: $${market.sellPrice}.`,
          });
          return;
        }
      
        // Kurangi uang pembeli dan tambahkan ke penjual
        user.money -= market.sellPrice;
        const seller = userData[market.owner];
        if (seller) {
          seller.money += market.sellPrice;
          seller.houses = seller.houses.filter((h) => h !== market.houseName); // Hapus rumah dari penjual
        }
      
        // Tambahkan rumah ke pembeli
        user.houses.push(market.houseName);
      
        // Hapus rumah dari daftar pasar
        marketList.splice(marketIndex, 1);
        saveMarketList();
        saveUserData();
      
        await sock.sendMessage(from, {
          text: `✅ Anda berhasil membeli rumah ${market.houseName} seharga $${market.sellPrice}.`,
        });
      
        await sock.sendMessage(market.owner, {
          text: `💰 Rumah Anda (${market.houseName}) telah dibeli oleh ${senderId.replace(
            "@s.whatsapp.net",
            ""
          )} seharga $${market.sellPrice}.`,
        });
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
      
        // Tambahkan biaya transportasi berdasarkan rumah
        const transportCosts = {
          far: 100, // Biaya transportasi untuk rumah jauh
          medium: 50, // Biaya transportasi untuk rumah sedang
          near: 20, // Biaya transportasi untuk rumah dekat
        };
      
        const currentHouse = user.currentHouse
          ? houses.find((house) => house.name === user.currentHouse)
          : null;
      
        const transportCost = currentHouse ? transportCosts[currentHouse.distance] : 150; // Default biaya transportasi jika tidak punya rumah
      
        if (user.money < transportCost) {
          await sock.sendMessage(from, {
            text: `❌ Uang Anda tidak cukup untuk membayar biaya transportasi sebesar $${transportCost}.`,
          });
          return;
        }
      
        user.money -= transportCost; // Kurangi biaya transportasi
        await sock.sendMessage(from, {
          text: `💼 Anda membayar biaya transportasi sebesar $${transportCost}.`,
        });
      
        // Tambahkan gaji, EXP, dan absen
        user.money += salaryPerAbsence;
        user.dailyEarnings += salaryPerAbsence;
        user.absenCount += 1;
      
        const expGained = 20; // +20 EXP
        user.exp += expGained;
      
        const expForNextLevel = getExpForNextLevel(user.level);
        if (user.exp >= expForNextLevel) {
          user.level += 1;
          user.exp -= expForNextLevel; // Sisa EXP setelah naik level
          user.money += 1000; // Bonus $1000
          await sock.sendMessage(from, {
            text: `🎉 Selamat! Anda naik ke level ${user.level}!`,
          });
        }
      
        saveUserData();
        await sock.sendMessage(from, {
          text: `✅ Anda telah absen sebagai ${user.job} (${user.absenCount}/${jobDetails.absencesPerDay}). Anda mendapatkan $${salaryPerAbsence} dan ${expGained} EXP. Total uang Anda: $${user.money}.`,
        });
      
        // Jika absen selesai
        if (user.absenCount === jobDetails.absencesPerDay) {
          const dailyBonus = 500; // Bonus $500
          user.money += dailyBonus;
          await sock.sendMessage(from, {
            text: `🎉 Anda telah menyelesaikan semua absen hari ini dan mendapatkan bonus $${dailyBonus}!`,
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

        // Tampilkan rumah
  let houseList = "🏠 Rumah:\n";
  if (user.houses && user.houses.length > 0) {
    houseList += `- Rumah yang dimiliki: ${user.houses.join(", ")}\n`;
    houseList += `- Rumah yang digunakan: ${
      user.currentHouse || "Tidak ada"
    }\n`;
  } else {
    houseList += "Belum memiliki rumah.\n";
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
            assetList +
            houseList,
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
      
        if (betAmount > MAX_BET_AMOUNT) {
          await sock.sendMessage(from, {
            text: `❌ Jumlah taruhan tidak boleh lebih dari $${MAX_BET_AMOUNT}.`,
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
      
        if (betAmount > MAX_BET_AMOUNT) {
          await sock.sendMessage(from, {
            text: `❌ Jumlah taruhan tidak boleh lebih dari $${MAX_BET_AMOUNT}.`,
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
          winnings = betAmount * 20;
        } else if (matchCount === 3) {
          winnings = betAmount * 10;
        } else if (matchCount === 2) {
          winnings = betAmount * 3;
        } else if (matchCount === 1) {
          winnings = betAmount * 2;
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

  setInterval(() => {
    houses.forEach((house) => {
      const fluctuation = Math.random() * 0.2 - 0.1; // Fluktuasi ±10%
      house.price = Math.max(1000, Math.floor(house.price * (1 + fluctuation))); // Harga minimum $1000
    });
  
    console.log("🏠 Harga rumah diperbarui:", houses);
  }, 3600000); // Perbarui setiap 1 jam
  setInterval(fetchRealTimePrices, 120000); 
  setInterval(() => {
    fetchRealTimePrices(); // Update harga currency setiap 6 jam
  }, 21600000); // 6 jam
  setInterval(() => {
    try {
      handleWelcome.checkReminders(sock);
    } catch (error) {
      console.error("❌ Error saat memeriksa pengingat:", error);
    }
  }, 60000); // Periksa setiap 1 menit
  module.exports = {
    saveUserData,
    userData, // Jika diperlukan untuk manipulasi data pengguna
  };
}

startBot();