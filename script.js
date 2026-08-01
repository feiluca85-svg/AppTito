const firebaseConfig = {
  apiKey: "AIzaSyC12o-f0D7yEUGb6LdQQK2KthGp10pMR2w",
  authDomain: "apptito-44c72.firebaseapp.com",
  projectId: "apptito-44c72",
  storageBucket: "apptito-44c72.firebasestorage.app",
  messagingSenderId: "730853120876",
  appId: "1:730853120876:web:3c582359cf0f18ed563149"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const docRef = db.collection("pasto_pronto").doc("family_state");

document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE ---
    let weeksData = {};
    let activeWeekId = null;
    let budgetCash = 100.0;
    let budgetVouchers = 90.0;
    
    // --- FIREBASE SYNC ---
    let isDbLoaded = false;
    docRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            weeksData = data.weeksData || {};
            activeWeekId = data.activeWeekId || null;
            
            if (!activeWeekId && Object.keys(weeksData).length > 0) {
                activeWeekId = Object.keys(weeksData)[0];
            }
            
            budgetCash = data.budgetCash !== undefined ? data.budgetCash : 100.00;
            budgetVouchers = data.budgetVouchers !== undefined ? data.budgetVouchers : 90.00;
            
            // Backup locale
            localStorage.setItem('pasto_pronto_weeks', JSON.stringify(weeksData));
            if (activeWeekId) localStorage.setItem('pasto_pronto_active_week', activeWeekId);
            localStorage.setItem('pasto_pronto_cash', budgetCash.toString());
            localStorage.setItem('pasto_pronto_vouchers', budgetVouchers.toString());

            isDbLoaded = true;
            
            // Aggiorna le viste attive
            updateHomePreviews();
            if (typeof reRenderActiveView === 'function') reRenderActiveView();
        } else if (!isDbLoaded) {
            // Migrazione iniziale dal telefono al Cloud
            try {
                weeksData = JSON.parse(localStorage.getItem('pasto_pronto_weeks') || '{}');
                activeWeekId = localStorage.getItem('pasto_pronto_active_week') || null;
                if (!activeWeekId && Object.keys(weeksData).length > 0) activeWeekId = Object.keys(weeksData)[0];
                const storedCash = localStorage.getItem('pasto_pronto_cash');
                if (storedCash !== null) budgetCash = parseFloat(storedCash);
                const storedVouchers = localStorage.getItem('pasto_pronto_vouchers');
                if (storedVouchers !== null) budgetVouchers = parseFloat(storedVouchers);
            } catch(e) {}
            
            saveState(); // Salva sul Cloud per la prima volta
            isDbLoaded = true;
        }
    }, (error) => {
        console.error("Errore di sincronizzazione:", error);
    });

    // Auto-recharge vouchers on the 6th of each month
    const checkVoucherRecharge = () => {
        const today = new Date();
        const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`;
        const lastRechargeMonth = localStorage.getItem('lastVoucherRechargeMonth');

        if (today.getDate() >= 6 && lastRechargeMonth !== currentMonthKey) {
            budgetVouchers = 90.0;
            saveState();
            localStorage.setItem('lastVoucherRechargeMonth', currentMonthKey);
            alert("Oggi è passato il 6 del mese! Il budget dei Buoni Celiachia è stato ripristinato automaticamente a 90.00 €.");
        }
    };
    checkVoucherRecharge();

    const saveState = () => {
        docRef.set({
            weeksData: weeksData,
            activeWeekId: activeWeekId,
            budgetCash: budgetCash,
            budgetVouchers: budgetVouchers
        }, { merge: true }).catch(err => console.error("Errore salvataggio Cloud:", err));
        
        // Backup locale
        localStorage.setItem('pasto_pronto_weeks', JSON.stringify(weeksData));
        if (activeWeekId) localStorage.setItem('pasto_pronto_active_week', activeWeekId);
        localStorage.setItem('pasto_pronto_cash', budgetCash.toString());
        localStorage.setItem('pasto_pronto_vouchers', budgetVouchers.toString());
    };

    // --- DOM ELEMENTS ---
    const homeView = document.getElementById('homeView');
    const goHomeBtn = document.getElementById('goHomeBtn');
    const appHeaderTitle = document.getElementById('appHeaderTitle');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    
    const tileBudget = document.getElementById('tileBudget');
    const tileVouchers = document.getElementById('tileVouchers');
    const tileGrocery = document.getElementById('tileGrocery');
    const tileMenu = document.getElementById('tileMenu');
    const tilePrep = document.getElementById('tilePrep');

    const budgetView = document.getElementById('budgetView');
    const vouchersView = document.getElementById('vouchersView');
    const groceryView = document.getElementById('groceryView');
    const menuView = document.getElementById('menuView');
    const prepView = document.getElementById('prepView');

    const views = [homeView, budgetView, vouchersView, groceryView, menuView, prepView];

    // Sidebar & Import
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarContent = document.getElementById('sidebarContent');
    const weeksList = document.getElementById('weeksList');
    
    const openImportBtn = document.getElementById('openImportBtn');
    const closeImportBtn = document.querySelector('.close-import-btn');
    const importModal = document.getElementById('importModal');
    const applyJsonBtn = document.getElementById('applyJsonBtn');
    const jsonInputArea = document.getElementById('jsonInputArea');
    const weekNameInput = document.getElementById('weekNameInput');
    const editModeBtn = document.getElementById('editModeBtn');
    const headerTitle = document.getElementById('appHeaderTitle');

    // --- GEM SHORTCUT LOGIC ---
    let pressTimer;
    const openGem = () => {
        let gemUrl = localStorage.getItem('pasto_pronto_gem_url');
        if (!gemUrl) {
            gemUrl = prompt("Inserisci il link (URL) del tuo Gem su Google Gemini:", "https://gemini.google.com/");
            if (gemUrl) {
                if (!gemUrl.startsWith('http://') && !gemUrl.startsWith('https://')) {
                    gemUrl = 'https://' + gemUrl;
                }
                localStorage.setItem('pasto_pronto_gem_url', gemUrl);
            }
        }
        if (gemUrl) {
            window.open(gemUrl, '_blank');
        }
    };

    const resetGemBtn = document.getElementById('resetGemBtn');
    if (resetGemBtn) {
        resetGemBtn.addEventListener('click', () => {
            closeSidebar();
            setTimeout(() => {
                let newUrl = prompt("Inserisci il NUOVO link (URL) del tuo Gem:", localStorage.getItem('pasto_pronto_gem_url') || "https://gemini.google.com/");
                if (newUrl) {
                    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
                        newUrl = 'https://' + newUrl;
                    }
                    localStorage.setItem('pasto_pronto_gem_url', newUrl);
                    alert("Link aggiornato con successo!");
                }
            }, 300);
        });
    }

    headerTitle.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(openGem, 800);
    });
    headerTitle.addEventListener('touchend', () => clearTimeout(pressTimer));
    headerTitle.addEventListener('touchcancel', () => clearTimeout(pressTimer));
    headerTitle.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openGem();
    });

    let editMode = false;
    const metroColors = ['#a20025', '#f0a30a', '#00a300', '#2b5797', '#d3a300', '#881798', '#E3008C', '#008272', '#00aba9', '#6a00ff', '#0050ef', '#1ba1e2'];
    const tileSizes = ['metro-tile', 'metro-tile tile-wide', 'metro-tile tile-large'];

    // Load Tile Preferences
    let tilePrefs = {};
    try {
        tilePrefs = JSON.parse(localStorage.getItem('pasto_pronto_tiles') || '{}');
    } catch(e){}

    const saveTilePrefs = () => {
        localStorage.setItem('pasto_pronto_tiles', JSON.stringify(tilePrefs));
    };

    const applyTilePrefs = () => {
        document.querySelectorAll('#homeView .metro-tile').forEach(tile => {
            const id = tile.id;
            if (tilePrefs[id]) {
                if (tilePrefs[id].color) {
                    tile.style.background = tilePrefs[id].color;
                    tile.dataset.color = tilePrefs[id].color;
                }
                if (tilePrefs[id].size) {
                    tile.className = tilePrefs[id].size;
                }
            }
        });
    };

    // --- NAVIGATION LOGIC ---
    let currentActiveRenderFn = null;
    let currentActiveView = null;
    let currentActiveTitle = "";

    window.reRenderActiveView = () => {
        if (currentActiveRenderFn && currentActiveView && currentActiveView.style.display !== 'none') {
            currentActiveRenderFn();
        }
    };

    const showView = (viewToShow, title, renderFn) => {
        currentActiveView = viewToShow;
        currentActiveTitle = title;
        currentActiveRenderFn = renderFn;

        // Nascondi tutte le viste principali
        views.forEach(v => v.style.display = 'none');
        // Mostra la vista richiesta
        viewToShow.style.display = viewToShow.id === 'homeView' ? 'grid' : 'block';
        
        // Update header logic
        if (viewToShow.id === 'homeView') {
            goHomeBtn.style.display = 'none';
            openSidebarBtn.style.display = 'inline-block';
            headerTitle.textContent = "AppTito";
            editModeBtn.style.display = 'inline-block';
            
            if (editMode) {
                editMode = false;
                document.body.classList.remove('edit-mode-active');
                editModeBtn.style.background = 'transparent';
                editModeBtn.style.color = 'white';
            }
            updateHomePreviews();
        } else {
            goHomeBtn.style.display = 'inline-block';
            openSidebarBtn.style.display = 'none';
            headerTitle.textContent = title;
            editModeBtn.style.display = 'none';
        }
    };

    goHomeBtn.addEventListener('click', () => {
        showView(homeView, "AppTito", null);
        updateHomePreviews();
    });
    
    const handleTileClick = (e, tile, view, title, renderFn) => {
        if (editMode) {
            e.preventDefault();
            // Change color
            let currentIndex = metroColors.indexOf(tile.dataset.color);
            let nextIndex = (currentIndex + 1) % metroColors.length;
            tile.style.background = metroColors[nextIndex];
            tile.dataset.color = metroColors[nextIndex];
            
            if (!tilePrefs[tile.id]) tilePrefs[tile.id] = {};
            tilePrefs[tile.id].color = metroColors[nextIndex];
            saveTilePrefs();
        } else {
            showView(view, title, renderFn); 
            renderFn();
        }
    };

    const handleTileRightClick = (e, tile) => {
        if (editMode) {
            e.preventDefault();
            // Change size
            let currentSize = tile.className;
            let nextIndex = (tileSizes.indexOf(currentSize) + 1) % tileSizes.length;
            tile.className = tileSizes[nextIndex];
            
            if (!tilePrefs[tile.id]) tilePrefs[tile.id] = {};
            tilePrefs[tile.id].size = tileSizes[nextIndex];
            saveTilePrefs();
        }
    };

    const attachTileEvents = (tile, view, title, renderFn) => {
        tile.addEventListener('click', (e) => handleTileClick(e, tile, view, title, renderFn));
        tile.addEventListener('contextmenu', (e) => handleTileRightClick(e, tile));
    };

    // Edit Mode Toggle
    editModeBtn.addEventListener('click', () => {
        editMode = !editMode;
        if (editMode) {
            document.body.classList.add('edit-mode-active');
            editModeBtn.style.background = 'white';
            editModeBtn.style.color = 'black';
            alert("Modalità Modifica Attiva!\n- Clicca una tile per cambiare COLORE.\n- Tieni premuto (o tasto destro) per cambiare DIMENSIONE.");
        } else {
            document.body.classList.remove('edit-mode-active');
            editModeBtn.style.background = 'transparent';
            editModeBtn.style.color = 'white';
        }
    });

    // --- SIDEBAR LOGIC ---
    const openSidebar = () => {
        sidebarOverlay.classList.add('active');
        setTimeout(() => { sidebarContent.style.transform = 'translateX(0)'; }, 10);
        renderSidebar();
    };

    const closeSidebar = () => {
        sidebarContent.style.transform = 'translateX(100%)';
        setTimeout(() => { sidebarOverlay.classList.remove('active'); }, 300);
    };

    openSidebarBtn.addEventListener('click', openSidebar);
    closeSidebarBtn.addEventListener('click', closeSidebar);
    
    const renderSidebar = () => {
        weeksList.innerHTML = '';
        const weekKeys = Object.keys(weeksData).sort().reverse(); // Show newest first
        
        if (weekKeys.length === 0) {
            weeksList.innerHTML = '<div style="color:var(--text-secondary); padding:10px;">Nessuna settimana salvata.</div>';
            return;
        }

        weekKeys.forEach(key => {
            const div = document.createElement('div');
            div.className = 'sidebar-item' + (key === activeWeekId ? ' active' : '');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            const textSpan = document.createElement('span');
            textSpan.textContent = key;
            
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fa-solid fa-circle-minus"></i>';
            delBtn.style.background = 'transparent';
            delBtn.style.border = 'none';
            delBtn.style.color = '#ff4d4d';
            delBtn.style.cursor = 'pointer';
            delBtn.style.fontSize = '1.4rem';
            delBtn.style.padding = '10px';
            delBtn.style.display = 'none'; // Nascosto di default

            delBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Previene il click sul div padre
                if (confirm(`Vuoi davvero eliminare la settimana "${key}"?`)) {
                    delete weeksData[key];
                    if (activeWeekId === key) {
                        const remaining = Object.keys(weeksData).sort().reverse();
                        activeWeekId = remaining.length > 0 ? remaining[0] : null;
                    }
                    saveState();
                    renderSidebar();
                    updateHomePreviews();
                    if (document.getElementById('homeView').style.display === 'none') {
                        showView(document.getElementById('homeView'));
                    }
                }
            });

            div.appendChild(textSpan);
            div.appendChild(delBtn);

            let pressTimer;
            let longPressed = false;

            div.addEventListener('touchstart', () => {
                longPressed = false;
                pressTimer = setTimeout(() => {
                    longPressed = true;
                    // Mostra/Nascondi il bottone di eliminazione
                    delBtn.style.display = delBtn.style.display === 'none' ? 'inline-block' : 'none';
                }, 800);
            });
            div.addEventListener('touchend', () => clearTimeout(pressTimer));
            div.addEventListener('touchcancel', () => clearTimeout(pressTimer));
            // Aggiungiamo anche contextmenu (tasto destro o long press su desktop)
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                delBtn.style.display = delBtn.style.display === 'none' ? 'inline-block' : 'none';
            });

            div.addEventListener('click', (e) => {
                if (longPressed) return; // Se era un long-press, non selezionare la settimana
                
                activeWeekId = key;
                saveState();
                updateHomePreviews();
                closeSidebar();
                showView(homeView);
            });
            weeksList.appendChild(div);
        });
    };

    // --- IMPORT LOGIC ---
    openImportBtn.addEventListener('click', () => {
        closeSidebar();
        setTimeout(() => {
            jsonInputArea.value = '';
            
            // Proponi il nome della settimana (es. 2026-08-01)
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            // Approssimazione settimana del mese
            const weekOfMonth = Math.ceil(now.getDate() / 7);
            weekNameInput.value = `${year}-${month}-0${weekOfMonth}`;
            
            importModal.classList.add('active');
        }, 300);
    });

    closeImportBtn.addEventListener('click', () => {
        importModal.classList.remove('active');
    });

    applyJsonBtn.addEventListener('click', () => {
        const weekName = weekNameInput.value.trim();
        if (!weekName) {
            alert("Inserisci un nome per la settimana!");
            return;
        }

        try {
            const rawJson = jsonInputArea.value.trim();
            let cleanJson = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
            
            // Estrae solo la parte tra parentesi graffe per ignorare testo extra
            const startIdx = cleanJson.indexOf('{');
            const endIdx = cleanJson.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                cleanJson = cleanJson.substring(startIdx, endIdx + 1);
            }

            const data = JSON.parse(cleanJson);
            
            weeksData[weekName] = {
                menu: data.menu || {},
                prepTimes: data.prepTimes || {},
                mealPrep: data.mealPrep || "",
                groceryList: (data.groceryList || []).map(item => ({...item, checked: false}))
            };
            
            activeWeekId = weekName;
            saveState();
            
            importModal.classList.remove('active');
            showView(homeView);
            alert(`Menu caricato per la settimana: ${weekName}`);
        } catch(e) {
            alert("Errore nel JSON! Assicurati di aver incollato correttamente il codice.\n\nDettaglio: " + e.message);
        }
    });

    // --- RENDER VIEWS ---

    const updateHomePreviews = () => {
        // Budget & Vouchers
        document.getElementById('budgetHomePreview').textContent = `${budgetCash.toFixed(2)} €`;
        document.getElementById('vouchersHomePreview').textContent = `${budgetVouchers.toFixed(2)} €`;
    };

    // Budget Tracker Logic
    const renderBudget = () => {
        const remainingEl = document.getElementById('cashRemaining');
        const msgEl = document.getElementById('cashMessage');
        remainingEl.textContent = `${budgetCash.toFixed(2)} €`;
        
        if (budgetCash < 0) {
            remainingEl.style.color = '#ff4d4d'; // Rosso vivo
            msgEl.textContent = "ATTENZIONE! Hai sforato il budget settimanale!";
            msgEl.style.color = '#ff4d4d';
        } else if (budgetCash < 20) {
            remainingEl.style.color = '#ffa500'; // Arancione
            msgEl.textContent = "Attenzione, budget quasi esaurito.";
            msgEl.style.color = '#ffa500';
        } else {
            remainingEl.style.color = '#a20025'; // Default tile color
            msgEl.textContent = "Bravi! Siete perfettamente in budget.";
            msgEl.style.color = '#00a300';
        }
    };

    document.getElementById('addCashExpenseBtn').addEventListener('click', () => {
        const val = parseFloat(document.getElementById('cashInput').value);
        if (!isNaN(val) && val > 0) {
            budgetCash -= val;
            document.getElementById('cashInput').value = '';
            saveState();
            renderBudget();
        }
    });

    document.getElementById('resetCashBtn').addEventListener('click', () => {
        if(confirm("Vuoi davvero resettare il budget cash a 100€?")) {
            budgetCash = 100.0;
            saveState();
            renderBudget();
        }
    });

    // Vouchers Tracker Logic
    const renderVouchers = () => {
        document.getElementById('vouchersRemaining').textContent = `${budgetVouchers.toFixed(2)} €`;
    };

    document.getElementById('addVoucherExpenseBtn').addEventListener('click', () => {
        const val = parseFloat(document.getElementById('vouchersInput').value);
        if (!isNaN(val) && val > 0) {
            budgetVouchers -= val;
            document.getElementById('vouchersInput').value = '';
            saveState();
            renderVouchers();
        }
    });

    document.getElementById('resetVouchersBtn').addEventListener('click', () => {
        if(confirm("Vuoi davvero resettare i buoni a 90€?")) {
            budgetVouchers = 90.0;
            saveState();
            renderVouchers();
        }
    });

    // Grocery Logic
    const renderGrocery = () => {
        const container = document.getElementById('groceryListContainer');
        container.innerHTML = '';
        
        const activeData = activeWeekId ? weeksData[activeWeekId] : null;
        if (!activeData || !activeData.groceryList || activeData.groceryList.length === 0) {
            container.innerHTML = '<div style="color:var(--text-secondary);">Nessuna lista della spesa per questa settimana.</div>';
            return;
        }

        let html = `<div style="display: flex; flex-direction: column; gap: 15px; background: #1e1e1e; padding: 20px;">`;
        activeData.groceryList.forEach((item, index) => {
            const checked = item.checked ? 'checked' : '';
            const style = item.checked ? 'text-decoration: line-through; opacity: 0.6;' : '';
            const voucherBadge = item.useVoucher ? `<span style="background: #fff; color: #00a300; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; margin-left: 5px;">BUONO</span>` : '';
            
            html += `
                <label style="display: flex; align-items: center; gap: 15px; cursor: pointer; ${style}">
                    <input type="checkbox" data-index="${index}" class="grocery-checkbox" ${checked} style="width: 25px; height: 25px; flex-shrink: 0;">
                    <span>${item.item} (${item.estimatedPrice}€) ${voucherBadge}</span>
                </label>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;

        document.querySelectorAll('.grocery-checkbox').forEach(box => {
            box.addEventListener('change', (e) => {
                const idx = e.target.getAttribute('data-index');
                weeksData[activeWeekId].groceryList[idx].checked = e.target.checked;
                saveState();
                renderGrocery(); // Re-render per lo strikethrough
            });
        });
    };

    // Menu Logic
    const safeStringify = (data) => {
        if (!data) return '-';
        if (typeof data === 'string') return data.replace(/\n/g, '<br>');
        if (Array.isArray(data)) return data.map(safeStringify).join('<div style="margin-top:8px;"></div>');
        if (typeof data === 'object') {
            return Object.entries(data).map(([k, v]) => 
                `<div class="meal-detail-item">
                    <div class="meal-detail-key">${k}</div>
                    <div class="meal-detail-value">${safeStringify(v)}</div>
                </div>`
            ).join('');
        }
        return String(data).replace(/\n/g, '<br>');
    };

    const renderMenu = () => {
        const container = document.getElementById('menuDaysContainer');
        container.innerHTML = '';

        const activeData = activeWeekId ? weeksData[activeWeekId] : null;
        if (!activeData || !activeData.menu || Object.keys(activeData.menu).length === 0) {
            container.innerHTML = '<div style="color:var(--text-secondary);">Nessun menu per questa settimana.</div>';
            return;
        }

        const giorniSettimana = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
        const sortedEntries = Object.entries(activeData.menu).sort((a, b) => {
            const idxA = giorniSettimana.indexOf(a[0].toLowerCase());
            const idxB = giorniSettimana.indexOf(b[0].toLowerCase());
            return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
        });

        sortedEntries.forEach(([giorno, dayData]) => {
            const prepKey = activeData.prepTimes ? Object.keys(activeData.prepTimes).find(k => k.toLowerCase() === giorno.toLowerCase()) : null;
            const prepTime = prepKey ? activeData.prepTimes[prepKey] : '';
            
            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';
            
            const bfast = safeStringify(dayData.breakfast);
            const s1 = dayData.snack1 ? `<br><br><strong>Spuntino:</strong><br>${safeStringify(dayData.snack1)}` : '';
            const lunch = safeStringify(dayData.lunch);
            const s2 = dayData.snack2 ? `<br><br><strong>Merenda:</strong><br>${safeStringify(dayData.snack2)}` : '';
            const dinner = safeStringify(dayData.dinner);

            accordionItem.innerHTML = `
                <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
                    <span>${giorno}</span>
                    <i class="fa-solid fa-chevron-down chevron"></i>
                </div>
                <div class="accordion-body">
                    ${prepTime ? `<div style="padding: 10px; background: #333; margin-bottom: 15px; border-radius: 4px;"><i class="fa-solid fa-stopwatch"></i> <strong>Tempi:</strong> ${prepTime}</div>` : ''}
                    <div class="menu-meal-block">
                        <div class="menu-meal-title">Colazione & Spuntino</div>
                        <div class="menu-meal-content"><strong>Colazione:</strong><br>${bfast}${s1}</div>
                    </div>
                    <div class="menu-meal-block">
                        <div class="menu-meal-title">Pranzo & Merenda</div>
                        <div class="menu-meal-content"><strong>Pranzo:</strong><br>${lunch}${s2}</div>
                    </div>
                    <div class="menu-meal-block">
                        <div class="menu-meal-title">Cena</div>
                        <div class="menu-meal-content">${dinner}</div>
                    </div>
                </div>
            `;
            container.appendChild(accordionItem);
        });
    };

    // Prep Logic
    const renderPrep = () => {
        const container = document.getElementById('prepContainer');
        const activeData = activeWeekId ? weeksData[activeWeekId] : null;
        
        if (!activeData || !activeData.mealPrep || (Array.isArray(activeData.mealPrep) && activeData.mealPrep.length === 0)) {
            container.textContent = "Nessun meal prep trovato per questa settimana.";
        } else {
            container.innerHTML = '';
            
            const extractSteps = (data) => {
                if (Array.isArray(data)) return data;
                if (typeof data === 'object') return Object.values(data);
                if (typeof data === 'string') return data.split(/\n+/).filter(s => s.trim().length > 0);
                return [String(data)];
            };

            const steps = extractSteps(activeData.mealPrep);
            
            steps.forEach(step => {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'prep-step';
                stepDiv.innerHTML = safeStringify(step);
                container.appendChild(stepDiv);
            });
        }
    };

    // Init Attachments
    attachTileEvents(tileBudget, budgetView, "budget cash", renderBudget);
    attachTileEvents(tileVouchers, vouchersView, "buoni", renderVouchers);
    attachTileEvents(tileGrocery, groceryView, "spesa", renderGrocery);
    attachTileEvents(tileMenu, menuView, "menu", renderMenu);
    attachTileEvents(tilePrep, prepView, "meal prep", renderPrep);

    // Init
    window.addCustomGroceryItem = () => {
        const input = document.getElementById('customGroceryInput');
        const itemName = input.value.trim();
        if (!itemName) return;

        if (activeWeekId && weeksData[activeWeekId]) {
            weeksData[activeWeekId].groceryList.push({
                item: itemName,
                category: "Aggiunti a Mano",
                estimatedPrice: 0,
                useVoucher: false,
                checked: false
            });
            saveState();
            input.value = '';
            // Since saveState syncs to Firebase, Firebase listener will trigger reRenderActiveView automatically!
            // But just in case, we force render here.
            renderGrocery();
        }
    };

    // Load initial views
    applyTilePrefs();
    updateHomePreviews();
});

// Booklet export function
window.exportMenuBooklet = () => {
    const prepView = document.getElementById('prepView');
    if (prepView) {
        prepView.classList.add('force-print');
    }
    window.print();
    setTimeout(() => {
        if (prepView) {
            prepView.classList.remove('force-print');
        }
    }, 1000);
};
