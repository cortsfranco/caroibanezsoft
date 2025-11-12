# 🪟 Configuración Específica para Windows

## ⚠️ Problema Común

El error `"NODE_ENV" no se reconoce como un comando interno o externo` ocurre porque los scripts en `package.json` usan sintaxis de Unix/Linux.

## ✅ Solución 1: Usar Scripts .bat (Más Fácil)

He creado scripts específicos para Windows:

### Desarrollo
```cmd
dev.bat
```
En lugar de `npm run dev`

### Build de Producción
```cmd
build.bat
```
En lugar de `npm run build`

### Ejecutar Producción
```cmd
start-prod.bat
```
En lugar de `npm start`

### Database Studio (este SÍ funciona)
```cmd
npm run db:studio
```

### Database Push (este SÍ funciona)
```cmd
npm run db:push
```

---

## ✅ Solución 2: Instalar cross-env (Recomendado para trabajo en equipo)

Si trabajas con otros desarrolladores en Mac/Linux, es mejor instalar `cross-env`:

```cmd
npm install --save-dev cross-env
```

Luego, cuando alguien con permisos edite `package.json`, puede actualizar los scripts así:

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "cross-env NODE_ENV=production node dist/index.js"
  }
}
```

---

## 🚀 Inicio Rápido para Windows

### Primera Vez:

1. **Instalar dependencias**:
   ```cmd
   npm install
   ```

2. **Configurar .env**:
   ```cmd
   copy .env.example .env
   ```
   Luego edita `.env` con tus credenciales

3. **Aplicar esquema de base de datos**:
   ```cmd
   npm run db:push
   ```

4. **Iniciar desarrollo**:
   ```cmd
   dev.bat
   ```

5. **Abrir navegador**:
   ```
   http://localhost:5000
   ```

### Opcionalmente - Database Studio (en otra terminal):
```cmd
npm run db:studio
```
Luego abre: http://localhost:4983

---

## 📁 Estructura de Scripts Windows

| Script | Comando | Qué Hace |
|--------|---------|----------|
| `dev.bat` | `dev.bat` | Inicia servidor de desarrollo |
| `build.bat` | `build.bat` | Compila para producción |
| `start-prod.bat` | `start-prod.bat` | Ejecuta versión compilada |
| `start-full.bat` | `start-full.bat` | Inicia todo (dev + db studio) |
| `start-full.ps1` | `.\start-full.ps1` | Lo mismo en PowerShell |

---

## 🔍 Troubleshooting

### Error: "tsx no se reconoce"
```cmd
npm install
```

### Error: "Cannot find module"
```cmd
npm install
npm run db:push
dev.bat
```

### Error: Database connection failed
1. Verifica que `.env` tiene `DATABASE_URL` configurado
2. Asegúrate que PostgreSQL está corriendo
3. Ejecuta `npm run db:push` primero

### Puerto 5000 ocupado
```cmd
netstat -ano | findstr :5000
taskkill /PID <número> /F
```

---

## ✅ Checklist de Verificación

- [ ] Node.js 18+ instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Archivo `.env` configurado
- [ ] Base de datos aplicada (`npm run db:push`)
- [ ] Servidor corriendo (`dev.bat`)
- [ ] Navegador abierto en http://localhost:5000

---

## 💡 Tip Pro

Crea un acceso directo de `start-full.bat` en tu escritorio para iniciar todo con un doble clic.

**¡Ahora estás listo para desarrollar en Windows! 🚀**
