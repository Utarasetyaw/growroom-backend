import axios from 'axios';
import { Logger } from '@nestjs/common';

const logger = new Logger('TelegramUtil');

export async function sendTelegramMessage(botToken: string, chatId: string | number, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  logger.log(`8. Mengirim request ke URL: ${url}`);

  axios.post(url, {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown'
  })
  .then(response => {
    logger.log('9. SUKSES! Respons dari Telegram API:', JSON.stringify(response.data));
  })
  .catch((error) => {
    logger.error('9. GAGAL! Terjadi error saat mengirim notifikasi.');
    if (error.response) {
      // Request terkirim dan server merespons dengan status error
      logger.error(`   -> Status Code: ${error.response.status}`);
      logger.error(`   -> Respons Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // Request terkirim tapi tidak ada respons
      logger.error('   -> Error Request: Tidak ada respons yang diterima dari server Telegram.');
    } else {
      // Error terjadi saat menyiapkan request
      logger.error('   -> Error Setup:', error.message);
    }
  });
}
