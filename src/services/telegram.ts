import https from 'https';
import { getTelegramConfig } from '../core/database';

export interface TelegramMessage {
  type: 'start' | 'complete' | 'error' | 'info';
  title: string;
  message: string;
  profileName?: string;
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', (e) => {
      console.error('Telegram API error:', e);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

export async function notify(msg: TelegramMessage): Promise<boolean> {
  const config = getTelegramConfig();

  if (!config.enabled || !config.botToken || !config.chatId) {
    return false;
  }

  // Check if notification type is enabled
  if (msg.type === 'start' && !config.notifyOnStart) return false;
  if (msg.type === 'complete' && !config.notifyOnComplete) return false;
  if (msg.type === 'error' && !config.notifyOnError) return false;

  const emoji = {
    start: '🚀',
    complete: '✅',
    error: '❌',
    info: 'ℹ️',
  }[msg.type];

  let text = `${emoji} <b>${msg.title}</b>\n\n${msg.message}`;

  if (msg.profileName) {
    text += `\n\n📋 Profile: ${msg.profileName}`;
  }

  text += `\n\n🕐 ${new Date().toLocaleString()}`;

  return sendTelegramMessage(config.botToken, config.chatId, text);
}

export async function notifyFarmingStart(profileCount: number): Promise<void> {
  await notify({
    type: 'start',
    title: 'Farming Started',
    message: `Starting farming for ${profileCount} profile(s)`,
  });
}

export async function notifyFarmingComplete(profileCount: number, success: number, failed: number): Promise<void> {
  await notify({
    type: 'complete',
    title: 'Farming Complete',
    message: `Completed farming for ${profileCount} profile(s)\n✅ Success: ${success}\n❌ Failed: ${failed}`,
  });
}

export async function notifyFarmingError(profileName: string, error: string): Promise<void> {
  await notify({
    type: 'error',
    title: 'Farming Error',
    message: error,
    profileName,
  });
}

export async function testTelegramConnection(botToken: string, chatId: string): Promise<boolean> {
  const text = '🔔 Phantom Browser test notification\n\nTelegram notifications are configured correctly!';
  return sendTelegramMessage(botToken, chatId, text);
}
