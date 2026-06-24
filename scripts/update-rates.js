const fs = require('fs');
const https = require('https');

const API_KEY = process.env.CURRENCY_BEACON_API_KEY;
const HISTORY_LIMIT = 31 * 24; // 31 день по одному снимку в час

if (!API_KEY) {
console.error('❌ CURRENCY_BEACON_API_KEY is not set');
process.exit(1);
}

function fetchRates() {
return new Promise((resolve, reject) => {
https.get(
`https://api.currencybeacon.com/v1/latest?api_key=${API_KEY}&base=USD`,
(res) => {
let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (error) {
                    reject(error);
                }
            });
        }
    ).on('error', reject);
});

}

async function main() {

console.log('📡 Fetching latest rates...');

const response = await fetchRates();

if (!response.response?.rates) {
    console.error('❌ Invalid API response');
    console.log(JSON.stringify(response, null, 2));
    process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const rates = response.response.rates;

const historyPath = 'data/history.json';

let history = [];

if (fs.existsSync(historyPath)) {
    history = JSON.parse(
        fs.readFileSync(historyPath, 'utf8')
    );
}

history.push({
    timestamp: now,
    rates: rates
});

if (history.length > HISTORY_LIMIT) {
    history = history.slice(-HISTORY_LIMIT);
}

fs.writeFileSync(
    historyPath,
    JSON.stringify(history, null, 2)
);

const dayAgo = now - 86400;
const weekAgo = now - 7 * 86400;
const monthAgo = now - 31 * 86400;

const ratesJson = {
    updated: now,
    current: rates,
    day: history.find(h => h.timestamp >= dayAgo)?.rates || {},
    week: history.find(h => h.timestamp >= weekAgo)?.rates || {},
    month: history.find(h => h.timestamp >= monthAgo)?.rates || {}
};

fs.writeFileSync(
    'data/rates.json',
    JSON.stringify(ratesJson, null, 2)
);

console.log(`✅ Updated successfully`);
console.log(`📊 History records: ${history.length}`);

}

main().catch(error => {
console.error('❌ Error:', error);
process.exit(1);
});
