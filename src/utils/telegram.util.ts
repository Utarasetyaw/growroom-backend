// src/utils/telegram.util.ts
import axios from 'axios';

export async function sendTelegramMessage(botToken: string, chatId: string | number, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  return axios.post(url, {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown'
  }).catch((e) => {
    // Bisa log error ke file/log management
    console.error('[Telegram] Gagal kirim notifikasi:', e.message);
  });
}
