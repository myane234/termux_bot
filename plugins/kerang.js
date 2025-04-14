module.exports = async function kerang(sock, msg, body) {
    const pertanyaan = body.slice(7).trim();

    if (!pertanyaan) {
        await sock.sendMessage(msg.key.remoteJid, {
            text: 'Ketik pertanyaan setelah perintah, contoh:\n!kerang apakah taufik gay?'
        });
        return;
    }

    const jawabanAcak = [
        "Iya", 
        "Tidak", 
        "Mungkin", 
        "Tanya lagi nanti", 
        "Rahasia", 
        "Gak mau jawab", 
        "Coba tebak sendiri"
    ];

    const jawabannya = jawabanAcak[Math.floor(Math.random() * jawabanAcak.length)];

    await sock.sendMessage(msg.key.remoteJid, {
        text: `Pertanyaan: ${pertanyaan}\nJawaban: ${jawabannya}`
    });
};
