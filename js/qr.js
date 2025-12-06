        const baseURL = window.location.origin + window.location.pathname.replace('qr-generator.html', 'table.html');

        // دالة للحصول على الطاولات المحفوظة محلياً
        function getSavedTables() {
            const saved = localStorage.getItem('tables');
            return saved ? JSON.parse(saved) : [];
        }

        // جلب الطاولات من قاعدة البيانات (Supabase). ترجع null في حالة عدم التوفر أو الخطأ
        async function fetchTablesFromDb() {
            try {
                if (!window.supabase) return null;
                const { data, error } = await window.supabase.from('tables').select('*').order('number', { ascending: true });
                if (error) {
                    console.error('Supabase error fetching tables:', error);
                    return null;
                }
                return data || [];
            } catch (err) {
                console.error('fetchTablesFromDb error:', err);
                return null;
            }
        }

        // دالة لحفظ الطاولات
        function saveTables(tables) {
            localStorage.setItem('tables', JSON.stringify(tables));
        }

        // دالة لإضافة طاولة للتخزين والعرض
        function addTableToStorage(tableNumber, notes = '') {
            const tables = getSavedTables();
            if (!tables.find(t => t.number === tableNumber)) {
                tables.push({ number: tableNumber, notes });
                saveTables(tables);
            }
        }

        // دالة لحذف طاولة من التخزين
        function removeTableFromStorage(tableNumber) {
            const tables = getSavedTables();
            const filtered = tables.filter(t => t.number !== tableNumber);
            saveTables(filtered);
        }

        // دالة لتحميل وعرض جميع الطاولات: تحاول أولاً جلبها من DB ثم fallback للمخزن المحلي
        async function loadSavedTables() {
            const dbTables = await fetchTablesFromDb();
            if (Array.isArray(dbTables) && dbTables.length > 0) {
                dbTables.forEach(t => {
                    // قد تكون أسماء الحقول مختلفة في قاعدة البيانات، نفترض fields: number, notes
                    const num = t.number || t.table_number || t.id;
                    const notes = t.notes || t.note || '';
                    if (num) renderTable(num, notes);
                });
                return;
            }

            // fallback: localStorage
            const tables = getSavedTables();
            tables.forEach(table => {
                renderTable(table.number, table.notes);
            });
        }

        // دالة لرسم/عرض الطاولة
        function renderTable(tableNumber, notes = '') {
            const grid = document.querySelector('.grid');
            const existingCard = document.getElementById(`table-${tableNumber}`);
            
            if (existingCard) return; // تجنب التكرار

            const tableUrl = `${baseURL}?table=${tableNumber}`;
            
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-lg p-6 text-center print:page-break-inside-avoid';
            card.id = `table-${tableNumber}`;
            
            card.innerHTML = `
                <div class="mb-4">
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">الطاولة رقم ${tableNumber}</h2>
                    <p class="text-sm text-gray-600 mb-4">امسح هذا الرمز لتقديم طلبك</p>
                    ${notes ? `<p class="text-xs text-gray-500 italic">${notes}</p>` : ''}
                </div>
                
                <div id="qrcode-${tableNumber}" class="flex justify-center mb-4" style="background: white; padding: 10px;"></div>
                
                <div class="border-t pt-4">
                    <p class="text-xs text-gray-500 break-all font-mono">${tableUrl}</p>
                </div>
                
                <div class="mt-4 flex gap-2 justify-center">
                    <button onclick="printTable(${tableNumber})" class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">طباعة</button>
                    <button onclick="downloadQR(${tableNumber})" class="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">تحميل</button>
                    <button onclick="deleteTable(${tableNumber})" class="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">حذف</button>
                </div>
            `;
            
            grid.appendChild(card);
            
            // توليد QR Code
            new QRCode(document.getElementById(`qrcode-${tableNumber}`), {
                text: tableUrl,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        function printTable(tableNum) {
            const card = document.getElementById(`table-${tableNum}`);
            const qrCanvas = card.querySelector(`#qrcode-${tableNum} canvas`);
            const qrCode = qrCanvas.toDataURL('image/png');
            
            const printWindow = window.open('', '', 'height=600,width=600');
            printWindow.document.write('<!DOCTYPE html>');
            printWindow.document.write('<html>');
            printWindow.document.write('<head>');
            printWindow.document.write('<meta charset="UTF-8">');
            printWindow.document.write('<title>الطاولة ' + tableNum + '</title>');
            printWindow.document.write('<style>');
            printWindow.document.write('body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }');
            printWindow.document.write('.card { max-width: 400px; margin: 0 auto; }');
            printWindow.document.write('h1 { font-size: 32px; margin-bottom: 20px; }');
            printWindow.document.write('img { max-width: 300px; margin: 20px 0; }');
            printWindow.document.write('@media print { body { margin: 0; padding: 10px; } }');
            printWindow.document.write('</style>');
            printWindow.document.write('</head>');
            printWindow.document.write('<body>');
            printWindow.document.write('<div class="card">');
            printWindow.document.write('<h1>الطاولة رقم ' + tableNum + '</h1>');
            printWindow.document.write('<p style="font-size: 18px; margin-bottom: 20px;">امسح هذا الرمز لتقديم طلبك</p>');
            printWindow.document.write('<img src="' + qrCode + '" alt="QR Code">');
            printWindow.document.write('<p style="margin-top: 20px; font-size: 14px;">مرحباً بك في مطعمنا 🍽️</p>');
            printWindow.document.write('</div>');
            printWindow.document.write('</body>');
            printWindow.document.write('</html>');
            printWindow.document.close();
            printWindow.print();
        }

        function downloadQR(tableNum) {
            const card = document.getElementById(`table-${tableNum}`);
            const qrCanvas = card.querySelector(`#qrcode-${tableNum} canvas`);
            const link = document.createElement('a');
            link.href = qrCanvas.toDataURL('image/png');
            link.download = `table-${tableNum}-qr.png`;
            link.click();
        }

        function printAll() {
            window.print();
        }

        function downloadAll() {
            alert('تم تحميل جميع الرموز بنجاح!\n\nيمكنك استخدام Print to PDF من قائمة الطباعة (Ctrl+P) لحفظ جميع الرموز في ملف PDF واحد');
        }
        // فتح موديول إضافة طاولة
        function openAddTableModal() {
            document.getElementById('addTableModal').classList.remove('hidden');
            document.getElementById('tableNumberInput').value = '';
            document.getElementById('tableNotesInput').value = '';
            document.getElementById('tableNumberInput').focus();
        }

        // إغلاق موديول إضافة طاولة
        function closeAddTableModal() {
            document.getElementById('addTableModal').classList.add('hidden');
        }

        // إضافة طاولة جديدة
        async function submitAddTable() {
            const tableNumber = parseInt(document.getElementById('tableNumberInput').value);
            const notes = document.getElementById('tableNotesInput').value.trim();

            if (!tableNumber || tableNumber < 1) {
                alert('يرجى إدخال رقم طاولة صحيح');
                return;
            }

            try {
                // التحقق من وجود الطاولة بالفعل
                const existingCard = document.getElementById(`table-${tableNumber}`);
                
                if (existingCard) {
                    alert('هذه الطاولة موجودة بالفعل');
                    return;
                }

                // إضافة الطاولة للتخزين والعرض
                addTableToStorage(tableNumber, notes);
                renderTable(tableNumber, notes);

                // حاول أيضاً حفظها في قاعدة البيانات إذا كانت Supabase متاحة
                try {
                    if (window.supabase) {
                        const payload = { number: tableNumber, notes };
                        const { data, error } = await window.supabase.from('tables').insert([payload]);
                        if (error) console.warn('Supabase insert tables warning:', error);
                    }
                } catch (e) {
                    console.warn('Failed to insert table to Supabase:', e);
                }

                alert(`✅ تمت إضافة الطاولة رقم ${tableNumber} بنجاح`);
                closeAddTableModal();
            } catch (error) {
                console.error('Error:', error);
                alert('حدث خطأ في إضافة الطاولة');
            }
        }

        // حذف طاولة
        async function deleteTable(tableNum) {
            if (confirm(`هل تريد حذف الطاولة رقم ${tableNum}؟`)) {
                const card = document.getElementById(`table-${tableNum}`);
                if (card) {
                    card.remove();
                    removeTableFromStorage(tableNum);

                    // حاول حذفها من قاعدة البيانات أيضاً
                    try {
                        if (window.supabase) {
                            const { error } = await window.supabase.from('tables').delete().eq('number', tableNum);
                            if (error) console.warn('Supabase delete tables warning:', error);
                        }
                    } catch (e) {
                        console.warn('Failed to delete table from Supabase:', e);
                    }

                    alert(`تم حذف الطاولة رقم ${tableNum}`);
                }
            }
        }

        // إغلاق الموديول عند الضغط خارجه
        document.addEventListener('DOMContentLoaded', function() {
            // تحميل الطاولات المحفوظة عند تحميل الصفحة
            loadSavedTables();

            const modal = document.getElementById('addTableModal');
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeAddTableModal();
                }
            });
        });
