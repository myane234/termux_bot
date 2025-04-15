const admins = [];  // Array untuk menyimpan admin yang sudah ditambahkan

module.exports = {
    name: 'admin',
    description: 'Menambah atau menghapus admin.',
    async execute(sock, message, body) {
        const { from, sender } = message; // Ambil info dari pesan
        const mentionedUser = message.mentionedJid[0]; // Ambil @tag yang di-mention

        if (!mentionedUser) {
            await sock.sendMessage(from, { text: '❌ Mohon mention pengguna yang ingin dijadikan admin atau dihapus.' });
            return;
        }

        if (body.startsWith('!admin')) {
            // Cek jika pengirim adalah admin
            if (!admins.includes(sender)) {
                await sock.sendMessage(from, { text: '❌ Anda tidak memiliki izin untuk menambahkan admin.' });
                return;
            }

            // Tambahkan pengguna yang di-mention sebagai admin
            if (!admins.includes(mentionedUser)) {
                admins.push(mentionedUser);
                await sock.sendMessage(from, { text: `✔️ ${mentionedUser} telah ditambahkan sebagai admin.` });
            } else {
                await sock.sendMessage(from, { text: `❌ ${mentionedUser} sudah menjadi admin.` });
            }
        }

        if (body.startsWith('!unadmin')) {
            // Cek jika pengirim adalah admin
            if (!admins.includes(sender)) {
                await sock.sendMessage(from, { text: '❌ Anda tidak memiliki izin untuk menghapus admin.' });
                return;
            }

            // Hapus pengguna yang di-mention sebagai admin
            const index = admins.indexOf(mentionedUser);
            if (index > -1) {
                admins.splice(index, 1);
                await sock.sendMessage(from, { text: `✔️ ${mentionedUser} telah dihapus dari admin.` });
            } else {
                await sock.sendMessage(from, { text: `❌ ${mentionedUser} tidak ada dalam daftar admin.` });
            }
        }
    },
};
