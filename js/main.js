        const SUPABASE_URL = 'https://ffavhmndcnqgrdcxcnuo.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmYXZobW5kY25xZ3JkY3hjbnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzIwODEsImV4cCI6MjA4MDYwODA4MX0.b80wJ2rZo_iiuO-HN-wzxyQ0bqh_Z_6p5h6unzL9G1E';
        const ADMIN_PASSWORD = 'admin123';

        // Initialize Supabase client
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        let menuItems = [];
        let orders = [];
        let editingItemId = null;
        let selectedImageBase64 = null;
        let currentOrder = null;
        let isLoggedIn = false;

        // Initialize
        window.onload = function() {
            checkLogin();
            setInterval(loadAllData, 5000);
        };

        // Login
        function adminLogin() {
            const password = document.getElementById('adminPassword').value;
            if (password === ADMIN_PASSWORD) {
                isLoggedIn = true;
                document.getElementById('loginModal').classList.remove('active');
                loadAllData();
            } else {
                alert('كلمة المرور غير صحيحة');
            }
        }

        function checkLogin() {
            const saved = localStorage.getItem('dashboardLogin');
            if (saved === 'true') {
                isLoggedIn = true;
                document.getElementById('loginModal').classList.remove('active');
                loadAllData();
            }
        }

        function logout() {
            isLoggedIn = false;
            localStorage.removeItem('dashboardLogin');
            document.getElementById('loginModal').classList.add('active');
            document.getElementById('adminPassword').value = '';
        }

        // Tab Switching
        function switchTab(tab) {
            document.querySelectorAll('[id$="Tab"]').forEach(el => el.classList.add('hidden'));
            document.getElementById(tab + 'Tab').classList.remove('hidden');
            
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            event.target.closest('.tab-btn').classList.add('active');

            const titles = {
                dashboard: ['لوحة المتابعة', 'عرض شامل لجميع الطلبات والإحصائيات'],
                cashier: ['نقطة الكاشير', 'إدارة الفواتير والدفع والمبيعات'],
                orders: ['إدارة الطلبات', 'إدارة ومتابعة جميع الطلبات'],
                menu: ['إدارة المنيو', 'إضافة وتعديل الأصناف']
            };

            document.getElementById('pageTitle').textContent = titles[tab][0];
            document.getElementById('pageDesc').textContent = titles[tab][1];

            if (tab === 'menu') loadMenuItems();
            if (tab === 'orders') loadOrders();
            if (tab === 'cashier') loadCashierData();
        }

        // Load all data
        async function loadAllData() {
            if (!isLoggedIn) return;
            await Promise.all([loadMenuItems(), loadOrders()]);
            updateDashboard();
        }

        // Load Menu Items
        async function loadMenuItems() {
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/menu_items?select=*&order=category,name`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                        }
                    }
                );

                if (!response.ok) throw new Error('فشل في تحميل البيانات');
                menuItems = await response.json();
                displayMenuTable();
            } catch (error) {
                console.error('Error:', error);
            }
        }

        // Load Orders
        async function loadOrders() {
            try {
                const { data: ordersList, error } = await supabase
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                orders = ordersList || [];
                filterAndDisplayOrders();
                displayTableStatus();
                displayRecentOrders();
            } catch (error) {
                console.error('Error:', error);
            }
        }

        // Display Menu Table
        function displayMenuTable() {
            const tbody = document.getElementById('menuTableBody');
            
            if (menuItems.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">لا توجد أصناف</td></tr>';
                return;
            }

            tbody.innerHTML = menuItems.map(item => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" class="w-10 h-10 rounded object-cover">` : '<div class="w-10 h-10 bg-gray-200 rounded"></div>'}
                            <div class="text-sm font-medium text-gray-900">${item.name}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">${item.category}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.price} ج.م</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button onclick="toggleAvailability('${item.id}', ${item.available})" class="px-3 py-1 text-xs font-semibold rounded-full ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${item.available ? 'متاح' : 'غير متاح'}
                        </button>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="editMenuItem('${item.id}')" class="text-blue-600 hover:text-blue-900 ml-3">✏️</button>
                        <button onclick="deleteMenuItem('${item.id}')" class="text-red-600 hover:text-red-900">🗑️</button>
                    </td>
                </tr>
            `).join('');
        }

        // Filter and Display Orders
        function filterAndDisplayOrders() {
            const statusFilter = document.getElementById('statusFilter').value;
            const tableFilter = document.getElementById('tableFilterOrders').value;

            let filtered = orders.filter(order => {
                const matchStatus = !statusFilter || order.status === statusFilter;
                const matchTable = !tableFilter || order.table_number === parseInt(tableFilter);
                return matchStatus && matchTable;
            });

            const container = document.getElementById('ordersContainer');

            if (filtered.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 py-8">لا توجد طلبات</p>';
                return;
            }

            container.innerHTML = filtered.map(order => `
                <div class="bg-white p-4 rounded-lg border-r-4 ${order.status === 'pending' ? 'border-orange-500' : order.status === 'preparing' ? 'border-blue-500' : order.status === 'ready' ? 'border-green-500' : 'border-purple-500'} hover:shadow-md cursor-pointer transition-all" onclick="openOrderModal('${order.id}')">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-lg font-bold text-gray-800">الطاولة #${order.table_number}</div>
                            <div class="text-sm text-gray-600">${order.customer_name} • ${new Date(order.created_at).toLocaleTimeString('ar-EG')}</div>
                        </div>
                        <div class="text-right">
                            <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>
                            <div class="text-xl font-bold text-orange-600 mt-2">${order.total_price} ج.م</div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Display Table Status
        function displayTableStatus() {
            const container = document.getElementById('tablesContainer');
            
            const tables = [];
            for (let i = 1; i <= 10; i++) {
                const tableOrders = orders.filter(o => o.table_number === i);
                const pending = tableOrders.filter(o => o.status === 'pending');
                const preparing = tableOrders.filter(o => o.status === 'preparing');
                const ready = tableOrders.filter(o => o.status === 'ready');
                const total = tableOrders.reduce((sum, o) => sum + o.total_price, 0);
                
                let statusClass = 'bg-green-100 border-green-300';
                let statusText = '✓';
                if (ready.length > 0) {
                    statusClass = 'bg-yellow-100 border-yellow-400';
                    statusText = '⚡';
                } else if (preparing.length > 0) {
                    statusClass = 'bg-blue-100 border-blue-400';
                    statusText = '⏳';
                } else if (pending.length > 0) {
                    statusClass = 'bg-orange-100 border-orange-400';
                    statusText = '🔔';
                }
                
                tables.push({ number: i, statusClass, statusText, total, orderCount: tableOrders.length });
            }
            
            container.innerHTML = tables.map(table => `
                <div onclick="filterTableOrders(${table.number})" class="cursor-pointer p-3 rounded-lg border-2 ${table.statusClass} hover:shadow-lg transition-all text-center">
                    <div class="text-2xl">${table.statusText}</div>
                    <div class="text-sm font-bold text-gray-800">#${table.number}</div>
                    ${table.orderCount > 0 ? `<div class="text-xs text-gray-600">${table.total} ج.م</div>` : ''}
                </div>
            `).join('');
        }

        // Display Recent Orders
        function displayRecentOrders() {
            const container = document.getElementById('recentOrdersContainer');
            const recent = orders.slice(0, 5);

            if (recent.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500">لا توجد طلبات</p>';
                return;
            }

            container.innerHTML = recent.map(order => `
                <div class="p-3 bg-gray-50 rounded border-r-4 border-orange-500 cursor-pointer hover:bg-gray-100" onclick="openOrderModal('${order.id}')">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="font-bold text-gray-800">طاولة #${order.table_number}</div>
                            <div class="text-xs text-gray-600">${order.customer_name}</div>
                        </div>
                        <div class="text-right">
                            <span class="status-badge status-${order.status}" style="padding: 0.25rem 0.75rem;">${getStatusText(order.status)}</span>
                            <div class="font-bold text-orange-600 text-sm">${order.total_price} ج.م</div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Update Dashboard Statistics
        function updateDashboard() {
            const total = orders.length;
            const pending = orders.filter(o => o.status === 'pending').length;
            const completed = orders.filter(o => o.status === 'completed').length;
            const daily = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
                .reduce((sum, o) => sum + o.total_price, 0);

            document.getElementById('totalOrders').textContent = total;
            document.getElementById('pendingCount').textContent = pending;
            document.getElementById('completedCount').textContent = completed;
            document.getElementById('dailyRevenue').textContent = daily + ' ج.م';
        }

        // Menu Item Functions
        function openAddMenuModal() {
            editingItemId = null;
            selectedImageBase64 = null;
            document.getElementById('menuModalTitle').textContent = 'إضافة صنف جديد';
            document.getElementById('itemName').value = '';
            document.getElementById('itemCategory').value = '';
            document.getElementById('itemPrice').value = '';
            document.getElementById('itemDescription').value = '';
            document.getElementById('itemImage').value = '';
            document.getElementById('itemImageUrl').value = '';
            document.getElementById('imagePreview').classList.add('hidden');
            document.getElementById('itemAvailable').checked = true;
            document.getElementById('menuModal').classList.add('active');
        }

        function editMenuItem(id) {
            const item = menuItems.find(i => i.id === id);
            if (!item) return;

            editingItemId = id;
            selectedImageBase64 = null;
            document.getElementById('menuModalTitle').textContent = 'تعديل الصنف';
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemCategory').value = item.category;
            document.getElementById('itemPrice').value = item.price;
            document.getElementById('itemDescription').value = item.description || '';
            document.getElementById('itemImage').value = '';
            document.getElementById('itemImageUrl').value = item.image_url || '';
            document.getElementById('itemAvailable').checked = item.available;
            
            if (item.image_url) {
                document.getElementById('imagePreview').src = item.image_url;
                document.getElementById('imagePreview').classList.remove('hidden');
            } else {
                document.getElementById('imagePreview').classList.add('hidden');
            }
            
            document.getElementById('menuModal').classList.add('active');
        }

        function closeMenuModal() {
            document.getElementById('menuModal').classList.remove('active');
        }

        function previewImage() {
            const fileInput = document.getElementById('itemImage');
            const preview = document.getElementById('imagePreview');
            const file = fileInput.files[0];

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    selectedImageBase64 = e.target.result;
                    preview.src = selectedImageBase64;
                    preview.classList.remove('hidden');
                    document.getElementById('itemImageUrl').value = '';
                };
                reader.readAsDataURL(file);
            }
        }

        async function saveMenuItem() {
            const name = document.getElementById('itemName').value.trim();
            const category = document.getElementById('itemCategory').value.trim();
            const price = document.getElementById('itemPrice').value;
            const description = document.getElementById('itemDescription').value.trim();
            const available = document.getElementById('itemAvailable').checked;
            const imageUrl = document.getElementById('itemImageUrl').value.trim();

            if (!name || !category || !price) {
                alert('يرجى ملء جميع الحقول المطلوبة');
                return;
            }

            const itemData = {
                name,
                category,
                price: parseFloat(price),
                description: description || null,
                available,
                image_url: selectedImageBase64 || imageUrl || null
            };

            try {
                let response;
                if (editingItemId) {
                    response = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?id=eq.${editingItemId}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(itemData)
                    });
                } else {
                    response = await fetch(`${SUPABASE_URL}/rest/v1/menu_items`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(itemData)
                    });
                }

                if (!response.ok) throw new Error('فشل في حفظ الصنف');

                closeMenuModal();
                await loadMenuItems();
                alert(editingItemId ? 'تم تعديل الصنف بنجاح' : 'تم إضافة الصنف بنجاح');
            } catch (error) {
                console.error('Error:', error);
                alert('حدث خطأ في حفظ الصنف');
            }
        }

        async function toggleAvailability(id, currentStatus) {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ available: !currentStatus })
                });

                if (!response.ok) throw new Error('فشل في تحديث الحالة');
                await loadMenuItems();
            } catch (error) {
                console.error('Error:', error);
                alert('حدث خطأ في تحديث الحالة');
            }
        }

        async function deleteMenuItem(id) {
            if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;

            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });

                if (!response.ok) throw new Error('فشل في حذف الصنف');
                await loadMenuItems();
                alert('تم حذف الصنف بنجاح');
            } catch (error) {
                console.error('Error:', error);
                alert('حدث خطأ في حذف الصنف');
            }
        }

        // Order Functions
        function filterTableOrders(tableNumber) {
            document.getElementById('tableFilterOrders').value = tableNumber;
            loadOrders();
        }

        function openOrderModal(orderId) {
            currentOrder = orders.find(o => o.id === orderId);
            if (!currentOrder) return;

            const items = JSON.parse(currentOrder.items);
            document.getElementById('modalOrderNumber').textContent = `الطلب #${currentOrder.order_number}`;
            document.getElementById('modalTableNumber').textContent = currentOrder.table_number;
            document.getElementById('modalCustomerName').textContent = currentOrder.customer_name;
            document.getElementById('modalOrderTime').textContent = new Date(currentOrder.created_at).toLocaleString('ar-EG');
            document.getElementById('modalOrderStatus').innerHTML = `<span class="status-badge status-${currentOrder.status}">${getStatusText(currentOrder.status)}</span>`;
            document.getElementById('modalOrderTotal').textContent = `${currentOrder.total_price} ج.م`;

            document.getElementById('modalOrderItems').innerHTML = items.map(item => `
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span class="font-medium">${item.name}</span>
                    <span class="text-sm text-gray-600">x${item.quantity}</span>
                    <span class="font-medium">${item.price * item.quantity} ج.م</span>
                </div>
            `).join('');

            const actions = [];
            if (currentOrder.status === 'pending') {
                actions.push(`<button onclick="updateOrderStatus('${currentOrder.id}', 'preparing')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold">بدء التحضير</button>`);
            } else if (currentOrder.status === 'preparing') {
                actions.push(`<button onclick="updateOrderStatus('${currentOrder.id}', 'ready')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold">جاهز للتسليم</button>`);
            } else if (currentOrder.status === 'ready') {
                actions.push(`<button onclick="updateOrderStatus('${currentOrder.id}', 'completed')" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-bold">مكتمل</button>`);
            }
            
            if (currentOrder.status !== 'completed') {
                actions.push(`<button onclick="deleteOrder('${currentOrder.id}')" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold">حذف</button>`);
            }

            document.getElementById('modalActions').innerHTML = actions.join('');
            document.getElementById('orderModal').classList.add('active');
        }

        function closeOrderModal() {
            document.getElementById('orderModal').classList.remove('active');
        }

        function getStatusText(status) {
            const statuses = {
                'pending': 'قيد الانتظار',
                'preparing': 'جاري التحضير',
                'ready': 'جاهز للتسليم',
                'completed': 'مكتمل'
            };
            return statuses[status] || status;
        }

        async function updateOrderStatus(orderId, newStatus) {
            try {
                const { error } = await supabase
                    .from('orders')
                    .update({ status: newStatus })
                    .eq('id', orderId);

                if (error) throw error;

                closeOrderModal();
                await loadOrders();
                alert('تم تحديث حالة الطلب بنجاح');
            } catch (error) {
                console.error('Error:', error);
                alert('حدث خطأ في تحديث الطلب');
            }
        }

        async function deleteOrder(orderId) {
            if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;

            try {
                const { error } = await supabase
                    .from('orders')
                    .delete()
                    .eq('id', orderId);

                if (error) throw error;

                closeOrderModal();
                await loadOrders();
                alert('تم حذف الطلب بنجاح');
            } catch (error) {
                console.error('Error:', error);
                alert('حدث خطأ في حذف الطلب');
            }
        }

        // Load Cashier Data
        // Load and display tables grid for table selection
        async function loadTablesGridForSelection() {
            try {
                const { data: allOrders, error } = await supabase
                    .from('orders')
                    .select('table_number, status')
                    .neq('status', 'completed');

                if (error) throw error;

                const usedTables = new Set(allOrders.map(o => o.table_number));
                const container = document.getElementById('tablesGridSelector');
                
                let tablesHtml = '';
                for (let i = 1; i <= 20; i++) {
                    const isUsed = usedTables.has(i);
                    const statusClass = isUsed ? 'bg-red-100 border-red-500 cursor-not-allowed opacity-60' : 'bg-green-100 border-green-500 cursor-pointer hover:bg-green-200 hover:shadow-md';
                    
                    tablesHtml += `
                        <button 
                            type="button"
                            class="table-selection-btn w-full aspect-square border-2 rounded-lg font-bold text-sm transition-all ${statusClass}"
                            onclick="${!isUsed ? `selectTable(${i})` : ''}"
                            ${isUsed ? 'disabled' : ''}
                            title="${isUsed ? 'مشغولة' : 'متاحة'}">
                            <div class="text-xl">${isUsed ? '🔴' : '🟢'}</div>
                            <div class="text-xs mt-1">${i}</div>
                        </button>
                    `;
                }
                
                container.innerHTML = tablesHtml;
            } catch (error) {
                console.error('Error:', error);
            }
        }

        // Select table for opening
        function selectTable(tableNum) {
            document.getElementById('newTableNumberInput').value = tableNum;
            document.getElementById('selectedTableInfo').textContent = `✅ تم اختيار الطاولة #${tableNum}`;
            document.getElementById('openTableBtn').disabled = false;
            
            // تحديث أزرار الاختيار
            const buttons = document.querySelectorAll('.table-selection-btn');
            buttons.forEach(btn => {
                btn.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
            });
            
            const selectedBtn = event.target.closest('.table-selection-btn');
            if (selectedBtn) {
                selectedBtn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
            }
        }

        async function loadCashierData() {
            try {
                const { data: allOrders, error } = await supabase
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // تحديث قائمة الطاولات المتاحة
                await loadTablesGridForSelection();

                const today = new Date().toDateString();
                const todayOrders = (allOrders || []).filter(o => new Date(o.created_at).toDateString() === today);
                
                // حساب المبيعات
                const totalSales = todayOrders.reduce((sum, o) => sum + o.total_price, 0);
                document.getElementById('todaySales').textContent = totalSales.toFixed(0) + ' ج.م';
                
                // عدد الفواتير
                document.getElementById('totalInvoices').textContent = todayOrders.length;
                
                // الطاولات النشطة
                const activeTables = new Set(todayOrders.map(o => o.table_number)).size;
                document.getElementById('activeTables').textContent = activeTables;
                
                // قيد الانتظار
                const pending = todayOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length;
                document.getElementById('cashierPendingCount').textContent = pending;

                // الفواتير المكتملة
                const completed = allOrders.filter(o => o.status === 'completed').slice(0, 15);
                document.getElementById('completedInvoicesCount').textContent = completed.length;
                
                document.getElementById('completedOrdersList').innerHTML = completed.length > 0 ? 
                    completed.map((o, idx) => {
                        const orderTime = new Date(o.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                        return `
                            <div class="invoice-card border-green-500 hover:shadow-lg">
                                <div class="flex items-start justify-between mb-3">
                                    <div>
                                        <div class="invoice-number">#${o.order_number}</div>
                                        <p class="text-sm text-gray-600 mt-1">العميل: <span class="font-semibold text-gray-800">${o.customer_name}</span></p>
                                        <p class="text-xs text-gray-500 mt-1">الطاولة: <span class="font-semibold">${o.table_number || '-'}</span></p>
                                    </div>
                                    <div class="text-right">
                                        <div class="invoice-amount">${o.total_price} ج.م</div>
                                        <div class="invoice-status mt-2">✓ مكتمل</div>
                                    </div>
                                </div>
                                <div class="border-t pt-2 mt-2 flex items-center justify-between text-xs text-gray-500">
                                    <span>⏰ ${orderTime}</span>
                                    <button onclick="printInvoice('${o.id}')" class="text-blue-600 hover:text-blue-800 font-semibold transition-colors">طباعة</button>
                                </div>
                            </div>
                        `;
                    }).join('')
                    : '<div class="text-center py-12"><svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class="text-gray-500 font-semibold">لم تكن هناك فواتير مكتملة</p></div>';

                // حالة الطاولات - فقط الطلبات النشطة (ليست مكتملة)
                const tableStatus = {};
                todayOrders.filter(o => o.status !== 'completed').forEach(o => {
                    if (!tableStatus[o.table_number]) {
                        tableStatus[o.table_number] = o.status;
                    }
                });

                const statusEmoji = {
                    'pending': '⏳ انتظار',
                    'preparing': '👨‍🍳 تحضير',
                    'ready': '✅ جاهز',
                    'completed': '🔒 مقفل'
                };

                let tableHtml = '';
                for (let i = 1; i <= 20; i++) {
                    const status = tableStatus[i];
                    let tableClass = 'table-empty';
                    let emoji = '🪑';
                    let label = `الطاولة ${i}`;
                    
                    if (status) {
                        tableClass = 'table-occupied';
                        emoji = statusEmoji[status].split(' ')[0];
                        label = statusEmoji[status].split(' ')[1] || `الطاولة ${i}`;
                    }
                    
                    tableHtml += `
                        <div class="table-card ${tableClass}" onclick="setTableNumberAndOpenBill(${i})" title="اضغط لعرض الفاتورة">
                            <div class="text-2xl">${emoji}</div>
                            <div class="text-sm mt-1">${i}</div>
                        </div>
                    `;
                }
                document.getElementById('cashierTableStatus').innerHTML = tableHtml;

            } catch (error) {
                console.error('Error:', error);
            }
        }

        // Open table bill modal
        async function openTableBillModal() {
            const tableNum = parseInt(document.getElementById('tableNumberInput').value);
            if (!tableNum || tableNum < 1 || tableNum > 10) {
                alert('أدخل رقم طاولة صحيح (1-10)');
                return;
            }
            setTableNumberAndOpenBill(tableNum);
        }

        // Set table number and open bill
        async function setTableNumberAndOpenBill(tableNum) {
            try {
                document.getElementById('tableNumberInput').value = tableNum;
                
                const { data: orders, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('table_number', tableNum)
                    .neq('status', 'completed')
                    .order('created_at', { ascending: false });

                if (error || !orders || orders.length === 0) {
                    alert('لا توجد طلبات لهذه الطاولة');
                    return;
                }

                // حساب الإجمالي والأصناف
                const totalAmount = orders.reduce((sum, o) => sum + o.total_price, 0);
                const allItems = [];
                const customerName = orders[0].customer_name;

                orders.forEach(order => {
                    JSON.parse(order.items).forEach(item => {
                        const exist = allItems.find(i => i.id === item.id);
                        if (exist) {
                            exist.quantity += item.quantity;
                        } else {
                            allItems.push({...item});
                        }
                    });
                });

                // تحديث البيانات
                document.getElementById('billTableNum').textContent = `الطاولة #${tableNum}`;
                document.getElementById('billCustomerName').textContent = customerName;
                document.getElementById('billTableNumSpan').textContent = tableNum;
                
                // إعادة تعيين الخصم
                document.getElementById('billDiscount').value = 0;
                window.currentBillTableNum = tableNum;
                window.currentBillSubtotal = totalAmount;

                // حفظ الأصناف الحالية
                window.currentTableItems = allItems;

                // عرض الأصناف مع أزرار التعديل والحذف
                document.getElementById('billItems').innerHTML = allItems.map((item, idx) => `
                    <tr class="border-b border-gray-200">
                        <td class="px-4 py-3">${item.name}</td>
                        <td class="px-4 py-3">${item.price} ج.م</td>
                        <td class="px-4 py-3">${item.quantity}</td>
                        <td class="px-4 py-3 font-bold">${(item.quantity * item.price).toFixed(0)} ج.م</td>
                        <td class="px-4 py-3 flex gap-2 justify-center">
                            <button onclick="editTableItem(${idx})" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-semibold transition-all">تعديل</button>
                            <button onclick="deleteTableItem(${idx})" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-semibold transition-all">حذف</button>
                        </td>
                    </tr>
                `).join('');

                // تحديث الإجمالي
                updateBillTotal();

                // حفظ البيانات للطباعة
                window.currentBillData = {
                    table: tableNum,
                    customer: customerName,
                    items: allItems,
                    total: totalAmount,
                    orders: orders
                };

                document.getElementById('tableBillModal').classList.add('active');
            } catch (error) {
                console.error('Error:', error);
                alert('حدث خطأ في تحميل الفاتورة');
            }
        }

        // Update Bill Total with Discount
        function updateBillTotal() {
            const discount = parseFloat(document.getElementById('billDiscount').value) || 0;
            const subtotal = window.currentBillSubtotal || 0;
            const discountAmount = (subtotal * discount) / 100;
            const total = subtotal - discountAmount;

            document.getElementById('billSubtotal').textContent = subtotal.toFixed(0) + ' ج.م';
            document.getElementById('billDiscountAmount').textContent = discountAmount.toFixed(0) + ' ج.م';
            document.getElementById('billTotal').textContent = total.toFixed(0) + ' ج.م';
            
            // حفظ الإجمالي النهائي
            window.currentBillTotal = total;
            
            // حفظ الخصم في قاعدة البيانات
            if (window.currentBillTableNum) {
                saveDiscountToDatabase(discount, total);
            }
        }

        // حفظ الخصم والإجمالي في قاعدة البيانات
        async function saveDiscountToDatabase(discount, finalTotal) {
            try {
                const tableNum = window.currentBillTableNum;
                if (!tableNum) return;

                // تحديث الطلبات بالخصم والإجمالي النهائي
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({
                        total_price: finalTotal,
                        notes: `خصم: ${discount}%`
                    })
                    .eq('table_number', tableNum)
                    .neq('status', 'completed')
                    .limit(1);

                if (updateError) {
                    console.error('خطأ في حفظ الخصم:', updateError);
                }
            } catch (error) {
                console.error('خطأ:', error);
            }
        }

        // Close bill modal
        function closeBillModal() {
            document.getElementById('tableBillModal').classList.remove('active');
        }

        // Print table bill
        function printTableBill() {
            if (!window.currentBillData) return;
            
            const data = window.currentBillData;
            const discount = parseFloat(document.getElementById('billDiscount').value) || 0;
            const subtotal = window.currentBillSubtotal || data.total;
            const discountAmount = (subtotal * discount) / 100;
            const total = subtotal - discountAmount;
            
            const printWindow = window.open('', '', 'height=500,width=700');
            
            let itemsHtml = data.items.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: center;">${item.price}</td>
                    <td style="text-align: center;"><strong>${(item.quantity * item.price).toFixed(0)}</strong></td>
                </tr>
            `).join('');

            let discountHtml = discount > 0 ? `
                <div style="margin: 10px 0; text-align: center;">
                    <p>الخصم: <strong>${discount}%</strong> = <strong style="color: red;">-${discountAmount.toFixed(0)} ج.م</strong></p>
                </div>
            ` : '';

            const content = `
                <!DOCTYPE html>
                <html dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: right; padding: 20px; }
                        h2 { text-align: center; margin-bottom: 10px; }
                        .info { margin-bottom: 15px; text-align: center; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                        th, td { padding: 8px; text-align: right; border-bottom: 1px solid #ddd; }
                        th { background-color: #f0f0f0; font-weight: bold; }
                        .total { text-align: center; font-size: 18px; font-weight: bold; margin-top: 20px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <h2>🧾 فاتورة الطاولة</h2>
                    <div class="info">
                        <p>الطاولة: <strong>${data.table}</strong></p>
                        <p>العميل: <strong>${data.customer}</strong></p>
                        <p>التاريخ: <strong>${new Date().toLocaleString('ar-EG')}</strong></p>
                    </div>
                    <table>
                        <tr>
                            <th>الصنف</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>الإجمالي</th>
                        </tr>
                        ${itemsHtml}
                    </table>
                    <div class="total">
                        <p>المجموع الفرعي: ${subtotal.toFixed(0)} ج.م</p>
                        ${discountHtml}
                        <p style="color: #ea580c; margin-top: 10px;">الإجمالي: ${total.toFixed(0)} ج.م</p>
                    </div>
                    <div class="footer">
                        <p>شكراً لك على الزيارة</p>
                        <p>-----</p>
                    </div>
                </body>
                </html>
            `;
            
            printWindow.document.write(content);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }

        // Copy bill link
        function copyBillLink() {
            if (!window.currentBillData) return;
            
            const data = window.currentBillData;
            const firstOrder = data.orders[0];
            const link = `${window.location.origin}${window.location.pathname.replace('dashboard.html', 'invoice.html')}?code=${firstOrder.order_number}`;
            
            navigator.clipboard.writeText(link).then(() => {
                alert('✅ تم نسخ الرابط!\nيمكن للعميل الآن متابعة فاتورته من هنا');
            }).catch(err => {
                alert('خطأ في نسخ الرابط');
            });
        }

        // Close table account (mark all orders as completed)
        async function closeTableAccount() {
            const tableNum = window.currentBillTableNum;
            if (!tableNum) {
                alert('لم يتم اختيار طاولة');
                return;
            }

            if (!confirm(`هل أنت متأكد من تقفيل حساب الطاولة ${tableNum}؟`)) return;

            try {
                // حفظ أي تعديلات معلقة على الأصناف
                if (window.currentTableItems && window.currentTableItems.length > 0) {
                    await saveTableItemsToDatabase();
                }

                // جلب الطلبات الحالية
                const { data: orders, error: fetchError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('table_number', tableNum)
                    .neq('status', 'completed');

                if (fetchError) throw fetchError;

                if (!orders || orders.length === 0) {
                    alert('لا توجد طلبات لتقفيل');
                    return;
                }

                // تحديث جميع الطلبات إلى completed مع التأكد من حفظ الأصناف
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ status: 'completed' })
                    .eq('table_number', tableNum)
                    .neq('status', 'completed');

                if (updateError) throw updateError;

                alert(`✅ تم تقفيل حساب الطاولة ${tableNum} بنجاح`);
                closeBillModal();
                document.getElementById('tableNumberInput').value = '';
                document.getElementById('billDiscount').value = 0;
                window.currentTableItems = [];
                window.currentBillTableNum = null;
                loadCashierData();
            } catch (error) {
                console.error('Error:', error);
                alert('خطأ: ' + error.message);
            }
        }

        // Print Invoice
        async function printInvoice(orderId) {
            try {
                const { data: order, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', orderId)
                    .single();

                if (error) throw error;

                const printWindow = window.open('', '_blank');
                const itemsHtml = (order.items || []).map(item => `
                    <tr>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">${item.name}</td>
                        <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${item.quantity}</td>
                        <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${item.price} ج.م</td>
                        <td style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd; font-weight: bold;">${(item.quantity * item.price).toFixed(2)} ج.م</td>
                    </tr>
                `).join('');

                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html lang="ar" dir="rtl">
                    <head>
                        <meta charset="UTF-8">
                        <title>فاتورة #${order.order_number}</title>
                        <style>
                            body { font-family: Arial, sans-serif; direction: rtl; }
                            .container { max-width: 400px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; }
                            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ea580c; padding-bottom: 10px; }
                            .header h1 { color: #ea580c; font-size: 24px; margin: 0; }
                            .header p { color: #666; margin: 5px 0; }
                            .info { margin: 15px 0; font-size: 14px; }
                            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                            table th { background: #f0f0f0; padding: 8px; font-weight: bold; text-align: right; border: 1px solid #ddd; }
                            .total { background: #f9fafb; padding: 15px; font-size: 18px; font-weight: bold; text-align: left; }
                            .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
                            @media print { body { margin: 0; } }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🧾 الفاتورة</h1>
                                <p>#${order.order_number}</p>
                            </div>
                            
                            <div class="info">
                                <p><strong>اسم العميل:</strong> ${order.customer_name}</p>
                                <p><strong>رقم الطاولة:</strong> ${order.table_number || '-'}</p>
                                <p><strong>التاريخ والوقت:</strong> ${new Date(order.created_at).toLocaleString('ar-EG')}</p>
                            </div>

                            <table>
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الكمية</th>
                                        <th>السعر</th>
                                        <th>الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>

                            <div class="total" style="border-top: 2px solid #ea580c; margin-top: 20px; padding-top: 15px;">
                                <div style="text-align: left;">الإجمالي: <span style="color: #ea580c;">${order.total_price} ج.م</span></div>
                            </div>

                            <div class="footer">
                                <p>شكراً لزيارتك</p>
                                <p>${new Date().toLocaleString('ar-EG')}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                setTimeout(() => printWindow.print(), 250);
            } catch (error) {
                console.error('Error:', error);
                alert('خطأ في طباعة الفاتورة');
            }
        }

        // Show Add Item Modal
        async function showAddItemModal() {
            if (!menuItems || menuItems.length === 0) {
                await loadMenuItems();
            }

            // تعبئة قائمة المنتجات
            const itemSelect = document.getElementById('itemSelect');
            itemSelect.innerHTML = '<option value="">-- اختر منتج --</option>';
            menuItems.filter(m => m.available).forEach(item => {
                itemSelect.innerHTML += `<option value="${item.id}" data-name="${item.name}" data-price="${item.price}">${item.name} (${item.price} ج.م)</option>`;
            });

            document.getElementById('addItemTitle').textContent = 'إضافة منتج';
            document.getElementById('itemQuantity').value = '1';
            window.editingItemIndex = null;
            document.getElementById('addItemModal').classList.add('active');
        }

        // Handle Item Select Change
        document.addEventListener('change', function(e) {
            if (e.target.id === 'itemSelect' && e.target.value) {
                const option = e.target.selectedOptions[0];
                document.getElementById('itemPrice').value = option.dataset.price;
            }
        });

        // Save Table Item (Add or Edit)
        async function saveTableItem() {
            const itemSelect = document.getElementById('itemSelect');
            const quantity = parseInt(document.getElementById('itemQuantity').value);

            if (!itemSelect.value) {
                alert('اختر منتج');
                return;
            }

            if (quantity < 1) {
                alert('الكمية يجب أن تكون أكبر من 0');
                return;
            }

            const option = itemSelect.selectedOptions[0];
            const newItem = {
                id: itemSelect.value,
                name: option.dataset.name,
                price: parseFloat(option.dataset.price),
                quantity: quantity
            };

            if (window.editingItemIndex !== null && window.editingItemIndex !== undefined) {
                // تعديل منتج موجود
                window.currentTableItems[window.editingItemIndex] = newItem;
            } else {
                // إضافة منتج جديد
                window.currentTableItems.push(newItem);
            }

            // حفظ الأصناف في قاعدة البيانات فوراً
            await saveTableItemsToDatabase();

            // تحديث شاشة الفاتورة
            updateBillItems();
            closeAddItemModal();
        }

        // حفظ الأصناف في قاعدة البيانات
        async function saveTableItemsToDatabase() {
            try {
                const tableNum = window.currentBillTableNum;
                if (!tableNum) return;

                // حساب الإجمالي الجديد
                const newTotal = window.currentTableItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

                // تحديث الطلب الحالي
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({
                        items: JSON.stringify(window.currentTableItems),
                        total_price: newTotal
                    })
                    .eq('table_number', tableNum)
                    .neq('status', 'completed')
                    .limit(1);

                if (updateError) {
                    console.error('خطأ في حفظ الأصناف:', updateError);
                }
            } catch (error) {
                console.error('خطأ:', error);
            }
        }

        // Edit Table Item
        function editTableItem(index) {
            const item = window.currentTableItems[index];
            window.editingItemIndex = index;

            // تعبئة النموذج
            const itemSelect = document.getElementById('itemSelect');
            itemSelect.value = item.id;
            document.getElementById('itemPrice').value = item.price;
            document.getElementById('itemQuantity').value = item.quantity;

            document.getElementById('addItemTitle').textContent = 'تعديل منتج';
            document.getElementById('addItemModal').classList.add('active');
        }

        // Delete Table Item
        async function deleteTableItem(index) {
            if (confirm('هل تريد حذف هذا المنتج؟')) {
                window.currentTableItems.splice(index, 1);
                
                // حفظ الأصناف المحدثة في قاعدة البيانات
                await saveTableItemsToDatabase();
                
                updateBillItems();
            }
        }

        // Update Bill Items Display
        function updateBillItems() {
            // إعادة عرض الأصناف
            document.getElementById('billItems').innerHTML = window.currentTableItems.map((item, idx) => `
                <tr class="border-b border-gray-200">
                    <td class="px-4 py-3">${item.name}</td>
                    <td class="px-4 py-3">${item.price} ج.م</td>
                    <td class="px-4 py-3">${item.quantity}</td>
                    <td class="px-4 py-3 font-bold">${(item.quantity * item.price).toFixed(0)} ج.م</td>
                    <td class="px-4 py-3 flex gap-2 justify-center">
                        <button onclick="editTableItem(${idx})" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-semibold transition-all">تعديل</button>
                        <button onclick="deleteTableItem(${idx})" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-semibold transition-all">حذف</button>
                    </td>
                </tr>
            `).join('');

            // إعادة حساب الإجمالي
            const newTotal = window.currentTableItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            window.currentBillSubtotal = newTotal;
            updateBillTotal();
        }

        // Close Add Item Modal
        function closeAddItemModal() {
            document.getElementById('addItemModal').classList.remove('active');
            document.getElementById('itemSelect').value = '';
            document.getElementById('itemPrice').value = '';
            document.getElementById('itemQuantity').value = '1';
            window.editingItemIndex = null;
        }

        // Open New Table
        async function openNewTable() {
            const tableNumber = parseInt(document.getElementById('newTableNumberInput').value);
            const customerName = document.getElementById('customerNameInput').value || 'عميل جديد';

            if (!tableNumber || tableNumber < 1 || tableNumber > 20) {
                alert('أدخل رقم طاولة صحيح (1-20)');
                return;
            }

            try {
                // التحقق من أن الطاولة ليست مستخدمة بالفعل
                const { data: existingOrders, error: checkError } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('table_number', tableNumber)
                    .neq('status', 'completed')
                    .limit(1);

                if (checkError) throw checkError;

                if (existingOrders && existingOrders.length > 0) {
                    alert('هذه الطاولة مستخدمة بالفعل! اختر طاولة أخرى');
                    return;
                }

                // إنشاء رقم طلب فريد
                const orderNumber = `T${tableNumber}-${Date.now()}`;

                // إنشاء طلب جديد فارغ لفتح الطاولة
                const { error: insertError } = await supabase
                    .from('orders')
                    .insert({
                        table_number: tableNumber,
                        customer_name: customerName,
                        order_number: orderNumber,
                        items: JSON.stringify([]),
                        total_price: 0,
                        status: 'pending',
                        notes: 'طاولة جديدة مفتوحة'
                    });

                if (insertError) throw insertError;

                alert(`✅ تم فتح الطاولة ${tableNumber} باسم "${customerName}" بنجاح`);
                document.getElementById('newTableNumberInput').value = '';
                document.getElementById('customerNameInput').value = '';
                loadCashierData();
            } catch (error) {
                console.error('Error:', error);
                alert('خطأ في فتح الطاولة: ' + error.message);
            }
        }

        // Save login state
        document.addEventListener('click', function(e) {
            if (e.target.textContent === 'دخول' && isLoggedIn) {
                localStorage.setItem('dashboardLogin', 'true');
            }
        });
