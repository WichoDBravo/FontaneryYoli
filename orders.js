// ============================================
// ORDERS.JS - SISTEMA DE GESTIÓN DE PEDIDOS
// ============================================

import {
    db,
    collection,
    doc,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    auth,
    onAuthStateChanged
} from './firebase-config.js';

// ============================================
// REFERENCIAS
// ============================================

const pedidosRef = collection(db, "pedidos");
const productosRef = collection(db, "productos");

// ============================================
// VARIABLES GLOBALES
// ============================================

let pedidosGlobal = [];
let productosGlobal = [];
let orderProducts = [];
let pedidoEnEdicion = null;

// ============================================
// DOM ELEMENTS
// ============================================

const orderFormContainer = document.getElementById('orderFormContainer');
const btnToggleOrders = document.getElementById('btnToggleOrders');
const orderForm = document.getElementById('orderForm');
const orderClient = document.getElementById('orderClient');
const orderPhone = document.getElementById('orderPhone');
const orderProductSelect = document.getElementById('orderProductSelect');
const orderQuantity = document.getElementById('orderQuantity');
const btnAddProductOrder = document.getElementById('btnAddProductOrder');
const orderProductsContainer = document.getElementById('orderProductsContainer');
const orderTotalAmount = document.getElementById('orderTotalAmount');
const btnSaveOrder = document.getElementById('btnSaveOrder');
const btnCancelOrder = document.getElementById('btnCancelOrder');
const ordersGrid = document.getElementById('ordersGrid');
const searchOrder = document.getElementById('searchOrder');
const ordersCount = document.getElementById('ordersCount');
const emptyOrdersState = document.getElementById('emptyOrdersState');

// ============================================
// FUNCIÓN: CARGAR PRODUCTOS PARA SELECT
// ============================================

async function cargarProductosSelect() {
    try {
        const snapshot = await getDocs(productosRef);
        productosGlobal = [];

        snapshot.forEach(doc => {
            productosGlobal.push({
                id: doc.id,
                ...doc.data()
            });
        });

        orderProductSelect.innerHTML = '<option value="">Seleccionar producto...</option>';
        productosGlobal.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.nombre} - Stock: ${p.stock || 0} - $${p.precio?.toFixed(2) || '0.00'}`;
            option.dataset.precio = p.precio || 0;
            option.dataset.stock = p.stock || 0;
            orderProductSelect.appendChild(option);
        });

        return productosGlobal;
    } catch (error) {
        console.error("Error al cargar productos:", error);
        return [];
    }
}

// ============================================
// FUNCIÓN: CARGAR PRODUCTOS GLOBALES
// ============================================

async function cargarProductosGlobal() {
    try {
        const snapshot = await getDocs(productosRef);
        productosGlobal = [];
        snapshot.forEach(doc => {
            productosGlobal.push({
                id: doc.id,
                ...doc.data()
            });
        });
        await cargarProductosSelect();
        return productosGlobal;
    } catch (error) {
        console.error("Error al recargar productos:", error);
        return [];
    }
}

// ============================================
// FUNCIÓN: REFRESCAR VISTA DE PRODUCTOS
// ============================================

async function refrescarProductosVista() {
    try {
        const snapshot = await getDocs(productosRef);
        const productosActualizados = [];
        
        snapshot.forEach(doc => {
            productosActualizados.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        if (window.productosGlobal !== undefined) {
            window.productosGlobal = productosActualizados;
        }
        
        const event = new CustomEvent('productosActualizados', {
            detail: { productos: productosActualizados }
        });
        document.dispatchEvent(event);
        
        console.log("✅ Productos refrescados en la interfaz");
        return productosActualizados;
    } catch (error) {
        console.error("Error al refrescar productos:", error);
        return [];
    }
}

// ============================================
// FUNCIÓN: AGREGAR PRODUCTO AL PEDIDO
// ============================================

function agregarProductoAlPedido() {
    const selectedOption = orderProductSelect.options[orderProductSelect.selectedIndex];
    const productoId = orderProductSelect.value;
    const cantidad = parseInt(orderQuantity.value) || 1;

    if (!productoId) {
        mostrarNotificacion("Selecciona un producto", "warning");
        return;
    }

    if (cantidad < 1) {
        mostrarNotificacion("La cantidad debe ser mayor a 0", "warning");
        return;
    }

    const producto = productosGlobal.find(p => p.id === productoId);
    if (!producto) {
        mostrarNotificacion("Producto no encontrado", "error");
        return;
    }

    const stockDisponible = producto.stock || 0;
    if (cantidad > stockDisponible) {
        mostrarNotificacion(`Stock insuficiente. Disponible: ${stockDisponible}`, "error");
        return;
    }

    const existente = orderProducts.find(item => item.id === productoId);
    if (existente) {
        const nuevaCantidad = existente.cantidad + cantidad;
        if (nuevaCantidad > stockDisponible) {
            mostrarNotificacion(`Stock insuficiente. Disponible: ${stockDisponible}`, "error");
            return;
        }
        existente.cantidad = nuevaCantidad;
    } else {
        orderProducts.push({
            id: productoId,
            nombre: producto.nombre,
            precio: producto.precio || 0,
            cantidad: cantidad
        });
    }

    renderizarProductosPedido();
    orderProductSelect.value = '';
    orderQuantity.value = '1';
    mostrarNotificacion(`✅ ${producto.nombre} agregado al pedido`, "success");
}

// ============================================
// FUNCIÓN: RENDERIZAR PRODUCTOS DEL PEDIDO
// ============================================

function renderizarProductosPedido() {
    if (orderProducts.length === 0) {
        orderProductsContainer.innerHTML = `<p class="empty-products-msg">No hay productos agregados</p>`;
        orderTotalAmount.textContent = '$0.00';
        return;
    }

    let total = 0;
    let html = '';

    orderProducts.forEach((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;

        html += `
            <div class="order-item">
                <div class="order-item-info">
                    <span class="item-name">${item.nombre}</span>
                    <span class="item-qty">× ${item.cantidad}</span>
                    <span class="item-price">$${subtotal.toFixed(2)}</span>
                </div>
                <button class="btn-remove-item" onclick="eliminarProductoPedido(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });

    orderProductsContainer.innerHTML = html;
    orderTotalAmount.textContent = `$${total.toFixed(2)}`;
}

// ============================================
// FUNCIÓN: ELIMINAR PRODUCTO DEL PEDIDO
// ============================================

window.eliminarProductoPedido = (index) => {
    const producto = orderProducts[index];
    if (producto) {
        orderProducts.splice(index, 1);
        renderizarProductosPedido();
        mostrarNotificacion(`🗑️ Producto eliminado del pedido`, "info");
    }
};

// ============================================
// FUNCIÓN: GUARDAR PEDIDO
// ============================================

async function guardarPedido(e) {
    e.preventDefault();

    const cliente = orderClient.value.trim();
    const telefono = orderPhone.value.trim();

    if (!cliente) {
        mostrarNotificacion("El nombre del cliente es obligatorio", "error");
        orderClient.focus();
        return;
    }

    if (!telefono) {
        mostrarNotificacion("El teléfono es obligatorio", "error");
        orderPhone.focus();
        return;
    }

    if (orderProducts.length === 0) {
        mostrarNotificacion("Agrega al menos un producto al pedido", "warning");
        return;
    }

    for (const item of orderProducts) {
        const productoRef = doc(db, "productos", item.id);
        const productoSnap = await getDoc(productoRef);
        if (productoSnap.exists()) {
            const stockActual = productoSnap.data().stock || 0;
            if (item.cantidad > stockActual) {
                mostrarNotificacion(`Stock insuficiente para "${item.nombre}". Disponible: ${stockActual}`, "error");
                return;
            }
        }
    }

    const total = orderProducts.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    const pedidoData = {
        cliente: cliente,
        telefono: telefono,
        productos: orderProducts.map(p => ({
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            cantidad: p.cantidad,
            subtotal: p.precio * p.cantidad
        })),
        total: total,
        estado: "pendiente",
        fecha: serverTimestamp()
    };

    try {
        for (const item of orderProducts) {
            const productoRef = doc(db, "productos", item.id);
            const productoSnap = await getDoc(productoRef);
            if (productoSnap.exists()) {
                const stockActual = productoSnap.data().stock || 0;
                await updateDoc(productoRef, {
                    stock: stockActual - item.cantidad
                });
            }
        }

        const docRef = await addDoc(pedidosRef, pedidoData);

        mostrarNotificacion(`✅ Pedido #${docRef.id.slice(0,8)} creado - Stock actualizado`, "success");
        
        resetearFormularioPedido();
        cerrarFormularioPedido();
        
        await cargarPedidos();
        await cargarProductosSelect();
        await cargarProductosGlobal();
        await refrescarProductosVista();

    } catch (error) {
        console.error("Error al guardar pedido:", error);
        mostrarNotificacion("Error al guardar pedido", "error");
    }
}

// ============================================
// FUNCIÓN: CARGAR PEDIDOS
// ============================================

async function cargarPedidos() {
    try {
        const q = query(pedidosRef, orderBy("fecha", "desc"));
        const snapshot = await getDocs(q);

        pedidosGlobal = [];

        snapshot.forEach(doc => {
            pedidosGlobal.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderizarPedidos(pedidosGlobal);

    } catch (error) {
        console.error("Error al cargar pedidos:", error);
    }
}

// ============================================
// FUNCIÓN: RENDERIZAR PEDIDOS
// ============================================

function renderizarPedidos(pedidos) {
    const terminoBusqueda = searchOrder.value.toLowerCase().trim();

    let pedidosFiltrados = pedidos;
    if (terminoBusqueda) {
        pedidosFiltrados = pedidos.filter(p =>
            p.cliente?.toLowerCase().includes(terminoBusqueda) ||
            p.telefono?.includes(terminoBusqueda)
        );
    }

    ordersCount.textContent = `${pedidosFiltrados.length} pedidos`;

    if (pedidosFiltrados.length === 0) {
        ordersGrid.innerHTML = '';
        emptyOrdersState.style.display = 'flex';
        return;
    }

    emptyOrdersState.style.display = 'none';

    ordersGrid.innerHTML = pedidosFiltrados.map(pedido => `
        <div class="order-card" data-id="${pedido.id}">
            <div class="order-card-header">
                <div class="order-card-client">
                    <span class="client-name">${pedido.cliente || 'Sin nombre'}</span>
                    <span class="client-phone"><i class="fas fa-phone"></i> ${pedido.telefono || 'Sin teléfono'}</span>
                </div>
                <span class="order-card-status ${pedido.estado || 'pendiente'}">
                    ${pedido.estado === 'pendiente' ? '⏳ Pendiente' : 
                      pedido.estado === 'cancelado' ? '❌ Cancelado' : 
                      pedido.estado === 'completado' ? '✅ Completado' : '📦 Pendiente'}
                </span>
            </div>
            <div class="order-card-products">
                ${pedido.productos?.map(p => `
                    <div class="product-item">
                        <span>${p.nombre}</span>
                        <span>${p.cantidad} × $${p.precio?.toFixed(2)} = $${p.subtotal?.toFixed(2)}</span>
                    </div>
                `).join('') || '<span style="color:#999;">Sin productos</span>'}
            </div>
            <div class="order-card-total">
                <span class="total-label">Total</span>
                <span class="total-amount">$${pedido.total?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="order-card-actions">
                ${pedido.estado !== 'cancelado' ? `
                    <button class="btn-cancel-order" onclick="cancelarPedido('${pedido.id}')">
                        <i class="fas fa-ban"></i> Cancelar
                    </button>
                ` : `
                    <button class="btn-view-order" disabled style="opacity:0.5;cursor:not-allowed;">
                        <i class="fas fa-ban"></i> Cancelado
                    </button>
                `}
                <button class="btn-delete-order" onclick="eliminarPedido('${pedido.id}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// FUNCIÓN: CANCELAR PEDIDO
// ============================================

window.cancelarPedido = async (pedidoId) => {
    const pedido = pedidosGlobal.find(p => p.id === pedidoId);
    if (!pedido) {
        mostrarNotificacion("Pedido no encontrado", "error");
        return;
    }

    if (pedido.estado === 'cancelado') {
        mostrarNotificacion("Este pedido ya está cancelado", "warning");
        return;
    }

    if (!confirm(`¿Cancelar el pedido de "${pedido.cliente}"? Se devolverá el stock.`)) return;

    try {
        for (const item of pedido.productos || []) {
            const productoRef = doc(db, "productos", item.id);
            const productoSnap = await getDoc(productoRef);
            if (productoSnap.exists()) {
                const stockActual = productoSnap.data().stock || 0;
                await updateDoc(productoRef, {
                    stock: stockActual + item.cantidad
                });
            }
        }

        const pedidoRef = doc(db, "pedidos", pedidoId);
        await updateDoc(pedidoRef, { estado: "cancelado" });

        mostrarNotificacion(`✅ Pedido cancelado - Stock devuelto`, "success");
        
        await cargarPedidos();
        await cargarProductosSelect();
        await cargarProductosGlobal();
        await refrescarProductosVista();

    } catch (error) {
        console.error("Error al cancelar pedido:", error);
        mostrarNotificacion("Error al cancelar pedido", "error");
    }
};

// ============================================
// FUNCIÓN: ELIMINAR PEDIDO
// ============================================

window.eliminarPedido = async (pedidoId) => {
    const pedido = pedidosGlobal.find(p => p.id === pedidoId);
    if (!pedido) {
        mostrarNotificacion("Pedido no encontrado", "error");
        return;
    }

    if (!confirm(`⚠️ ¿Eliminar permanentemente el pedido de "${pedido.cliente}"? Esta acción no se puede deshacer.`)) return;

    try {
        if (pedido.estado !== 'cancelado' && pedido.estado !== 'completado') {
            for (const item of pedido.productos || []) {
                const productoRef = doc(db, "productos", item.id);
                const productoSnap = await getDoc(productoRef);
                if (productoSnap.exists()) {
                    const stockActual = productoSnap.data().stock || 0;
                    await updateDoc(productoRef, {
                        stock: stockActual + item.cantidad
                    });
                }
            }
        }

        const pedidoRef = doc(db, "pedidos", pedidoId);
        await deleteDoc(pedidoRef);

        mostrarNotificacion(`🗑️ Pedido eliminado permanentemente`, "success");
        
        await cargarPedidos();
        await cargarProductosSelect();
        await cargarProductosGlobal();
        await refrescarProductosVista();

    } catch (error) {
        console.error("Error al eliminar pedido:", error);
        mostrarNotificacion("Error al eliminar pedido", "error");
    }
};

// ============================================
// FUNCIÓN: RESETEAR FORMULARIO DE PEDIDO
// ============================================

function resetearFormularioPedido() {
    orderForm.reset();
    orderProducts = [];
    renderizarProductosPedido();
}

// ============================================
// FUNCIÓN: ABRIR/CERRAR FORMULARIO DE PEDIDO
// ============================================

function abrirFormularioPedido() {
    orderFormContainer.style.display = 'block';
    btnToggleOrders.textContent = '✕ Cerrar Pedido';
    btnToggleOrders.classList.add('active');
    document.querySelector('.orders-section').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function cerrarFormularioPedido() {
    orderFormContainer.style.display = 'none';
    btnToggleOrders.textContent = '➕ Nuevo Pedido';
    btnToggleOrders.classList.remove('active');
    resetearFormularioPedido();
}

btnToggleOrders.addEventListener('click', () => {
    if (orderFormContainer.style.display === 'none') {
        abrirFormularioPedido();
    } else {
        cerrarFormularioPedido();
    }
});

btnCancelOrder.addEventListener('click', cerrarFormularioPedido);

// ============================================
// FUNCIÓN: BUSCAR PEDIDOS
// ============================================

searchOrder.addEventListener('input', () => {
    renderizarPedidos(pedidosGlobal);
});

// ============================================
// EVENTOS DEL FORMULARIO
// ============================================

orderForm.addEventListener('submit', guardarPedido);
btnAddProductOrder.addEventListener('click', agregarProductoAlPedido);

orderQuantity.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        agregarProductoAlPedido();
    }
});

// ============================================
// FUNCIÓN: MOSTRAR NOTIFICACIÓN
// ============================================

function mostrarNotificacion(mensaje, tipo = "success") {
    const notificaciones = document.querySelectorAll('.toast-notification');
    notificaciones.forEach(n => n.remove());

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${tipo}`;

    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };

    toast.innerHTML = `
        <i class="fas ${iconos[tipo] || iconos.info}"></i>
        <span>${mensaje}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);

    const timeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(timeout);
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
}

// ============================================
// INICIALIZACIÓN
// ============================================

async function initOrders() {
    await cargarProductosSelect();
    await cargarPedidos();
    console.log("📦 Sistema de pedidos inicializado");
}

export { initOrders };

// ============================================
// AUTO-INICIALIZACIÓN
// ============================================

// Verificar autenticación y cargar pedidos automáticamente
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("📦 Inicializando pedidos automáticamente...");
        cargarProductosSelect();
        cargarPedidos();
    }
});