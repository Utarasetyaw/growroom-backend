import axios from 'axios';

export async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  if (!botToken || !chatId) {
    throw new Error('Telegram bot token or chatId not set');
  }
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, { chat_id: chatId, text });
  } catch (e) {
    // Silently fail agar tidak mengganggu flow utama
    console.error('[Telegram] Failed to send message:', e?.response?.data || e);
  }
}
