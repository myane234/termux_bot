module.exports = {
  ping: async (sock, from) => {
    const start = Date.now();
    await sock.sendMessage(from, { text: "Pong! 🏓" });
    const latency = Date.now() - start;
    await sock.sendMessage(from, { text: `⚡ Latency: ${latency}ms` });
  }
};