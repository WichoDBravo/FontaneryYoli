// ============================================
// IMPORTACIONES
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
    onAuthStateChanged,
    signOut
} from './firebase-config.js';

// Importación de los pedidos
import { initOrders } from './orders.js';

// ============================================
// REFERENCIAS A LA BASE DE DATOS
// ============================================

const productosRef = collection(db, "productos");

// ============================================
// VARIABLES GLOBALES (SOLO UNA VEZ)
// ============================================

let productosGlobal = [];
window.productosGlobal = productosGlobal; // Para exportar al scope global
let productoEnEdicion = null;

// ============================================
// DOM ELEMENTS
// ============================================

const form = document.getElementById('productForm');
const productName = document.getElementById('productName');
const productCode = document.getElementById('productCode');
const productPrice = document.getElementById('productPrice');
const productStock = document.getElementById('productStock');
const productImage = document.getElementById('productImage');
const productCategory = document.getElementById('productCategory');
const productDescription = document.getElementById('productDescription');
const btnSubmit = document.getElementById('btnSubmit');
const btnText = document.getElementById('btnText');
const btnCancelarEdit = document.getElementById('btnCancelarEdit');
const formTitle = document.getElementById('formTitle');
const emptyState = document.getElementById('emptyState');
const searchProduct = document.getElementById('searchProduct');
const productsCount = document.getElementById('productsCount');
const totalProductos = document.getElementById('totalProductos');
const productosStock = document.getElementById('productosStock');
const bajoStock = document.getElementById('bajoStock');
const sinStock = document.getElementById('sinStock');
const userName = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');

// Image preview
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const btnRemoveImage = document.getElementById('btnRemoveImage');

// ============================================
// FUNCIÓN: CARGAR PRODUCTOS DESDE FIRESTORE
// ============================================

async function cargarProductos() {
    try {
        const q = query(productosRef, orderBy("nombre"));
        const snapshot = await getDocs(q);

        productosGlobal = [];

        snapshot.forEach(doc => {
            productosGlobal.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // ✅ Actualizar window.productosGlobal
        window.productosGlobal = productosGlobal;

        renderizarProductos(productosGlobal);
        actualizarEstadisticas(productosGlobal);
    } catch (error) {
        console.error("Error al cargar:", error);
        mostrarNotificacion("Error al cargar productos", "error");
    }
}

// ============================================
// FUNCIÓN: RECARGAR PRODUCTOS GLOBALES
// ============================================

async function recargarProductosGlobal() {
    try {
        const snapshot = await getDocs(productosRef);
        productosGlobal = [];
        snapshot.forEach(doc => {
            productosGlobal.push({
                id: doc.id,
                ...doc.data()
            });
        });
        window.productosGlobal = productosGlobal;
        return productosGlobal;
    } catch (error) {
        console.error("Error al recargar productos:", error);
        return [];
    }
}

// ============================================
// FUNCIÓN: RENDERIZAR PRODUCTOS EN TARJETAS
// ============================================

function renderizarProductos(productos) {
    const terminoBusqueda = searchProduct.value.toLowerCase().trim();

    let productosFiltrados = productos;
    if (terminoBusqueda) {
        productosFiltrados = productos.filter(p =>
            p.nombre?.toLowerCase().includes(terminoBusqueda) ||
            p.codigo?.toLowerCase().includes(terminoBusqueda)
        );
    }

    productsCount.textContent = `${productosFiltrados.length} productos`;

    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (productosFiltrados.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    grid.innerHTML = productosFiltrados.map(producto => `
        <div class="product-card">
            <div class="product-card-image">
                ${producto.imagenURL ? 
                    `<img src="${producto.imagenURL}" alt="${producto.nombre}" loading="lazy">` :
                    `<div class="no-image"><i class="fas fa-image"></i></div>`
                }
            </div>
            <div class="product-card-body">
                <div class="product-name">${producto.nombre || 'Sin nombre'}</div>
                <div class="product-code">${producto.codigo || 'N/A'}</div>
                <div class="product-category">${obtenerCategoriaNombre(producto.categoria)}</div>
                <div class="product-price">$${producto.precio?.toFixed(2) || '0.00'}</div>
                <div class="product-stock ${obtenerClaseStock(producto.stock)}">
                    ${producto.stock > 0 ? `📦 ${producto.stock} unidades` : '❌ Agotado'}
                </div>
                ${producto.descripcion ? `
                    <div class="product-description">${producto.descripcion}</div>
                ` : ''}
                <div class="product-card-actions">
                    <button class="btn-edit-card" onclick="editarProducto('${producto.id}')">
                        <i class="fas fa-edit"></i>
                        <span>Editar</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// FUNCIÓN: ACTUALIZAR ESTADÍSTICAS
// ============================================

function actualizarEstadisticas(productos) {
    const total = productos.length;
    const enStock = productos.filter(p => p.stock > 0).length;
    const bajo = productos.filter(p => p.stock > 0 && p.stock < 10).length;
    const sin = productos.filter(p => p.stock === 0 || p.stock === undefined).length;

    totalProductos.textContent = total;
    productosStock.textContent = enStock;
    bajoStock.textContent = bajo;
    sinStock.textContent = sin;
}

// ============================================
// FUNCIÓN: OBTENER NOMBRE DE CATEGORÍA
// ============================================

function obtenerCategoriaNombre(categoria) {
    const categorias = {
        'baño': '🚽 Baños',
        'cocina': '🍳 Cocina',
        'otros': '📦 Otros'
    };
    return categorias[categoria] || '📦 Sin Categoría';
}

// ============================================
// FUNCIÓN: OBTENER CLASE DE STOCK
// ============================================

function obtenerClaseStock(stock) {
    if (stock === 0) return 'stock-zero';
    if (stock < 10) return 'stock-low';
    return 'stock-normal';
}

// ============================================
// FUNCIÓN: GUARDAR PRODUCTO (CREAR/ACTUALIZAR)
// ============================================

async function guardarProducto(e) {
    e.preventDefault();

    const nombre = productName.value.trim();
    const codigo = productCode.value.trim();
    const precio = parseFloat(productPrice.value);
    const stock = parseInt(productStock.value);
    const imagenURL = productImage.value.trim();
    const categoria = productCategory.value;
    const descripcion = productDescription.value.trim();

    if (!nombre) {
        mostrarNotificacion("El nombre del producto es obligatorio", "error");
        productName.focus();
        return;
    }

    if (!codigo) {
        mostrarNotificacion("El código del producto es obligatorio", "error");
        productCode.focus();
        return;
    }

    if (isNaN(precio) || precio < 0) {
        mostrarNotificacion("Ingresa un precio válido", "error");
        productPrice.focus();
        return;
    }

    if (isNaN(stock) || stock < 0) {
        mostrarNotificacion("Ingresa un stock válido", "error");
        productStock.focus();
        return;
    }

    if (!productoEnEdicion) {
        const codigoExistente = productosGlobal.find(p => p.codigo === codigo);
        if (codigoExistente) {
            mostrarNotificacion(`El código "${codigo}" ya está en uso`, "error");
            productCode.focus();
            return;
        }
    }

    const productoData = {
        nombre,
        codigo,
        precio,
        stock,
        imagenURL: imagenURL || "",
        categoria: categoria || "",
        descripcion: descripcion || "",
        fechaActualizacion: serverTimestamp()
    };

    try {
        if (productoEnEdicion) {
            const productoRef = doc(db, "productos", productoEnEdicion);
            await updateDoc(productoRef, productoData);
            mostrarNotificacion("✅ Producto actualizado correctamente", "success");
        } else {
            await addDoc(productosRef, {
                ...productoData,
                fechaCreacion: serverTimestamp()
            });
            mostrarNotificacion("✅ Producto agregado correctamente", "success");
        }

        resetearFormulario();
        cancelarEdicion();
        await cargarProductos();

    } catch (error) {
        console.error("Error al guardar producto:", error);
        mostrarNotificacion("Error al guardar producto", "error");
    }
}

// ============================================
// FUNCIÓN: EDITAR PRODUCTO
// ============================================

window.editarProducto = async (id) => {
    try {
        const productoRef = doc(db, "productos", id);
        const snapshot = await getDoc(productoRef);

        if (!snapshot.exists()) {
            mostrarNotificacion("Producto no encontrado", "error");
            return;
        }

        const data = snapshot.data();
        productoEnEdicion = id;

        productName.value = data.nombre || '';
        productCode.value = data.codigo || '';
        productPrice.value = data.precio || '';
        productStock.value = data.stock || '';
        productImage.value = data.imagenURL || '';
        productCategory.value = data.categoria || '';
        productDescription.value = data.descripcion || '';

        if (data.imagenURL) {
            mostrarVistaPrevia(data.imagenURL);
        }

        formTitle.textContent = '✏️ Editar Producto';
        btnText.textContent = 'Actualizar Producto';
        btnSubmit.classList.add('editing');
        btnCancelarEdit.style.display = 'inline-flex';

        document.querySelector('.form-section').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        mostrarNotificacion(`✏️ Editando: ${data.nombre}`, "info");

    } catch (error) {
        console.error("Error al cargar producto:", error);
        mostrarNotificacion("Error al cargar el producto", "error");
    }
};

// ============================================
// FUNCIÓN: CANCELAR EDICIÓN
// ============================================

function cancelarEdicion() {
    productoEnEdicion = null;
    formTitle.textContent = 'Agregar Nuevo Producto';
    btnText.textContent = 'Guardar Producto';
    btnSubmit.classList.remove('editing');
    btnCancelarEdit.style.display = 'none';
}

// ============================================
// FUNCIÓN: RESETEAR FORMULARIO
// ============================================

function resetearFormulario() {
    form.reset();
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '#';
}

// ============================================
// FUNCIÓN: MOSTRAR VISTA PREVIA DE IMAGEN
// ============================================

function mostrarVistaPrevia(url) {
    if (url && url.startsWith('http')) {
        imagePreview.src = url;
        imagePreviewContainer.style.display = 'block';
    } else {
        imagePreviewContainer.style.display = 'none';
    }
}

// ============================================
// FUNCIÓN: MOSTRAR NOTIFICACIÓN (TOAST)
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
// FUNCIÓN: BUSCAR PRODUCTOS
// ============================================

searchProduct.addEventListener('input', () => {
    renderizarProductos(productosGlobal);
});

// ============================================
// FUNCIÓN: VISTA PREVIA DE IMAGEN
// ============================================

productImage.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url && url.startsWith('http')) {
        mostrarVistaPrevia(url);
    } else {
        imagePreviewContainer.style.display = 'none';
    }
});

btnRemoveImage.addEventListener('click', () => {
    productImage.value = '';
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '#';
});

// ============================================
// EVENTOS DEL FORMULARIO
// ============================================

form.addEventListener('submit', guardarProducto);

btnCancelarEdit.addEventListener('click', () => {
    resetearFormulario();
    cancelarEdicion();
    mostrarNotificacion("Edición cancelada", "info");
});

// ============================================
// FUNCIÓN: CIERRE DE SESIÓN
// ============================================

async function cerrarSesion() {
    if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
        try {
            await signOut(auth);
            mostrarNotificacion("👋 Sesión cerrada correctamente", "success");
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            mostrarNotificacion("Error al cerrar sesión", "error");
        }
    }
}

btnLogout.addEventListener('click', cerrarSesion);

// ============================================
// FUNCIÓN: INICIALIZAR AUTENTICACIÓN
// ============================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        userName.textContent = user.displayName || user.email?.split('@')[0] || 'Empleado';
        console.log("👤 Usuario autenticado:", user.email);
        cargarProductos();
        initOrders(); // ✅ Inicializar pedidos
    } else {
        console.log("⚠️ Usuario no autenticado");
        window.location.href = 'login.html';
    }
});

// ============================================
// ESCUCHAR ACTUALIZACIONES DE PRODUCTOS
// ============================================

document.addEventListener('productosActualizados', (event) => {
    const { productos } = event.detail;

    console.log("🔄 Evento recibido - Actualizando productos en vista");

    productosGlobal = productos;
    window.productosGlobal = productos;

    renderizarProductos(productos);
    actualizarEstadisticas(productos);

    console.log("✅ Productos actualizados en la interfaz");
});

// ============================================
// INICIALIZACIÓN
// ============================================

console.log("✅ Sistema de Gestión de Inventario - Fontanería");
console.log("📦 Listo para operar");
