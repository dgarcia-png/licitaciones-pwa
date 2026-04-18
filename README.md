# Forgeser PWA — Frontend

PWA React + TypeScript + Vite del sistema integral Forgeser. Despliega en Vercel.

> **Contexto**: Frontend de gestión integral para Forgeser Servicios del Sur SL (limpieza/facilities sector público andaluz). Conecta con backend Cloud Run + GAS legacy.

---

## Stack técnico

| Componente | Versión |
|---|---|
| React | 19.2.x |
| TypeScript | 5.9.x |
| Vite | 8.0.x |
| Tailwind CSS | 4.2.x |
| React Router | 7.13.x |
| Zustand | 5.0.x (state) |
| TanStack Query | 5.91.x |
| Recharts | 3.8.x |
| `@react-pdf/renderer` | 4.3.x |
| `xlsx` | 0.18.x (export Excel) |
| Lucide React | 0.577.x (iconos) |
| Sentry React | 10.49.x (error tracking) |

Lista completa en [`package.json`](./package.json).

---

## URLs

- **Producción**: https://licitaciones-pwa.vercel.app
- **Backend API**: https://forgeser-backend-801944899567.europe-west1.run.app
- **Repo GitHub**: https://github.com/dgarcia-png/licitaciones-pwa
- **Vercel project**: `davids-projects-88ae293e/licitaciones-pwa`

---

## Arquitectura

```
Navegador (PWA instalable)
    ↓ HTTPS + x-token header
Cloud Run "forgeser-backend"
    ↓
Firestore + Drive + Gemini + GAS
```

El frontend **nunca** habla directamente con Firestore (las rules son deny-all). Todo pasa por el backend Cloud Run vía `api.ts`.

---

## Scripts npm

```bash
npm run dev        # Servidor desarrollo Vite (puerto 5173)
npm run build      # Build producción → dist/
npm run preview    # Preview del build
npm run lint       # ESLint
```

---

## Despliegue a producción

```bash
cd ~/Desktop/licitaciones-pwa

# 1. Verifica TypeScript sin errores
npx tsc --noEmit

# 2. Build local
npx vercel build --prod

# 3. Deploy
npx vercel deploy --prebuilt --prod
```

Tras deploy, verifica en navegador:
- https://licitaciones-pwa.vercel.app
- DevTools → Application → Service Workers (debería actualizar el SW solo)

Si la UI sigue mostrando versión vieja: F12 → Application → Storage → Clear site data + hard refresh (Cmd+Shift+R).

---

## Estructura del repo

```
licitaciones-pwa/
├── src/
│   ├── main.tsx              # Entry point + Sentry init + SW registro
│   ├── App.tsx               # Router + AuthContext
│   ├── index.css
│   ├── pages/                # ~50 páginas (una por ruta)
│   ├── components/           # Componentes compartidos
│   ├── context/              # AuthContext, etc.
│   ├── hooks/                # useConfigListas, useOffline, etc.
│   ├── services/
│   │   └── api.ts            # fetchFAST/postFAST/putFAST/deleteFAST
│   └── utils/
│
├── public/
│   ├── sw.js                 # Service Worker (cache + offline queue)
│   └── manifest.json         # PWA manifest
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

---

## Módulos principales (páginas)

### Licitaciones
- `OportunidadesPage` — listado con filtros
- `NuevaOportunidadPage` — alta manual
- `DetalleOportunidadPage` — análisis IA + scoring
- `OfertaPage`, `DecisionesPage`, `SeguimientoPage`, `AnalisisPage`
- `DashboardLicitacionesPage`, `ConocimientoPage`, `PlantillasPage`
- `ConveniosPage`, `CalculoPage`

### RRHH
- `PersonalPage`, `FichajesPage`, `AusenciasPage`
- `CertificacionesPage`, `PrlPage`, `RgpdPage`
- `HorasExtrasPage`, `SubrogacionPage`
- `DashboardRRHHPage`

### Territorio
- `TerritorioPage`, `OperadorCampoV2Page`
- `PartesPage`, `OrdenesPage`, `PlanificacionPage`
- `IncidenciasPage`, `InventarioPage`, `VehiculosPage`
- `CalidadPage`, `ChecklistConfigPage`, `MapaSupervisorPage`
- `DashboardTerritorioPage`

### Portal cliente / empleado
- `PortalClientePage` — vista cliente con token único
- `PortalEmpleadoPage` — autoservicio empleado
- `PortalTokensPage` — gestión tokens admin

### Sistema
- `LoginPage`, `DashboardPage` (Dashboard 360)
- `ConfiguracionPage`, `UsuariosPage`
- `AlertasPage`, `EscaneoDocumentosPage`
- `DocumentosPage`, `InformesPage`

---

## Roles y permisos

Definidos en backend (ver `forgeser-backend/README.md`). Frontend lee `usuario.rol` desde Auth context tras login y muestra/oculta secciones del menú.

| Rol | Nivel |
|---|---|
| `SUPER_ADMIN` | 1 |
| `DIRECTOR_GERENTE` | 2 |
| `ADMIN_RRHH`, `ADMIN_LICITACIONES`, `ADMIN_TERRITORIO` | 2 |
| `RESPONSABLE_COMERCIAL`, `RESPONSABLE_PRL`, `RESPONSABLE_RGPD`, `SUPERVISOR_TERRITORIO` | 3 |
| `TRABAJADOR_CAMPO`, `TRABAJADOR_LECTURA` | 5 |

---

## API client (`src/services/api.ts`)

Helpers principales:
```ts
import { fetchFAST, postFAST, putFAST, deleteFAST } from './services/api'

const data = await fetchFAST('/empleados')
const resp = await postFAST('/fichajes', { empleado_id, accion: 'entrada' })
```

Todos añaden header `x-token` con el JWT del localStorage. Si la respuesta tiene `code: 401`, hacen logout automático y redirigen a `/login`.

---

## Auth flow

1. Usuario entra a `/login` → `LoginPage`
2. POST `/auth/login` con email + password
3. Backend devuelve `{ ok, token, usuario: { email, nombre, rol, nivel, empleado_id } }`
4. `AuthContext` guarda en localStorage:
   - `auth_token` — el JWT
   - `usuario` — JSON del objeto usuario
5. Cada petición a la API incluye `x-token: {token}`
6. Token expira a las 24h → próxima petición devuelve 401 → logout automático

**Pendiente F-NEW-1**: botón "Cerrar sesión" en sidebar (hoy no existe).

---

## Service Worker

`public/sw.js` registra al cargar la app (`main.tsx`). Funcionalidades:
- Cache de assets estáticos (offline first)
- Bypass cache para llamadas a Cloud Run (siempre fresh)
- Cola offline de mutaciones (reintenta cuando vuelve red)
- Auto-update al detectar nueva versión del SW
- Reload automático al activarse nuevo SW

---

## Sentry — observabilidad

Inicializado en `main.tsx`. Solo activo en producción (no en `localhost`). Captura:
- Errores no controlados (window.onerror)
- Promise rejections
- Errores de React renderizado

Filtros aplicados:
- Ignora extensiones de navegador
- Redacta `token=...` de URLs antes de enviar
- No envía PII por defecto

Dashboard: https://forgeser.sentry.io/

---

## Estilo y diseño

- **Color principal**: verde Forgeser `#1a3c34` / `#2d5a4e`
- **Iconos**: lucide-react
- **Componentes UI**: shadcn/ui (algunos)
- **Charts**: recharts

---

## Cosas a saber (gotchas)

- **Tras deploy**: Service Worker puede mostrar caché vieja. Si se ven inconsistencias, usuario debe Ctrl+Shift+R o limpiar site data.
- **Bundle InformesPage**: 1.6MB chunk monstruo (C30 pendiente). Hacer dynamic import.
- **`@react-pdf/renderer`**: 450KB, solo se usa en Informes. Candidato a code-split.
- **Sanitize en api.ts**: convierte campos `_at`, fechas, etc. automáticamente. Cuidado al añadir nuevos campos con nombres similares.
- **`localStorage`**: `auth_token` y `usuario` son las claves. Borrarlas equivale a logout.
- **`InformesPage` 1.6MB chunk** — pendiente code-split (C30).

---

## Pendientes (resumen)

Ver backlog completo. Frontend prioritarios:
- **F-NEW-1**: botón "Cerrar sesión" en menú
- **F-NEW-2**: gestor configurable de roles + edición usuarios
- **F-NEW-4**: quitar línea 78 de `ConfiguracionPage.tsx` (`ss_empresa_pct` huérfano)
- **C30**: code-split `InformesPage` (1.6MB)
- **C31**: `LoginPage` debe mostrar errores de credenciales incorrectas
- **C32**: privilege escalation por edición de localStorage (riesgo bajo, no crítico)

---

## Variables de entorno

Vercel auto-inyecta las suyas. Para desarrollo local en `.env`:
```
# Ninguna obligatoria por ahora — el backend URL está hardcoded en api.ts
```

Si en el futuro hay env vars (Sentry DSN dinámico, distintos backends por entorno), prefijar con `VITE_` para que Vite las exponga.

---

## Contacto

- **Desarrollador**: David García (`adavidgcia@gmail.com`)

---

_Última actualización: 18/04/2026_
