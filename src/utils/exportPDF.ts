// exportPDF.ts — genera PDF del análisis directamente en el navegador

export function exportarAnalisisPDF(analisis: any, oportunidad?: any) {
  const ac = analisis?.analisis_completo || {}
  const titulo = analisis.titulo || oportunidad?.titulo || 'Análisis de licitación'
  const organismo = analisis.organismo || oportunidad?.organismo || ''
  const score = Number(analisis.puntuacion_interes) || 0
  const fecha = analisis.fecha_analisis || new Date().toLocaleDateString('es-ES')

  const scoreColor = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626'
  const scoreLabel = score >= 70 ? 'RECOMENDADA' : score >= 40 ? 'EVALUAR' : 'NO RECOMENDADA'

  function fmtEuro(n: any) {
    if (!n) return '—'
    return Number(n).toLocaleString('es-ES') + ' €'
  }

  function row(label: string, value: any) {
    if (!value || value === 'No especificado') return ''
    return `<tr><td style="color:#64748b;padding:4px 8px;font-size:12px;width:40%">${label}</td><td style="padding:4px 8px;font-size:12px">${value}</td></tr>`
  }

  function section(title: string, content: string) {
    if (!content.trim()) return ''
    return `
      <div style="margin-bottom:16px;break-inside:avoid">
        <h3 style="font-size:13px;font-weight:700;color:#1a3c34;border-bottom:2px solid #1a3c34;padding-bottom:4px;margin-bottom:8px">${title}</h3>
        ${content}
      </div>`
  }

  function lista(items: any[], campo: string) {
    if (!items || items.length === 0) return ''
    return '<ul style="margin:0;padding-left:16px">' +
      items.map(i => `<li style="font-size:12px;margin-bottom:3px">${typeof i === 'string' ? i : (i[campo] || JSON.stringify(i))}</li>`).join('') +
      '</ul>'
  }

  // Criterios
  let criteriosHTML = ''
  if (ac.criterios_adjudicacion?.length > 0) {
    criteriosHTML = '<table style="width:100%;border-collapse:collapse">' +
      ac.criterios_adjudicacion.map((c: any) => `
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:5px 8px;font-size:12px;font-weight:600">${c.criterio}</td>
          <td style="padding:5px 8px;font-size:12px;color:#7c3aed;font-weight:700;text-align:right">${c.puntuacion_maxima} pts</td>
          <td style="padding:5px 8px;font-size:11px;color:#64748b">${c.tipo || ''}</td>
        </tr>`).join('') +
      '</table>'
  }

  // Riesgos
  let riesgosHTML = ''
  if (ac.riesgos_detectados?.length > 0) {
    riesgosHTML = ac.riesgos_detectados.map((r: any) => {
      const txt = typeof r === 'string' ? r : r.riesgo || ''
      const grav = typeof r === 'object' ? r.gravedad || 'media' : 'media'
      const color = grav === 'alta' ? '#dc2626' : grav === 'media' ? '#d97706' : '#64748b'
      return `<div style="font-size:12px;margin-bottom:4px;display:flex;gap:6px;align-items:flex-start">
        <span style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;margin-top:1px;white-space:nowrap">${grav.toUpperCase()}</span>
        <span>${txt}</span></div>`
    }).join('')
  }

  // Oportunidades detectadas
  let oposHTML = ''
  if (ac.oportunidades_detectadas?.length > 0) {
    oposHTML = ac.oportunidades_detectadas.map((o: any) => {
      const txt = typeof o === 'string' ? o : o.oportunidad || ''
      return `<div style="font-size:12px;margin-bottom:4px">▸ ${txt}</div>`
    }).join('')
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Análisis — ${titulo}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; }
    @media print {
      @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
      .no-print { display: none; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
    .page { max-width: 800px; margin: 0 auto; padding: 20px; }
  </style>
</head>
<body>
<div class="page">

  <!-- Cabecera -->
  <div style="background:#1a3c34;color:#fff;padding:20px 24px;border-radius:8px;margin-bottom:20px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">ANÁLISIS DE LICITACIÓN</div>
        <h1 style="font-size:16px;font-weight:700;margin:0 0 6px 0;line-height:1.3">${titulo}</h1>
        <div style="font-size:12px;color:rgba(255,255,255,0.8)">${organismo}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px">Generado: ${fecha}</div>
      </div>
      <div style="text-align:center;margin-left:20px;flex-shrink:0">
        <div style="background:${scoreColor};color:#fff;border-radius:50%;width:64px;height:64px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;margin:0 auto 4px">${score}</div>
        <div style="font-size:9px;font-weight:700;color:${scoreColor === '#059669' ? '#6ee7b7' : scoreColor === '#d97706' ? '#fcd34d' : '#fca5a5'}">${scoreLabel}</div>
      </div>
    </div>
  </div>

  <!-- Resumen ejecutivo -->
  ${analisis.resumen ? section('Resumen ejecutivo',
    `<p style="font-size:13px;line-height:1.6;margin:0">${analisis.resumen}</p>`) : ''}

  <!-- Justificación puntuación -->
  ${ac.puntuacion_interes?.justificacion ? section('Justificación de la puntuación',
    `<p style="font-size:12px;line-height:1.5;margin:0;padding:10px;background:#f8fafc;border-radius:6px;border-left:3px solid ${scoreColor}">${ac.puntuacion_interes.justificacion}</p>`) : ''}

  <!-- Datos básicos -->
  ${section('Datos del contrato', `<table style="width:100%;border-collapse:collapse">
    ${row('Tipo de contrato', ac.datos_basicos?.tipo_contrato)}
    ${row('Presupuesto (con IVA)', fmtEuro(ac.datos_basicos?.presupuesto_base_iva))}
    ${row('Presupuesto (sin IVA)', fmtEuro(ac.datos_basicos?.presupuesto_base_sin_iva))}
    ${row('Valor estimado', fmtEuro(ac.datos_basicos?.valor_estimado))}
    ${row('Duración', ac.datos_basicos?.duracion_contrato)}
    ${row('Prórrogas', ac.datos_basicos?.prorrogas)}
    ${row('Lotes', ac.datos_basicos?.lotes)}
    ${row('Presentación ofertas', ac.plazos?.presentacion_ofertas)}
  </table>`)}

  <!-- Criterios adjudicación -->
  ${criteriosHTML ? section('Criterios de adjudicación', criteriosHTML) : ''}

  <!-- Solvencia -->
  ${section('Solvencia requerida', `<table style="width:100%;border-collapse:collapse">
    ${row('Volumen de negocios', ac.solvencia_economica?.volumen_anual_negocios)}
    ${row('Seguro RC', ac.solvencia_economica?.seguro_responsabilidad)}
    ${row('Trabajos similares', ac.solvencia_tecnica?.trabajos_similares)}
    ${row('Importe mínimo trabajos', fmtEuro(ac.solvencia_tecnica?.importe_minimo_trabajos))}
    ${row('Personal cualificado', ac.solvencia_tecnica?.personal_cualificado)}
    ${row('Clasificación requerida', ac.clasificacion_empresarial?.requerida)}
    ${row('Grupo / Subgrupo', ac.clasificacion_empresarial?.grupo ? ac.clasificacion_empresarial.grupo + ' / ' + (ac.clasificacion_empresarial.subgrupo || '') : '')}
  </table>`)}

  <!-- Personal -->
  ${section('Personal requerido', `<table style="width:100%;border-collapse:collapse">
    ${row('Subrogación', ac.personal_requerido?.subrogacion)}
    ${row('Trabajadores a subrogar', ac.personal_requerido?.num_trabajadores_subrogar > 0 ? ac.personal_requerido.num_trabajadores_subrogar : undefined)}
    ${row('Convenio aplicable', ac.personal_requerido?.convenio_aplicable)}
    ${row('Categorías', ac.personal_requerido?.categorias_profesionales)}
  </table>${ac.personal_requerido?.detalle ? `<p style="font-size:12px;margin:6px 0 0;padding:8px;background:#f8fafc;border-radius:4px">${ac.personal_requerido.detalle}</p>` : ''}`)}

  <!-- 2 columnas riesgos / oportunidades -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;break-inside:avoid">
    ${riesgosHTML ? `<div>
      <h3 style="font-size:13px;font-weight:700;color:#dc2626;border-bottom:2px solid #dc2626;padding-bottom:4px;margin:0 0 8px">Riesgos detectados</h3>
      ${riesgosHTML}
    </div>` : '<div></div>'}
    ${oposHTML ? `<div>
      <h3 style="font-size:13px;font-weight:700;color:#059669;border-bottom:2px solid #059669;padding-bottom:4px;margin:0 0 8px">Oportunidades detectadas</h3>
      ${oposHTML}
    </div>` : '<div></div>'}
  </div>

  <!-- Mejoras valorables -->
  ${ac.mejoras_valorables?.length > 0 && ac.mejoras_valorables[0].mejora !== 'No especificado'
    ? section('Mejoras valorables', `<table style="width:100%;border-collapse:collapse">` +
        ac.mejoras_valorables.map((m: any) => `<tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:4px 8px;font-size:12px">${m.mejora}</td>
          ${m.puntuacion > 0 ? `<td style="padding:4px 8px;font-size:12px;color:#7c3aed;font-weight:700;text-align:right">${m.puntuacion} pts</td>` : '<td></td>'}
        </tr>`).join('') + '</table>') : ''}

  <!-- Documentación requerida -->
  ${ac.documentacion_requerida?.length > 0
    ? section('Documentación requerida', lista(ac.documentacion_requerida, '')) : ''}

  <!-- Footer -->
  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8">
    <span>Forgeser Servicios del Sur SL — Confidencial</span>
    <span>Análisis generado con IA (Gemini) · ${new Date().toLocaleDateString('es-ES')}</span>
  </div>

</div>

<script>
  window.onload = function() { window.print(); }
</script>
</body>
</html>`

  // Abrir en nueva ventana e imprimir
  const ventana = window.open('', '_blank', 'width=900,height=700')
  if (!ventana) { alert('Permite las ventanas emergentes para exportar el PDF'); return }
  ventana.document.write(html)
  ventana.document.close()
}

export function exportarCalculoPDF(calculo: any, oportunidad?: any) {
  const titulo = oportunidad?.titulo || 'Cálculo económico'
  const organismo = oportunidad?.organismo || ''
  const r = calculo?.resumen || {}
  const personal = calculo?.personal || []

  function fmtEuro(n: any) {
    if (!n) return '—'
    return Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cálculo — ${titulo}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; }
    @media print {
      @page { margin: 15mm; size: A4; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
    .page { max-width: 800px; margin: 0 auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a3c34; color: #fff; padding: 6px 10px; font-size: 12px; text-align: left; }
    td { padding: 5px 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
    .total { background: #1a3c34; color: #fff; font-weight: 700; }
  </style>
</head>
<body>
<div class="page">

  <div style="background:#1a3c34;color:#fff;padding:20px 24px;border-radius:8px;margin-bottom:20px">
    <div style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;margin-bottom:4px">CÁLCULO ECONÓMICO</div>
    <h1 style="font-size:16px;font-weight:700;margin:0 0 4px">${titulo}</h1>
    <div style="font-size:12px;color:rgba(255,255,255,0.8)">${organismo}</div>
  </div>

  <!-- Resumen -->
  <h3 style="font-size:13px;font-weight:700;color:#1a3c34;border-bottom:2px solid #1a3c34;padding-bottom:4px;margin-bottom:8px">Resumen económico</h3>
  <table style="margin-bottom:20px">
    <tr><td>Costes directos (personal)</td><td style="text-align:right;font-weight:600">${fmtEuro(r.costesDirectos)}</td></tr>
    <tr><td>Costes indirectos</td><td style="text-align:right;font-weight:600">${fmtEuro(r.costesIndirectos)}</td></tr>
    <tr><td>Gastos generales</td><td style="text-align:right;font-weight:600">${fmtEuro(r.importeGG)}</td></tr>
    <tr><td>Beneficio industrial</td><td style="text-align:right;font-weight:600">${fmtEuro(r.importeBI)}</td></tr>
    <tr><td style="font-weight:700">Total sin IVA</td><td style="text-align:right;font-weight:700;font-size:14px">${fmtEuro(r.totalSinIVA)}</td></tr>
    <tr class="total"><td>TOTAL CON IVA (oferta)</td><td style="text-align:right;font-size:15px">${fmtEuro(r.totalConIVA)}</td></tr>
    <tr><td>Baja sobre presupuesto</td><td style="text-align:right;color:#059669;font-weight:700">${r.baja || 0} %</td></tr>
  </table>

  <!-- Personal -->
  ${personal.length > 0 ? `
  <h3 style="font-size:13px;font-weight:700;color:#1a3c34;border-bottom:2px solid #1a3c34;padding-bottom:4px;margin-bottom:8px">Desglose de personal</h3>
  <table style="margin-bottom:20px">
    <tr><th>Categoría</th><th>Grupo</th><th>Uds</th><th>H/sem</th><th>Bruto anual/ud</th><th>Total anual</th></tr>
    ${personal.map((p: any) => `<tr>
      <td>${p.categoria || ''}</td>
      <td>${p.grupo || ''}</td>
      <td style="text-align:center">${p.cantidad || 1}</td>
      <td style="text-align:center">${p.horasSemanales || ''}</td>
      <td style="text-align:right">${fmtEuro(p.brutoAnual || p.totalAnualBruto)}</td>
      <td style="text-align:right;font-weight:600">${fmtEuro((p.brutoAnual || p.totalAnualBruto || 0) * (p.cantidad || 1))}</td>
    </tr>`).join('')}
  </table>` : ''}

  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8">
    <span>Forgeser Servicios del Sur SL — Confidencial</span>
    <span>${new Date().toLocaleDateString('es-ES')}</span>
  </div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`

  const ventana = window.open('', '_blank', 'width=900,height=700')
  if (!ventana) { alert('Permite las ventanas emergentes para exportar el PDF'); return }
  ventana.document.write(html)
  ventana.document.close()
}