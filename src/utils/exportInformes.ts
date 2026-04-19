// src/utils/exportInformes.ts
// Exportación Excel (exceljs) y PDF (print) para todos los tabs de Informes
// exceljs se carga de forma dinámica (lazy) para no inflar el bundle principal

import type ExcelJS from 'exceljs'

async function getExcelJS() {
  const mod = await import('exceljs')
  return mod.default
}

// Helper: guardar workbook exceljs en browser
async function xlsxSave(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  a.click(); URL.revokeObjectURL(url)
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n == null) return '0'
  return Number(n).toFixed(2)
}

async function descargar(wb: ExcelJS.Workbook, nombre: string) {
  await xlsxSave(wb, `${nombre}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ─── Tab Económico / P&L ────────────────────────────────────────────────────

export async function exportarEconomicoExcel(informeEco: any) {
  const ExcelJS = await getExcelJS()
  const wb = new ExcelJS.Workbook()

  // Hoja 1: Resumen contratos
  const contratos = (informeEco?.contratos || []).map((c: any) => ({
    'Contrato':         c.titulo || '',
    'Organismo':        c.organismo || '',
    'Ingresos (€)':     fmt(c.ingresos_acum),
    'Costes (€)':       fmt(c.costes_acum),
    'Beneficio (€)':    fmt(c.beneficio_acum),
    'Margen real (%)':  fmt(c.margen_real_pct),
    'Meses':            c.meses_registrados || 0,
    'Alerta margen':    c.alerta_margen ? 'Sí' : 'No',
  }))
  const ws1 = wb.addWorksheet('Contratos P&L')
  ws1.addRows(contratos)

  // Hoja 2: KPIs globales
  const g = informeEco?.global || {}
  const kpis = [
    { 'KPI': 'Contratos activos',   'Valor': g.contratos_activos || 0 },
    { 'KPI': 'Total ingresos (€)',   'Valor': fmt(g.total_ingresos) },
    { 'KPI': 'Total beneficio (€)',  'Valor': fmt(g.total_beneficio) },
    { 'KPI': 'Margen global (%)',    'Valor': fmt(g.margen_global_pct) },
    { 'KPI': 'Contratos en alerta',  'Valor': g.contratos_alerta || 0 },
  ]
  const ws2 = wb.addWorksheet('KPIs globales')
  ws2.addRows(kpis)

  await descargar(wb, 'informe_economico')
}

// ─── Tab Licitaciones ───────────────────────────────────────────────────────

export async function exportarLicitacionesExcel(informeLic: any) {
  const ExcelJS = await getExcelJS()
  const wb = new ExcelJS.Workbook()

  const ops = (informeLic?.ultimas_oportunidades || []).map((o: any) => ({
    'Título':           o.titulo || '',
    'Organismo':        o.organismo || '',
    'Presupuesto (€)':  fmt(o.presupuesto),
    'Scoring':          o.scoring || 0,
    'Estado':           o.estado || '',
    'Fecha límite':     o.fecha_limite || '',
    'CPV':              o.cpv || '',
  }))
  const ws1 = wb.addWorksheet('Oportunidades')
  ws1.addRows(ops)

  const k = informeLic?.kpis || {}
  const kpis = [
    { 'KPI': 'Total oportunidades',    'Valor': k.total_oportunidades || 0 },
    { 'KPI': 'Tasa de éxito (%)',       'Valor': fmt(k.tasa_exito_pct) },
    { 'KPI': 'Importe adjudicado (€)',  'Valor': fmt(k.importe_adjudicado) },
    { 'KPI': 'Pipeline presupuesto (€)','Valor': fmt(k.presupuesto_pipeline) },
    { 'KPI': 'Scoring medio',           'Valor': k.scoring_medio || 0 },
    { 'KPI': 'Contratos activos',       'Valor': k.contratos_activos || 0 },
  ]
  const ws2 = wb.addWorksheet('KPIs')
  ws2.addRows(kpis)

  await descargar(wb, 'informe_licitaciones')
}

// ─── Tab RRHH ───────────────────────────────────────────────────────────────

export async function exportarRRHHExcel(informeRRHH: any) {
  const ExcelJS = await getExcelJS()
  const wb = new ExcelJS.Workbook()

  const empleados = (informeRRHH?.empleados_detalle || []).map((e: any) => ({
    'Nombre':          `${e.nombre || ''} ${e.apellidos || ''}`.trim(),
    'DNI':             e.dni || '',
    'Categoría':       e.categoria || '',
    'Centro':          e.centro || '',
    'Salario bruto (€)': fmt(e.salario_bruto),
    'Estado':          e.estado || '',
    'Contrato':        e.tipo_contrato || '',
  }))
  const ws1 = wb.addWorksheet('Plantilla')
  ws1.addRows(empleados)

  const p = informeRRHH?.plantilla || {}
  const f = informeRRHH?.fichajes || {}
  const a = informeRRHH?.ausencias || {}
  const kpis = [
    { 'KPI': 'Plantilla total',           'Valor': p.total || 0 },
    { 'KPI': 'Empleados activos',          'Valor': p.activos || 0 },
    { 'KPI': 'Horas trabajadas',           'Valor': f.total_horas || 0 },
    { 'KPI': 'Horas extra',                'Valor': f.horas_extra || 0 },
    { 'KPI': 'Ausencias mes',              'Valor': a.total || 0 },
    { 'KPI': 'Pendientes aprobar',         'Valor': a.pendientes_aprobar || 0 },
    { 'KPI': 'Coste nómina est. (€)',      'Valor': fmt(informeRRHH?.coste_nomina_estimado) },
    { 'KPI': 'Contratos a vencer 30d',     'Valor': p.contratos_vencer_30d || 0 },
  ]
  const ws2 = wb.addWorksheet('KPIs')
  ws2.addRows(kpis)

  await descargar(wb, 'informe_rrhh')
}

// ─── Tab Territorio ─────────────────────────────────────────────────────────

export async function exportarTerritorioExcel(informeTerr: any) {
  const ExcelJS = await getExcelJS()
  const wb = new ExcelJS.Workbook()

  const c = informeTerr?.centros || {}
  const o = informeTerr?.operativo || {}
  const i = informeTerr?.incidencias || {}
  const q = informeTerr?.calidad || {}

  const resumen = [
    { 'Concepto': 'Centros activos',           'Valor': c.activos || 0 },
    { 'Concepto': 'Total centros',             'Valor': c.total || 0 },
    { 'Concepto': 'Presupuesto anual total (€)','Valor': fmt(c.total_presupuesto_anual) },
    { 'Concepto': 'Partes completados',        'Valor': o.partes_completados || 0 },
    { 'Concepto': 'Partes totales mes',        'Valor': o.partes_totales || 0 },
    { 'Concepto': 'Horas trabajadas',          'Valor': o.horas_trabajadas || 0 },
    { 'Concepto': 'Coste personal (€)',        'Valor': fmt(o.coste_personal) },
    { 'Concepto': 'Coste materiales (€)',      'Valor': fmt(o.coste_materiales) },
    { 'Concepto': 'Incidencias abiertas',      'Valor': i.abiertas || 0 },
    { 'Concepto': 'SLA vencidos',              'Valor': i.sla_vencidas || 0 },
    { 'Concepto': 'Calidad media (sobre 5)',   'Valor': q.media_mes || 0 },
    { 'Concepto': 'Inspecciones mes',          'Valor': q.num_inspecciones || 0 },
  ]
  const ws = wb.addWorksheet('Territorio')
  ws.addRows(resumen)

  await descargar(wb, 'informe_territorio')
}

// ─── Tab Rendimiento ────────────────────────────────────────────────────────

export async function exportarRendimientoExcel(infRend: any) {
  const ExcelJS = await getExcelJS()
  const wb = new ExcelJS.Workbook()

  // Hoja 1: Resumen proyectos
  const proyectos = (infRend?.proyectos || []).map((p: any) => ({
    'Semáforo':                   p.semaforo || '',
    'Proyecto':                   p.titulo || '',
    'Organismo':                  p.organismo || '',
    'Meses ejecutados':           p.meses_ejecutados || 0,
    'Meses restantes':            p.meses_restantes || 0,
    'Ejecución (%)':              p.pct_ejecucion || 0,
    'Ingresos reales (€)':        fmt(p.real_acumulado?.ingresos),
    'Costes reales (€)':          fmt(p.real_acumulado?.total_costes),
    'Beneficio real (€)':         fmt(p.real_acumulado?.beneficio),
    'Margen real (%)':            fmt(p.margen_real),
    'Margen proyectado (%)':      fmt(p.margen_proyectado),
    'Desv. personal (%)':         fmt(p.desviacion_partidas?.personal?.pct),
    'Desv. materiales (%)':       fmt(p.desviacion_partidas?.materiales?.pct),
    'Desv. maquinaria (%)':       fmt(p.desviacion_partidas?.maquinaria?.pct),
    'Desv. indirectos (%)':       fmt(p.desviacion_partidas?.indirectos?.pct),
    'Desv. total (%)':            fmt(p.desviacion_partidas?.total?.pct),
    'Ingresos proyectados (€)':   fmt(p.proyeccion?.ingresos),
    'Costes proyectados (€)':     fmt(p.proyeccion?.total_costes),
    'Beneficio proyectado (€)':   fmt(p.proyeccion?.beneficio),
    'IPC (índice coste)':         fmt(p.indice_coste),
    'Alertas':                    (p.alertas || []).map((a: any) => a.msg).join(' | '),
  }))
  const ws1 = wb.addWorksheet('Proyectos')
  ws1.addRows(proyectos)

  // Hoja 2: Resumen global
  const r = infRend?.resumen || {}
  const resumen = [
    { 'KPI': 'Total proyectos activos',  'Valor': r.total_proyectos || 0 },
    { 'KPI': 'Proyectos en rojo',        'Valor': r.proyectos_rojo || 0 },
    { 'KPI': 'Proyectos en amarillo',    'Valor': r.proyectos_amarillo || 0 },
    { 'KPI': 'Proyectos en verde',       'Valor': r.proyectos_verde || 0 },
    { 'KPI': 'Total ingresos (€)',        'Valor': fmt(r.total_ingresos) },
    { 'KPI': 'Total costes (€)',          'Valor': fmt(r.total_costes) },
    { 'KPI': 'Total beneficio (€)',       'Valor': fmt(r.total_beneficio) },
    { 'KPI': 'Margen global (%)',         'Valor': fmt(r.margen_global) },
  ]
  const ws2 = wb.addWorksheet('Resumen global')
  ws2.addRows(resumen)

  // Hoja 3 por proyecto: evolución mensual (todos concatenados)
  const evolucion: any[] = []
  for (const p of (infRend?.proyectos || [])) {
    for (const m of (p.meses || [])) {
      evolucion.push({
        'Proyecto':         p.titulo || '',
        'Periodo':          m.periodo || '',
        'Ingresos (€)':     fmt(m.ingresos),
        'Personal (€)':     fmt(m.personal),
        'Materiales (€)':   fmt(m.materiales),
        'Maquinaria (€)':   fmt(m.maquinaria),
        'Indirectos (€)':   fmt(m.indirectos),
        'Total costes (€)': fmt(m.total_costes),
        'Beneficio (€)':    fmt(m.beneficio),
        'Margen (%)':       fmt(m.margen),
        'Desviación (€)':   fmt(m.desviacion),
        'Desviación (%)':   fmt(m.desviacion_pct),
      })
    }
  }
  if (evolucion.length > 0) {
    const ws3 = wb.addWorksheet('Evolución mensual')
    ws3.addRows(evolucion)
  }

  await descargar(wb, 'informe_rendimiento')
}

// ─── PDF genérico (print ventana) ───────────────────────────────────────────
// Llamar desde el tab activo; la ventana se abre con el HTML del informe listo para imprimir.

export function imprimirInformeRendimiento(infRend: any) {
  const proyectos = infRend?.proyectos || []
  const r = infRend?.resumen || {}

  const filas = proyectos.map((p: any) => {
    const sem = p.semaforo === 'rojo' ? '🔴' : p.semaforo === 'amarillo' ? '🟡' : '🟢'
    const alertasHtml = (p.alertas || []).map((a: any) =>
      `<li style="color:${a.nivel==='critica'?'#dc2626':'#d97706'}">${a.msg}</li>`
    ).join('')
    return `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:6px 8px">${sem}</td>
        <td style="padding:6px 8px;font-weight:600;font-size:11px">${p.titulo}<br/><span style="font-weight:normal;color:#94a3b8;font-size:10px">${p.organismo}</span></td>
        <td style="padding:6px 8px;text-align:center;font-size:11px">${p.meses_ejecutados}/${p.meses_ejecutados + p.meses_restantes}</td>
        <td style="padding:6px 8px;text-align:right;font-size:11px">${fmt(p.margen_real)}%</td>
        <td style="padding:6px 8px;text-align:right;font-size:11px;color:${p.margen_proyectado<5?'#dc2626':p.margen_proyectado<10?'#d97706':'#059669'}">${fmt(p.margen_proyectado)}%</td>
        <td style="padding:6px 8px;text-align:right;font-size:11px">${fmt(p.desviacion_partidas?.total?.pct)}%</td>
        <td style="padding:6px 8px;font-size:10px"><ul style="margin:0;padding-left:12px">${alertasHtml}</ul></td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Informe de Rendimiento — Forgeser</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; }
    h1 { color: #1a3c34; font-size: 20px; }
    h2 { color: #1a3c34; font-size: 14px; border-bottom: 2px solid #1a3c34; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1a3c34; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
    .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
    .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
    .kpi-val { font-size: 18px; font-weight: 800; color: #1a3c34; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Informe de Rendimiento de Proyectos</h1>
  <p style="color:#64748b;margin-bottom:16px">Generado: ${new Date().toLocaleString('es-ES')} · Forgeser Servicios del Sur SL</p>
  
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Proyectos activos</div><div class="kpi-val">${r.total_proyectos || 0}</div></div>
    <div class="kpi"><div class="kpi-label">🔴 En rojo</div><div class="kpi-val" style="color:#dc2626">${r.proyectos_rojo || 0}</div></div>
    <div class="kpi"><div class="kpi-label">🟡 En amarillo</div><div class="kpi-val" style="color:#d97706">${r.proyectos_amarillo || 0}</div></div>
    <div class="kpi"><div class="kpi-label">Margen global</div><div class="kpi-val">${fmt(r.margen_global)}%</div></div>
  </div>

  <h2>Proyectos por rendimiento</h2>
  <table>
    <thead><tr>
      <th>▲</th><th>Proyecto</th><th style="text-align:center">Meses</th>
      <th style="text-align:right">Margen real</th><th style="text-align:right">Proyectado</th>
      <th style="text-align:right">Desv. total</th><th>Alertas</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table>
</body>
</html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (w) {
    w.document.write(html)
    w.document.close()
    w.onload = () => w.print()
  }
}

