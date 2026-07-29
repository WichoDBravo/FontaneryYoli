// ============================================
// FUNCIÓN PRINCIPAL: EXPORTAR PRODUCTOS A PDF
// ============================================

window.exportarProductosPDF = async function() {
    // Obtener productos actuales
    const productos = window.productosGlobal || [];
    
    if (productos.length === 0) {
        mostrarNotificacion("⚠️ No hay productos para exportar", "warning");
        return;
    }

    // Deshabilitar botón durante la generación
    const btn = document.getElementById('btnExportPDF');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';
    
    try {
        // Generar HTML para el PDF
        const contenidoHTML = generarHTMLProductos(productos);
        
        // Crear un contenedor temporal
        const container = document.createElement('div');
        container.id = 'pdf-container';
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 900px;
            background: white;
            padding: 40px;
            font-family: 'Inter', Arial, sans-serif;
            z-index: 9999;
        `;
        container.innerHTML = contenidoHTML;
        document.body.appendChild(container);
        
        // Esperar a que las imágenes carguen
        await esperarCargaImagenes(container);
        
        // Generar PDF
        await generarPDFDesdeHTML(container);
        
        // Limpiar
        document.body.removeChild(container);
        
        mostrarNotificacion("✅ PDF generado correctamente", "success");
        
    } catch (error) {
        console.error("Error al generar PDF:", error);
        mostrarNotificacion("❌ Error al generar PDF: " + error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-file-pdf"></i> Exportar PDF';
    }
};

// ============================================
// FUNCIÓN: GENERAR HTML PARA EL PDF
// ============================================

function generarHTMLProductos(productos) {
    const fecha = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const categorias = {
        'baño': '🚽 Baños',
        'cocina': '🍳 Cocina',
        'otros': '📦 Otros'
    };
    
    // Generar tarjetas de productos
    let tarjetasProductos = '';
    productos.forEach((producto, index) => {
        const categoriaNombre = categorias[producto.categoria] || '📦 Sin categoría';
        const stockClase = producto.stock > 0 ? 'stock-ok' : 'stock-zero';
        const stockTexto = producto.stock > 0 ? `${producto.stock} unidades` : 'Agotado';
        
        // Limpiar descripción para que no tenga caracteres extraños
        const descripcion = producto.descripcion ? producto.descripcion.trim() : '';
        
        tarjetasProductos += `
            <div class="product-card-pdf">
                <div class="product-image-pdf">
                    ${producto.imagenURL ? 
                        `<img src="${producto.imagenURL}" alt="${producto.nombre}" crossorigin="anonymous">` :
                        `<div class="no-image-pdf">📷</div>`
                    }
                </div>
                <div class="product-info-pdf">
                    <div class="product-header-pdf">
                        <span class="product-number-pdf">#${index + 1}</span>
                        <span class="product-status-pdf ${stockClase}">${stockTexto}</span>
                    </div>
                    <h3 class="product-name-pdf">${producto.nombre || 'Sin nombre'}</h3>
                    <div class="product-meta-pdf">
                        <span class="product-code-pdf">📋 ${producto.codigo || 'N/A'}</span>
                        <span class="product-category-pdf">${categoriaNombre}</span>
                    </div>
                    <div class="product-price-pdf">$${producto.precio?.toFixed(2) || '0.00'}</div>
                    ${descripcion ? `
                        <div class="product-description-pdf">
                            <span class="desc-label">📝 Descripción:</span>
                            <p>${descripcion}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    // Calcular estadísticas
    const totalProductos = productos.length;
    const enStock = productos.filter(p => p.stock > 0).length;
    const bajoStock = productos.filter(p => p.stock > 0 && p.stock < 10).length;
    const sinStock = productos.filter(p => p.stock === 0 || p.stock === undefined).length;
    const valorTotal = productos.reduce((sum, p) => sum + (p.precio || 0) * (p.stock || 0), 0);
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                /* ============================================ */
                /* ESTILOS PARA EL PDF                          */
                /* ============================================ */
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body { 
                    font-family: 'Inter', Arial, sans-serif; 
                    background: white; 
                    padding: 30px;
                    color: #1e293b;
                }
                
                /* ===== HEADER ===== */
                .pdf-header {
                    text-align: center;
                    margin-bottom: 25px;
                    padding-bottom: 20px;
                    border-bottom: 4px solid #2563eb;
                    background: linear-gradient(135deg, #f8fafc, #ffffff);
                    padding: 20px;
                    border-radius: 12px;
                }
                
                .pdf-header .logo-icon {
                    font-size: 36px;
                    color: #2563eb;
                }
                
                .pdf-header h1 {
                    font-size: 26px;
                    color: #0f172a;
                    margin: 4px 0;
                }
                
                .pdf-header h1 span {
                    color: #2563eb;
                }
                
                .pdf-header .subtitle {
                    color: #64748b;
                    font-size: 14px;
                }
                
                .pdf-header .fecha {
                    color: #94a3b8;
                    font-size: 12px;
                    margin-top: 4px;
                }
                
                /* ===== ESTADÍSTICAS ===== */
                .pdf-stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin: 15px 0 25px;
                    padding: 12px;
                    background: #f8fafc;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                
                .pdf-stats .stat-item {
                    text-align: center;
                    padding: 6px;
                }
                
                .pdf-stats .stat-item .stat-number {
                    font-size: 20px;
                    font-weight: 700;
                    color: #0f172a;
                    display: block;
                }
                
                .pdf-stats .stat-item .stat-label {
                    font-size: 10px;
                    color: #64748b;
                    font-weight: 500;
                }
                
                .pdf-stats .stat-item .stat-number.blue { color: #2563eb; }
                .pdf-stats .stat-item .stat-number.green { color: #10b981; }
                .pdf-stats .stat-item .stat-number.yellow { color: #f59e0b; }
                .pdf-stats .stat-item .stat-number.red { color: #ef4444; }
                .pdf-stats .stat-item .stat-number.purple { color: #8b5cf6; }
                
                /* ===== TARJETAS DE PRODUCTOS ===== */
                .products-grid-pdf {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-top: 10px;
                }
                
                .product-card-pdf {
                    display: flex;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                    min-height: 140px;
                }
                
                /* ===== IMAGEN ===== */
                .product-image-pdf {
                    width: 120px;
                    min-height: 140px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    overflow: hidden;
                }
                
                .product-image-pdf img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .product-image-pdf .no-image-pdf {
                    font-size: 36px;
                    color: #cbd5e1;
                }
                
                /* ===== INFORMACIÓN ===== */
                .product-info-pdf {
                    padding: 12px 14px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .product-header-pdf {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .product-number-pdf {
                    font-size: 11px;
                    font-weight: 600;
                    color: #94a3b8;
                }
                
                .product-status-pdf {
                    font-size: 10px;
                    font-weight: 600;
                    padding: 2px 10px;
                    border-radius: 12px;
                }
                
                .product-status-pdf.stock-ok {
                    background: #d1fae5;
                    color: #065f46;
                }
                
                .product-status-pdf.stock-zero {
                    background: #fecaca;
                    color: #dc2626;
                }
                
                .product-name-pdf {
                    font-size: 15px;
                    font-weight: 600;
                    color: #0f172a;
                    line-height: 1.3;
                }
                
                .product-meta-pdf {
                    display: flex;
                    gap: 10px;
                    font-size: 11px;
                    color: #64748b;
                    flex-wrap: wrap;
                }
                
                .product-code-pdf {
                    background: #f1f5f9;
                    padding: 1px 8px;
                    border-radius: 4px;
                }
                
                .product-category-pdf {
                    background: #f1f5f9;
                    padding: 1px 8px;
                    border-radius: 4px;
                }
                
                .product-price-pdf {
                    font-size: 18px;
                    font-weight: 700;
                    color: #2563eb;
                    margin: 2px 0;
                }
                
                .product-description-pdf {
                    margin-top: 4px;
                    padding-top: 6px;
                    border-top: 1px dashed #e2e8f0;
                }
                
                .product-description-pdf .desc-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: #94a3b8;
                    display: block;
                    margin-bottom: 2px;
                }
                
                .product-description-pdf p {
                    font-size: 11px;
                    color: #475569;
                    line-height: 1.5;
                    max-height: 60px;
                    overflow: hidden;
                }
                
                /* ===== FOOTER ===== */
                .pdf-footer {
                    margin-top: 25px;
                    padding-top: 15px;
                    border-top: 2px solid #e2e8f0;
                    text-align: center;
                    font-size: 11px;
                    color: #94a3b8;
                }
                
                .pdf-footer .page-number {
                    font-weight: 600;
                    color: #64748b;
                }
                
                /* ============================================ */
                /* RESPONSIVE PARA EL PDF                       */
                /* ============================================ */
                
                @media (max-width: 700px) {
                    .products-grid-pdf {
                        grid-template-columns: 1fr;
                    }
                    
                    .pdf-stats {
                        grid-template-columns: repeat(3, 1fr);
                    }
                    
                    .product-image-pdf {
                        width: 100px;
                        min-height: 120px;
                    }
                }
                
                @media print {
                    .product-card-pdf {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <!-- ===== HEADER ===== -->
            <div class="pdf-header">
                <div class="logo-icon">🔧</div>
                <h1>Gestión <span>de Inventario</span></h1>
                <div class="subtitle">Reporte completo de productos</div>
                <div class="fecha">📅 Generado: ${fecha}</div>
            </div>
            
            <!-- ===== ESTADÍSTICAS ===== -->
            <div class="pdf-stats">
                <div class="stat-item">
                    <span class="stat-number blue">${totalProductos}</span>
                    <span class="stat-label">📦 Total</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number green">${enStock}</span>
                    <span class="stat-label">✅ En Stock</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number yellow">${bajoStock}</span>
                    <span class="stat-label">⚠️ Stock Bajo</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number red">${sinStock}</span>
                    <span class="stat-label">❌ Sin Stock</span>
                </div>
            </div>
            
            <!-- ===== PRODUCTOS ===== -->
            <div class="products-grid-pdf">
                ${tarjetasProductos}
            </div>
            
            <!-- ===== FOOTER ===== -->
            <div class="pdf-footer">
                <span class="page-number">📄 Inventario de productos</span>
                <span style="margin:0 8px;">•</span>
                © ${new Date().getFullYear()} - Gestión de Fontanería
                <br>
                <span style="font-size:10px;">Este documento es generado automáticamente desde el sistema de gestión.</span>
            </div>
        </body>
        </html>
    `;
}

// ============================================
// FUNCIÓN: ESPERAR CARGA DE IMÁGENES
// ============================================

function esperarCargaImagenes(container) {
    return new Promise((resolve) => {
        const imagenes = container.querySelectorAll('img');
        if (imagenes.length === 0) {
            resolve();
            return;
        }
        
        let cargadas = 0;
        let errores = 0;
        const total = imagenes.length;
        
        imagenes.forEach(img => {
            // Si ya está cargada
            if (img.complete) {
                cargadas++;
                if (cargadas + errores === total) resolve();
                return;
            }
            
            img.addEventListener('load', () => {
                cargadas++;
                if (cargadas + errores === total) resolve();
            });
            
            img.addEventListener('error', () => {
                errores++;
                // Mostrar placeholder en caso de error
                img.style.display = 'none';
                const parent = img.parentElement;
                if (parent) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'no-image-pdf';
                    placeholder.textContent = '📷';
                    parent.appendChild(placeholder);
                }
                if (cargadas + errores === total) resolve();
            });
        });
        
        // Timeout por seguridad
        setTimeout(resolve, 8000);
    });
}

// ============================================
// FUNCIÓN: GENERAR PDF DESDE HTML
// ============================================

async function generarPDFDesdeHTML(container) {
    // Crear canvas con html2canvas
    const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 900,
        height: container.scrollHeight,
        onclone: (clonedDoc) => {
            const imgs = clonedDoc.querySelectorAll('img');
            imgs.forEach(img => {
                img.crossOrigin = 'anonymous';
                img.setAttribute('crossorigin', 'anonymous');
            });
        }
    });
    
    // Crear PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    
    // Calcular dimensiones
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = 297;
    
    let heightLeft = pdfHeight;
    let position = 0;
    
    // Primera página
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    
    // Páginas adicionales
    while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
    }
    
    // Guardar
    const fecha = new Date().toISOString().slice(0, 10);
    pdf.save(`inventario_${fecha}.pdf`);
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
// EXPORTAR FUNCIÓN AL SCOPE GLOBAL
// ============================================

window.exportarProductosPDF = exportarProductosPDF;
console.log("📄 Función de exportación a PDF cargada");
