// src/utils/pdfInformes.tsx
// PDFs profesionales para todos los tabs de Informes
// Requiere: npm install @react-pdf/renderer

import {
  Document, Page, View, Text, StyleSheet, pdf,
} from '@react-pdf/renderer'

// ─── Paleta Forgeser ─────────────────────────────────────────────────────────

const B = {
  verde:    '#1a3c34',
  verdeM:   '#2d5a4e',
  verdeCl:  '#e8f0ee',
  azul:     '#2563eb',
  emerald:  '#059669',
  amber:    '#d97706',
  rojo:     '#dc2626',
  slate:    '#475569',
  slateL:   '#e2e8f0',
  blanco:   '#ffffff',
  texto:    '#0f172a',
  textoM:   '#475569',
}

// ─── Helpers formateo ─────────────────────────────────────────────────────────

function euro(n: number | undefined | null): string {
  const v = n || 0
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(2) + ' M€'
  if (Math.abs(v) >= 1000)    return (v / 1000).toFixed(0) + ' K€'
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'
}

function pct(n: number | undefined | null): string {
  return (n || 0).toFixed(1) + '%'
}

function fechaHoy(): string {
  return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

function mesLabel(mesStr: string): string {
  const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const [y, m] = (mesStr || '').split('-')
  return `${MESES[parseInt(m)] || ''} ${y || ''}`
}

// ─── Estilos globales ─────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    backgroundColor: B.blanco,
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 0,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: B.texto,
  },
  // Header
  header: {
    backgroundColor: B.verde,
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 22,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  logoMark: {
    width: 36,
    height: 36,
    backgroundColor: B.verdeM,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: B.blanco,
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
  empresa: {
    color: '#9ec9bc',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  headerTitulo: {
    color: B.blanco,
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  headerSub: {
    color: '#9ec9bc',
    fontSize: 9,
    marginTop: 3,
  },
  // Body
  body: {
    paddingHorizontal: 32,
  },
  seccion: {
    marginBottom: 18,
  },
  seccionTitulo: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: B.verde,
    borderBottomWidth: 1,
    borderBottomColor: B.verdeCl,
    paddingBottom: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: B.verde,
  },
  kpiLabel: {
    fontSize: 7,
    color: B.textoM,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  kpiValor: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: B.texto,
  },
  kpiSub: {
    fontSize: 7,
    color: B.textoM,
    marginTop: 2,
  },
  // Tabla
  tabla: {
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: B.verde,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tablaCeldaH: {
    color: B.blanco,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tablaFila: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: B.slateL,
  },
  tablaFilaImpar: {
    backgroundColor: '#f8fafc',
  },
  tablaCelda: {
    fontSize: 8,
    color: B.texto,
  },
  tablaCeldaMuted: {
    fontSize: 8,
    color: B.textoM,
  },
  // Alerta
  alertaBox: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: B.rojo,
    gap: 6,
  },
  alertaTexto: {
    fontSize: 8,
    color: '#991b1b',
    fontFamily: 'Helvetica-Bold',
  },
  // Barra mini
  barraWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barraBg: {
    flex: 1,
    height: 4,
    backgroundColor: B.slateL,
    borderRadius: 2,
  },
  barraFill: {
    height: 4,
    borderRadius: 2,
  },
  // Dos columnas
  cols2: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: B.slateL,
    paddingTop: 6,
  },
  footerTxt: {
    fontSize: 7,
    color: B.textoM,
  },
  // Badge
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  // Info row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: B.slateL,
  },
  infoLabel: { fontSize: 8, color: B.textoM },
  infoValor: { fontSize: 8, color: B.texto, fontFamily: 'Helvetica-Bold' },
})

// ─── Componentes compartidos ─────────────────────────────────────────────────

function PDFHeader({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <View style={S.header}>
      <View style={S.headerRow}>
        <View style={S.logoMark}>
          <Text style={S.logoLetter}>F</Text>
        </View>
        <View>
          <Text style={S.empresa}>FORGESER SERVICIOS DEL SUR SL</Text>
          <Text style={{ color: '#9ec9bc', fontSize: 7 }}>Almonte, Huelva</Text>
        </View>
      </View>
      <Text style={S.headerTitulo}>{titulo}</Text>
      {subtitulo && <Text style={S.headerSub}>{subtitulo}</Text>}
      <Text style={[S.headerSub, { marginTop: 8, fontSize: 7 }]}>
        Generado el {fechaHoy()} · Documento confidencial
      </Text>
    </View>
  )
}

function PDFFooter() {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerTxt}>Forgeser Servicios del Sur SL · Documento confidencial</Text>
      <Text style={S.footerTxt} render={({ pageNumber, totalPages }) =>
        `Página ${pageNumber} de ${totalPages}`} />
    </View>
  )
}

function KpiBox({ label, valor, sub, color }: { label: string; valor: string; sub?: string; color?: string }) {
  return (
    <View style={[S.kpiBox, color ? { borderLeftColor: color } : {}]}>
      <Text style={S.kpiLabel}>{label}</Text>
      <Text style={[S.kpiValor, color ? { color } : {}]}>{valor}</Text>
      {sub && <Text style={S.kpiSub}>{sub}</Text>}
    </View>
  )
}

function BarraMini({ pctVal, color }: { pctVal: number; color: string }) {
  const w = Math.min(100, Math.max(0, pctVal))
  return (
    <View style={S.barraWrap}>
      <View style={S.barraBg}>
        <View style={[S.barraFill, { width: w + '%', backgroundColor: color }]} />
      </View>
      <Text style={{ fontSize: 7, color: B.textoM, width: 30, textAlign: 'right' }}>
        {pctVal.toFixed(1)}%
      </Text>
    </View>
  )
}

function SeccionTitulo({ children }: { children: string }) {
  return <Text style={S.seccionTitulo}>{children}</Text>
}

// ════════════════════════════════════════════════════════════════════════════
// PDF ECONÓMICO / P&L
// ════════════════════════════════════════════════════════════════════════════

export function PDFEconomico({ informeEco, informeContrato, mes }: any) {
  const g = informeEco?.global || {}
  const contratos: any[] = informeEco?.contratos || []
  const acum = informeContrato?.acumulado || null
  const meses: any[] = informeContrato?.meses || []
  const contrato = informeContrato?.contrato || null

  return (
    <Document title="Informe Económico P&L — Forgeser">
      <Page size="A4" style={S.page}>
        <PDFHeader
          titulo="Informe Económico P&L"
          subtitulo={mes ? `Periodo: ${mesLabel(mes)}` : undefined}
        />
        <View style={S.body}>

          {/* KPIs globales */}
          <View style={S.kpiGrid}>
            <KpiBox label="Contratos activos"   valor={String(g.contratos_activos || 0)} color={B.verde} />
            <KpiBox label="Ingresos acumulados"  valor={euro(g.total_ingresos)}           color={B.azul} />
            <KpiBox label="Beneficio acumulado"  valor={euro(g.total_beneficio)}
              color={(g.total_beneficio || 0) >= 0 ? B.emerald : B.rojo} />
            <KpiBox label="Margen global"        valor={pct(g.margen_global_pct)}
              color={(g.margen_global_pct || 0) >= 15 ? B.emerald : (g.margen_global_pct || 0) >= 10 ? B.amber : B.rojo} />
          </View>

          {/* Alerta si hay contratos en riesgo */}
          {(g.contratos_alerta || 0) > 0 && (
            <View style={S.alertaBox}>
              <Text style={S.alertaTexto}>
                ⚠ {g.contratos_alerta} contrato{g.contratos_alerta > 1 ? 's' : ''} con margen por debajo del 10%
              </Text>
            </View>
          )}

          {/* Tabla contratos */}
          <View style={S.seccion}>
            <SeccionTitulo>Contratos en ejecución</SeccionTitulo>
            <View style={S.tabla}>
              <View style={S.tablaHeader}>
                <Text style={[S.tablaCeldaH, { flex: 3 }]}>Contrato / Organismo</Text>
                <Text style={[S.tablaCeldaH, { flex: 1.5, textAlign: 'right' }]}>Ingresos</Text>
                <Text style={[S.tablaCeldaH, { flex: 1.5, textAlign: 'right' }]}>Costes</Text>
                <Text style={[S.tablaCeldaH, { flex: 1.5, textAlign: 'right' }]}>Beneficio</Text>
                <Text style={[S.tablaCeldaH, { flex: 1.2, textAlign: 'right' }]}>Margen</Text>
              </View>
              {contratos.map((c: any, i: number) => (
                <View key={c.id} style={[S.tablaFila, i % 2 === 1 ? S.tablaFilaImpar : {},
                  c.alerta_margen ? { backgroundColor: '#fff1f2' } : {}]}>
                  <View style={{ flex: 3 }}>
                    <Text style={[S.tablaCelda, { fontFamily: 'Helvetica-Bold' }]} numberOfLines={1}>
                      {c.titulo}
                    </Text>
                    <Text style={[S.tablaCeldaMuted, { fontSize: 7 }]} numberOfLines={1}>
                      {c.organismo}
                    </Text>
                  </View>
                  <Text style={[S.tablaCelda, { flex: 1.5, textAlign: 'right' }]}>{euro(c.ingresos_acum)}</Text>
                  <Text style={[S.tablaCelda, { flex: 1.5, textAlign: 'right', color: B.textoM }]}>{euro(c.costes_acum)}</Text>
                  <Text style={[S.tablaCelda, { flex: 1.5, textAlign: 'right',
                    fontFamily: 'Helvetica-Bold',
                    color: (c.beneficio_acum || 0) >= 0 ? B.emerald : B.rojo }]}>
                    {euro(c.beneficio_acum)}
                  </Text>
                  <View style={{ flex: 1.2 }}>
                    <BarraMini
                      pctVal={c.margen_real_pct || 0}
                      color={(c.margen_real_pct || 0) >= 15 ? B.emerald : (c.margen_real_pct || 0) >= 10 ? B.amber : B.rojo}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Detalle contrato seleccionado */}
          {contrato && acum && (
            <View style={S.seccion}>
              <SeccionTitulo>Detalle: {contrato.titulo}</SeccionTitulo>
              <Text style={[S.tablaCeldaMuted, { marginBottom: 8 }]}>{contrato.organismo}</Text>

              <View style={S.cols2}>
                <View style={S.col}>
                  <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Ingresos acumulados</Text>
                    <Text style={[S.infoValor, { color: B.azul }]}>{euro(acum.total_ingresos)}</Text>
                  </View>
                  <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Costes acumulados</Text>
                    <Text style={S.infoValor}>{euro(acum.total_costes)}</Text>
                  </View>
                  <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Beneficio acumulado</Text>
                    <Text style={[S.infoValor, { color: (acum.total_beneficio || 0) >= 0 ? B.emerald : B.rojo }]}>
                      {euro(acum.total_beneficio)}
                    </Text>
                  </View>
                  <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Margen real</Text>
                    <Text style={[S.infoValor, { color: (acum.margen_pct || 0) >= 10 ? B.emerald : B.rojo }]}>
                      {pct(acum.margen_pct)}
                    </Text>
                  </View>
                </View>
                <View style={S.col}>
                  <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Personal</Text>
                    <Text style={S.infoValor}>{euro(acum.coste_personal)}</Text>
                  </View>
                  <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Materiales</Text>
                    <Text style={S.infoValor}>{euro(acum.coste_materiales)}</Text>
                  </View>
                  <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Maquinaria</Text>
                    <Text style={S.infoValor}>{euro(acum.coste_maquinaria)}</Text>
                  </View>
                  <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Indirectos</Text>
                    <Text style={S.infoValor}>{euro(acum.costes_indirectos)}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Evolución mensual del contrato */}
          {meses.length > 0 && (
            <View style={S.seccion} break>
              <SeccionTitulo>Evolución mensual P&L</SeccionTitulo>
              <View style={S.tabla}>
                <View style={S.tablaHeader}>
                  <Text style={[S.tablaCeldaH, { width: 52 }]}>Periodo</Text>
                  <Text style={[S.tablaCeldaH, { flex: 1, textAlign: 'right' }]}>Ingresos</Text>
                  <Text style={[S.tablaCeldaH, { flex: 1, textAlign: 'right' }]}>Personal</Text>
                  <Text style={[S.tablaCeldaH, { flex: 1, textAlign: 'right' }]}>Materiales</Text>
                  <Text style={[S.tablaCeldaH, { flex: 1, textAlign: 'right' }]}>Total costes</Text>
                  <Text style={[S.tablaCeldaH, { flex: 1, textAlign: 'right' }]}>Beneficio</Text>
                  <Text style={[S.tablaCeldaH, { width: 46, textAlign: 'right' }]}>Margen</Text>
                </View>
                {meses.map((m: any, i: number) => (
                  <View key={m.periodo} style={[S.tablaFila, i % 2 === 1 ? S.tablaFilaImpar : {},
                    (m.beneficio || 0) < 0 ? { backgroundColor: '#fff1f2' } : {}]}>
                    <Text style={[S.tablaCelda, { width: 52, fontFamily: 'Helvetica-Bold' }]}>{m.periodo}</Text>
                    <Text style={[S.tablaCelda, { flex: 1, textAlign: 'right' }]}>{euro(m.ingresos)}</Text>
                    <Text style={[S.tablaCeldaMuted, { flex: 1, textAlign: 'right' }]}>{euro(m.coste_personal)}</Text>
                    <Text style={[S.tablaCeldaMuted, { flex: 1, textAlign: 'right' }]}>{euro(m.coste_materiales)}</Text>
                    <Text style={[S.tablaCelda, { flex: 1, textAlign: 'right' }]}>{euro(m.total_costes)}</Text>
                    <Text style={[S.tablaCelda, { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold',
                      color: (m.beneficio || 0) >= 0 ? B.emerald : B.rojo }]}>
                      {euro(m.beneficio)}
                    </Text>
                    <Text style={[S.tablaCelda, { width: 46, textAlign: 'right',
                      color: (m.margen || 0) >= 15 ? B.emerald : (m.margen || 0) >= 10 ? B.amber : B.rojo }]}>
                      {pct(m.margen)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
        <PDFFooter />
      </Page>
    </Document>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PDF LICITACIONES
// ════════════════════════════════════════════════════════════════════════════

export function PDFLicitaciones({ informeLic }: any) {
  const k = informeLic?.kpis || {}
  const ops: any[] = informeLic?.ultimas_oportunidades || []
  const porEstado: Record<string, number> = informeLic?.por_estado || {}
  const maxEstado = Math.max(...Object.values(porEstado).map(Number), 1)

  const ESTADO_LABEL: Record<string, string> = {
    nueva: 'Nueva', en_analisis: 'En análisis', go: 'GO', no_go: 'NO-GO',
    presentada: 'Presentada', adjudicada: 'Adjudicada', perdida: 'Perdida', descartada: 'Descartada',
  }
  const ESTADO_COLOR: Record<string, string> = {
    nueva: B.azul, en_analisis: B.amber, go: B.emerald, no_go: B.rojo,
    presentada: '#6366f1', adjudicada: '#7c3aed', perdida: '#be123c', descartada: B.slate,
  }

  return (
    <Document title="Informe Licitaciones — Forgeser">
      <Page size="A4" style={S.page}>
        <PDFHeader titulo="Informe de Licitaciones" subtitulo="Pipeline y seguimiento de oportunidades" />
        <View style={S.body}>

          {/* KPIs */}
          <View style={S.kpiGrid}>
            <KpiBox label="Total oportunidades"  valor={String(k.total_oportunidades || 0)} color={B.azul} />
            <KpiBox label="Tasa de éxito"         valor={pct(k.tasa_exito_pct)}              color={B.emerald} />
            <KpiBox label="Importe adjudicado"    valor={euro(k.importe_adjudicado)}          color={B.verde} />
            <KpiBox label="Pipeline presupuesto"  valor={euro(k.presupuesto_pipeline)}        color='#7c3aed' />
          </View>
          <View style={[S.kpiGrid, { marginTop: -8 }]}>
            <KpiBox label="Scoring medio"        valor={String(k.scoring_medio || 0)} color={B.amber} />
            <KpiBox label="Contratos activos"    valor={String(k.contratos_activos || 0)} color={B.emerald} />
          </View>

          {/* Pipeline visual */}
          {Object.keys(porEstado).length > 0 && (
            <View style={S.seccion}>
              <SeccionTitulo>Pipeline por estado</SeccionTitulo>
              {Object.entries(porEstado)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([estado, count]) => (
                  <View key={estado} style={{ marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 8, color: B.texto }}>{ESTADO_LABEL[estado] || estado}</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: ESTADO_COLOR[estado] || B.slate }}>
                        {count} licitación{(count as number) !== 1 ? 'es' : ''}
                      </Text>
                    </View>
                    <View style={S.barraBg}>
                      <View style={[S.barraFill, {
                        width: ((count as number) / maxEstado * 100) + '%',
                        backgroundColor: ESTADO_COLOR[estado] || B.slate,
                        height: 8,
                      }]} />
                    </View>
                  </View>
                ))}
            </View>
          )}

          {/* Tabla oportunidades */}
          {ops.length > 0 && (
            <View style={S.seccion}>
              <SeccionTitulo>Últimas oportunidades</SeccionTitulo>
              <View style={S.tabla}>
                <View style={S.tablaHeader}>
                  <Text style={[S.tablaCeldaH, { flex: 4 }]}>Licitación</Text>
                  <Text style={[S.tablaCeldaH, { flex: 2, textAlign: 'right' }]}>Presupuesto</Text>
                  <Text style={[S.tablaCeldaH, { width: 40, textAlign: 'center' }]}>Score</Text>
                  <Text style={[S.tablaCeldaH, { width: 70, textAlign: 'center' }]}>Estado</Text>
                </View>
                {ops.map((o: any, i: number) => (
                  <View key={o.id} style={[S.tablaFila, i % 2 === 1 ? S.tablaFilaImpar : {}]}>
                    <View style={{ flex: 4 }}>
                      <Text style={[S.tablaCelda, { fontFamily: 'Helvetica-Bold' }]} numberOfLines={1}>
                        {o.titulo}
                      </Text>
                      <Text style={[S.tablaCeldaMuted, { fontSize: 7 }]} numberOfLines={1}>
                        {o.organismo}
                      </Text>
                    </View>
                    <Text style={[S.tablaCelda, { flex: 2, textAlign: 'right' }]}>{euro(o.presupuesto)}</Text>
                    <Text style={[S.tablaCelda, { width: 40, textAlign: 'center', fontFamily: 'Helvetica-Bold',
                      color: (o.scoring || 0) >= 70 ? B.emerald : (o.scoring || 0) >= 50 ? B.amber : B.slate }]}>
                      {o.scoring || 0}
                    </Text>
                    <View style={{ width: 70, alignItems: 'center' }}>
                      <Text style={[S.badge, {
                        backgroundColor: ESTADO_COLOR[o.estado] ? ESTADO_COLOR[o.estado] + '22' : '#f1f5f9',
                        color: ESTADO_COLOR[o.estado] || B.slate,
                      }]}>
                        {ESTADO_LABEL[o.estado] || o.estado}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
        <PDFFooter />
      </Page>
    </Document>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PDF RRHH
// ════════════════════════════════════════════════════════════════════════════

export function PDFRRHH({ informeRRHH, mes }: any) {
  const p = informeRRHH?.plantilla  || {}
  const f = informeRRHH?.fichajes   || {}
  const a = informeRRHH?.ausencias  || {}
  const empleados: any[] = informeRRHH?.empleados_detalle || []

  return (
    <Document title="Informe RRHH — Forgeser">
      <Page size="A4" style={S.page}>
        <PDFHeader
          titulo="Informe de Recursos Humanos"
          subtitulo={mes ? `Mes: ${mesLabel(mes)}` : undefined}
        />
        <View style={S.body}>

          {/* KPIs plantilla */}
          <View style={S.kpiGrid}>
            <KpiBox label="Plantilla total"      valor={String(p.total  || 0)} color={B.verde} />
            <KpiBox label="Empleados activos"    valor={String(p.activos || 0)} color={B.emerald} />
            <KpiBox label="Contratos vencer 30d" valor={String(p.contratos_vencer_30d || 0)}
              color={(p.contratos_vencer_30d || 0) > 0 ? B.rojo : B.slate} />
            <KpiBox label="Coste nómina est."    valor={euro(informeRRHH?.coste_nomina_estimado)} color={B.slate} />
          </View>

          {/* KPIs fichajes + ausencias */}
          <View style={S.cols2}>
            <View style={[S.col, { backgroundColor: '#f0fdf4', borderRadius: 6, padding: 12, marginBottom: 16 }]}>
              <Text style={[S.seccionTitulo, { borderBottomColor: '#bbf7d0', fontSize: 8, marginBottom: 6 }]}>
                FICHAJES DEL MES
              </Text>
              <View style={S.infoRow}>
                <Text style={S.infoLabel}>Horas trabajadas</Text>
                <Text style={[S.infoValor, { color: B.azul }]}>{(f.total_horas || 0)}h</Text>
              </View>
              <View style={S.infoRow}>
                <Text style={S.infoLabel}>Horas extra</Text>
                <Text style={[S.infoValor, { color: (f.horas_extra || 0) > 40 ? B.rojo : B.amber }]}>
                  {(f.horas_extra || 0)}h
                </Text>
              </View>
              <View style={[S.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={S.infoLabel}>Días trabajados</Text>
                <Text style={S.infoValor}>{f.dias_trabajados || 0}</Text>
              </View>
            </View>

            <View style={[S.col, { backgroundColor: (a.pendientes_aprobar || 0) > 0 ? '#fffbeb' : '#f8fafc', borderRadius: 6, padding: 12, marginBottom: 16 }]}>
              <Text style={[S.seccionTitulo, { borderBottomColor: B.slateL, fontSize: 8, marginBottom: 6 }]}>
                AUSENCIAS DEL MES
              </Text>
              <View style={S.infoRow}>
                <Text style={S.infoLabel}>Total ausencias</Text>
                <Text style={S.infoValor}>{a.total || 0}</Text>
              </View>
              <View style={[S.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={S.infoLabel}>Pendientes aprobar</Text>
                <Text style={[S.infoValor, { color: (a.pendientes_aprobar || 0) > 0 ? B.amber : B.slate }]}>
                  {a.pendientes_aprobar || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Tabla empleados */}
          {empleados.length > 0 && (
            <View style={S.seccion}>
              <SeccionTitulo>Detalle de plantilla</SeccionTitulo>
              <View style={S.tabla}>
                <View style={S.tablaHeader}>
                  <Text style={[S.tablaCeldaH, { flex: 2.5 }]}>Empleado</Text>
                  <Text style={[S.tablaCeldaH, { flex: 1.5 }]}>Categoría</Text>
                  <Text style={[S.tablaCeldaH, { flex: 2 }]}>Centro</Text>
                  <Text style={[S.tablaCeldaH, { flex: 1.2, textAlign: 'right' }]}>Salario bruto</Text>
                  <Text style={[S.tablaCeldaH, { width: 52, textAlign: 'center' }]}>Estado</Text>
                </View>
                {empleados.map((e: any, i: number) => (
                  <View key={e.id} style={[S.tablaFila, i % 2 === 1 ? S.tablaFilaImpar : {}]}>
                    <View style={{ flex: 2.5 }}>
                      <Text style={[S.tablaCelda, { fontFamily: 'Helvetica-Bold' }]} numberOfLines={1}>
                        {e.nombre} {e.apellidos}
                      </Text>
                      <Text style={[S.tablaCeldaMuted, { fontSize: 7 }]}>{e.dni}</Text>
                    </View>
                    <Text style={[S.tablaCeldaMuted, { flex: 1.5 }]} numberOfLines={1}>{e.categoria || '—'}</Text>
                    <Text style={[S.tablaCeldaMuted, { flex: 2 }]} numberOfLines={1}>{e.centro || '—'}</Text>
                    <Text style={[S.tablaCelda, { flex: 1.2, textAlign: 'right' }]}>{euro(e.salario_bruto)}</Text>
                    <View style={{ width: 52, alignItems: 'center' }}>
                      <Text style={[S.badge, {
                        backgroundColor: e.estado === 'activo' ? '#dcfce7' : '#f1f5f9',
                        color: e.estado === 'activo' ? B.emerald : B.slate,
                      }]}>
                        {e.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              {empleados.length >= 20 && (
                <Text style={{ fontSize: 7, color: B.textoM, marginTop: 4, textAlign: 'right' }}>
                  Mostrando primeros 20 empleados. Exporta a Excel para el listado completo.
                </Text>
              )}
            </View>
          )}
        </View>
        <PDFFooter />
      </Page>
    </Document>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PDF TERRITORIO
// ════════════════════════════════════════════════════════════════════════════

export function PDFTerritorio({ informeTerr, mes }: any) {
  const c  = informeTerr?.centros     || {}
  const op = informeTerr?.operativo   || {}
  const ic = informeTerr?.incidencias || {}
  const ca = informeTerr?.calidad     || {}
  const totalCostes = (op.coste_personal || 0) + (op.coste_materiales || 0)

  return (
    <Document title="Informe Territorio — Forgeser">
      <Page size="A4" style={S.page}>
        <PDFHeader
          titulo="Informe de Territorio"
          subtitulo={mes ? `Mes: ${mesLabel(mes)}` : undefined}
        />
        <View style={S.body}>

          {/* KPIs */}
          <View style={S.kpiGrid}>
            <KpiBox label="Centros activos"      valor={String(c.activos || 0)} color={B.verde} />
            <KpiBox label="Partes completados"   valor={`${op.partes_completados || 0} / ${op.partes_totales || 0}`}
              color={B.emerald} />
            <KpiBox label="Horas trabajadas"     valor={`${op.horas_trabajadas || 0}h`} color={B.azul} />
            <KpiBox label="Calidad media"        valor={`${ca.media_mes || 0}/5`}
              color={(ca.media_mes || 0) >= 4 ? B.emerald : (ca.media_mes || 0) >= 3 ? B.amber : B.rojo} />
          </View>

          {/* Resumen operativo */}
          <View style={S.cols2}>
            <View style={S.col}>
              <View style={[{ backgroundColor: '#f0fdf4', borderRadius: 6, padding: 12, marginBottom: 16 }]}>
                <Text style={[S.seccionTitulo, { borderBottomColor: '#bbf7d0', fontSize: 8, marginBottom: 8 }]}>
                  COSTES OPERATIVOS
                </Text>
                <View style={S.infoRow}>
                  <Text style={S.infoLabel}>Personal</Text>
                  <Text style={S.infoValor}>{euro(op.coste_personal)}</Text>
                </View>
                <View style={S.infoRow}>
                  <Text style={S.infoLabel}>Materiales</Text>
                  <Text style={S.infoValor}>{euro(op.coste_materiales)}</Text>
                </View>
                <View style={[S.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={[S.infoLabel, { fontFamily: 'Helvetica-Bold' }]}>Total</Text>
                  <Text style={[S.infoValor, { color: B.verde }]}>{euro(totalCostes)}</Text>
                </View>
                {totalCostes > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ marginBottom: 4 }}>
                      <Text style={{ fontSize: 7, color: B.textoM, marginBottom: 2 }}>
                        Personal — {pct((op.coste_personal || 0) / totalCostes * 100)}
                      </Text>
                      <BarraMini
                        pctVal={(op.coste_personal || 0) / totalCostes * 100}
                        color={B.verde}
                      />
                    </View>
                    <View>
                      <Text style={{ fontSize: 7, color: B.textoM, marginBottom: 2 }}>
                        Materiales — {pct((op.coste_materiales || 0) / totalCostes * 100)}
                      </Text>
                      <BarraMini
                        pctVal={(op.coste_materiales || 0) / totalCostes * 100}
                        color={B.azul}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={S.col}>
              <View style={[{ backgroundColor: (ic.abiertas || 0) > 0 ? '#fff1f2' : '#f8fafc', borderRadius: 6, padding: 12, marginBottom: 16 }]}>
                <Text style={[S.seccionTitulo, { borderBottomColor: B.slateL, fontSize: 8, marginBottom: 8 }]}>
                  INCIDENCIAS Y CALIDAD
                </Text>
                <View style={S.infoRow}>
                  <Text style={S.infoLabel}>Incidencias abiertas</Text>
                  <Text style={[S.infoValor, { color: (ic.abiertas || 0) > 0 ? B.rojo : B.emerald }]}>
                    {ic.abiertas || 0}
                  </Text>
                </View>
                <View style={S.infoRow}>
                  <Text style={S.infoLabel}>SLA vencidos</Text>
                  <Text style={[S.infoValor, { color: (ic.sla_vencidas || 0) > 0 ? B.rojo : B.emerald }]}>
                    {ic.sla_vencidas || 0}
                  </Text>
                </View>
                <View style={S.infoRow}>
                  <Text style={S.infoLabel}>Inspecciones calidad</Text>
                  <Text style={S.infoValor}>{ca.num_inspecciones || 0}</Text>
                </View>
                <View style={[S.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={S.infoLabel}>Puntuación media</Text>
                  <Text style={[S.infoValor, {
                    color: (ca.media_mes || 0) >= 4 ? B.emerald : (ca.media_mes || 0) >= 3 ? B.amber : B.rojo
                  }]}>
                    {ca.media_mes || 0} / 5
                  </Text>
                </View>
              </View>

              <View style={[{ backgroundColor: '#f8fafc', borderRadius: 6, padding: 12 }]}>
                <Text style={[S.seccionTitulo, { borderBottomColor: B.slateL, fontSize: 8, marginBottom: 8 }]}>
                  CENTROS
                </Text>
                <View style={S.infoRow}>
                  <Text style={S.infoLabel}>Total centros</Text>
                  <Text style={S.infoValor}>{c.total || 0}</Text>
                </View>
                <View style={S.infoRow}>
                  <Text style={S.infoLabel}>Centros activos</Text>
                  <Text style={[S.infoValor, { color: B.emerald }]}>{c.activos || 0}</Text>
                </View>
                <View style={[S.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={S.infoLabel}>Presupuesto anual</Text>
                  <Text style={S.infoValor}>{euro(c.total_presupuesto_anual)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <PDFFooter />
      </Page>
    </Document>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PDF RENDIMIENTO
// ════════════════════════════════════════════════════════════════════════════

export function PDFRendimiento({ informeRend }: any) {
  const r = informeRend?.resumen   || {}
  const proyectos: any[] = informeRend?.proyectos || []

  const semaforoLabel: Record<string, string> = { rojo: '● ROJO', amarillo: '● AMARILLO', verde: '● VERDE' }
  const semaforoColor: Record<string, string>  = { rojo: B.rojo, amarillo: B.amber, verde: B.emerald }

  return (
    <Document title="Informe Rendimiento — Forgeser">
      <Page size="A4" style={S.page}>
        <PDFHeader titulo="Informe de Rendimiento" subtitulo="Desviación presupuestaria por proyecto" />
        <View style={S.body}>

          {/* KPIs */}
          <View style={S.kpiGrid}>
            <KpiBox label="Proyectos activos"  valor={String(r.total_proyectos    || 0)} color={B.verde} />
            <KpiBox label="En rojo"            valor={String(r.proyectos_rojo    || 0)}
              color={(r.proyectos_rojo || 0) > 0 ? B.rojo : B.slate} />
            <KpiBox label="En amarillo"        valor={String(r.proyectos_amarillo || 0)} color={B.amber} />
            <KpiBox label="En verde"           valor={String(r.proyectos_verde   || 0)} color={B.emerald} />
          </View>
          <View style={[S.kpiGrid, { marginTop: -8 }]}>
            <KpiBox label="Ingresos acum."    valor={euro(r.total_ingresos)}  color={B.azul} />
            <KpiBox label="Costes acum."      valor={euro(r.total_costes)}    color={B.slate} />
            <KpiBox label="Beneficio acum."   valor={euro(r.total_beneficio)}
              color={(r.total_beneficio || 0) >= 0 ? B.emerald : B.rojo} />
            <KpiBox label="Margen global"     valor={pct(r.margen_global)}
              color={(r.margen_global || 0) >= 15 ? B.emerald : (r.margen_global || 0) >= 10 ? B.amber : B.rojo} />
          </View>

          {/* Tabla proyectos */}
          {proyectos.length > 0 && (
            <View style={S.seccion}>
              <SeccionTitulo>Desviación por proyecto</SeccionTitulo>
              <View style={S.tabla}>
                <View style={S.tablaHeader}>
                  <Text style={[S.tablaCeldaH, { width: 52 }]}>Estado</Text>
                  <Text style={[S.tablaCeldaH, { flex: 3 }]}>Proyecto</Text>
                  <Text style={[S.tablaCeldaH, { width: 48, textAlign: 'center' }]}>Avance</Text>
                  <Text style={[S.tablaCeldaH, { width: 52, textAlign: 'right' }]}>Margen real</Text>
                  <Text style={[S.tablaCeldaH, { width: 52, textAlign: 'right' }]}>Proyectado</Text>
                  <Text style={[S.tablaCeldaH, { width: 52, textAlign: 'right' }]}>Desv. total</Text>
                </View>
                {proyectos.map((p: any, i: number) => {
                  const desvPct = p.desviacion_partidas?.total?.pct || 0
                  return (
                    <View key={p.id} style={[S.tablaFila, i % 2 === 1 ? S.tablaFilaImpar : {},
                      p.semaforo === 'rojo' ? { backgroundColor: '#fff1f2' } :
                      p.semaforo === 'amarillo' ? { backgroundColor: '#fffbeb' } : {}]}>
                      <Text style={[S.badge, { width: 52,
                        color: semaforoColor[p.semaforo] || B.slate,
                        fontSize: 7, fontFamily: 'Helvetica-Bold' }]}>
                        {semaforoLabel[p.semaforo] || '●'}
                      </Text>
                      <View style={{ flex: 3 }}>
                        <Text style={[S.tablaCelda, { fontFamily: 'Helvetica-Bold' }]} numberOfLines={1}>
                          {p.titulo}
                        </Text>
                        <Text style={[S.tablaCeldaMuted, { fontSize: 7 }]} numberOfLines={1}>
                          {p.organismo}
                        </Text>
                      </View>
                      <Text style={[S.tablaCelda, { width: 48, textAlign: 'center' }]}>
                        {p.meses_ejecutados}/{(p.meses_ejecutados || 0) + (p.meses_restantes || 0)}m
                      </Text>
                      <Text style={[S.tablaCelda, { width: 52, textAlign: 'right',
                        color: (p.margen_real || 0) >= 15 ? B.emerald : (p.margen_real || 0) >= 10 ? B.amber : B.rojo }]}>
                        {pct(p.margen_real)}
                      </Text>
                      <Text style={[S.tablaCelda, { width: 52, textAlign: 'right',
                        color: (p.margen_proyectado || 0) >= 10 ? B.emerald : B.rojo }]}>
                        {pct(p.margen_proyectado)}
                      </Text>
                      <Text style={[S.tablaCelda, { width: 52, textAlign: 'right',
                        color: desvPct > 10 ? B.rojo : desvPct > 5 ? B.amber : B.emerald }]}>
                        {desvPct > 0 ? '+' : ''}{pct(desvPct)}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}
        </View>
        <PDFFooter />
      </Page>
    </Document>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Helper descarga
// ════════════════════════════════════════════════════════════════════════════

export async function descargarPDF(documento: React.ReactElement, nombre: string) {
  const blob = await pdf(documento).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
