/*
WhatsApp Pooja Booking Bot using Baileys.js + Nodemailer
Author: ChatGPT
*/

const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

// === Email Setup ===
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// === Baileys WhatsApp Auth ===
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (text.toLowerCase() === 'book') {
      await sock.sendMessage(sender, { text: '🙏 Welcome to Pooja Booking!\nPlease enter time of pooja (e.g., 10:30 AM, 2nd Aug)' });

      let data = {};

      const collect = async (key, prompt) => {
        await sock.sendMessage(sender, { text: prompt });
        return new Promise(resolve => {
          const handler = async ({ messages }) => {
            const reply = messages[0];
            if (reply.key.remoteJid === sender && reply.message.conversation) {
              data[key] = reply.message.conversation;
              sock.ev.off('messages.upsert', handler);
              resolve();
            }
          };
          sock.ev.on('messages.upsert', handler);
        });
      };

      await collect('time', '⏰ Enter time of pooja:');
      await collect('place', '📍 Enter place of pooja (with address):');
      await collect('type', '🕉️ Enter type of pooja (e.g., Satyanarayana Vratham):');

      // Send Email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: '📋 New Pooja Booking',
        text: `New Pooja Booking:\n- Time: ${data.time}\n- Place: ${data.place}\n- Type: ${data.type}`
      };

      await transporter.sendMail(mailOptions);

      await sock.sendMessage(sender, { text: '✅ Your pooja booking is confirmed. Admin has been notified!' });
    }
  });
}

startBot();
