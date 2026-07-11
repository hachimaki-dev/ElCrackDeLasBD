"use strict";
/**
 * SQL Engine Laboratory — Docker Environment Doctor
 *
 * Sistema de diagnóstico y preparación automática del entorno Docker.
 * Funciona como un "doctor" que:
 *   1. Detecta el SO y arquitectura (Mac M1/M2/M3/M4, Linux, Windows)
 *   2. Verifica que Docker esté instalado y corriendo
 *   3. Verifica la conexión al socket Docker
 *   4. Verifica si la imagen del laboratorio existe localmente
 *   5. Reporta qué motores corren nativos vs bajo emulación
 *   6. Genera un plan de acción para lo que falta
 *
 * Diseñado para ser consumido tanto por usuarios humanos (via Output Channel)
 * como por agentes de IA que necesitan contexto sobre el entorno.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDoctor = runDoctor;
exports.formatDoctorReport = formatDoctorReport;
exports.runDoctorFormatted = runDoctorFormatted;
const platformInfo_1 = require("./platformInfo");
const dockerConfigResolver_1 = require("./dockerConfigResolver");
const engine_types_1 = require("../engines/engine.types");
const registry_1 = require("../engines/registry");
// ==========================================================================
// Doctor Implementation
// ==========================================================================
/**
 * Ejecuta el diagnóstico completo del entorno ("Doctor").
 * Verifica todo lo necesario para que la extensión funcione correctamente
 * en la plataforma actual.
 *
 * @param dockerClient - Cliente Docker para verificaciones
 * @param resolverOverrides - Overrides opcionales para testing
 * @returns Reporte completo del doctor
 */
async function runDoctor(dockerClient, resolverOverrides) {
    const platform = (0, platformInfo_1.detectPlatform)();
    const checks = [];
    const resolutionLog = [];
    // ── Check 1: Plataforma detectada ──
    checks.push({
        name: 'Detección de plataforma',
        status: 'info',
        message: platform.displayString,
    });
    // ── Check 2: Resolver socket Docker ──
    const resolvedOptions = (0, dockerConfigResolver_1.resolveDockerOptions)({
        ...resolverOverrides,
        onLog: (message) => {
            resolutionLog.push(message);
        },
    });
    const socketPath = resolvedOptions.socketPath;
    const tcpHost = resolvedOptions.host;
    const tcpPort = resolvedOptions.port;
    if (socketPath) {
        checks.push({
            name: 'Socket Docker',
            status: 'pass',
            message: `Socket encontrado: ${socketPath}`,
        });
    }
    else if (tcpHost) {
        checks.push({
            name: 'Conexión Docker (TCP)',
            status: 'pass',
            message: `Conexión TCP: ${tcpHost}:${tcpPort}`,
        });
    }
    else {
        checks.push({
            name: 'Socket Docker',
            status: 'fail',
            message: 'No se encontró ningún socket Docker ni conexión TCP.',
            action: platform.os === 'darwin'
                ? 'Instala y abre Docker Desktop para macOS desde https://docker.com/products/docker-desktop'
                : platform.os === 'win32'
                    ? 'Instala y abre Docker Desktop para Windows desde https://docker.com/products/docker-desktop'
                    : 'Instala Docker Engine: sudo apt-get install docker.io (Ubuntu/Debian) o equivalente',
        });
    }
    // ── Check 3: Docker disponible (ping) ──
    const availabilityResult = await dockerClient.checkDockerAvailability();
    if (availabilityResult.ok) {
        checks.push({
            name: 'Docker daemon',
            status: 'pass',
            message: 'Docker está corriendo y responde.',
        });
    }
    else {
        checks.push({
            name: 'Docker daemon',
            status: 'fail',
            message: availabilityResult.error.message,
            action: platform.os === 'darwin'
                ? 'Abre Docker Desktop desde el Dock o Applications.'
                : platform.os === 'win32'
                    ? 'Abre Docker Desktop desde el menú Inicio.'
                    : 'Inicia el servicio Docker: sudo systemctl start docker',
        });
    }
    // ── Check 4: Imagen del laboratorio ──
    const fullImageName = `${engine_types_1.DOCKER_IMAGE_CONFIG.imageName}:${engine_types_1.DOCKER_IMAGE_CONFIG.imageTag}`;
    let imageExists = false;
    if (availabilityResult.ok) {
        imageExists = await dockerClient.imageExists(fullImageName);
        if (imageExists) {
            checks.push({
                name: 'Imagen Docker',
                status: 'pass',
                message: `Imagen '${fullImageName}' disponible localmente.`,
            });
        }
        else {
            checks.push({
                name: 'Imagen Docker',
                status: 'warn',
                message: `Imagen '${fullImageName}' no encontrada localmente.`,
                action: 'Se descargará automáticamente al iniciar un motor por primera vez.',
                autoFixable: true,
            });
        }
    }
    // ── Check 5: Motores bajo emulación ──
    if (platform.isArm) {
        const emulatedEngines = (0, registry_1.getAllEngines)()
            .filter(eng => (0, platformInfo_1.requiresEmulation)(eng.id, platform))
            .map(eng => eng.displayName);
        if (emulatedEngines.length > 0) {
            checks.push({
                name: 'Emulación de motores',
                status: 'warn',
                message: `${emulatedEngines.join(', ')} correrá(n) bajo emulación amd64 en tu ${platform.displayString}.`,
                action: 'Esto es normal y esperado. El rendimiento será menor para estos motores.',
            });
        }
        const nativeEngines = (0, registry_1.getAllEngines)()
            .filter(eng => !(0, platformInfo_1.requiresEmulation)(eng.id, platform))
            .map(eng => eng.displayName);
        if (nativeEngines.length > 0) {
            checks.push({
                name: 'Motores nativos arm64',
                status: 'pass',
                message: `${nativeEngines.join(', ')} corren nativos en ${platform.arch}. ✨`,
            });
        }
    }
    else {
        checks.push({
            name: 'Compatibilidad de motores',
            status: 'pass',
            message: 'Todos los motores corren nativos en tu plataforma amd64.',
        });
    }
    // ── Compatibilidad por motor ──
    const engineCompatibility = (0, registry_1.getAllEngines)().map(engine => {
        const emulated = (0, platformInfo_1.requiresEmulation)(engine.id, platform);
        const emulationWarning = (0, platformInfo_1.getEmulationWarning)(engine.id, platform);
        const nativeNote = (0, platformInfo_1.getArm64NativeNote)(engine.id, platform);
        return {
            engineId: engine.id,
            displayName: engine.displayName,
            runsNative: !emulated,
            requiresEmulation: emulated,
            note: emulationWarning ?? nativeNote,
        };
    });
    // ── Resumen ──
    const passed = checks.filter(c => c.status === 'pass').length;
    const failed = checks.filter(c => c.status === 'fail').length;
    const warnings = checks.filter(c => c.status === 'warn').length;
    return {
        timestamp: new Date().toISOString(),
        platform,
        checks,
        engineCompatibility,
        resolutionLog,
        resolvedDockerOptions: { socketPath, host: tcpHost, port: tcpPort },
        summary: {
            total: checks.length,
            passed,
            failed,
            warnings,
            allCriticalPassed: failed === 0,
        },
    };
}
// ==========================================================================
// Report Formatting
// ==========================================================================
/** Iconos por status */
const STATUS_ICONS = {
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
    info: 'ℹ️',
};
/**
 * Formatea el reporte del doctor como texto legible para el Output Channel.
 *
 * @param report - Reporte del doctor
 * @returns String multi-línea formateado
 */
function formatDoctorReport(report) {
    const lines = [
        '',
        '╔═══════════════════════════════════════════════════════╗',
        '║   SQL Engine Laboratory — Environment Doctor          ║',
        '╚═══════════════════════════════════════════════════════╝',
        '',
        `  🕐 ${report.timestamp}`,
        `  💻 ${report.platform.displayString}`,
        '',
        '── Checks ──────────────────────────────────────────────',
    ];
    for (const check of report.checks) {
        lines.push(`  ${STATUS_ICONS[check.status]}  ${check.name}: ${check.message}`);
        if (check.action) {
            lines.push(`      → ${check.action}`);
        }
    }
    lines.push('');
    lines.push('── Engine Compatibility ─────────────────────────────────');
    for (const engine of report.engineCompatibility) {
        const icon = engine.runsNative ? '🟢' : '🟡';
        const mode = engine.runsNative ? 'nativo' : 'emulación';
        lines.push(`  ${icon}  ${engine.displayName}: ${mode}`);
        if (engine.note) {
            lines.push(`      ${engine.note}`);
        }
    }
    if (report.resolutionLog.length > 0) {
        lines.push('');
        lines.push('── Socket Resolution Log ───────────────────────────────');
        for (const logEntry of report.resolutionLog) {
            lines.push(`  ${logEntry}`);
        }
    }
    lines.push('');
    lines.push('── Summary ─────────────────────────────────────────────');
    lines.push(`  Total: ${report.summary.total} | ✅ ${report.summary.passed} | ❌ ${report.summary.failed} | ⚠️  ${report.summary.warnings}`);
    if (report.summary.allCriticalPassed) {
        lines.push('  🎉 Todo listo — puedes iniciar cualquier motor.');
    }
    else {
        lines.push('  🔧 Hay checks fallidos que necesitan atención antes de continuar.');
    }
    lines.push('');
    return lines.join('\n');
}
/**
 * Ejecuta el doctor y retorna el reporte formateado en un solo paso.
 * Convenience function para uso directo desde comandos de VS Code.
 *
 * @param dockerClient - Cliente Docker
 * @returns String formateado del reporte
 */
async function runDoctorFormatted(dockerClient) {
    const report = await runDoctor(dockerClient);
    return formatDoctorReport(report);
}
//# sourceMappingURL=dockerDiagnostics.js.map