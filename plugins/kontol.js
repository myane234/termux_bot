module.exports = async function kontol(sock, msg, body) {
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const from = msg.key.remoteJid;

    // Ambil query setelah command (!cekkontol)
    const query = body.slice(11).trim(); // slice dari index ke-11, panjang "!cekkontol "

    let namaTag, mentionJid = [];

    if (mentioned.length > 0) {
        const target = mentioned[0];
        namaTag = `@${target.split('@')[0]}`;
        mentionJid = [target];
    } else if (query) {
        namaTag = query;
    } else {
        const pengirim = msg.key.participant || msg.key.remoteJid;
        namaTag = `@${pengirim.split('@')[0]}`;
        mentionJid = [pengirim];
    }

    const jenis = [
        "Black Mamba 🐍",
        "Sosis Solo 😎",
        "Bayi Lintah 🤏",
        "Titanium Drill 🔩",
        "Odol Ketinggalan Tutup 😭",
        "Kontol Kamen Rider 👺",
        "Burung Emprit 🐦"
    ];

    const jembut = [
        "Selembut bulu ketek Elaina ✨",
        "Keriting spiral model Jepang 🇯🇵",
        "Gak ada, wax tiap hari 😎",
        "Kayak hutan Amazon 🌳",
        "Semulus paha anime cewek"
    ];

    const ukuran = [
        "1 nano senimeter 😭",
        "3 cm lagi sampe standar 🫣",
        "17cm – siap terbang ✈️",
        "5 meter (pas bangun mimpi basah) 🚀",
        "Gak bisa diukur, karena malu-malu 🙈"
    ];

    const hasil = `*Kontol Checker*\n\n👤 Nama: ${namaTag}\n🍌 Kontol: *${acak(jenis)}*\n🧵 Jembut: *${acak(jembut)}*\n📏 Ukuran: *${acak(ukuran)}*`;

    await sock.sendMessage(from, {
        text: hasil,
        mentions: mentionJid
    });
};

function acak(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
