# Catálogo de Productos y Sedes con Juegos y Administración

Aplicación web completa y responsive (computador, tablet y celular) para la exhibición de productos, sedes presenciales/virtuales, juegos interactivos ("Mientras esperas:") y panel de administración integral con control de roles y personalización de identidad visual.

---

## Características Principales

1. **Header y Navegación Responsive:**
   - Secciones: **Inicio**, **Productos**, **Sedes**, **Contacto** y **Login/Panel**.
   - Espacio para **logo PNG** de la empresa, modificable por el administrador.
   - Selectores de color para el **fondo del header** y el **fondo general de la página**, con cálculo automático de contraste para legibilidad de textos.
   - Botón inteligente **Pide a domicilio** (visible si el servicio está habilitado).

2. **Página de Inicio:**
   - Tarjetas de contenido informativas con título, descripción e imagen.
   - Configuración de alineación de imagen (izquierda o derecha).
   - Ajuste de tamaño de tarjeta (`sm`, `md`, `lg`, `full`) y de imagen (`sm`, `md`, `lg`).
   - CRUD completo administrable en tiempo real.

3. **Catálogo de Productos y Juegos Interactivos:**
   - **Característica por defecto "Mientras esperas:":**
     - **Sudoku:** con validación de casillas, teclado numérico en móviles y reinicio.
     - **Culebrita (Snake):** controlable con teclado (flechas o WASD), gestos táctiles (swipe) y panel D-Pad virtual en pantalla para celulares y tablets.
     - **Triki (Tres en raya):** modo contra la máquina (1 jugador con IA) o 2 jugadores locales.
   - Productos organizados por **categorías contraídas por defecto** con indicador de cantidad y flecha desplegable.
   - Cada producto incluye imagen, título, precio, descripción con botón **Ver más** para expandir/contraer.
   - **Sistema de Descuentos:** switch para activar/desactivar, precio regular tachado y precio con descuento como precio actual, borde rojo sutil y badge discreto de "Descuento". Al desactivarse, el valor anterior se conserva en base de datos pero se oculta al público.
   - **Eliminación en cascada de categorías:** al eliminar una categoría, se solicita confirmación explícita y se eliminan automáticamente todos sus productos asociados.

4. **Sedes Presenciales y Virtuales:**
   - **Presenciales:** dirección física, horarios para lunes a sábado, domingos y festivos, y botón directo **Cómo llegar** con enlace configurable (Google Maps / Waze).
   - **Virtuales:** horarios independientes para lunes a viernes en la mañana, lunes a viernes en la tarde, y fin de semana.
   - **Detección inteligente de dispositivo:**
     - En **celular/tablet:** intenta abrir el deep link de la aplicación (ej. Didi Food, Rappi, etc.); si no está instalada, redirige automáticamente a la tienda de aplicaciones (Play Store / App Store).
     - En **computador:** abre la página web o enlace de descarga de la plataforma.

5. **Seguridad, Usuarios y Roles:**
   - **Credenciales iniciales de instalación:**
     - Usuario: `Admin`
     - Contraseña: `Admin`
   - **Configuración inicial obligatoria:** en el primer inicio de sesión se exige cambiar el usuario, contraseña segura y registrar correo de recuperación (con envío de código de verificación si SMTP está activo).
   - El administrador no puede eliminarse a sí mismo.
   - Creación, edición y eliminación de **Colaboradores** (con nombre, usuario y contraseña).
   - **Permisos estrictos:**
     - **Administrador:** productos, categorías, sedes, inicio, contacto, colaboradores, logo y colores.
     - **Colaborador:** restringido únicamente a crear, modificar y eliminar productos.
   - Contraseñas almacenadas de forma segura mediante **hash bcrypt con sal**.

6. **Formulario de Contacto:**
   - Campos: nombre, correo electrónico obligatorio y mensaje (comentario, sugerencia, petición o agradecimiento).
   - Guarda el mensaje en base de datos SQLite y, si el correo SMTP y el correo de contacto están configurados, envía la notificación inmediatamente.
   - Notificación de confirmación en pantalla al usuario tras el envío.

7. **Persistencia y Arquitectura:**
   - Base de datos **SQLite** con claves foráneas activas (`PRAGMA foreign_keys=ON`).
   - Las imágenes se guardan como archivos en disco bajo la carpeta `uploads/` (en SQLite solo se guarda la ruta relativa, nunca datos binarios BLOB).
   - Compatible con volúmenes persistentes de Docker.

---

## Cómo Ejecutar de Forma Local (Sin Docker)

### Requisitos previos
- **Python 3.10** o superior instalado en el equipo.
- Gestor de paquetes `pip`.

### Paso a paso

1. **Abrir la terminal en la carpeta del proyecto:**
   ```bash
   cd c:\Users\farid\Desktop\appprodcutos
   ```

2. **Crear un entorno virtual de Python:**
   - En Windows:
     ```powershell
     python -m venv .venv
     ```
   - En Linux / macOS:
     ```bash
     python3 -m venv .venv
     ```

3. **Activar el entorno virtual:**
   - En Windows (PowerShell):
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
     *(Si PowerShell bloquea scripts por política de ejecución, ejecute: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*
   - En Windows (Símbolo del sistema / CMD):
     ```cmd
     .\.venv\Scripts\activate.bat
     ```
   - En Linux / macOS:
     ```bash
     source .venv/bin/activate
     ```

4. **Instalar las dependencias del proyecto:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configurar las variables de entorno:**
   Copie el archivo de ejemplo:
   - En Windows (PowerShell / CMD):
     ```cmd
     copy .env.example .env
     ```
   - En Linux / macOS:
     ```bash
     cp .env.example .env
     ```
   *(Abra el archivo `.env` para personalizar la clave secreta o configurar las credenciales SMTP si desea pruebas de correo real).*

6. **Iniciar el servidor local con Uvicorn:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

7. **Acceder a la aplicación:**
   Abra su navegador web e ingrese a:
   [http://localhost:8000](http://localhost:8000)

8. **Primer inicio de sesión:**
   - Vaya a la sección **Login** en el menú superior.
   - Ingrese:
     - **Usuario:** `Admin`
     - **Contraseña:** `Admin`
   - El sistema desplegará automáticamente la pantalla de **Configuración inicial requerida**, solicitando su nuevo nombre de usuario, contraseña definitiva y correo de recuperación.

9. **Ejecutar pruebas automatizadas:**
   Con el entorno virtual activo, puede verificar todos los flujos ejecutando:
   ```bash
   python test_suite.py
   ```

---

## Cómo Ejecutar con Docker

### Requisitos previos
- Docker Desktop o Docker Engine instalado y en ejecución.

### Paso a paso

1. **Configurar el archivo `.env`:**
   ```bash
   copy .env.example .env
   ```
   *(o `cp .env.example .env` en Linux/Mac).*

2. **Construir e iniciar el contenedor con Docker Compose:**
   ```bash
   docker compose up --build
   ```

3. **Abrir en el navegador:**
   [http://localhost:8000](http://localhost:8000)

4. **Detener la aplicación:**
   ```bash
   docker compose down
   ```

### Persistencia en Docker
Docker Compose crea dos volúmenes persistentes para garantizar que los datos no se pierdan al reiniciar o actualizar contenedores:
- `sqlite_data` → Montado en `/app/data` (archivo `app.db`).
- `uploads_data` → Montado en `/app/uploads` (imágenes de logo, tarjetas de inicio y productos).

---

## Estructura del Proyecto

```text
appprodcutos/
├── app/
│   ├── config.py             # Configuración y lectura de variables de entorno
│   ├── database.py           # Conexión SQLAlchemy y SQLite con PRAGMA foreign_keys
│   ├── deps.py               # Dependencias de seguridad (require_admin, require_staff)
│   ├── mailer.py             # Servicio de envío de correos SMTP
│   ├── main.py               # Punto de entrada FastAPI, middlewares y rutas estáticas
│   ├── models.py             # Modelos ORM (User, Category, Product, Location, etc.)
│   ├── schemas.py            # Esquemas Pydantic y validaciones de entrada
│   ├── security.py           # Hasheo bcrypt y generación/verificación de tokens JWT
│   ├── seed.py               # Inicialización de administrador y ajustes por defecto
│   ├── uploads.py            # Validación y guardado seguro de imágenes en disco
│   ├── routers/              # Endpoints API divididos por dominio
│   │   ├── auth.py           # Login, setup inicial y códigos de verificación
│   │   ├── categories.py     # Gestión de categorías
│   │   ├── contact.py        # Envío y consulta de mensajes de contacto
│   │   ├── home.py           # Gestión de tarjetas de la página de inicio
│   │   ├── locations.py      # Gestión de sedes presenciales y virtuales
│   │   ├── products.py       # Gestión de productos, imágenes y descuentos
│   │   ├── public.py         # Endpoints públicos para el catálogo y sedes
│   │   ├── settings.py       # Configuración de apariencia, colores y logo
│   │   └── users.py          # Gestión de colaboradores
│   └── static/               # Frontend SPA (Vanilla JS + CSS moderno)
│       ├── css/style.css     # Estilos responsivos, temas de color y layouts
│       ├── js/api.js         # Cliente HTTP, manejo de token y deep links
│       ├── js/app.js         # Renderizado de vistas públicas y navegación
│       ├── js/admin.js       # Panel de administración interactivo
│       ├── js/games.js       # Juegos: Sudoku, Culebrita con D-pad y Triki
│       └── index.html        # Página principal contenedora
├── docker-compose.yml        # Orquestación de contenedores y volúmenes
├── Dockerfile                # Imagen Docker basada en Python 3.12-slim
├── requirements.txt          # Dependencias de Python
├── test_suite.py             # Suite de pruebas automatizadas
├── .env.example              # Plantilla de variables de entorno
└── README.md                 # Documentación completa del proyecto
```
# appProductos
