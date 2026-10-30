
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        import { firebaseConfig, appId, defaultMapels, defaultPendekatan, defaultModel, defaultMetode } from './config.js';

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        // Initialize LocalForage for PDFs to avoid Storage Billing
        const lf = localforage.createInstance({ name: "SpapPintar_DB", storeName: "pustaka_lokal" });

        let currentUser = null;
        let currentPdfObjectUrl = null;
        let currentZoom = 1;

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        const setTxt = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

        // SIDEBAR TOGGLE
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('mobile-overlay');
        const openSidebarBtn = document.getElementById('btn-open-sidebar');
        const closeSidebarBtn = document.getElementById('btn-close-sidebar');

        function toggleSidebar(show) {
            if (show) {
                sidebar.classList.remove('-translate-x-full'); sidebarOverlay.classList.remove('hidden');
            } else {
                sidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('hidden');
            }
        }
        openSidebarBtn?.addEventListener('click', () => toggleSidebar(true));
        closeSidebarBtn?.addEventListener('click', () => toggleSidebar(false));
        sidebarOverlay?.addEventListener('click', () => toggleSidebar(false));
        document.querySelectorAll('.nav-link').forEach(link => { link.addEventListener('click', () => { if(window.innerWidth < 768) toggleSidebar(false); }); });

        let globalMapels = [...defaultMapels];
        let globalPendekatan = [...defaultPendekatan];
        let globalModel = [...defaultModel];
        let globalMetode = [...defaultMetode];
        
        async function loadDynamicLists() {
            if (!currentUser) return;
            try {
                const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'pengaturan', 'variabel');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    if(data.mapels) globalMapels = data.mapels;
                    if(data.pendekatan) globalPendekatan = data.pendekatan;
                    if(data.model) globalModel = data.model;
                    if(data.metode) globalMetode = data.metode;
                }
            } catch(e) { console.error("Gagal muat variabel cloud:", e); }
            renderDynamicSettings(); updateAllSelects();
        }

        async function saveDynamicLists() {
            if(!currentUser) return;
            try {
                const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'pengaturan', 'variabel');
                await setDoc(docRef, { mapels: globalMapels, pendekatan: globalPendekatan, model: globalModel, metode: globalMetode });
            } catch(e) { console.error("Gagal simpan variabel cloud:", e); }
        }

        function renderDynamicSettings() {
            renderListUI('mapel-list', globalMapels, 'removeMapel');
            renderListUI('pendekatan-list', globalPendekatan, 'removePendekatan');
            renderListUI('model-list', globalModel, 'removeModel');
            renderListUI('metode-list', globalMetode, 'removeMetode');
        }

        function renderListUI(containerId, arrayData, removeFuncName) {
            const container = document.getElementById(containerId);
            if (!container) return; container.innerHTML = '';
            arrayData.forEach((item, idx) => { container.innerHTML += `<div class="flex items-center bg-white border border-gray-200 shadow-sm rounded-full px-3 py-1 text-xs md:text-sm text-navy font-semibold">${item} <button type="button" onclick="${removeFuncName}(${idx})" class="ml-2 text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button></div>`; });
        }

        window.removeMapel = async (idx) => { globalMapels.splice(idx, 1); renderDynamicSettings(); updateAllSelects(); await saveDynamicLists(); };
        window.removePendekatan = async (idx) => { globalPendekatan.splice(idx, 1); renderDynamicSettings(); updateAllSelects(); await saveDynamicLists(); };
        window.removeModel = async (idx) => { globalModel.splice(idx, 1); renderDynamicSettings(); updateAllSelects(); await saveDynamicLists(); };
        window.removeMetode = async (idx) => { globalMetode.splice(idx, 1); renderDynamicSettings(); updateAllSelects(); await saveDynamicLists(); };

        const setupAddBtn = (btnId, inputId, arr) => {
            document.getElementById(btnId)?.addEventListener('click', async () => {
                const val = document.getElementById(inputId).value.trim();
                if (val && !arr.includes(val)) { arr.push(val); document.getElementById(inputId).value = ''; renderDynamicSettings(); updateAllSelects(); await saveDynamicLists(); }
            });
        };
        setupAddBtn('btn-add-mapel', 'new-mapel', globalMapels); setupAddBtn('btn-add-pendekatan', 'new-pendekatan', globalPendekatan); setupAddBtn('btn-add-model', 'new-model', globalModel); setupAddBtn('btn-add-metode', 'new-metode', globalMetode);

        function updateAllSelects() {
            const fillSelect = (selectorClass, arrayData) => {
                document.querySelectorAll(selectorClass).forEach(sel => {
                    const currentVal = sel.value; sel.innerHTML = '';
                    arrayData.forEach(m => { sel.innerHTML += `<option value="${m}">${m}</option>`; });
                    if(arrayData.includes(currentVal)) sel.value = currentVal;
                });
            };
            fillSelect('.mapel-dynamic-select', globalMapels); fillSelect('.select-pendekatan', globalPendekatan); fillSelect('.select-model', globalModel); fillSelect('.select-metode', globalMetode); updateBukuSelector();
        }

        const initAuth = async () => { try { if (!auth.currentUser) await signInAnonymously(auth); } catch (error) { const as = document.getElementById('auth-status'); if (as) as.innerHTML = "⚠️ DB Offline"; } };
        initAuth();

        window.showToast = (message, type = 'info') => {
            const toast = document.getElementById('toast'); if (!toast) return;
            setTxt('toast-message', message); const ti = document.getElementById('toast-icon');
            if (ti) {
                if(type === 'error') ti.innerHTML = '<i class="fas fa-exclamation-circle text-red-400"></i>';
                else if(type === 'success') ti.innerHTML = '<i class="fas fa-check-circle text-orange"></i>';
                else ti.innerHTML = '<i class="fas fa-info-circle text-blue-400"></i>';
            }
            toast.classList.remove('translate-y-32', 'opacity-0'); setTimeout(() => { toast.classList.add('translate-y-32', 'opacity-0'); }, 4000);
        };

        let cachedSettings = {
            sekolahName: 'SD Negeri Pasirmae 1', jenjang: 'Sekolah Dasar (SD)', kota: 'Pandeglang',
            kepsekName: 'Yayan Iskandar, S.Pd', kepsekNIP: '196805182000121002',
            guruName: '', guruNIP: '-', jmlSiswa: 32, pendekatan: 'Saintifik', model: 'Problem Based Learning (PBL)',
            metode: 'Diskusi Kelompok', sarana: 'Pengaturan tempat duduk berkelompok, pemanfaatan proyektor.',
            kondisi: 'Reguler/tipikal. Gaya belajar heterogen.',
            gdocsUrl: 'https://script.google.com/macros/s/AKfycbxSnGKx3SEBmbQ-mTTG0ejKt2L_KrxQCdqMoFLbeihbbyjCmHFyx0rPUaISYIcOHaGH/exec'
        };

        async function loadSettingsUI() {
            if (!currentUser) return;
            try {
                const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'pengaturan', 'profil');
                const snap = await getDoc(docRef);
                if (snap.exists()) { cachedSettings = snap.data(); } else { cachedSettings.guruName = currentUser.nama; cachedSettings.guruNIP = currentUser.nip || '-'; }
                
                document.getElementById('set-sekolah').value = cachedSettings.sekolahName; document.getElementById('set-jenjang').value = cachedSettings.jenjang;
                document.getElementById('set-kota').value = cachedSettings.kota; document.getElementById('set-kepsek-name').value = cachedSettings.kepsekName;
                document.getElementById('set-kepsek-nip').value = cachedSettings.kepsekNIP; document.getElementById('set-guru-name').value = cachedSettings.guruName; 
                document.getElementById('set-guru-nip').value = cachedSettings.guruNIP; document.getElementById('set-jmlSiswa').value = cachedSettings.jmlSiswa;
                document.getElementById('set-sarana').value = cachedSettings.sarana; document.getElementById('set-kondisi').value = cachedSettings.kondisi;
                document.getElementById('set-gdocs-url').value = cachedSettings.gdocsUrl || '';
                
                setTimeout(() => {
                    const p = document.getElementById('set-pendekatan'); if(p) p.value = cachedSettings.pendekatan || globalPendekatan[0];
                    const md = document.getElementById('set-model'); if(md) md.value = cachedSettings.model || globalModel[0];
                    const mt = document.getElementById('set-metode'); if(mt) mt.value = cachedSettings.metode || globalMetode[0];
                }, 100);
            } catch(e) { console.error(e); }
        }

        document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
            e.preventDefault(); if(!currentUser) return;
            const btn = e.submitter; const ori = btn.innerHTML; btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Menyimpan...`; btn.disabled = true;
            try {
                cachedSettings = {
                    sekolahName: document.getElementById('set-sekolah').value, jenjang: document.getElementById('set-jenjang').value,
                    kota: document.getElementById('set-kota').value, kepsekName: document.getElementById('set-kepsek-name').value,
                    kepsekNIP: document.getElementById('set-kepsek-nip').value, guruName: document.getElementById('set-guru-name').value,
                    guruNIP: document.getElementById('set-guru-nip').value, jmlSiswa: document.getElementById('set-jmlSiswa').value,
                    pendekatan: document.getElementById('set-pendekatan').value, model: document.getElementById('set-model').value,
                    metode: document.getElementById('set-metode').value, sarana: document.getElementById('set-sarana').value,
                    kondisi: document.getElementById('set-kondisi').value,
                    gdocsUrl: document.getElementById('set-gdocs-url').value
                };
                const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'pengaturan', 'profil');
                await setDoc(docRef, cachedSettings); showToast('Pengaturan profil berhasil disimpan ke Cloud.', 'success');
            } catch (err) { showToast('Gagal menyimpan profil.', 'error'); } finally { btn.innerHTML = ori; btn.disabled = false; }
        });

        const initUserSession = async () => {
            const saved = sessionStorage.getItem('current_teacher');
            if(saved) {
                currentUser = JSON.parse(saved); setTxt('dash-user', currentUser.nama); setTxt('nav-user-name', currentUser.nama);
                document.getElementById('login-screen').style.display = 'none'; document.getElementById('sidebar').classList.remove('-translate-x-full'); 
                document.getElementById('main-content').classList.remove('hidden');
                if(window.innerWidth < 768) { sidebar.classList.add('-translate-x-full'); }
                await loadDynamicLists(); await loadSettingsUI(); await loadReferences(); switchView('dashboard');
            }
        };

        window.logout = () => { sessionStorage.removeItem('current_teacher'); location.reload(); };

        onAuthStateChanged(auth, (user) => { if (user) { const as = document.getElementById('auth-status'); if (as) { as.innerHTML = "✅ Sinkronisasi DB Siap"; as.classList.replace("text-graytext", "text-navy"); } initUserSession(); } });

        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-login'); const unameInput = document.getElementById('login-username').value.trim().toLowerCase(); const pinInput = document.getElementById('login-pin').value.trim();
            btn.disabled = true; btn.innerHTML = '<span class="loader border-white w-5 h-5 mr-2" style="border-width: 3px; border-top-color: transparent;"></span> Memeriksa...';
            try {
                if (!auth.currentUser) await signInAnonymously(auth);
                const guruRef = collection(db, 'artifacts', appId, 'public', 'data', 'guru'); const snap = await getDocs(guruRef);
                let matchedGuru = null; snap.forEach(doc => { const data = doc.data(); if ((data.username || "").toLowerCase() === unameInput && data.pin === pinInput) matchedGuru = { id: doc.id, ...data }; });
                
                if (matchedGuru) {
                    currentUser = { username: matchedGuru.username, uid: matchedGuru.id, nama: matchedGuru.nama || matchedGuru.username, kelas: matchedGuru.kelas || "Kelas Default", nip: matchedGuru.nip || '-' };
                    sessionStorage.setItem('current_teacher', JSON.stringify(currentUser)); showToast(`Selamat datang, ${currentUser.nama}!`, 'success');
                    setTxt('dash-user', currentUser.nama); setTxt('nav-user-name', currentUser.nama);

                    const loginScreen = document.getElementById('login-screen'); loginScreen.classList.add('opacity-0');
                    setTimeout(async () => {
                        loginScreen.style.display = 'none'; document.getElementById('main-content').classList.remove('hidden');
                        if(window.innerWidth >= 768) { sidebar.classList.remove('-translate-x-full'); }
                        await loadDynamicLists(); await loadSettingsUI(); await loadReferences(); switchView('dashboard');
                    }, 500);
                } else { showToast('Username atau PIN salah!', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> Masuk Ruang Kerja'; }
            } catch (error) { showToast('Gagal memverifikasi database.', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> Masuk Ruang Kerja'; }
        });

        window.switchView = (target) => {
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            document.getElementById(`view-${target}`).classList.add('active');
            const targetLink = document.querySelector(`.nav-link[data-target="${target}"]`); if(targetLink) targetLink.classList.add('active');
            let title = "Dasbor Utama"; if(target === 'generator') title = "Kreator AI Modul"; if(target === 'arsip') { title = "Arsip Dokumen"; loadArsip(); } if(target === 'referensi') { title = "Pustaka Referensi"; loadReferences(); } if(target === 'pengaturan') { title = "Pengaturan Profil"; loadSettingsUI(); } setTxt('page-title', title);
        };

        document.getElementById('btn-toggle-layout')?.addEventListener('click', () => { document.getElementById('generator-layout').classList.toggle('preview-expanded'); setTimeout(autoFitZoom, 350); });

        function applyZoom() {
            const wrapper = document.getElementById('pdf-wrapper');
            if(wrapper) { wrapper.style.transform = `scale(${currentZoom})`; document.getElementById('zoom-level-text').innerText = Math.round(currentZoom * 100) + '%'; }
        }
        document.getElementById('btn-zoom-in')?.addEventListener('click', () => { if(currentZoom < 2.5) { currentZoom += 0.1; applyZoom(); } });
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => { if(currentZoom > 0.4) { currentZoom -= 0.1; applyZoom(); } });

        document.querySelectorAll('.gen-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.gen-tab-btn').forEach(b => { b.classList.remove('bg-white', 'shadow', 'text-navy'); b.classList.add('text-graytext', 'hover:bg-gray-200'); });
                e.target.classList.remove('text-graytext', 'hover:bg-gray-200'); e.target.classList.add('bg-white', 'shadow', 'text-navy');
                document.querySelectorAll('.gen-form').forEach(f => f.classList.add('hidden')); document.getElementById(e.target.dataset.target).classList.remove('hidden');
                document.getElementById('pdf-wrapper').classList.add('hidden'); document.getElementById('empty-state').classList.remove('hidden');
                document.getElementById('btn-download').style.display = 'none'; document.getElementById('btn-save-db').style.display = 'none'; document.getElementById('btn-word').style.display = 'none'; document.getElementById('btn-gdocs').style.display = 'none';
            });
        });

        document.getElementById('use-global-settings')?.addEventListener('change', (e) => {
            const container = document.getElementById('custom-class-settings');
            if(e.target.checked) container.classList.add('hidden');
            else { container.classList.remove('hidden'); document.getElementById('cust-jmlSiswa').value = cachedSettings.jmlSiswa; document.getElementById('cust-pendekatan').value = cachedSettings.pendekatan || globalPendekatan[0]; document.getElementById('cust-model').value = cachedSettings.model || globalModel[0]; document.getElementById('cust-metode').value = cachedSettings.metode || globalMetode[0]; }
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetForm = e.target.dataset.target;
                document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.classList.add('inactive'); });
                e.target.classList.remove('inactive', 'text-navy'); e.target.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(f => { f.classList.remove('block'); f.classList.add('hidden'); }); document.getElementById(targetForm).classList.remove('hidden'); document.getElementById(targetForm).classList.add('block');
            });
        });

        document.getElementById('form-file')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('ref-name-file').value, mapel = document.getElementById('ref-mapel-file').value;
            const fileInput = document.getElementById('ref-file'); const file = fileInput.files[0];
            if(!file) return;
            const btn = e.submitter; const oriText = btn.innerHTML; btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Menyimpan...`; btn.disabled = true;

            try {
                let numPages = 0;
                try { const arrayBuffer = await file.arrayBuffer(); const pdf = await pdfjsLib.getDocument(arrayBuffer).promise; numPages = pdf.numPages; } catch(err) { console.warn("Gagal ekstrak halaman", err); }
                await lf.setItem('ref_' + Date.now(), { type: 'file', name: name, mapel: mapel, file: file, size: file.size, pages: numPages, timestamp: new Date().toISOString() });
                showToast(`Berkas disimpan secara lokal!`, 'success'); e.target.reset(); await loadReferences();
            } catch(e) { showToast("Gagal menyimpan file lokal", "error"); } finally { btn.innerHTML = oriText; btn.disabled = false; }
        });

        document.getElementById('form-link')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('ref-name-link').value, mapel = document.getElementById('ref-mapel-link').value, url = document.getElementById('ref-link').value;
            const btn = e.submitter; const oriText = btn.innerHTML; btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Menyimpan...`; btn.disabled = true;
            try {
                await lf.setItem('ref_' + Date.now(), { type: 'link', name: name, mapel: mapel, url: url, timestamp: new Date().toISOString() });
                showToast(`Tautan web disimpan secara lokal!`, 'success'); e.target.reset(); await loadReferences();
            } catch(e) { showToast("Gagal menyimpan tautan lokal.", "error"); } finally { btn.innerHTML = oriText; btn.disabled = false; }
        });

        async function loadReferences() {
            const listContainer = document.getElementById('ref-list'); listContainer.innerHTML = ''; 
            let items = [];
            await lf.iterate(function(value, key) { items.push({key, ...value}); });
            items.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            items.forEach(item => {
                const div = document.createElement('div'); div.className = "app-card p-5 flex justify-between items-center bg-white border-l-4 " + (item.type === 'file' ? "border-l-orange" : "border-l-navy");
                let icon = item.type === 'file' ? '<i class="fas fa-file-pdf"></i>' : '<i class="fas fa-link"></i>';
                let subtext = item.type === 'file' ? `<span class="text-orange font-bold mr-1">PDF Lokal</span> • ${item.pages ? `${item.pages} Hal` : ''} • ${(item.size/1024/1024).toFixed(2)} MB` : `<span class="text-blue-500 font-bold mr-1">URL Lokal</span>`;
                div.innerHTML = `
                    <div class="flex items-center space-x-3 w-full overflow-hidden">
                        <div class="w-10 h-10 rounded-full bg-lightbg flex items-center justify-center text-lg text-graytext shadow-inner shrink-0">${icon}</div>
                        <div class="truncate flex-1">
                            <div class="flex items-center gap-2 mb-1"><span class="bg-lightbg text-navy text-[9px] px-2 py-0.5 rounded font-bold uppercase border border-gray-200">${item.mapel || 'Semua'}</span></div>
                            <p class="font-heading font-bold text-navy truncate text-sm">${item.name}</p>
                            <p class="text-[10px] text-graytext">${subtext}</p>
                        </div>
                        <button onclick="deleteRef('${item.key}')" class="text-gray-400 hover:text-orange transition ml-2 shrink-0"><i class="fas fa-trash"></i></button>
                    </div>`;
                listContainer.appendChild(div);
            });
            if(items.length === 0) listContainer.innerHTML = '<div class="col-span-full py-8 text-graytext text-center border-2 border-dashed border-gray-200 rounded-xl">Belum ada pustaka lokal.</div>';
            setTxt('ref-badge', items.length.toString()); updateBukuSelector(items);
        }

        window.deleteRef = async (key) => {
            if(!confirm(`Yakin ingin menghapus referensi ini dari penyimpanan browser?`)) return;
            await lf.removeItem(key); showToast('Dihapus dari lokal.', 'success'); await loadReferences();
        };

        window.closePdfModal = () => { document.getElementById('pdf-modal').classList.add('hidden'); if(currentPdfObjectUrl) URL.revokeObjectURL(currentPdfObjectUrl); };

        function updateBukuSelector(items) {
            const selectors = document.querySelectorAll('.buku-dynamic-select'); if(!selectors.length || !items) return;
            let optionsHtml = '<option value="">-- Tanpa Rujukan Pustaka --</option>';
            items.forEach(item => { optionsHtml += `<option value="${item.key}">[${item.mapel || 'Semua'}] ${item.name}</option>`; });
            selectors.forEach(selector => {
                const currentVal = selector.value; selector.innerHTML = optionsHtml;
                if(currentVal && items.find(p => p.key === currentVal)) selector.value = currentVal;
                const container = selector.closest('div.bg-lightbg');
                if(container) {
                    const btn = container.querySelector('.btn-preview-buku'); const pk = container.querySelector('.page-picker-container');
                    if(pk) { selector.addEventListener('change', () => { if(selector.value) { pk.classList.remove('hidden'); if(btn) btn.classList.remove('hidden'); } else { pk.classList.add('hidden'); if(btn) btn.classList.add('hidden'); } }); }
                }
            });
        }

        document.querySelector('.btn-preview-buku')?.addEventListener('click', async () => {
            const key = document.getElementById('buku-modul').value; if(!key) return;
            const record = await lf.getItem(key);
            if(record) {
                if (record.type === 'link') window.open(record.url, '_blank');
                else { currentPdfObjectUrl = URL.createObjectURL(record.file); document.getElementById('pdf-viewer-frame').src = currentPdfObjectUrl; document.getElementById('pdf-modal').classList.remove('hidden'); }
            }
        });

        async function extractSpecificPages(fileData, pagesStr) {
            try {
                const arrayBuffer = await fileData.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let pagesToExtract = []; const parts = pagesStr.replace(/\s+/g,'').split(',');
                for(let part of parts) {
                    if(part.includes('-')) { const [start, end] = part.split('-').map(Number); if(start && end && start <= end) for(let i=start; i<=end; i++) pagesToExtract.push(i); } 
                    else { const num = Number(part); if(num) pagesToExtract.push(num); }
                }
                if(pagesToExtract.length === 0) pagesToExtract = [1];
                if(pagesToExtract.length > 10) pagesToExtract = pagesToExtract.slice(0, 10); 

                let text = ``;
                for (let i of pagesToExtract) {
                    if(i > pdf.numPages) continue;
                    const page = await pdf.getPage(i); const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(' ') + '\n';
                }
                return text;
            } catch (e) { console.error("PDF Extraction Error:", e); throw new Error("Gagal mengekstrak PDF."); }
        }

        async function fetchGeminiAPI(prompt) {
            const urlVercel = "/api/chat"; const payload = { pesan: prompt }; const backoffDelays = [1000, 2000, 4000, 8000];
            for (let i = 0; i < backoffDelays.length; i++) {
                try {
                    const response = await fetch(urlVercel, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!response.ok) { 
                        const errDetails = await response.text(); 
                        // Deteksi jika server mengembalikan error 429 atau pesan string kuota habis
                        if (response.status === 429 || errDetails.includes("429") || errDetails.includes("Too Many Requests") || errDetails.toLowerCase().includes("quota exceeded")) {
                            throw new Error("QUOTA_EXCEEDED");
                        }
                        throw new Error(`HTTP Error ${response.status}: ${errDetails}`); 
                    }
                    const result = await response.json();
                    if (result.error) {
                        if (JSON.stringify(result.error).includes("429") || JSON.stringify(result.error).toLowerCase().includes("quota exceeded")) throw new Error("QUOTA_EXCEEDED");
                        throw new Error(result.error.message || "Error dari Server.");
                    }
                    let responseText = typeof result === 'string' ? result : (result.candidates && result.candidates.length > 0 ? result.candidates[0].content.parts[0].text : (result.text || result.pesan || result.response || JSON.stringify(result)));
                    return responseText;
                } catch (error) { 
                    // Jika error kuota, langsung lemparkan ke UI (jangan ulangi loop)
                    if (error.message === "QUOTA_EXCEEDED") throw error;
                    
                    if (i === backoffDelays.length - 1) throw error; 
                    await new Promise(res => setTimeout(res, backoffDelays[i])); 
                }
            }
        }

        /* --- Post-processing AI HTML untuk konsistensi --- */
        function sanitizeAIHtml(html) {
            if (!html || typeof html !== 'string') return html || '';
            // Hapus markdown code fences yang kadang bocor
            html = html.replace(/```html/gi, '').replace(/```/g, '');
            // Hapus inline styles yang merusak (font-family, color, background dari AI)
            html = html.replace(/style\s*=\s*"[^"]*font-family[^"]*"/gi, '');
            // Hapus double/triple <br>
            html = html.replace(/(<br\s*\/?\s*>){3,}/gi, '<br><br>');
            // Wrap orphan text nodes (text not inside tags) - basic
            html = html.replace(/^([^<]+)$/gm, (match) => {
                const trimmed = match.trim();
                if (trimmed && !trimmed.startsWith('<')) return `<p>${trimmed}</p>`;
                return match;
            });
            // Ensure lists have consistent structure
            html = html.replace(/<li>\s*<p>/gi, '<li>').replace(/<\/p>\s*<\/li>/gi, '</li>');
            // Normalize spacing
            html = html.replace(/\n{3,}/g, '\n\n');
            return html.trim();
        }

        const formatDate = (dateStr) => { if(!dateStr) return ''; return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }); };
        const todayStr = new Date().toISOString().split('T')[0];
        document.getElementById('tglBuat').value = todayStr; document.getElementById('tglPelaksanaan').value = todayStr;
        document.getElementById('tgl-atp').value = todayStr; document.getElementById('tgl-prota').value = todayStr; document.getElementById('tgl-jurnal').value = todayStr;

        function startLoadingAI(title) {
            document.getElementById('empty-state').classList.add('hidden'); document.getElementById('pdf-wrapper').classList.add('hidden'); document.getElementById('loading-state').classList.remove('hidden'); setTxt('loading-title', title); currentZoom = 1; applyZoom();
        }

        function autoFitZoom() {
            const container = document.getElementById('output-container');
            const wrapper = document.getElementById('pdf-wrapper');
            if(!container || !wrapper || wrapper.classList.contains('hidden')) return;
            const isLandscape = wrapper.classList.contains('landscape-mode');
            const targetWidth = isLandscape ? 1122 : 794;
            const containerWidth = container.clientWidth - 40;
            if (containerWidth > 0) {
                currentZoom = Math.min(1.2, containerWidth / targetWidth);
                applyZoom();
            }
        }
        window.addEventListener('resize', autoFitZoom);

        function showSuccess(html, isLandscape = false) {
            document.getElementById('pdf-content').innerHTML = html; document.getElementById('loading-state').classList.add('hidden');
            const pdfWrapper = document.getElementById('pdf-wrapper'); pdfWrapper.classList.remove('hidden');
            if (isLandscape) pdfWrapper.classList.add('landscape-mode'); else pdfWrapper.classList.remove('landscape-mode');
            document.getElementById('btn-download').style.display = 'flex'; document.getElementById('btn-word').style.display = 'flex'; document.getElementById('btn-save-db').style.display = 'flex'; document.getElementById('btn-print').style.display = 'flex'; document.getElementById('btn-gdocs').style.display = 'flex';
            autoFitZoom();
            showToast('Dokumen AI berhasil disusun!', 'success'); document.getElementById('output-container').scrollTo(0, 0);
            if(window.innerWidth < 1024) document.getElementById('preview-panel').scrollIntoView({ behavior: 'smooth' });
        }

        function showError(e) { 
            console.error(e); 
            document.getElementById('loading-state').classList.add('hidden'); 
            const emptyState = document.getElementById('empty-state');
            
            if (e.message === "QUOTA_EXCEEDED") {
                // Tampilan Khusus Kuota Habis
                emptyState.innerHTML = `
                    <div class="text-5xl md:text-7xl mb-4 md:mb-6 text-red-500"><i class="fas fa-exclamation-triangle"></i></div>
                    <p class="font-heading font-bold text-lg md:text-xl text-navy">Batas Kuota AI Tercapai</p>
                    <p class="text-xs md:text-sm mt-2 text-center max-w-sm px-4 text-graytext">Server menolak permintaan karena batasan <b>Tingkat Gratis (Free Tier)</b> API Gemini telah habis untuk saat ini. <br><br><span class="text-orange font-medium">Sistem Anti-Spam aktif. Silakan tunggu 1-2 Menit sebelum menggenerasi ulang.</span></p>
                `;
                emptyState.classList.remove('hidden');
                showToast('Gagal: Kuota Limit AI tercapai. Mohon tunggu sebentar.', 'error');
            } else {
                // Tampilan Error Umum (Kembali ke default)
                emptyState.innerHTML = `
                    <div class="text-5xl md:text-7xl mb-4 md:mb-6 text-gray-300"><i class="fas fa-file-signature"></i></div>
                    <p class="font-heading font-bold text-lg md:text-xl text-navy">Pembuatan Gagal</p>
                    <p class="text-xs md:text-sm mt-2 text-center max-w-sm px-4">Terdapat kesalahan teknis saat menyusun dokumen. Silakan periksa koneksi Anda dan coba kembali.</p>
                `;
                emptyState.classList.remove('hidden');
                showToast(e.message || 'Gagal menyusun dokumen.', 'error'); 
            }
        }

        document.getElementById('btn-auto-tp')?.addEventListener('click', async () => {
            const mapel = document.getElementById('mapel-modul').value, kelas = document.getElementById('kelas-modul').value;
            if (!mapel || !kelas) return showToast('Pilih Mapel & Kelas dahulu!', 'error');
            const btnAuto = document.getElementById('btn-auto-tp'); btnAuto.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Merumuskan...`; btnAuto.disabled = true;

            const selectedKey = document.getElementById('buku-modul').value; const hb = document.getElementById('hal-modul'); let pagesToExtract = hb ? hb.value : "1";
            let extractedContext = "";
            try {
                if(selectedKey) {
                    const record = await lf.getItem(selectedKey);
                    if(record) {
                        if (record.type === 'file') extractedContext = await extractSpecificPages(record.file, pagesToExtract);
                        else if (record.type === 'link') extractedContext = `Referensi utama berjudul: ${record.name} hal ${pagesToExtract}`;
                    }
                }
                const materiInput = document.getElementById('materiPokok').value;
                if(!extractedContext && !materiInput) { showToast('Wajib isi Materi Pokok secara manual jika tidak ada Referensi Buku!', 'error'); document.getElementById('materiPokok').focus(); btnAuto.innerHTML = `<i class="fas fa-magic mr-1"></i> Auto Rumuskan`; btnAuto.disabled = false; return; }

                let prompt = `Anda adalah ahli pendidikan di Indonesia. Tugas Anda merumuskan "Materi Pokok" (1 kalimat pendek) dan "Tujuan Pembelajaran" (1 paragraf jelas dengan 2 poin) untuk mapel ${mapel} kelas ${kelas}. Berikan respons format JSON murni TANPA \`\`\`json dengan kunci "materi_pokok" dan "tp".`;
                if(extractedContext) prompt += ` Konteks: "${extractedContext.substring(0, 2000)}"`; if(materiInput) prompt += ` Acuan Materi: "${materiInput}"`;

                let responseText = await fetchGeminiAPI(prompt);
                const aiData = JSON.parse(responseText.replace(/```json/gi, '').replace(/```/g, '').trim());
                if(aiData.tp) document.getElementById('tp').value = aiData.tp; if(aiData.materi_pokok) document.getElementById('materiPokok').value = aiData.materi_pokok;
                showToast('Materi & TP berhasil dirumuskan cerdas!', 'success');
            } catch(err) { 
                if (err.message === "QUOTA_EXCEEDED") {
                    showToast('Gagal: Kuota AI habis. Tunggu 1 menit!', 'error');
                } else {
                    showToast('Gagal merumuskan TP otomatis.', 'error'); 
                }
            } finally { btnAuto.innerHTML = `<i class="fas fa-magic mr-1"></i> Auto Rumuskan`; btnAuto.disabled = false; }
        });

        document.getElementById('form-modul')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnGen = document.getElementById('btn-generate-modul'); const originalBtnHtml = btnGen.innerHTML;
            btnGen.disabled = true; btnGen.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Menyusun Modul AI...`;
            startLoadingAI("Menyusun Modul Ajar AI...");

            try {
                const mapel = document.getElementById('mapel-modul').value, kelas = document.getElementById('kelas-modul').value, semester = document.getElementById('semester-modul').value;
                const materi = document.getElementById('materiPokok').value, tpVal = document.getElementById('tp').value, waktuTitimangsaFormatted = formatDate(document.getElementById('tglBuat').value), alokasi = document.getElementById('alokasiWaktu').value;
                const ug = document.getElementById('use-global-settings'); const useGlobal = ug ? ug.checked : true;
                const setJml = useGlobal ? cachedSettings.jmlSiswa : document.getElementById('cust-jmlSiswa').value, setPendekatan = useGlobal ? cachedSettings.pendekatan : document.getElementById('cust-pendekatan').value, setModel = useGlobal ? cachedSettings.model : document.getElementById('cust-model').value, setMetode = useGlobal ? cachedSettings.metode : document.getElementById('cust-metode').value, setSarana = useGlobal ? cachedSettings.sarana : document.getElementById('cust-sarana').value, setKondisi = useGlobal ? cachedSettings.kondisi : document.getElementById('cust-kondisi').value;

                const detailLevel = document.getElementById('modul-detail').value;
                const hasLkpd = document.getElementById('chk-lkpd').checked, hasBahan = document.getElementById('chk-bahan').checked, hasAsesmen = document.getElementById('chk-asesmen').checked, hasPengayaan = document.getElementById('chk-pengayaan').checked, hasJurnal = document.getElementById('chk-jurnal').checked;

                const selectedKey = document.getElementById('buku-modul').value, hBuku = document.getElementById('hal-modul').value || "1";
                let extractedText = ""; let sumberBelajarDeskripsi = "Buku Paket Siswa Standar";

                if(selectedKey) {
                    const record = await lf.getItem(selectedKey);
                    if(record) {
                        if (record.type === 'file') { setTxt('loading-text', `Mengekstrak rujukan PDF Lokal...`); extractedText = await extractSpecificPages(record.file, hBuku); sumberBelajarDeskripsi = `${record.name} (Referensi Hal: ${hBuku})`; } 
                        else if (record.type === 'link') { extractedText = `Tautan rujukan: ${record.name}`; sumberBelajarDeskripsi = `${record.name}`; }
                    }
                }
                
                setTxt('loading-text', `Mengirim instruksi ke AI Vercel...`);
                let prompt = `Anda adalah ahli pedagogik tingkat tinggi Kurikulum Merdeka Indonesia. Buatlah rincian Modul Ajar/RPP dengan ketentuan:
Mata Pelajaran: ${mapel}, Kelas: ${kelas}, Semester: ${semester}
Materi Pokok: ${materi}
Tujuan Pembelajaran: ${tpVal}
Pendekatan: ${setPendekatan}, Model: ${setModel}, Metode: ${setMetode}
Kondisi Kelas: ${setKondisi}
Tingkat Detail Kegiatan: ${detailLevel} (Bila "Garis Besar": ringkas esensial. Bila "Sangat Rinci": elaborasi skenario utuh per-menit, percakapan guru-siswa, pertanyaan pemantik. Bila "Standar": porsi moderat).
${extractedText ? `Konteks Rujukan:\n${extractedText.substring(0, 2000)}\n` : ''}

ATURAN FORMAT WAJIB:
1. "pendahuluan", "inti", "penutup": WAJIB berupa HTML <ol> (ordered list). Setiap <li> diawali estimasi durasi dalam tanda kurung, contoh: <li><b>(5 menit)</b> Guru menyapa dan mengecek kehadiran.</li>
2. Pada "inti": WAJIB cantumkan nama SINTAKS MODEL (misal: <b>Sintaks 1 – Orientasi Masalah:</b>) sebelum uraian. JANGAN gunakan <p> untuk uraian kegiatan, gunakan <ol> saja.
3. "karakteristik": 1 kalimat deskripsi karakteristik materi.
4. "dimensi_p5": Sebutkan 2-3 dimensi Profil Pelajar Pancasila yang relevan (1 kalimat).
5. "asesmen_awal", "asesmen_proses", "asesmen_akhir": Masing-masing 1-2 kalimat jelas.
6. Berikan respons format JSON murni TANPA markdown \`\`\`json.

Kunci JSON: { "karakteristik": "...", "dimensi_p5": "...", "pendahuluan": "<ol>...</ol>", "inti": "<ol>...</ol>", "penutup": "<ol>...</ol>", "asesmen_awal": "...", "asesmen_proses": "...", "asesmen_akhir": "..."`;
                if (hasLkpd) prompt += `, "lkpd": "HTML <ol> instruksi tugas LKPD (3-5 langkah kerja)"`;
                if (hasBahan) prompt += `, "bahan": "HTML rangkuman materi ajar (2-3 paragraf)"`;
                if (hasAsesmen) prompt += `, "soal_sumatif": "HTML <ol> berisi 3 soal evaluasi akhir lengkap"`;
                if (hasPengayaan) prompt += `, "pengayaan": "1 paragraf ide pengayaan", "remedial": "1 paragraf ide remedial"`;
                prompt += ` }`;

                let responseText = await fetchGeminiAPI(prompt);
                let dataAI = JSON.parse(responseText.replace(/```json/gi, '').replace(/```/g, '').trim());

                // Sanitize semua field HTML dari AI
                dataAI.pendahuluan = sanitizeAIHtml(dataAI.pendahuluan);
                dataAI.inti = sanitizeAIHtml(dataAI.inti);
                dataAI.penutup = sanitizeAIHtml(dataAI.penutup);
                if(dataAI.lkpd) dataAI.lkpd = sanitizeAIHtml(dataAI.lkpd);
                if(dataAI.bahan) dataAI.bahan = sanitizeAIHtml(dataAI.bahan);
                if(dataAI.soal_sumatif) dataAI.soal_sumatif = sanitizeAIHtml(dataAI.soal_sumatif);

                let lampiranHTML = ``;
                if(hasLkpd && dataAI.lkpd) lampiranHTML += `<div class="page-break html2pdf__page-break"></div>
<h1>LAMPIRAN: LEMBAR KERJA PESERTA DIDIK (LKPD)</h1>
<table class="tbl-identity"><tr><td style="width:30%">Nama Kelompok</td><td>: ................................</td></tr><tr><td>Anggota</td><td>: 1. .................. 2. .................. 3. ..................</td></tr><tr><td>Kelas</td><td>: ${kelas}</td></tr></table>
<h3>Petunjuk Kerja</h3>
<div style="margin-top: 10px;">${dataAI.lkpd}</div>
<div style="width: 100%; height: 250px; border: 2px dashed #555; margin-top: 25px; text-align: center; line-height: 250px; color: #999;" class="avoid-break">[ Area Ruang Kerja Kelompok ]</div>`;

                if(hasBahan && dataAI.bahan) lampiranHTML += `<div class="page-break html2pdf__page-break"></div>
<h1>LAMPIRAN: BAHAN AJAR GURU</h1>
<h3>Rangkuman Materi: ${materi}</h3>
<div style="text-align: justify; margin-top: 10px;">${dataAI.bahan}</div>`;

                if(hasAsesmen && dataAI.soal_sumatif) lampiranHTML += `<div class="page-break html2pdf__page-break"></div>
<h1>LAMPIRAN: INSTRUMEN ASESMEN</h1>
<h3>1. Rubrik Penilaian Observasi</h3>
<table>
<tr><th>Kriteria</th><th>Sangat Baik (4)</th><th>Baik (3)</th><th>Cukup (2)</th><th>Perlu Bimbingan (1)</th></tr>
<tr><td style="font-weight:bold">Kerjasama</td><td>Semua anggota aktif merata</td><td>Sebagian besar aktif</td><td>Hanya 1-2 orang mendominasi</td><td>Tidak ada kerjasama</td></tr>
<tr><td style="font-weight:bold">Pemahaman</td><td>Dapat menjelaskan dengan contoh</td><td>Dapat menjelaskan tanpa contoh</td><td>Menjelaskan dengan bantuan</td><td>Belum memahami</td></tr>
</table>
<h3>2. Soal Evaluasi Akhir</h3>
<div style="margin-left: 10px; margin-top: 10px;">${dataAI.soal_sumatif}</div>`;

                if(hasPengayaan || hasJurnal) {
                    lampiranHTML += `<div class="page-break html2pdf__page-break"></div>`;
                    if(hasPengayaan) lampiranHTML += `<h1>LAMPIRAN: PENGAYAAN & REMEDIAL</h1>
<h3>A. Program Pengayaan</h3>
<p style="margin-bottom:15px; text-align: justify;">${dataAI.pengayaan || 'Siswa yang telah mencapai ketuntasan diberikan tugas pengayaan berupa proyek mini atau eksplorasi materi lebih mendalam.'}</p>
<h3>B. Program Remedial</h3>
<p style="text-align: justify;">${dataAI.remedial || 'Siswa yang belum mencapai ketuntasan diberikan bimbingan individu/kelompok kecil dan mengerjakan ulang soal dengan variasi berbeda.'}</p>`;
                    if(hasJurnal) lampiranHTML += `
<h1 style="margin-top: 40px;">LAMPIRAN: JURNAL REFLEKSI GURU</h1>
<table class="tbl-identity"><tr><td style="width:30%">Hari/Tanggal</td><td>: ............................................</td></tr><tr><td>Mata Pelajaran</td><td>: ${mapel}</td></tr></table>
<table style="margin-top: 15px;">
<tr><th style="width: 5%;">No</th><th>Pertanyaan Refleksi</th><th style="width: 40%;">Catatan Lapangan</th></tr>
<tr><td style="text-align:center;">1.</td><td>Apakah tujuan pembelajaran tercapai? Bagaimana indikatornya?</td><td style="height: 55px;"></td></tr>
<tr><td style="text-align:center;">2.</td><td>Kesulitan apa yang dialami peserta didik selama proses pembelajaran?</td><td style="height: 55px;"></td></tr>
<tr><td style="text-align:center;">3.</td><td>Langkah perbaikan apa yang akan dilakukan pada pertemuan selanjutnya?</td><td style="height: 55px;"></td></tr>
</table>`;
                }

                const identikHtml = `
<div style="text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px double #000;">
<h1 style="font-size: 16pt; margin: 0; letter-spacing: 1px;">MODUL AJAR</h1>
<h2 style="font-size: 13pt; margin: 8px 0 0 0; font-weight: normal; text-transform: uppercase;">MATA PELAJARAN ${mapel}</h2>
<p style="font-size: 10pt; margin-top: 5px; color: #555;">Kurikulum Merdeka — Tahun Pelajaran ${new Date().getFullYear()}/${new Date().getFullYear()+1}</p>
</div>

<h3 class="section-label">A. IDENTIFIKASI</h3>
<table class="tbl-identity" style="margin-bottom: 20px;">
<tr><td style="width: 30%;">Penyusun</td><td>: ${cachedSettings.guruName}</td></tr>
<tr><td>Jenjang Sekolah</td><td>: ${cachedSettings.jenjang}</td></tr>
<tr><td>Fase / Kelas / Semester</td><td>: ${kelas} / ${semester}</td></tr>
<tr><td>Mata Pelajaran</td><td>: ${mapel}</td></tr>
<tr><td>Alokasi Waktu</td><td>: ${alokasi}</td></tr>
<tr><td>Nama Sekolah</td><td>: ${cachedSettings.sekolahName}</td></tr>
</table>

<table style="margin-bottom: 25px;">
<tr><td style="font-weight: bold; width: 30%;">Kesiapan Peserta Didik</td><td>${setKondisi}</td></tr>
<tr><td style="font-weight: bold;">Karakteristik Materi</td><td>${dataAI.karakteristik || '-'}</td></tr>
<tr><td style="font-weight: bold;">Dimensi Profil Pelajar Pancasila</td><td>${dataAI.dimensi_p5 || '-'}</td></tr>
</table>

<h3 class="section-label">B. DESAIN PEMBELAJARAN</h3>
<table style="margin-bottom: 25px;">
<tr><td style="font-weight: bold; width: 30%;">Topik Pembelajaran</td><td>${materi}</td></tr>
<tr><td style="font-weight: bold;">Target Peserta Didik</td><td>Reguler/Tipikal (Estimasi: ${setJml} Siswa)</td></tr>
<tr><td style="font-weight: bold;">Tujuan Pembelajaran (TP)</td><td style="white-space: pre-wrap;">${tpVal}</td></tr>
<tr><td style="font-weight: bold;">Pendekatan & Model</td><td>Pendekatan: ${setPendekatan}<br>Model: ${setModel}<br>Metode: ${setMetode}</td></tr>
<tr><td style="font-weight: bold;">Fasilitas & Lingkungan</td><td>${setSarana}<br><br><b>Rujukan:</b> ${sumberBelajarDeskripsi}</td></tr>
</table>

<h3 class="section-label">C. PENGALAMAN BELAJAR (KEGIATAN)</h3>
<table style="margin-bottom: 25px;">
<tr><th style="width: 20%;">Tahap Pembelajaran</th><th style="width: 12%;">Waktu</th><th>Rincian Langkah Kegiatan</th></tr>
<tr><td style="font-weight: bold; text-align: center; vertical-align:top;">Pendahuluan</td><td style="text-align: center; vertical-align:top;">15 Menit</td><td>${dataAI.pendahuluan}</td></tr>
<tr><td style="font-weight: bold; text-align: center; vertical-align:top;">Kegiatan Inti</td><td style="text-align: center; vertical-align:top;">[Menyesuaikan]</td><td>${dataAI.inti}</td></tr>
<tr><td style="font-weight: bold; text-align: center; vertical-align:top;">Penutup</td><td style="text-align: center; vertical-align:top;">15 Menit</td><td>${dataAI.penutup}</td></tr>
</table>

<h3 class="section-label">D. ASESMEN PEMBELAJARAN</h3>
<table style="margin-bottom: 25px;">
<tr><th style="width: 25%;">Jenis Asesmen</th><th>Instrumen dan Pelaksanaan</th></tr>
<tr><td style="font-weight: bold;">Awal (Diagnostik)</td><td>${dataAI.asesmen_awal || '-'}</td></tr>
<tr><td style="font-weight: bold;">Proses (Formatif)</td><td>${dataAI.asesmen_proses || '-'}</td></tr>
<tr><td style="font-weight: bold;">Akhir (Sumatif)</td><td>${dataAI.asesmen_akhir || '-'}</td></tr>
</table>

<table class="ttd-block" style="width: 100%;">
<tr>
<td style="width: 50%;">Mengetahui,<br>Kepala Sekolah<br><br><br><br><br><b style="text-decoration: underline;">${cachedSettings.kepsekName}</b><br>NIP. ${cachedSettings.kepsekNIP !== '-' ? cachedSettings.kepsekNIP : '..........................'}</td>
<td style="width: 50%;">${cachedSettings.kota}, ${waktuTitimangsaFormatted}<br>Guru Kelas / Mata Pelajaran<br><br><br><br><br><b style="text-decoration: underline;">${cachedSettings.guruName}</b><br>NIP. ${cachedSettings.guruNIP !== '-' ? cachedSettings.guruNIP : '..........................'}</td>
</tr>
</table>
${lampiranHTML}`;
                showSuccess(identikHtml, false);
            } catch(e) { showError(e); } finally { btnGen.disabled = false; btnGen.innerHTML = originalBtnHtml; }
        });

        document.getElementById('form-atp')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnGen = document.getElementById('btn-generate-atp'); const originalBtnHtml = btnGen.innerHTML;
            btnGen.disabled = true; btnGen.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Menyusun ATP...`;
            startLoadingAI("Menyusun ATP AI...");

            try {
                const mapel = document.getElementById('mapel-atp').value, kelas = document.getElementById('kelas-atp').value, semester = document.getElementById('semester-atp').value;
                const minggu = document.getElementById('minggu-atp').value, jpMinggu = document.getElementById('jp-minggu-atp').value, cpText = document.getElementById('cp-atp').value;
                const bKey = document.getElementById('buku-atp').value, hBuku = document.getElementById('hal-atp').value || "1-5";
                
                let extractedText = "";
                if(bKey) {
                    const record = await lf.getItem(bKey);
                    if(record && record.type === 'file') { setTxt('loading-text', `Membaca materi rujukan...`); extractedText = await extractSpecificPages(record.file, hBuku); }
                }

                let prompt = `Buatlah Alur Tujuan Pembelajaran (ATP) Kurikulum Merdeka dengan ketentuan berikut:
Konteks:
- Mata Pelajaran: ${mapel}
- Fase/Kelas: ${kelas}
- Semester: ${semester}
- Alokasi: ${minggu} minggu efektif
- Waktu: ${jpMinggu} jam pelajaran per minggu
- CP yang diturunkan: "${cpText}"
- Referensi Tambahan: ${extractedText ? extractedText.substring(0, 2000) : 'Gunakan standar materi yang sesuai.'}

Prinsip penyusunan ATP:
1. Urutan TP harus menunjukkan gradasi dari konkret ke abstrak.
2. Setiap TP harus terukur dan menggunakan kata kerja operasional (KKO).
3. Cantumkan alokasi waktu per TP (akumulasi harus logis dengan total alokasi minggu x JP).
4. Pastikan ada kesinambungan antar TP.

Berikan format JSON murni TANPA markdown dan TANPA tag html apapun: 
{ 
  "rasional": "Paragraf rasional / penjabaran ringkas arah pembelajaran", 
  "alur": [ 
    { "no": 1, "tujuan": "...", "materi": "...", "waktu": "...", "keterangan": "..." } 
  ] 
}`;

                const response = await fetchGeminiAPI(prompt);
                const dataAI = JSON.parse(response.replace(/```json/gi, '').replace(/```/g, '').trim());
                const waktuTitimangsaFormatted = formatDate(document.getElementById('tgl-atp').value);
                
                let alurRows = ''; 
                dataAI.alur.forEach(a => { 
                    alurRows += `<tr><td style="text-align:center; border:1px solid #000; padding:6px;">${a.no}</td><td style="border:1px solid #000; padding:6px;">${sanitizeAIHtml(a.tujuan)}</td><td style="border:1px solid #000; padding:6px;">${sanitizeAIHtml(a.materi)}</td><td style="text-align:center; border:1px solid #000; padding:6px;">${sanitizeAIHtml(a.waktu)}</td><td style="border:1px solid #000; padding:6px;">${sanitizeAIHtml(a.keterangan)}</td></tr>`; 
                });

                const html = `<div style="text-align: center; margin-bottom: 30px;">
<h1 style="font-size: 16pt; margin: 0; font-weight: bold; text-transform: uppercase;">ALUR DAN TUJUAN PEMBELAJARAN (ATP)</h1>
<h2 style="font-size: 14pt; margin: 5px 0 0 0; font-weight: bold; text-transform: uppercase;">KURIKULUM MERDEKA</h2>
</div>

<div class="section-label">A. IDENTIFIKASI SATUAN PENDIDIKAN</div>
<table class="tbl-identity">
<tr><td style="width: 30%;">Nama Sekolah</td><td style="width: 70%;">: ${cachedSettings.sekolahName}</td></tr>
<tr><td>Nama Penyusun</td><td>: ${cachedSettings.guruName}</td></tr>
<tr><td>Mata Pelajaran</td><td>: ${mapel}</td></tr>
<tr><td>Fase / Kelas / Semester</td><td>: ${kelas} / ${semester}</td></tr>
<tr><td>Alokasi Waktu</td><td>: ${minggu} Minggu Efektif (${jpMinggu} JP/Minggu)</td></tr>
</table>

<div class="section-label">B. CAPAIAN PEMBELAJARAN (CP)</div>
<p style="margin-bottom: 20px; text-align: justify; font-style: italic;">"${cpText}"</p>

<div class="section-label">C. RASIONAL MATA PELAJARAN</div>
<p style="margin-bottom: 20px; text-align: justify;">${sanitizeAIHtml(dataAI.rasional)}</p>

<div class="section-label">D. MATRIKS ALUR TUJUAN PEMBELAJARAN</div>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 11pt;">
<thead>
<tr>
<th style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width:5%;">No</th>
<th style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width:35%;">Tujuan Pembelajaran</th>
<th style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width:30%;">Materi Pokok</th>
<th style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width:10%;">Alokasi Waktu</th>
<th style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width:20%;">Keterangan</th>
</tr>
</thead>
<tbody>
${alurRows}
</tbody>
</table>

<table class="ttd-block avoid-break">
<tr>
<td style="width: 50%; text-align: center; vertical-align: top;">
Mengetahui,<br>Kepala Sekolah
<br><br><br><br><br>
<b style="text-decoration: underline;">${cachedSettings.kepsekName}</b><br>
NIP. ${cachedSettings.kepsekNIP !== '-' ? cachedSettings.kepsekNIP : '..........................'}
</td>
<td style="width: 50%; text-align: center; vertical-align: top;">
${cachedSettings.kota}, ${waktuTitimangsaFormatted}<br>Guru Kelas / Mata Pelajaran
<br><br><br><br><br>
<b style="text-decoration: underline;">${cachedSettings.guruName}</b><br>
NIP. ${cachedSettings.guruNIP !== '-' ? cachedSettings.guruNIP : '..........................'}
</td>
</tr>
</table>`;
                showSuccess(html, true);
            } catch(e) { showError(e); } finally { btnGen.disabled = false; btnGen.innerHTML = originalBtnHtml; }
        });

        document.getElementById('form-prota')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnGen = document.getElementById('btn-generate-prota'); const originalBtnHtml = btnGen.innerHTML;
            btnGen.disabled = true; btnGen.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Menyusun Prota...`;
            startLoadingAI("Menyusun Prota & Promes Kompleks...");

            try {
                const mapel = document.getElementById('mapel-prota').value, kelas = document.getElementById('kelas-prota').value, tahun = document.getElementById('tahun-prota').value;
                const bKey = document.getElementById('buku-prota').value, hBuku = document.getElementById('hal-prota').value || "1-5";
                
                let extractedText = "";
                if(bKey) {
                    const record = await lf.getItem(bKey);
                    if(record && record.type === 'file') { setTxt('loading-text', `Membaca materi Buku Rujukan Lokal...`); extractedText = await extractSpecificPages(record.file, hBuku); }
                }

                const fKaldik = document.getElementById('kaldik-prota').files[0]; let kaldikText = "";
                if (fKaldik) { setTxt('loading-text', `Menganalisis Kaldik...`); kaldikText = await extractSpecificPages(fKaldik, "1-3"); }

                setTxt('loading-text', `Mengalkulasi matriks mingguan semester...`);
                let prompt = `Buatlah Program Tahunan (Prota) & Program Semester (Promes) berbasis analisis per minggu. Mapel: ${mapel}, Kelas: ${kelas}, Tahun: ${tahun}. Materi: ${extractedText ? extractedText.substring(0, 2000) : 'Standar Kemdikbud'}. ${kaldikText ? `Kondisi Kaldik: ${kaldikText.substring(0,1000)}` : ''} 
                ATURAN PROMES: Setiap bulan memiliki tepat 5 minggu (array 5 elemen). Isi elemen string jumlah jam ("4 JP"), atau "Libur", "Sumatif", "PTS", "PAS", atau string kosong "" jika materi tidak diajarkan. Berikan format JSON murni TANPA markdown dan TANPA tag html apapun: { "prota": [ {"no": 1, "tujuan": "Tujuan 1", "materi": "Materi A", "waktu": "12 JP"} ], "promes_ganjil": [ { "materi": "Materi A", "waktu": "12 JP", "juli": ["", "", "4 JP", "4 JP", "4 JP"], "agustus": ["Libur", "Sumatif", "", "", ""], "september": ["", "", "", "", ""], "oktober": ["", "", "", "", ""], "november": ["", "", "", "", ""], "desember": ["", "", "", "PAS", "Libur"] } ], "promes_genap": [ { "materi": "Materi B", "waktu": "12 JP", "januari": ["Libur", "4 JP", "4 JP", "4 JP", ""], "februari": ["Sumatif", "", "", "", ""], "maret": ["", "", "PTS", "", ""], "april": ["", "", "", "", "Libur"], "mei": ["", "", "", "", ""], "juni": ["", "", "PAS", "Libur", "Libur"] } ] }`;

                const response = await fetchGeminiAPI(prompt);
                const dataAI = JSON.parse(response.replace(/```json/gi, '').replace(/```/g, '').trim());
                const waktuTitimangsaFormatted = formatDate(document.getElementById('tgl-prota').value);
                
                let protaRows = ''; 
                dataAI.prota.forEach(p => { 
                    protaRows += `<tr><td style="text-align:center; border:1px solid #000; padding:6px;">${p.no}</td><td style="border:1px solid #000; padding:6px;">${sanitizeAIHtml(p.tujuan)}</td><td style="border:1px solid #000; padding:6px;">${sanitizeAIHtml(p.materi)}</td><td style="text-align:center; border:1px solid #000; padding:6px;">${sanitizeAIHtml(p.waktu)}</td></tr>`; 
                });

                const renderPromesWeeks = (p, bulanArray) => {
                    let html = '';
                    bulanArray.forEach(b => {
                        let weeks = p[b] || ["","","","",""];
                        weeks.forEach(w => {
                            let bg = ""; let lw = String(w).toLowerCase();
                            if(lw.includes('libur') || lw.includes('cuti')) bg = "background-color: #fca5a5;";
                            else if(lw.includes('sumatif') || lw.includes('pts') || lw.includes('pas') || lw.includes('asesmen')) bg = "background-color: #fef08a;";
                            else if(w !== "") bg = "background-color: #bbf7d0;";
                            html += `<td style="border:1px solid #000; padding:2px; text-align:center; font-size:8pt; ${bg}">${sanitizeAIHtml(w)}</td>`;
                        });
                    });
                    return html;
                };

                let promesGanjil = ''; 
                dataAI.promes_ganjil.forEach(p => { 
                    promesGanjil += `<tr><td style="border:1px solid #000; padding:6px;">${sanitizeAIHtml(p.materi)}</td><td style="border:1px solid #000; padding:6px; text-align:center;">${sanitizeAIHtml(p.waktu)}</td>`; 
                    promesGanjil += renderPromesWeeks(p, ['juli', 'agustus', 'september', 'oktober', 'november', 'desember']); 
                    promesGanjil += `</tr>`; 
                });
                
                let promesGenap = ''; 
                dataAI.promes_genap.forEach(p => { 
                    promesGenap += `<tr><td style="border:1px solid #000; padding:6px;">${sanitizeAIHtml(p.materi)}</td><td style="border:1px solid #000; padding:6px; text-align:center;">${sanitizeAIHtml(p.waktu)}</td>`; 
                    promesGenap += renderPromesWeeks(p, ['januari', 'februari', 'maret', 'april', 'mei', 'juni']); 
                    promesGenap += `</tr>`; 
                });

                const thMinggu = `<th style="border:1px solid #000;">1</th><th style="border:1px solid #000;">2</th><th style="border:1px solid #000;">3</th><th style="border:1px solid #000;">4</th><th style="border:1px solid #000;">5</th>`;
                const thGanjil = `<th colspan="5" style="border:1px solid #000;">Jul</th><th colspan="5" style="border:1px solid #000;">Ags</th><th colspan="5" style="border:1px solid #000;">Sep</th><th colspan="5" style="border:1px solid #000;">Okt</th><th colspan="5" style="border:1px solid #000;">Nov</th><th colspan="5" style="border:1px solid #000;">Des</th>`;
                const thGenap = `<th colspan="5" style="border:1px solid #000;">Jan</th><th colspan="5" style="border:1px solid #000;">Feb</th><th colspan="5" style="border:1px solid #000;">Mar</th><th colspan="5" style="border:1px solid #000;">Apr</th><th colspan="5" style="border:1px solid #000;">Mei</th><th colspan="5" style="border:1px solid #000;">Jun</th>`;

                const html = `<div style="text-align: center; margin-bottom: 30px;">
<h1 style="font-size: 16pt; margin: 0; font-weight: bold; text-transform: uppercase;">PROGRAM TAHUNAN</h1>
<h2 style="font-size: 14pt; margin: 5px 0 0 0; font-weight: bold; text-transform: uppercase;">TAHUN PELAJARAN ${tahun}</h2>
</div>

<div class="section-label">IDENTIFIKASI SATUAN PENDIDIKAN</div>
<table class="tbl-identity">
<tr><td style="width: 30%;">Satuan Pendidikan</td><td style="width: 70%;">: ${cachedSettings.sekolahName}</td></tr>
<tr><td>Mata Pelajaran</td><td>: ${mapel}</td></tr>
<tr><td>Fase / Kelas</td><td>: ${kelas}</td></tr>
</table>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 11pt;">
<thead>
<tr>
<th style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width:5%;">No</th>
<th style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width:45%;">Tujuan Pembelajaran</th>
<th style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width:35%;">Materi</th>
<th style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width:15%;">Waktu</th>
</tr>
</thead>
<tbody>
${protaRows}
</tbody>
</table>

<div class="page-break html2pdf__page-break"></div>

<div style="text-align: center; margin-bottom: 30px;">
<h1 style="font-size: 16pt; margin: 0; font-weight: bold; text-transform: uppercase;">PROGRAM SEMESTER (GANJIL)</h1>
<h2 style="font-size: 14pt; margin: 5px 0 0 0; font-weight: bold; text-transform: uppercase;">TAHUN PELAJARAN ${tahun}</h2>
</div>
<table class="tbl-identity">
<tr><td style="width: 30%;">Satuan Pendidikan</td><td style="width: 70%;">: ${cachedSettings.sekolahName}</td></tr>
<tr><td>Mata Pelajaran</td><td>: ${mapel}</td></tr>
<tr><td>Fase / Kelas</td><td>: ${kelas}</td></tr>
</table>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 9pt;">
<thead>
<tr>
<th rowspan="2" style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width: 25%;">Materi Pokok</th>
<th rowspan="2" style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width: 5%;">AW</th>
${thGanjil}
</tr>
<tr style="background:#f3f4f6; font-size: 8pt;">${thMinggu.repeat(6)}</tr>
</thead>
<tbody>
${promesGanjil}
</tbody>
</table>
<div style="font-size:9pt; margin-top:5px; margin-bottom: 15px;"><b>Keterangan:</b> <span style="background:#bbf7d0; padding:2px 5px; border:1px solid #000;">x JP</span> = Pembelajaran Efektif, <span style="background:#fef08a; padding:2px 5px; border:1px solid #000;">Asesmen/PTS/PAS</span> = Penilaian, <span style="background:#fca5a5; padding:2px 5px; border:1px solid #000;">Libur</span> = Hari Libur Nasional / Kalender Pendidikan</div>

<div class="page-break html2pdf__page-break"></div>

<div style="text-align: center; margin-bottom: 30px;">
<h1 style="font-size: 16pt; margin: 0; font-weight: bold; text-transform: uppercase;">PROGRAM SEMESTER (GENAP)</h1>
<h2 style="font-size: 14pt; margin: 5px 0 0 0; font-weight: bold; text-transform: uppercase;">TAHUN PELAJARAN ${tahun}</h2>
</div>
<table class="tbl-identity">
<tr><td style="width: 30%;">Satuan Pendidikan</td><td style="width: 70%;">: ${cachedSettings.sekolahName}</td></tr>
<tr><td>Mata Pelajaran</td><td>: ${mapel}</td></tr>
<tr><td>Fase / Kelas</td><td>: ${kelas}</td></tr>
</table>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 9pt;">
<thead>
<tr>
<th rowspan="2" style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width: 25%;">Materi Pokok</th>
<th rowspan="2" style="border: 1px solid #000; padding: 8px; background:#f3f4f6; width: 5%;">AW</th>
${thGenap}
</tr>
<tr style="background:#f3f4f6; font-size: 8pt;">${thMinggu.repeat(6)}</tr>
</thead>
<tbody>
${promesGenap}
</tbody>
</table>

<table class="ttd-block avoid-break">
<tr>
<td style="width: 50%; text-align: center; vertical-align: top;">
Mengetahui,<br>Kepala Sekolah
<br><br><br><br><br>
<b style="text-decoration: underline;">${cachedSettings.kepsekName}</b><br>
NIP. ${cachedSettings.kepsekNIP !== '-' ? cachedSettings.kepsekNIP : '..........................'}
</td>
<td style="width: 50%; text-align: center; vertical-align: top;">
${cachedSettings.kota}, ${waktuTitimangsaFormatted}<br>Guru Kelas / Mata Pelajaran
<br><br><br><br><br>
<b style="text-decoration: underline;">${cachedSettings.guruName}</b><br>
NIP. ${cachedSettings.guruNIP !== '-' ? cachedSettings.guruNIP : '..........................'}
</td>
</tr>
</table>`;
                showSuccess(html, true);
            } catch(e) { showError(e); } finally { btnGen.disabled = false; btnGen.innerHTML = originalBtnHtml; }
        });

        document.getElementById('form-jurnal')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnGen = document.getElementById('btn-generate-jurnal'); const originalBtnHtml = btnGen.innerHTML;
            btnGen.disabled = true; btnGen.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Merumuskan Jurnal...`;
            startLoadingAI("Menyusun Jurnal Harian Guru...");

            try {
                const mapel = document.getElementById('mapel-jurnal').value, kelas = document.getElementById('kelas-jurnal').value, semester = document.getElementById('semester-jurnal').value;
                const tgl = formatDate(document.getElementById('tgl-jurnal').value), jam = document.getElementById('jam-jurnal').value, materi = document.getElementById('materi-jurnal').value;
                const absS = document.getElementById('absen-s').value || "0", absI = document.getElementById('absen-i').value || "0", absA = document.getElementById('absen-a').value || "0", namaAbsen = document.getElementById('nama-absen-jurnal').value || "-";

                let prompt = `Buatlah uraian Jurnal Mengajar Harian Guru untuk satu pertemuan. Mapel: ${mapel}, Kelas: ${kelas}, Materi Pokok: ${materi}, Model Pembelajaran: ${cachedSettings.model}. Berikan format JSON murni TANPA markdown dan TANPA tag html apapun: { "uraian_kegiatan": "1 paragraf deskripsi kegiatan inti berdasarkan model", "penilaian": "Bentuk instrumen asesmen harian", "hambatan": "Kemungkinan hambatan teknis/kondisi siswa (1 kalimat)", "tindak_lanjut": "Solusi tindak lanjut (1 kalimat)" }`;

                const response = await fetchGeminiAPI(prompt);
                const dataAI = JSON.parse(response.replace(/```json/gi, '').replace(/```/g, '').trim());
                
                const html = `
                <div style="text-align: center; margin-bottom: 30px;">
<h1 style="font-size: 16pt; margin: 0; font-weight: bold; text-transform: uppercase;">AGENDA DAN JURNAL MENGAJAR HARIAN GURU</h1>
<h2 style="font-size: 12pt; margin: 5px 0 0 0; text-transform: uppercase;">SEMESTER ${semester} TAHUN PELAJARAN ${cachedSettings.tahunPelajaran || 'MASA KINI'}</h2>
</div>

<div class="section-label">IDENTIFIKASI SATUAN PENDIDIKAN</div>
<table class="tbl-identity">
<tr><td style="width: 20%;">Sekolah</td><td style="width: 30%;">: ${cachedSettings.sekolahName}</td><td style="width: 20%;">Fase / Kelas</td><td style="width: 30%;">: ${kelas}</td></tr>
<tr><td>Mata Pelajaran</td><td>: ${mapel}</td><td>Tanggal</td><td>: ${tgl}</td></tr>
</table>

<div class="section-label">URAIAN PELAKSANAAN PEMBELAJARAN</div>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 11pt;">
<thead>
<tr>
<th style="border: 1px solid #000; padding: 8px; width: 25%; background:#f3f4f6; text-align:left;">Komponen Jurnal</th>
<th style="border: 1px solid #000; padding: 8px; width: 75%; background:#f3f4f6; text-align:left;">Uraian Pelaksanaan</th>
</tr>
</thead>
<tbody>
<tr><td style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: top;">Jam Pelajaran Ke</td><td style="border: 1px solid #000; padding: 8px;">${jam}</td></tr>
<tr><td style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: top;">Materi Pembelajaran</td><td style="border: 1px solid #000; padding: 8px;">${materi}</td></tr>
<tr><td style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: top;">Uraian Kegiatan (Inti)</td><td style="border: 1px solid #000; padding: 8px; text-align: justify;">${sanitizeAIHtml(dataAI.uraian_kegiatan)}</td></tr>
<tr><td style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: top;">Bentuk Penilaian Formatif</td><td style="border: 1px solid #000; padding: 8px;">${sanitizeAIHtml(dataAI.penilaian)}</td></tr>
<tr><td style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: top;">Kehadiran Peserta Didik</td><td style="border: 1px solid #000; padding: 8px;">Sakit: ${absS} orang<br>Izin: ${absI} orang<br>Alpa: ${absA} orang<br>Catatan Nama: ${namaAbsen}</td></tr>
<tr><td style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: top;">Hambatan / Catatan Khusus</td><td style="border: 1px solid #000; padding: 8px;">${sanitizeAIHtml(dataAI.hambatan)}</td></tr>
<tr><td style="border: 1px solid #000; padding: 8px; font-weight: bold; vertical-align: top;">Tindak Lanjut Perbaikan</td><td style="border: 1px solid #000; padding: 8px;">${sanitizeAIHtml(dataAI.tindak_lanjut)}</td></tr>
</tbody>
</table>

<table class="ttd-block avoid-break">
<tr>
<td style="width: 50%; text-align: center; vertical-align: top;">
Mengetahui,<br>Kepala Sekolah
<br><br><br><br><br>
<b style="text-decoration: underline;">${cachedSettings.kepsekName}</b><br>
NIP. ${cachedSettings.kepsekNIP !== '-' ? cachedSettings.kepsekNIP : '..........................'}
</td>
<td style="width: 50%; text-align: center; vertical-align: top;">
${cachedSettings.kota}, ${tgl}<br>Guru Kelas / Mata Pelajaran
<br><br><br><br><br>
<b style="text-decoration: underline;">${cachedSettings.guruName}</b><br>
NIP. ${cachedSettings.guruNIP !== '-' ? cachedSettings.guruNIP : '..........................'}
</td>
</tr>
</table>`;
                showSuccess(html, false);
            } catch(e) { showError(e); } finally { btnGen.disabled = false; btnGen.innerHTML = originalBtnHtml; }
        });

        document.getElementById('btn-save-db')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-save-db'); const ori = btn.innerHTML;
            if(btn) { btn.innerHTML = `⏳`; btn.disabled = true; }
            try {
                let activeTab = document.querySelector('.gen-tab-btn.bg-white')?.dataset.target;
                let jenis = 'MODUL'; let mapel = document.getElementById('mapel-modul').value;
                if (activeTab === 'form-atp') { jenis = 'ATP'; mapel = document.getElementById('mapel-atp').value; }
                if (activeTab === 'form-prota') { jenis = 'PROMES'; mapel = document.getElementById('mapel-prota').value; }
                if (activeTab === 'form-jurnal') { jenis = 'JURNAL'; mapel = document.getElementById('mapel-jurnal').value; }

                const docData = { id: Date.now().toString(), jenis: jenis, mapel: mapel, content: document.getElementById('pdf-content')?.innerHTML || '', timestamp: new Date().toISOString() };
                if (!currentUser) throw new Error("Anda belum login!");
                
                const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'arsip_dokumen', docData.id);
                await setDoc(docRef, docData);
                showToast("Arsip tersimpan aman di Cloud Firestore!", "success");
            } catch (e) { console.error(e); showToast("Gagal menyimpan ke Arsip Cloud.", "error"); } 
            finally { if(btn) { btn.innerHTML = ori; btn.disabled = false; } }
        });

        document.getElementById('btn-download')?.addEventListener('click', async () => {
            const el = document.getElementById('pdf-content'); 
            const wrapper = document.getElementById('pdf-wrapper');
            const outputContainer = document.getElementById('output-container');
            if (!el || !wrapper) return;

            const btn = document.getElementById('btn-download');
            const oriBtnHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Menyimpan...`;
            }

            // Simpan status zoom dan scroll posisi pratinjau
            const oldTransform = wrapper.style.transform;
            const oldTransition = wrapper.style.transition;
            const oldScrollTop = outputContainer ? outputContainer.scrollTop : 0;
            const oldScrollLeft = outputContainer ? outputContainer.scrollLeft : 0;

            // Matikan transisi dan reset transform serta scroll agar tidak bergeser saat di-capture
            wrapper.style.transition = 'none';
            wrapper.style.transform = 'none';
            if (outputContainer) {
                outputContainer.scrollTop = 0;
                outputContainer.scrollLeft = 0;
            }

            const isLandscape = wrapper.classList.contains('landscape-mode');
            const orientation = isLandscape ? 'landscape' : 'portrait';

            let activeTab = document.querySelector('.gen-tab-btn.bg-white')?.dataset.target;
            let pre = isLandscape ? "Dokumen_Landscape_" : "Modul_Ajar_";
            if (activeTab === 'form-modul') pre = "Modul_Ajar_";
            else if (activeTab === 'form-atp' || isLandscape) pre = "ATP_";
            if (activeTab === 'form-prota') pre = "Prota_Promes_";
            if (activeTab === 'form-jurnal') pre = "Jurnal_Harian_";

            let mapelName = "Dokumen";
            try { 
                const sel = document.querySelector(`#${activeTab} .mapel-dynamic-select`);
                if (sel && sel.value) mapelName = sel.value;
            } catch(e){}

            // Beri jeda agar DOM browser me-render reset skala
            await new Promise(r => setTimeout(r, 120));

            const opt = {
                margin: isLandscape ? [12, 15, 12, 15] : [15, 15, 15, 15], // mm: [atas, kiri, bawah, kanan]
                filename: `${pre}${mapelName}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    logging: false,
                    scrollY: 0,
                    scrollX: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: orientation,
                    compress: true
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: ['.page-break', '.html2pdf__page-break'],
                    avoid: ['tr', '.avoid-break', '.ttd-block', 'h1', 'h2', 'h3', '.section-label']
                }
            };

            try {
                await html2pdf().set(opt).from(el).save();
                showToast("PDF berhasil diunduh!", "success");
            } catch (err) {
                console.error("Gagal cetak PDF:", err);
                showToast("Gagal mengunduh PDF.", "error");
            } finally {
                wrapper.style.transform = oldTransform;
                wrapper.style.transition = oldTransition;
                if (outputContainer) {
                    outputContainer.scrollTop = oldScrollTop;
                    outputContainer.scrollLeft = oldScrollLeft;
                }
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = oriBtnHtml;
                }
            }
        });

        document.getElementById('btn-word')?.addEventListener('click', () => {
            const el = document.getElementById('pdf-content');
            const wrapper = document.getElementById('pdf-wrapper');
            const isLandscape = wrapper ? wrapper.classList.contains('landscape-mode') : false;

            let activeTab = document.querySelector('.gen-tab-btn.bg-white')?.dataset.target;
            let pre = isLandscape ? "Dokumen_Landscape_" : "Modul_Ajar_";
            if (activeTab === 'form-modul') pre = "Modul_Ajar_";
            if (activeTab === 'form-atp' || isLandscape) pre = "ATP_";
            if (activeTab === 'form-prota') pre = "Prota_Promes_";
            if (activeTab === 'form-jurnal') pre = "Jurnal_Harian_";
            let mapelName = "Dokumen"; try { mapelName = document.querySelector(`#${activeTab} .mapel-dynamic-select`).value; } catch(e){}

            const pageConfig = isLandscape ? `size: 29.7cm 21cm; mso-page-orientation: landscape;` : `size: 21cm 29.7cm;`;
            const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${pre}${mapelName}</title><style>@page Section1 { ${pageConfig} margin: 1.5cm; mso-header-margin: 35.4pt; mso-footer-margin: 35.4pt; mso-paper-source: 0; } div.Section1 { page: Section1; } body { font-family: "Times New Roman"; font-size: 12pt; text-align: justify; line-height: 1.5; } p { margin: 0 0 12pt 0; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 6px 8px; vertical-align: top; } th { background-color: #e5e5e5; text-align: center; font-weight: bold; } .text-center { text-align: center; } .font-bold { font-weight: bold; }</style></head><body><div class="Section1">`;
            const footer = "</div></body></html>";
            
            let htmlContent = el.innerHTML.replace(/<div class="[^"]*page-break[^"]*"><\/div>/g, "<br clear=all style='mso-special-character:line-break;page-break-before:always'>");
            const blob = new Blob(['\ufeff', header + htmlContent + footer], { type: 'application/msword' });
            const url = URL.createObjectURL(blob); const link = document.createElement('a');
            link.href = url; link.download = `${pre}${mapelName}.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
        });

        /* --- Print PDF (Kualitas Tinggi via browser print dialog) --- */
        document.getElementById('btn-print')?.addEventListener('click', () => {
            const wrapper = document.getElementById('pdf-wrapper');
            if (!wrapper) return;
            const oldTransform = wrapper.style.transform;
            const oldTransition = wrapper.style.transition;
            wrapper.style.transition = 'none';
            wrapper.style.transform = 'none';
            
            const isLandscape = wrapper.classList.contains('landscape-mode');
            
            // Injeksi tag @page dinamis agar dialog print browser langsung mengatur orientasi dan margin presisi
            let printStyle = document.getElementById('dynamic-print-style');
            if (!printStyle) {
                printStyle = document.createElement('style');
                printStyle.id = 'dynamic-print-style';
                document.head.appendChild(printStyle);
            }
            
            printStyle.innerHTML = isLandscape 
                ? `@page { size: A4 landscape; margin: 12mm 15mm 12mm 15mm; }` 
                : `@page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }`;
            
            if (isLandscape) {
                document.body.classList.add('printing-landscape');
            } else {
                document.body.classList.remove('printing-landscape');
            }
            
            setTimeout(() => {
                window.print();
                wrapper.style.transform = oldTransform;
                wrapper.style.transition = oldTransition;
                document.body.classList.remove('printing-landscape');
            }, 250);
        });
        document.getElementById('btn-gdocs')?.addEventListener('click', async () => {
            const url = cachedSettings.gdocsUrl;
            if(!url) {
                showToast("Atur URL Google Script di Pengaturan dahulu!", "error");
                switchView('pengaturan');
                return;
            }
            const btn = document.getElementById('btn-gdocs');
            const ori = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Mengirim...`;
            
            try {
                let activeTab = document.querySelector('.gen-tab-btn.bg-white')?.dataset.target;
                let title = "Dokumen Sekolah";
                if(activeTab === 'form-modul') title = "Modul Ajar - " + document.getElementById('materiPokok').value;
                if(activeTab === 'form-atp') title = "ATP - " + document.getElementById('mapel-atp').value;
                if(activeTab === 'form-prota') title = "Prota Promes - " + document.getElementById('mapel-prota').value;
                if(activeTab === 'form-jurnal') title = "Jurnal Harian - " + document.getElementById('materi-jurnal').value;
                
                const htmlContent = document.getElementById('pdf-content')?.innerHTML || '';
                
                await fetch(url, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: title, html: htmlContent, email: currentUser?.username || 'guru' })
                });
                showToast("Berhasil terkirim! Cek Google Drive Anda.", "success");
            } catch(e) {
                console.error(e);
                showToast("Gagal mengirim ke Google Docs.", "error");
            } finally {
                btn.innerHTML = ori;
                btn.disabled = false;
            }
        });

        async function loadArsip() {
            if(!currentUser) return;
            const loading = document.getElementById('arsip-loading'); const container = document.getElementById('arsip-container');
            if(loading) loading.classList.remove('hidden'); 
            if(container) {
                container.classList.add('hidden'); container.innerHTML = '';
                let docs = [];
                try {
                    const arsipCol = collection(db, 'artifacts', appId, 'users', currentUser.username, 'arsip_dokumen');
                    const snap = await getDocs(arsipCol);
                    snap.forEach(d => docs.push(d.data()));
                } catch (e) { console.error("Gagal load arsip cloud:", e); }
                
                docs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
                if(loading) loading.classList.add('hidden'); container.classList.remove('hidden');

                let count = 0;
                docs.forEach(doc => {
                    count++; const date = new Date(doc.timestamp).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    container.innerHTML += `
                        <div class="app-card p-4 md:p-6 bg-white flex flex-col md:flex-row justify-between items-start md:items-center border-l-4 border-l-navy gap-4">
                            <div><span class="text-xs font-bold bg-lightbg text-navy px-2 py-1 rounded border border-gray-200">${doc.jenis}</span><h3 class="text-base md:text-lg font-heading font-bold mt-2 text-navy">Dokumen ${doc.jenis} - ${doc.mapel}</h3><p class="text-[10px] md:text-xs text-graytext"><i class="fas fa-cloud mr-1"></i> Tersinkronisasi: ${date}</p></div>
                            <div class="flex gap-2 w-full md:w-auto"><button onclick="viewArsip('${doc.id}')" class="btn-secondary flex-1 md:flex-none justify-center"><i class="fas fa-eye md:mr-0 mr-1"></i> <span class="md:hidden">Lihat</span></button><button onclick="deleteArsip('${doc.id}')" class="btn-secondary flex-1 md:flex-none justify-center text-red-500 hover:text-red-700 hover:border-red-500"><i class="fas fa-trash md:mr-0 mr-1"></i> <span class="md:hidden">Hapus</span></button></div>
                        </div>`;
                });
                if(count === 0) container.innerHTML = `<div class="app-card p-6 bg-white border-l-4 border-l-orange"><p class="font-heading font-bold text-navy">Arsip cloud Anda masih kosong.</p></div>`;
            }
        }

        window.deleteArsip = async (id) => {
            if(!confirm("Yakin hapus arsip dokumen ini secara permanen dari Cloud?")) return;
            try { const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'arsip_dokumen', id); await deleteDoc(docRef); loadArsip(); showToast("Arsip berhasil dihapus dari Cloud", "success"); } catch(e) { showToast("Gagal menghapus arsip.", "error"); }
        };

        window.viewArsip = async (id) => {
            try {
                const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'arsip_dokumen', id); const docSnap = await getDoc(docRef);
                if(docSnap.exists()) {
                    const docData = docSnap.data(); document.getElementById('pdf-content').innerHTML = docData.content;
                    switchView('generator'); document.getElementById('empty-state').classList.add('hidden');
                    const pdfWrapper = document.getElementById('pdf-wrapper'); pdfWrapper.classList.remove('hidden');
                    if(docData.jenis === 'ATP' || docData.jenis === 'PROMES') pdfWrapper.classList.add('landscape-mode'); else pdfWrapper.classList.remove('landscape-mode');
                    currentZoom = 1; applyZoom(); 
                    document.getElementById('btn-download').style.display = 'flex'; document.getElementById('btn-word').style.display = 'flex'; document.getElementById('btn-print').style.display = 'flex'; document.getElementById('btn-save-db').style.display = 'none';
                    if(window.innerWidth < 1024) document.getElementById('preview-panel').scrollIntoView({ behavior: 'smooth' });
                }
            } catch (e) { showToast("Gagal memuat dokumen dari Cloud.", "error"); }
        };
    