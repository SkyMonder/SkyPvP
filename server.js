const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const STATS_FILE = path.join(__dirname, 'stats.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Раздаём статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Загрузка статистики из файла
function loadStats() {
    try {
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error loading stats:', e);
    }
    return {};
}

// Сохранение статистики в файл
function saveStats(stats) {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (e) {
        console.error('Error saving stats:', e);
    }
}

let stats = loadStats();

// Эндпоинт для получения статистики (для фронтенда)
app.get('/api/stats', (req, res) => {
    const playersArray = Object.entries(stats).map(([uuid, data]) => ({
        name: data.name || uuid.substring(0, 8),
        wins: data.wins || 0,
        losses: data.losses || 0
    }));
    res.json(playersArray);
});

// Эндпоинт для обновления после дуэли (POST от плагина)
app.post('/api/update', (req, res) => {
    const { api_key, winner_uuid, winner_name, loser_uuid, loser_name, winner_wins, winner_losses, loser_wins, loser_losses } = req.body;
    
    // Проверка API ключа
    if (api_key !== 'skypvp_8f7d3a2b9e1c4f5d6a7b8c9d0e1f2g3h') {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    if (!stats[winner_uuid]) stats[winner_uuid] = { name: winner_name, wins: 0, losses: 0 };
    if (!stats[loser_uuid]) stats[loser_uuid] = { name: loser_name, wins: 0, losses: 0 };

    stats[winner_uuid].wins = winner_wins;
    stats[winner_uuid].name = winner_name;
    stats[loser_uuid].losses = loser_losses;
    stats[loser_uuid].name = loser_name;

    saveStats(stats);
    res.json({ status: 'ok' });
});

// Эндпоинт для массовой синхронизации
app.post('/api/update/bulk', (req, res) => {
    const { api_key, players } = req.body;
    
    // ИСПРАВЛЕНО: используем тот же ключ
    if (api_key !== 'skypvp_8f7d3a2b9e1c4f5d6a7b8c9d0e1f2g3h') {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    // Простая проверка, что players - это объект
    if (typeof players !== 'object' || players === null) {
        return res.status(400).json({ error: 'Invalid players data' });
    }

    // Заменяем статистику
    stats = players;
    saveStats(stats);
    res.json({ status: 'ok' });
});

// Добавим простой ping-эндпоинт для UptimeRobot
app.get('/ping', (req, res) => {
    res.send('OK');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API доступен по адресу: http://localhost:${PORT}/api/stats`);
});
