module.exports = async function(req, res) {
    // 1. Mengizinkan jalur komunikasi (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Tangani preflight request dari browser
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Blokir jika bukan metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: { message: 'Method tidak diizinkan. Gunakan POST.' } });
    }

    try {
        const { pesan } = req.body;
        
        // Panggil API Key dari Environment Variables Vercel
        const apiKey = process.env.GEMINI_API_KEY; 
        
        if (!apiKey) {
            return res.status(500).json({ error: { message: "GEMINI_API_KEY belum diisi di Dasbor Vercel (Settings > Environment Variables)!" } });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const googleRes = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: pesan }] }]
            })
        });

        const data = await googleRes.json();
        
        // Jika Google menolak (limit/kunci salah), teruskan errornya ke HTML
        if (!googleRes.ok) {
            return res.status(googleRes.status).json(data);
        }
        
        // Sukses! Kembalikan jawaban AI
        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: { message: 'Terjadi kesalahan di Server Vercel: ' + error.message } });
    }
};
