// ==================== টেলিগ্রাম বট ====================
const TelegramBot = require('node-telegram-bot-api');
const Tesseract = require('tesseract.js');
const express = require('express');

// আপনার বট টোকেন
const BOT_TOKEN = "8355719607:AAFdgUvp-04Pvd3YOka7wT6Z3DsRkzF1O6c";

// এক্সপ্রেস অ্যাপ
const app = express();
const PORT = process.env.PORT || 3000;

// টেলিগ্রাম বট তৈরি
const bot = new TelegramBot(BOT_TOKEN);

// USA ফোন নম্বর খোঁজার প্যাটার্ন
const PHONE_PATTERNS = [
  /\+\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  /1[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  /\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/g,
  /\d{10}/g,
];

// নম্বর বের করা
function findNumbers(text) {
  let numbers = [];
  
  PHONE_PATTERNS.forEach(pattern => {
    const found = text.match(pattern);
    if (found) {
      numbers = numbers.concat(found);
    }
  });
  
  // ইউনিক এবং ক্লিন নম্বর
  const uniqueNumbers = [...new Set(numbers)];
  return uniqueNumbers.map(num => num.replace(/\D/g, ''));
}

// ফরম্যাট করা
function formatResult(numbers) {
  if (numbers.length === 0) {
    return "❌ ইমেজে কোনো USA ফোন নম্বর পাওয়া যায়নি।";
  }
  
  let result = "✅ পাওয়া USA ফোন নম্বর:\n\n";
  numbers.forEach(num => {
    // USA ফরম্যাটে কনভার্ট
    if (num.length === 10) {
      result += `+1${num}\n`;
    } else if (num.length === 11 && num.startsWith('1')) {
      result += `+${num}\n`;
    } else {
      result += `${num}\n`;
    }
  });
  
  result += `\n📊 মোট: ${numbers.length}টি নম্বর`;
  result += "\n📋 উপরের নম্বরগুলো কপি করতে পারেন";
  
  return result;
}

// ইমেজ থেকে টেক্সট পড়া
async function readImage(imageUrl) {
  try {
    console.log("ইমেজ পড়া শুরু...");
    
    const { data: { text } } = await Tesseract.recognize(
      imageUrl,
      'eng',
      { 
        logger: info => console.log(info.status)
      }
    );
    
    console.log("টেক্সট পড়া শেষ");
    return text;
  } catch (error) {
    console.error("ত্রুটি:", error);
    throw error;
  }
}

// ==================== টেলিগ্রাম কমান্ড ====================

// /start কমান্ড
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const text = `
👋 USA ফোন নম্বর স্ক্যানার বট

ইমেজ পাঠান, USA ফোন নম্বরগুলো বের করে দেব।

📌 কমান্ড:
/start - শুরু করুন
/scan - স্ক্যান সম্পর্কে তথ্য

📸 ব্যবহার:
১. USA ফোন নম্বর আছে এমন ইমেজ পাঠান
২. বট স্ক্যান করবে
৩. নম্বরগুলো পাবেন একসাথে

📞 সাপোর্টেড ফরম্যাট:
• (123) 456-7890
• 123-456-7890
• 123.456.7890
• +1 123 456 7890
• 1234567890
  `;
  
  bot.sendMessage(chatId, text);
});

// /scan কমান্ড
bot.onText(/\/scan/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "📸 একটি ইমেজ পাঠান যাতে USA ফোন নম্বর আছে।");
});

// ইমেজ প্রসেস
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // স্ট্যাটাস মেসেজ
    const statusMsg = await bot.sendMessage(chatId, "🔍 ইমেজ ডাউনলোড হচ্ছে...");
    
    // বড় ইমেজ নেওয়া
    const photo = msg.photo[msg.photo.length - 1];
    
    // ফাইল URL পাওয়া
    const file = await bot.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    await bot.editMessageText("🔍 ইমেজ স্ক্যান হচ্ছে...", {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });
    
    // ইমেজ পড়া
    const text = await readImage(fileUrl);
    
    // নম্বর বের করা
    const numbers = findNumbers(text);
    
    await bot.editMessageText(formatResult(numbers), {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });
    
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ ত্রুটি: ${error.message}`);
  }
});

// সাধারণ টেক্সট
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  
  if (msg.text && !msg.text.startsWith('/') && !msg.photo) {
    bot.sendMessage(chatId, "ℹ️ ইমেজ পাঠান অথবা /start কমান্ড দিন");
  }
});

// ==================== রেন্ডার সার্ভার ====================

app.use(express.json());

// হোম পেজ
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>USA Phone Scanner Bot</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial;
          text-align: center;
          padding: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 15px;
          color: #333;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
          color: #667eea;
        }
        .status {
          background: #d4edda;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .telegram-btn {
          background: #0088cc;
          color: white;
          padding: 12px 24px;
          border-radius: 25px;
          text-decoration: none;
          display: inline-block;
          margin-top: 20px;
          font-weight: bold;
        }
        .telegram-btn:hover {
          background: #006699;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🇺🇸 USA Phone Scanner Bot</h1>
        <div class="status">
          <h2>✅ বট চালু আছে!</h2>
          <p>টেলিগ্রামে ইমেজ পাঠানোর পর স্ক্যান করা হবে</p>
        </div>
        <p>ইমেজে USA ফোন নম্বর স্ক্যান করে বের করে দেবে</p>
        <p>নম্বরগুলো একসাথে কপি করতে পারবেন</p>
        <a href="https://t.me/USAPhoneScannerBot" class="telegram-btn" target="_blank">
          টেলিগ্রামে ব্যবহার করুন
        </a>
      </div>
    </body>
    </html>
  `);
});

// Webhook এন্ডপয়েন্ট
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// সার্ভার শুরু
app.listen(PORT, () => {
  console.log(`✅ সার্ভার চলছে: http://localhost:${PORT}`);
  console.log(`🤖 বট প্রস্তুত: টেলিগ্রামে ইমেজ পাঠান`);
  
  // Polling মোডে বট চালু (রেন্ডারে কাজ করবে)
  bot.startPolling();
});
