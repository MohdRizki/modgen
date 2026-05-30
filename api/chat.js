const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    // Header CORS bawaan
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Gunakan metode POST.' });
    }

    try {
        const { pesan } = req.body;
        
        if (!pesan) {
            return res.status(400).json({ error: 'Parameter pesan kosong.' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent(pesan);
        const response = await result.response;
        const text = response.text();

        return res.status(200).json({ text: text });

    } catch (error) {
        console.error("AI Error:", error);
        return res.status(500).json({ 
            error: { message: "Gagal terhubung ke AI Gemini.", details: error.message } 
        });
    }
};
