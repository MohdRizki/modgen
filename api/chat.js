const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    // Mengatur header CORS agar frontend dapat mengakses API ini
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Menangani preflight request dari browser (CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Hanya menerima metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
    }

    try {
        const { pesan } = req.body;
        
        if (!pesan) {
            return res.status(400).json({ error: 'Parameter "pesan" tidak boleh kosong.' });
        }

        // Inisialisasi Gemini API dengan API Key dari Environment Variable Vercel
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Menggunakan model Gemini 2.5 Flash untuk respons yang cepat dan hemat biaya
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Generate konten berdasarkan prompt dari frontend
        const result = await model.generateContent(pesan);
        const response = await result.response;
        const text = response.text();

        // Mengembalikan teks ke frontend
        return res.status(200).json({ text: text });

    } catch (error) {
        console.error("Error pada Backend AI:", error);
        return res.status(500).json({ 
            error: { 
                message: "Gagal memproses permintaan AI. Pastikan API Key valid dan server tidak sedang gangguan.",
                details: error.message 
            } 
        });
    }
};
