const fs = require('fs');
const https = require('https');

const API_KEY = process.env.CURRENCY_BEACON_API_KEY;
const HISTORY_LIMIT = 31 * 24; // 744 записи (31 день)

if (!API_KEY) {
    console.error("❌ CURRENCY_BEACON_API_KEY is not set!");
    process.exit(1);
}

async function fetchRates() {
    return new Promise((resolve, reject) => {
        https.get(`https://api.currencybeacon.com/mcp?api_key=${API_KEY}`, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error("Failed to parse API response"));
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        console.log("📡 Fetching latest rates...");

        const apiResponse = await fetchRates();
        const now = Math.floor(Date.now() / 1000);

        // 1. Загружаем историю
        let history = [];
        const historyPath = 'data/history.json';
        if (fs.existsSync(historyPath)) {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        }

        // 2. Добавляем новую запись
        history.push({
            timestamp: now,
            rates: apiResponse.rates || apiResponse
        });

        // 3. Ограничиваем размер истории
        if (history.length > HISTORY_LIMIT) {
            history = history.slice(-HISTORY_LIMIT);
        }

        // 4. Сохраняем историю
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

        // 5. Формируем rates.json
        const ratesJson = {
            updated: now,
            current: apiResponse.rates || apiResponse,
            day: {},
            week: {},
            month: {}
        };

        const dayAgo = now - 86400;      // 24 часа
        const weekAgo = now - 604800;    // 7 дней
        const monthAgo = now - 2678400;  // ~31 день

        ratesJson.day = history.find(h => h.timestamp >= dayAgo)?.rates || {};
        ratesJson.week = history.find(h => h.timestamp >= weekAgo)?.rates || {};
        ratesJson.month = history.find(h => h.timestamp >= monthAgo)?.rates || {};

        fs.writeFileSync('data/rates.json', JSON.stringify(ratesJson, null, 2));

        console.log(`✅ Successfully updated at ${new Date().toISOString()}`);
        console.log(`📊 History size: ${history.length}/${HISTORY_LIMIT}`);

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

main();
