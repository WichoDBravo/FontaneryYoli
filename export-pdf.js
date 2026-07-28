// ============================================
// EXPORT-PDF.JS - EXPORTAR PRODUCTOS A PDF
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
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
    
    try {
        // Generar HTML para el PDF
        const contenidoHTML = generarHTMLProductos(productos);
        
        // Crear un contenedor temporal para renderizar
        const container = document.createElement('div');
        container.id = 'pdf-container';
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 800px;
            background: white;
            padding: 30px;
            font-family: 'Inter', Arial, sans-serif;
            z-index: 9999;
        `;
        container.innerHTML = contenidoHTML;
        document.body.appendChild(container);
        
        // Esperar a que las imágenes carguen
        await esperarCargaImagenes(container);
        
        // Generar PDF con html2canvas + jsPDF
        await generarPDFDesdeHTML(container);
        
        // Limpiar
        document.body.removeChild(container);
        
        mostrarNotificacion("✅ PDF generado correctamente", "success");
        
    } catch (error) {
        console.error("Error al generar PDF:", error);
        mostrarNotificacion("❌ Error al generar PDF: " + error.message, "error");
    } finally {
        // Restaurar botón
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
    
    // Categorías para filtro
    const categorias = {
        'baño': '🚽 Baños',
        'cocina': '🍳 Cocina',
        'otros': '📦 Otros'
    };
    
    // Generar filas de productos
    let filasProductos = '';
    productos.forEach((producto, index) => {
        const categoriaNombre = categorias[producto.categoria] || '📦 Sin categoría';
        const stockClase = producto.stock > 0 ? 'stock-ok' : 'stock-zero';
        const stockTexto = producto.stock > 0 ? `${producto.stock} unidades` : 'Agotado';
        
        filasProductos += `
            <tr>
                <td style="text-align:center; padding:8px 4px; border-bottom:1px solid #e5e7eb; vertical-align:middle;">
                    ${index + 1}
                </td>
                <td style="text-align:center; padding:8px 4px; border-bottom:1px solid #e5e7eb; vertical-align:middle;">
                    ${producto.imagenURL ? 
                        `<img src="${producto.imagenURL}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" onerror="this.style.display='none'">` :
                        `<span style="color:#9ca3af; font-size:20px;">📷</span>`
                    }
                </td>
                <td style="padding:8px 4px; border-bottom:1px solid #e5e7eb; font-weight:600; vertical-align:middle;">
                    ${producto.nombre || 'Sin nombre'}
                </td>
                <td style="padding:8px 4px; border-bottom:1px solid #e5e7eb; color:#6b7280; vertical-align:middle;">
                    ${producto.codigo || 'N/A'}
                </td>
                <td style="padding:8px 4px; border-bottom:1px solid #e5e7eb; vertical-align:middle;">
                    <span style="background:#f3f4f6; padding:2px 10px; border-radius:12px; font-size:11px;">
                        ${categoriaNombre}
                    </span>
                </td>
                <td style="padding:8px 4px; border-bottom:1px solid #e5e7eb; color:#2563eb; font-weight:700; text-align:right; vertical-align:middle;">
                    $${producto.precio?.toFixed(2) || '0.00'}
                </td>
                <td style="padding:8px 4px; border-bottom:1px solid #e5e7eb; text-align:center; vertical-align:middle;">
                    <span style="padding:2px 10px; border-radius:12px; font-size:11px; font-weight:500; ${producto.stock > 0 ? 'background:#d1fae5; color:#065f46;' : 'background:#fecaca; color:#dc2626;'}">
                        ${stockTexto}
                    </span>
                </td>
            </tr>
        `;
    });
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Inter', Arial, sans-serif; 
                    background: white; 
                    padding: 20px;
                }
                .pdf-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 3px solid #2563eb;
                }
                .pdf-header h1 {
                    font-size: 24px;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .pdf-header h1 i {
                    color: #2563eb;
                }
                .pdf-header .subtitle {
                    color: #6b7280;
                    font-size: 13px;
                    margin-top: 4px;
                }
                .pdf-header .fecha {
                    color: #9ca3af;
                    font-size: 12px;
                    margin-top: 2px;
                }
                .pdf-stats {
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                    margin: 15px 0;
                    padding: 10px;
                    background: #f8fafc;
                    border-radius: 8px;
                }
                .pdf-stats span {
                    font-size: 13px;
                    color: #475569;
                }
                .pdf-stats strong {
                    color: #0f172a;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    margin-top: 10px;
                }
                th {
                    background: #1e293b;
                    color: white;
                    padding: 8px 4px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 11px;
                    text-transform: uppercase;
                }
                th:first-child { text-align:center; }
                th:nth-child(2) { text-align:center; }
                th:nth-child(6) { text-align:right; }
                th:last-child { text-align:center; }
                td:first-child { text-align:center; }
                td:nth-child(2) { text-align:center; }
                td:nth-child(6) { text-align:right; }
                td:last-child { text-align:center; }
                .footer {
                    margin-top: 20px;
                    padding-top: 10px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 11px;
                    color: #9ca3af;
                }
                .logo-text {
                    font-size: 18px;
                    font-weight: 700;
                    color: #0f172a;
                }
                .logo-text span {
                    color: #2563eb;
                }
                .empty-img {
                    color: #d1d5db;
                    font-size: 24px;
                }
            </style>
        </head>
        <body>
            <div class="pdf-header">
                <h1>
                    <span class="logo-text">Gestión <span>de Inventario</span></span>
                </h1>
                <div class="subtitle">Reporte completo de productos</div>
                <div class="fecha">📅 Generado: ${fecha}</div>
            </div>
            
            <div class="pdf-stats">
                <span>📦 Total: <strong>${productos.length}</strong> productos</span>
                <span>✅ En Stock: <strong>${productos.filter(p => p.stock > 0).length}</strong></span>
                <span>⚠️ Stock Bajo: <strong>${productos.filter(p => p.stock > 0 && p.stock < 10).length}</strong></span>
                <span>❌ Sin Stock: <strong>${productos.filter(p => p.stock === 0 || p.stock === undefined).length}</strong></span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width:40px;">#</th>
                        <th style="width:70px;">Imagen</th>
                        <th style="min-width:120px;">Nombre</th>
                        <th style="min-width:100px;">Código</th>
                        <th style="min-width:90px;">Categoría</th>
                        <th style="width:80px; text-align:right;">Precio</th>
                        <th style="width:100px; text-align:center;">Stock</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasProductos}
                </tbody>
            </table>
            
            <div class="footer">
                Este documento es generado automáticamente desde el sistema de gestión de inventario.
                <br>
                © ${new Date().getFullYear()} - Gestión de Fontanería
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
        imagenes.forEach(img => {
            if (img.complete) {
                cargadas++;
                if (cargadas === imagenes.length) resolve();
            } else {
                img.addEventListener('load', () => {
                    cargadas++;
                    if (cargadas === imagenes.length) resolve();
                });
                img.addEventListener('error', () => {
                    cargadas++;
                    if (cargadas === imagenes.length) resolve();
                });
            }
        });
        
        // Timeout por seguridad
        setTimeout(resolve, 5000);
    });
}

// ============================================
// FUNCIÓN: GENERAR PDF DESDE HTML
// ============================================

async function generarPDFDesdeHTML(container) {
    // Crear un canvas con html2canvas
    const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
        height: container.scrollHeight,
        onclone: (clonedDoc) => {
            // Asegurar que las imágenes se rendericen
            const imgs = clonedDoc.querySelectorAll('img');
            imgs.forEach(img => {
                img.crossOrigin = 'anonymous';
            });
        }
    });
    
    // Crear PDF con jsPDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Calcular dimensiones para ajustar en A4
    const pdfWidth = 210; // mm (A4)
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // Si el contenido es más alto que una página, dividir
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = 297; // mm (A4)
    
    // Primera página
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    
    // Páginas adicionales si es necesario
    while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
    }
    
    // Guardar PDF
    pdf.save(`inventario_${new Date().toISOString().slice(0,10)}.pdf`);
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