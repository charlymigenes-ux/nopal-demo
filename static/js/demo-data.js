// ── NOPAL LIVE DEMO — backend falso ──
// Se carga ANTES que app.js a propósito: app.js hace
// `const ORIGINAL_FETCH = window.fetch.bind(window)` en su línea 17, así que
// lo que quede instalado acá es lo que app.js va a usar para TODO. Si esto
// cargara después, app.js ya se habría quedado con el fetch nativo y cada
// llamada moriría en un 404 del servidor estático.
//
// No hay backend, no hay red, no hay estado en disco. Todo vive en memoria
// del navegador: recargar la página es el reset.

(function () {
    'use strict';

    const FETCH_REAL = window.fetch.bind(window);

    // ── Aspecto con el que arranca el demo ────────────────────────────
    // El core lee estas claves de localStorage en su arranque, y este
    // archivo corre antes que app.js, así que basta con dejarlas puestas:
    // no hace falta tocar su código ni aplicar el tema a mano después.
    //
    // Se fija en cada carga, no solo la primera. Es lo coherente con el
    // cartel: "recargar la página restaura todo" — quien se ponga a probar
    // temas durante la visita los ve cambiar, y al recargar el demo vuelve
    // a presentarse como debe.
    //
    // El fondo es el tercero del Modo IA aplicado al tema NOPAL: el core
    // guarda la URL completa del fondo elegido, no un índice dentro de las
    // opciones del tema, así que cruzarlos es una combinación válida y no
    // un truco (ver THEME_WALLPAPER_CONFIG en app.js).
    localStorage.setItem('theme', 'green');                                  // "NOPAL Style"
    localStorage.setItem('nopalThemeWallpaper', 'static/img/FONDO3_IA.webp');

    // Vista de dispositivos: todas las máquinas en una sola fila (modo
    // mixto), en cuadrícula y mostrando también las desconectadas. Las tres
    // se fijan aunque alguna coincida con el arranque de fábrica: el demo
    // debe presentarse SIEMPRE igual, no como lo dejara el visitante
    // anterior. Ojo: 'list' es el valor por defecto del core, así que sin
    // esta línea la cuadrícula no se aplicaría.
    localStorage.setItem('devicesGroupMode', 'mixed');
    localStorage.setItem('printersViewMode', 'grid');
    localStorage.setItem('showOfflineMachines', 'true');

    // El recorrido guiado arranca apagado: quien visita el demo viene a mirar, y el cuadro del recorrido
    // le tapa la pantalla en cada sección. Se puede volver a encender en Configuración → General
    // ("Recorrido guiado"). Como lo demás, se fija en cada carga.
    localStorage.setItem('onboardingHintsEnabled', 'false');

    // El panel superior se repliega solo y se vuelve a abrir al pasar el
    // ratón por encima, en vez de quedarse fijo comiéndose la pantalla.
    localStorage.setItem('panelHeroAutoHideMode', 'hover');

    // ── Estado del taller de mentira ──────────────────────────────────
    // Los puertos imitan a los de una granja virtual (7211, 7212...) porque
    // es lo que NOPAL usa de verdad para Klipper; así los datos se parecen a
    // los reales hasta en la forma de la clave.
    const taller = {
        impresoras: [
            {
                port: 7211,
                name: 'Anet ET4',
                status: 'online',
                state: 'printing',
                extruder: { temperature: 208.4, target: 210 },
                bed: { temperature: 59.6, target: 60 },
                job: {
                    filename: 'soporte_camara_v3.gcode',
                    progress: 61,
                    estimated_remaining: 47 * 60,
                    current_layer: 143,
                    total_layer: 234,
                },
            },
            {
                port: 7213,
                name: 'Ender 3 V2',
                status: 'online',
                state: 'paused',
                extruder: { temperature: 214.9, target: 215 },
                bed: { temperature: 64.7, target: 65 },
                job: {
                    filename: 'engranaje_helicoidal.gcode',
                    progress: 28,
                    estimated_remaining: 96 * 60,
                    current_layer: 61,
                    total_layer: 218,
                },
            },
        ],

        // Los carretes los resuelve el plugin de Spoolman por puerto. El
        // color va en hex porque la ficha pinta el carrete de ese color.
        carretes: {
            7211: { label: 'PETG Verde Cactus', color_hex: '3E8E5A', diameter: 1.75, remaining_weight: 643 },
            7213: { label: 'ABS Naranja', color_hex: 'D9622B', diameter: 1.75, remaining_weight: 254 },
        },
    };

    // ── El taller se mueve solo ───────────────────────────────────────
    // Un demo con números congelados se nota a los tres segundos. Esto es lo
    // único que hace falta para que parezca vivo: el progreso sube, las
    // temperaturas tiritan alrededor del target y el carrete pierde gramos.
    function tic() {
        taller.impresoras.forEach(imp => {
            const oscila = (target) => target > 0
                ? Math.round((target + (Math.random() - 0.5) * 1.6) * 10) / 10
                : Math.round((22 + Math.random() * 2.5) * 10) / 10;
            imp.extruder.temperature = oscila(imp.extruder.target);
            imp.bed.temperature = oscila(imp.bed.target);

            if (imp.state !== 'printing' || !imp.job) return;

            imp.job.progress = Math.min(100, imp.job.progress + 0.35);
            imp.job.estimated_remaining = Math.max(0, imp.job.estimated_remaining - 4);
            imp.job.current_layer = Math.min(
                imp.job.total_layer,
                Math.round((imp.job.progress / 100) * imp.job.total_layer),
            );

            const carrete = taller.carretes[imp.port];
            if (carrete) carrete.remaining_weight = Math.max(0, Math.round((carrete.remaining_weight - 0.08) * 10) / 10);

            // Un trabajo que llega al 100% termina y la máquina queda lista:
            // dejarlo clavado en "imprimiendo 100%" para siempre es la clase
            // de detalle que delata que no hay nada detrás.
            if (imp.job.progress >= 100) {
                imp.state = 'ready';
                imp.job = null;
                imp.extruder.target = 0;
                imp.bed.target = 0;
            }
        });
    }
    setInterval(tic, 2000);

    // ── Traducción al formato que espera app.js ───────────────────────
    // renderPrinters() lee printer.data.extruder/heater_bed (el formato crudo
    // de Moonraker) y printer.job aparte. Se arma acá para que el estado de
    // arriba se pueda leer y editar sin pelear con esa forma.
    function comoLaEsperaNopal(imp) {
        return {
            port: imp.port,
            name: imp.name,
            status: imp.status,
            state: imp.state,
            data: {
                extruder: { temperature: imp.extruder.temperature, target: imp.extruder.target },
                heater_bed: { temperature: imp.bed.temperature, target: imp.bed.target },
            },
            job: imp.job
                ? {
                    filename: imp.job.filename,
                    progress: Math.round(imp.job.progress * 10) / 10,
                    estimated_remaining: imp.job.estimated_remaining,
                    current_layer: imp.job.current_layer,
                    total_layer: imp.job.total_layer,
                }
                : null,
        };
    }

    function porPuerto(url) {
        const m = url.match(/\/api\/printers\/(\d+)\//);
        if (!m) return null;
        return taller.impresoras.find(i => String(i.port) === m[1]) || null;
    }

    // ── Láser y CNC ───────────────────────────────────────────────────
    // GRBL habla en estados cortos: Run mientras corta, Idle en reposo. El
    // láser graba y avanza; el CNC queda esperando trabajo, para que el
    // recorrido muestre las dos situaciones sin tener que tocar nada.
    const laser = { progress: 41 };
    const cnc = { estado: 'Idle' };

    setInterval(() => {
        laser.progress += 0.5;
        if (laser.progress >= 100) laser.progress = 0;
    }, 2000);

    // ── Inventario de Spoolman ────────────────────────────────────────
    const INVENTARIO = [
        ['PETG Verde Cactus', 'PETG', 'Sunlu', '3E8E5A', 643, 1000, 'Estante A1'],
        ['PLA Negro Mate', 'PLA', 'Prusament', '1C1C1C', 918, 1000, 'Estante A2'],
        ['ABS Naranja', 'ABS', 'eSun', 'D9622B', 254, 1000, 'Estante B1'],
        ['PLA Blanco', 'PLA', 'Sunlu', 'F2F2F2', 1102, 1250, 'Estante A3'],
        ['TPU Transparente', 'TPU', 'Overture', 'D8E6F0', 480, 750, 'Caja seca'],
        ['PLA Silk Dorado', 'PLA', 'eSun', 'C9A227', 424, 1000, 'Estante B2'],
    ].map((s, i) => ({
        id: i + 1,
        remaining_weight: s[4],
        initial_weight: s[5],
        reserved_weight: 0,
        location: s[6],
        price: 22.5,
        lot_nr: `L-2026-${100 + i}`,
        comment: '',
        filament: {
            name: s[0], material: s[1], vendor: { name: s[2] },
            color_hex: s[3], weight: s[5], price: 22.5,
        },
    }));

    // ── Cámaras ───────────────────────────────────────────────────────
    // El plugin camera-viewer pinta `stream_url` dentro de un <img>, contando
    // con que del otro lado haya un MJPEG. Un GIF en loop entra por el mismo
    // agujero sin que el plugin se entere: es la única forma de tener imagen
    // en movimiento sin un servidor que la genere.
    const CAMARA_DEMO = 'static/demo/demo-cam.gif';
    const camaras = [
        {
            id: 'cam-demo-1', name: 'Anet ET4 · cama', enabled: true, purpose: 'timelapse',
            purpose_note: 'Demo', stream_url: CAMARA_DEMO, source_url: CAMARA_DEMO,
            device_path: null, bound_device: { type: 'klipper', id: 'Anet ET4' }, timelapse_config: {},
        },
        {
            id: 'cam-demo-2', name: 'Ender 3 V2 · frontal', enabled: true, purpose: 'timelapse',
            purpose_note: 'Demo', stream_url: CAMARA_DEMO, source_url: CAMARA_DEMO,
            device_path: null, bound_device: { type: 'klipper', id: 'Ender 3 V2' }, timelapse_config: {},
        },
    ];

    // ── Plugins ───────────────────────────────────────────────────────
    // El catálogo real de NOPAL, servido como archivo estático. Los que
    // tienen su carpeta frontend copiada en plugins-static/ se declaran
    // instalados y activos: app.js (loadPluginAsset) va a inyectar sus JS y
    // CSS igual que en una instalación de verdad, así que las secciones de
    // los plugins son las auténticas, no una imitación.
    // matriz-led queda fuera a propósito: su panel espera matrices de
    // píxeles reales de la pantalla LED y con datos inventados se rompe en
    // pantalla. En la galería se sigue viendo como disponible, que para el
    // recorrido vende lo mismo sin dejar errores por todos lados.
    const PLUGINS_CON_FRONTEND = {
        'camera-viewer': { version: '1.4.0', section: 'camera-viewer', file: 'camera-viewer' },
        'spoolman': { version: '0.2.0', section: 'spoolman', file: 'spoolman' },
        'cotizador': { version: '1.1.0', section: 'pricing', file: 'cotizador' },
        'svg-toolkit': { version: '0.9.0', section: 'svg-toolkit', file: 'svg-toolkit' },
        'font-library': { version: '0.5.1', section: 'font-library', file: 'font-library' },
        'shape-creator': { version: '1.2.0', section: 'shape-creator', file: 'shape-creator' },
        'arduino-accessories': { version: '2.6.0', section: 'arduino-accessories', file: 'arduino-accessories' },
    };

    let catalogoCache = null;
    async function catalogoDePlugins() {
        if (catalogoCache) return catalogoCache;
        let catalogo = [];
        try {
            const r = await FETCH_REAL('plugin_catalog.json');
            if (r.ok) catalogo = await r.json();
        } catch (_) { /* sin catálogo la galería sale vacía, no rota */ }

        const plugins = catalogo.map(p => {
            const local = PLUGINS_CON_FRONTEND[p.id];
            const entry = Object.assign({}, p, {
                installed: !!local,
                enabled: !!local,
                installed_at: local ? '2026-07-14T10:22:00Z' : null,
                catalog_version: p.version,
            });
            if (local) {
                entry.version = local.version;
                entry.frontend = {
                    section: local.section,
                    script: `plugins-static/${p.id}/frontend/${local.file}.js`,
                    style: `plugins-static/${p.id}/frontend/${local.file}.css`,
                };
            }
            return entry;
        });

        catalogoCache = {
            plugins,
            categories: [...new Set(plugins.map(p => p.category))].sort(),
            installed_count: plugins.filter(p => p.installed).length,
        };
        return catalogoCache;
    }

    // ── IA de demostración ────────────────────────────────────────────
    // Encendida y con historial, pero sin ningún proveedor detrás: no hay
    // API key que quemar porque no hay a quién llamar. Las respuestas salen
    // de aquí abajo, leyendo el mismo estado del taller que ve el panel —
    // por eso los números que cita la IA coinciden con las fichas.
    //
    // Todo el texto del asistente está en los cinco idiomas que NOPAL ya
    // ofrece en su selector. Un demo que muestra la interfaz en alemán y
    // contesta el chat en español se delata solo; y como el idioma se puede
    // cambiar en caliente, esto se resuelve en cada llamada, no al cargar.
    const IDIOMAS = ['es', 'en', 'de', 'fr', 'pt-BR'];

    function idioma() {
        const actual = (typeof currentLanguage !== 'undefined' && currentLanguage)
            || localStorage.getItem('language') || 'es';
        return IDIOMAS.indexOf(actual) >= 0 ? actual : 'es';
    }

    function T(clave) {
        const lote = TEXTOS[idioma()] || TEXTOS.es;
        return lote[clave] !== undefined ? lote[clave] : TEXTOS.es[clave];
    }

    // Redondeos que se repiten en las cinco traducciones.
    const g = v => Math.round(v);
    const min = s => Math.round(s / 60);

    const TEXTOS = {
        es: {
            modelo: 'nopal-demo · sin conexión externa',
            apoyoInstalar: 'Instalar NOPAL',
            apoyoCodigo: 'Ver el código',
            apoyoApoyar: 'Apoyar',
            finTitulo: 'Esto es NOPAL, y es libre.',
            finTexto: 'Lo que acabas de recorrer corre en una Raspberry Pi o en cualquier Debian, con tus máquinas de verdad. Si te sirve, el proyecto se sostiene con quien lo apoya.',
            finCerrar: 'Seguir mirando el demo',
            cartel: '🌵 <strong>NOPAL LIVE DEMO</strong> — todo simulado, ningún hardware real. Recarga para reiniciar.',
            soloLectura: 'Modo demostración: la configuración es de solo lectura. Todo lo que se ve son datos simulados.',
            sugerencias: [
                '¿Cómo van las impresiones ahora mismo?',
                '¿Cuánto material me queda?',
                '¿Hay alguna máquina con problemas?',
                '¿Cuánto falta para que termine todo?',
            ],
            eventos: [
                'Impresión iniciada: engranaje_helicoidal.gcode',
                'Carrete asignado: PETG Verde Cactus',
                'Impresión pausada por el operador',
                'Impresión terminada: tapa_caja_v2.gcode',
                'Trabajo de grabado completado',
                'Carrete ABS Naranja por debajo de 300 g',
                'Impresión iniciada: soporte_camara_v3.gcode',
            ],
            conversaciones: [
                {
                    titulo: '¿Cómo va la cola de hoy?',
                    pregunta: '¿Cómo va la cola de hoy?',
                    respuesta: 'La Anet ET4 lleva el 61 % del soporte de cámara y le quedan unos 47 minutos. '
                        + 'La Ender 3 V2 está pausada desde hace rato en el engranaje helicoidal — si no fue a '
                        + 'propósito, conviene revisarla antes de que se enfríe la cama.',
                },
                {
                    titulo: 'Material suficiente para el lote',
                    pregunta: '¿Me alcanza el ABS naranja para las 12 piezas?',
                    respuesta: 'No con ese carrete. Quedan 254 g y las 12 piezas piden unos 390 g contando purga '
                        + 'y soportes. Te faltarían ~136 g: o entra un carrete nuevo, o el lote se parte en dos tandas.',
                },
                {
                    titulo: 'Primera capa despegándose',
                    pregunta: 'Se me despega la primera capa en la Ender',
                    respuesta: 'Con ABS querés la cama a 100 °C y sin corrientes de aire; a 65 °C se despega casi '
                        + 'siempre. Si con eso sigue, el siguiente sospechoso es el Z-offset — en el historial veo dos '
                        + 'cancelaciones seguidas en esa máquina, que suele ser la firma de una boquilla demasiado alta.',
                },
            ],
            resp: {
                temperatura: imps => imps.map(i => `${i.name}: boquilla ${g(i.extruder.temperature)} °C `
                    + `(objetivo ${i.extruder.target || '—'}), cama ${g(i.bed.temperature)} °C.`).join('\n'),
                carretes: pares => pares.map(([n, c]) => `${n}: ${c.label}, quedan ${g(c.remaining_weight)} g.`).join('\n')
                    + '\n\nEl ABS naranja es el que está más justo.',
                pausadas: p => p.length
                    ? `${p.map(i => i.name).join(' y ')} está pausada en "${p[0].job ? p[0].job.filename : '—'}" `
                      + `al ${p[0].job ? g(p[0].job.progress) : 0} %. No hay errores de firmware registrados, así que `
                      + 'fue una pausa manual o un cambio de filamento a medias.'
                    : 'Ninguna máquina está pausada ni reportando error ahora mismo.',
                tiempo: imp => imp.length
                    ? imp.map(i => `${i.name}: ${g(i.job.progress)} %, faltan ~${min(i.job.estimated_remaining)} min `
                        + `(capa ${i.job.current_layer} de ${i.job.total_layer}).`).join('\n')
                    : 'No hay ninguna impresión en curso en este momento.',
                general: (a, p, t) => `Ahora mismo hay ${a} máquina(s) imprimiendo y ${p} pausada(s), sobre ${t} conectadas.`
                    + '\n\nEsta es una IA de demostración: responde con el estado simulado del taller y no habla con '
                    + 'ningún proveedor externo. En una instalación real acá contestaría tu modelo configurado, con '
                    + 'acceso a las mismas herramientas de consulta.',
            },
        },

        en: {
            modelo: 'nopal-demo · no external connection',
            apoyoInstalar: 'Install NOPAL',
            apoyoCodigo: 'View the code',
            apoyoApoyar: 'Support',
            finTitulo: 'This is NOPAL, and it’s free software.',
            finTexto: 'What you just explored runs on a Raspberry Pi or any Debian box, with your own machines. If it’s useful to you, the project keeps going thanks to the people who support it.',
            finCerrar: 'Keep exploring the demo',
            cartel: '🌵 <strong>NOPAL LIVE DEMO</strong> — all simulated, no real hardware. Reload to reset.',
            soloLectura: 'Demo mode: settings are read-only. Everything you see is simulated data.',
            sugerencias: [
                'How are the prints going right now?',
                'How much filament do I have left?',
                'Is any machine having trouble?',
                'How long until everything finishes?',
            ],
            eventos: [
                'Print started: engranaje_helicoidal.gcode',
                'Spool assigned: PETG Cactus Green',
                'Print paused by the operator',
                'Print finished: tapa_caja_v2.gcode',
                'Engraving job completed',
                'ABS Orange spool below 300 g',
                'Print started: soporte_camara_v3.gcode',
            ],
            conversaciones: [
                {
                    titulo: 'How is today’s queue going?',
                    pregunta: 'How is today’s queue going?',
                    respuesta: 'The Anet ET4 is 61 % through the camera mount, about 47 minutes left. '
                        + 'The Ender 3 V2 has been paused on the helical gear for a while — if that wasn’t '
                        + 'deliberate, check it before the bed cools down.',
                },
                {
                    titulo: 'Enough filament for the batch',
                    pregunta: 'Do I have enough orange ABS for the 12 parts?',
                    respuesta: 'Not on that spool. There are 254 g left and the 12 parts need about 390 g including '
                        + 'purge and supports. You’d be ~136 g short: either load a fresh spool, or split the batch in two runs.',
                },
                {
                    titulo: 'First layer lifting',
                    pregunta: 'The first layer keeps lifting on the Ender',
                    respuesta: 'For ABS you want the bed at 100 °C and no draughts; at 65 °C it lifts almost every time. '
                        + 'If it still happens, the next suspect is the Z-offset — the history shows two cancellations in a '
                        + 'row on that machine, which is the usual signature of a nozzle sitting too high.',
                },
            ],
            resp: {
                temperatura: imps => imps.map(i => `${i.name}: nozzle ${g(i.extruder.temperature)} °C `
                    + `(target ${i.extruder.target || '—'}), bed ${g(i.bed.temperature)} °C.`).join('\n'),
                carretes: pares => pares.map(([n, c]) => `${n}: ${c.label}, ${g(c.remaining_weight)} g left.`).join('\n')
                    + '\n\nThe orange ABS is the one running short.',
                pausadas: p => p.length
                    ? `${p.map(i => i.name).join(' and ')} is paused on "${p[0].job ? p[0].job.filename : '—'}" `
                      + `at ${p[0].job ? g(p[0].job.progress) : 0} %. No firmware errors were logged, so it was a manual `
                      + 'pause or a filament change left halfway.'
                    : 'No machine is paused or reporting an error right now.',
                tiempo: imp => imp.length
                    ? imp.map(i => `${i.name}: ${g(i.job.progress)} %, about ${min(i.job.estimated_remaining)} min left `
                        + `(layer ${i.job.current_layer} of ${i.job.total_layer}).`).join('\n')
                    : 'There is no print running at the moment.',
                general: (a, p, t) => `Right now ${a} machine(s) are printing and ${p} paused, out of ${t} connected.`
                    + '\n\nThis is a demo assistant: it answers from the simulated workshop state and never talks to an '
                    + 'external provider. In a real install your configured model would answer here, with access to the '
                    + 'same query tools.',
            },
        },

        de: {
            modelo: 'nopal-demo · keine externe Verbindung',
            apoyoInstalar: 'NOPAL installieren',
            apoyoCodigo: 'Code ansehen',
            apoyoApoyar: 'Unterstützen',
            finTitulo: 'Das ist NOPAL, und es ist freie Software.',
            finTexto: 'Was Sie gerade gesehen haben, läuft auf einem Raspberry Pi oder jedem Debian-System, mit Ihren echten Maschinen. Wenn es Ihnen nützt: Das Projekt lebt von denen, die es unterstützen.',
            finCerrar: 'Weiter im Demo umsehen',
            cartel: '🌵 <strong>NOPAL LIVE DEMO</strong> — alles simuliert, keine echte Hardware. Neu laden zum Zurücksetzen.',
            soloLectura: 'Demo-Modus: Die Einstellungen sind schreibgeschützt. Alle Daten sind simuliert.',
            sugerencias: [
                'Wie laufen die Drucke gerade?',
                'Wie viel Filament habe ich noch?',
                'Hat eine Maschine Probleme?',
                'Wie lange dauert es noch bis alles fertig ist?',
            ],
            eventos: [
                'Druck gestartet: engranaje_helicoidal.gcode',
                'Spule zugewiesen: PETG Kaktusgrün',
                'Druck vom Bediener pausiert',
                'Druck beendet: tapa_caja_v2.gcode',
                'Gravurauftrag abgeschlossen',
                'Spule ABS Orange unter 300 g',
                'Druck gestartet: soporte_camara_v3.gcode',
            ],
            conversaciones: [
                {
                    titulo: 'Wie läuft die heutige Warteschlange?',
                    pregunta: 'Wie läuft die heutige Warteschlange?',
                    respuesta: 'Die Anet ET4 ist bei 61 % der Kamerahalterung, noch etwa 47 Minuten. '
                        + 'Die Ender 3 V2 steht schon länger beim Schrägzahnrad pausiert — falls das nicht '
                        + 'beabsichtigt war, sollten Sie nachsehen, bevor das Bett auskühlt.',
                },
                {
                    titulo: 'Genug Material für die Serie',
                    pregunta: 'Reicht das orange ABS für die 12 Teile?',
                    respuesta: 'Mit dieser Spule nicht. Es sind noch 254 g übrig, die 12 Teile brauchen rund 390 g '
                        + 'inklusive Purge und Stützen. Es fehlen also ~136 g: entweder eine neue Spule einlegen oder '
                        + 'die Serie auf zwei Durchgänge aufteilen.',
                },
                {
                    titulo: 'Erste Schicht löst sich',
                    pregunta: 'Bei der Ender löst sich die erste Schicht',
                    respuesta: 'Für ABS sollte das Bett auf 100 °C stehen und es darf nicht ziehen; bei 65 °C löst es '
                        + 'sich fast immer. Wenn es dann noch auftritt, ist der Z-Offset der nächste Verdächtige — im '
                        + 'Verlauf sehe ich zwei Abbrüche hintereinander an dieser Maschine, das spricht meist für eine '
                        + 'zu hoch stehende Düse.',
                },
            ],
            resp: {
                temperatura: imps => imps.map(i => `${i.name}: Düse ${g(i.extruder.temperature)} °C `
                    + `(Soll ${i.extruder.target || '—'}), Bett ${g(i.bed.temperature)} °C.`).join('\n'),
                carretes: pares => pares.map(([n, c]) => `${n}: ${c.label}, noch ${g(c.remaining_weight)} g.`).join('\n')
                    + '\n\nDas orange ABS wird am knappsten.',
                pausadas: p => p.length
                    ? `${p.map(i => i.name).join(' und ')} ist bei "${p[0].job ? p[0].job.filename : '—'}" `
                      + `bei ${p[0].job ? g(p[0].job.progress) : 0} % pausiert. Es sind keine Firmware-Fehler `
                      + 'protokolliert, es war also eine manuelle Pause oder ein halb erledigter Filamentwechsel.'
                    : 'Zurzeit ist keine Maschine pausiert oder meldet einen Fehler.',
                tiempo: imp => imp.length
                    ? imp.map(i => `${i.name}: ${g(i.job.progress)} %, noch ca. ${min(i.job.estimated_remaining)} Min. `
                        + `(Schicht ${i.job.current_layer} von ${i.job.total_layer}).`).join('\n')
                    : 'Im Moment läuft kein Druck.',
                general: (a, p, t) => `Gerade drucken ${a} Maschine(n) und ${p} sind pausiert, von ${t} verbundenen.`
                    + '\n\nDies ist eine Demo-KI: Sie antwortet aus dem simulierten Zustand der Werkstatt und '
                    + 'kontaktiert keinen externen Anbieter. In einer echten Installation würde hier Ihr konfiguriertes '
                    + 'Modell antworten, mit Zugriff auf dieselben Abfrage-Werkzeuge.',
            },
        },

        fr: {
            modelo: 'nopal-demo · sans connexion externe',
            apoyoInstalar: 'Installer NOPAL',
            apoyoCodigo: 'Voir le code',
            apoyoApoyar: 'Soutenir',
            finTitulo: 'Voici NOPAL, et c’est un logiciel libre.',
            finTexto: 'Ce que vous venez de parcourir tourne sur un Raspberry Pi ou n’importe quel Debian, avec vos propres machines. Si cela vous est utile, le projet avance grâce à ceux qui le soutiennent.',
            finCerrar: 'Continuer à explorer la démo',
            cartel: '🌵 <strong>NOPAL LIVE DEMO</strong> — tout est simulé, aucun matériel réel. Rechargez pour réinitialiser.',
            soloLectura: 'Mode démonstration : la configuration est en lecture seule. Toutes les données sont simulées.',
            sugerencias: [
                'Où en sont les impressions ?',
                'Combien de filament me reste-t-il ?',
                'Une machine a-t-elle un problème ?',
                'Combien de temps avant que tout soit fini ?',
            ],
            eventos: [
                'Impression démarrée : engranaje_helicoidal.gcode',
                'Bobine assignée : PETG Vert Cactus',
                'Impression mise en pause par l’opérateur',
                'Impression terminée : tapa_caja_v2.gcode',
                'Travail de gravure terminé',
                'Bobine ABS Orange sous les 300 g',
                'Impression démarrée : soporte_camara_v3.gcode',
            ],
            conversaciones: [
                {
                    titulo: 'Où en est la file d’attente ?',
                    pregunta: 'Où en est la file d’attente aujourd’hui ?',
                    respuesta: 'L’Anet ET4 en est à 61 % du support de caméra, il reste environ 47 minutes. '
                        + 'L’Ender 3 V2 est en pause depuis un moment sur l’engrenage hélicoïdal — si ce n’était '
                        + 'pas volontaire, mieux vaut vérifier avant que le plateau refroidisse.',
                },
                {
                    titulo: 'Assez de matière pour le lot',
                    pregunta: 'Est-ce que l’ABS orange suffit pour les 12 pièces ?',
                    respuesta: 'Pas avec cette bobine. Il reste 254 g et les 12 pièces demandent environ 390 g en '
                        + 'comptant la purge et les supports. Il manquerait ~136 g : soit une bobine neuve, soit le lot '
                        + 'se fait en deux fournées.',
                },
                {
                    titulo: 'Première couche qui se décolle',
                    pregunta: 'La première couche se décolle sur l’Ender',
                    respuesta: 'Pour l’ABS, il faut le plateau à 100 °C et aucun courant d’air ; à 65 °C ça se '
                        + 'décolle presque à chaque fois. Si le problème persiste, le suspect suivant est le Z-offset — '
                        + 'l’historique montre deux annulations d’affilée sur cette machine, la signature habituelle '
                        + 'd’une buse trop haute.',
                },
            ],
            resp: {
                temperatura: imps => imps.map(i => `${i.name} : buse ${g(i.extruder.temperature)} °C `
                    + `(cible ${i.extruder.target || '—'}), plateau ${g(i.bed.temperature)} °C.`).join('\n'),
                carretes: pares => pares.map(([n, c]) => `${n} : ${c.label}, il reste ${g(c.remaining_weight)} g.`).join('\n')
                    + '\n\nC’est l’ABS orange le plus juste.',
                pausadas: p => p.length
                    ? `${p.map(i => i.name).join(' et ')} est en pause sur « ${p[0].job ? p[0].job.filename : '—'} » `
                      + `à ${p[0].job ? g(p[0].job.progress) : 0} %. Aucune erreur de firmware n’est enregistrée : `
                      + 'c’était donc une pause manuelle ou un changement de filament laissé à moitié.'
                    : 'Aucune machine n’est en pause ni ne signale d’erreur pour le moment.',
                tiempo: imp => imp.length
                    ? imp.map(i => `${i.name} : ${g(i.job.progress)} %, encore ~${min(i.job.estimated_remaining)} min `
                        + `(couche ${i.job.current_layer} sur ${i.job.total_layer}).`).join('\n')
                    : 'Aucune impression n’est en cours pour le moment.',
                general: (a, p, t) => `Actuellement ${a} machine(s) impriment et ${p} sont en pause, sur ${t} connectées.`
                    + '\n\nCeci est une IA de démonstration : elle répond à partir de l’état simulé de l’atelier et '
                    + 'ne contacte aucun fournisseur externe. Dans une vraie installation, votre modèle configuré '
                    + 'répondrait ici, avec accès aux mêmes outils de consultation.',
            },
        },

        'pt-BR': {
            modelo: 'nopal-demo · sem conexão externa',
            apoyoInstalar: 'Instalar o NOPAL',
            apoyoCodigo: 'Ver o código',
            apoyoApoyar: 'Apoiar',
            finTitulo: 'Isto é o NOPAL, e é software livre.',
            finTexto: 'O que você acabou de percorrer roda num Raspberry Pi ou em qualquer Debian, com as suas máquinas de verdade. Se for útil para você, o projeto se mantém com quem o apoia.',
            finCerrar: 'Continuar vendo a demo',
            cartel: '🌵 <strong>NOPAL LIVE DEMO</strong> — tudo simulado, nenhum hardware real. Recarregue para reiniciar.',
            soloLectura: 'Modo demonstração: a configuração é somente leitura. Tudo o que aparece são dados simulados.',
            sugerencias: [
                'Como estão as impressões agora?',
                'Quanto material ainda tenho?',
                'Alguma máquina com problema?',
                'Quanto falta para terminar tudo?',
            ],
            eventos: [
                'Impressão iniciada: engranaje_helicoidal.gcode',
                'Carretel atribuído: PETG Verde Cacto',
                'Impressão pausada pelo operador',
                'Impressão concluída: tapa_caja_v2.gcode',
                'Trabalho de gravação concluído',
                'Carretel ABS Laranja abaixo de 300 g',
                'Impressão iniciada: soporte_camara_v3.gcode',
            ],
            conversaciones: [
                {
                    titulo: 'Como está a fila de hoje?',
                    pregunta: 'Como está a fila de hoje?',
                    respuesta: 'A Anet ET4 está em 61 % do suporte de câmera e faltam uns 47 minutos. '
                        + 'A Ender 3 V2 está pausada há um tempo na engrenagem helicoidal — se não foi de propósito, '
                        + 'vale conferir antes que a mesa esfrie.',
                },
                {
                    titulo: 'Material suficiente para o lote',
                    pregunta: 'O ABS laranja dá para as 12 peças?',
                    respuesta: 'Com esse carretel, não. Restam 254 g e as 12 peças pedem cerca de 390 g contando purga '
                        + 'e suportes. Faltariam ~136 g: ou entra um carretel novo, ou o lote sai em duas levas.',
                },
                {
                    titulo: 'Primeira camada soltando',
                    pregunta: 'A primeira camada está soltando na Ender',
                    respuesta: 'Com ABS a mesa precisa estar a 100 °C e sem corrente de ar; a 65 °C solta quase sempre. '
                        + 'Se continuar, o próximo suspeito é o Z-offset — no histórico vejo dois cancelamentos seguidos '
                        + 'nessa máquina, que costuma ser a assinatura de um bico alto demais.',
                },
            ],
            resp: {
                temperatura: imps => imps.map(i => `${i.name}: bico ${g(i.extruder.temperature)} °C `
                    + `(alvo ${i.extruder.target || '—'}), mesa ${g(i.bed.temperature)} °C.`).join('\n'),
                carretes: pares => pares.map(([n, c]) => `${n}: ${c.label}, restam ${g(c.remaining_weight)} g.`).join('\n')
                    + '\n\nO ABS laranja é o mais apertado.',
                pausadas: p => p.length
                    ? `${p.map(i => i.name).join(' e ')} está pausada em "${p[0].job ? p[0].job.filename : '—'}" `
                      + `em ${p[0].job ? g(p[0].job.progress) : 0} %. Não há erros de firmware registrados, então foi `
                      + 'uma pausa manual ou uma troca de filamento pela metade.'
                    : 'Nenhuma máquina está pausada nem reportando erro agora.',
                tiempo: imp => imp.length
                    ? imp.map(i => `${i.name}: ${g(i.job.progress)} %, faltam ~${min(i.job.estimated_remaining)} min `
                        + `(camada ${i.job.current_layer} de ${i.job.total_layer}).`).join('\n')
                    : 'Não há nenhuma impressão em andamento no momento.',
                general: (a, p, t) => `Agora há ${a} máquina(s) imprimindo e ${p} pausada(s), de ${t} conectadas.`
                    + '\n\nEsta é uma IA de demonstração: responde com o estado simulado da oficina e não fala com '
                    + 'nenhum provedor externo. Numa instalação real, aqui responderia o seu modelo configurado, com '
                    + 'acesso às mesmas ferramentas de consulta.',
            },
        },
    };

    // Las conversaciones guardadas se arman en el idioma activo. Los id y
    // las fechas no cambian: si alguien cambia de idioma con una abierta,
    // sigue siendo la misma conversación, traducida.
    function conversaciones() {
        return T('conversaciones').map((c, i) => ({
            id: `demo-${i + 1}`,
            title: c.titulo,
            updated_at: Math.floor(Date.now() / 1000) - [3600, 86400, 172800][i],
            messages: [
                { role: 'user', content: c.pregunta },
                {
                    role: 'assistant',
                    tool_calls: [
                        ['get_printers_status', 'get_print_queue'],
                        ['get_spools', 'estimate_filament'],
                        ['get_printer_config', 'get_recent_events'],
                    ][i],
                    content: c.respuesta,
                },
            ],
        }));
    }

    // Respuestas por tema: se elige por palabra clave y se arma con datos
    // vivos del taller. No es un modelo, es un guion — pero cita el estado
    // real de la demo, así que no se contradice con lo que se ve en pantalla.
    // Las palabras clave van en los cinco idiomas porque quien escribe en
    // alemán espera que "Temperatur" acierte igual que "temperatura".
    const TEMAS = [
        ['temperatura', /temperatur|caliente|grados|°c|hot|degree|düse|bett|chaud|degré|quente|grau/i],
        ['carretes', /carrete|filament|material|gramos|spool|grams|spule|filamento|bobine|carretel|matéria/i],
        ['pausadas', /pausad|parad|problema|error|falla|revisar|paused|stuck|trouble|fehler|problem|pause|panne|souci|pausada|erro/i],
        ['tiempo', /termin|cuánto falta|cuanto falta|tiempo|listo|how long|left|finish|time|fertig|dauer|wie lange|reste|temps|fini|quanto falta|tempo/i],
    ];

    function respuestaIA(pregunta) {
        const q = pregunta || '';
        const r = T('resp');
        const imprimiendo = taller.impresoras.filter(i => i.state === 'printing');
        const pausadas = taller.impresoras.filter(i => i.state === 'paused');

        const tema = TEMAS.find(([, patron]) => patron.test(q));
        switch (tema && tema[0]) {
            case 'temperatura':
                return { answer: r.temperatura(taller.impresoras), tools: ['get_printers_status'] };
            case 'carretes':
                return {
                    answer: r.carretes(Object.entries(taller.carretes).map(([puerto, c]) => {
                        const imp = taller.impresoras.find(i => String(i.port) === puerto);
                        return [imp ? imp.name : puerto, c];
                    })),
                    tools: ['get_spools'],
                };
            case 'pausadas':
                return { answer: r.pausadas(pausadas), tools: ['get_printers_status', 'get_recent_events'] };
            case 'tiempo':
                return { answer: r.tiempo(imprimiendo), tools: ['get_printers_status'] };
            default:
                return {
                    answer: r.general(imprimiendo.length, pausadas.length, taller.impresoras.length),
                    tools: ['get_printers_status'],
                };
        }
    }

    function eventosDemo() {
        const ahora = Date.now();
        const hace = m => new Date(ahora - m * 60000).toLocaleTimeString(idioma(), { hour: '2-digit', minute: '2-digit' });
        const cuando = [214, 180, 96, 64, 41, 22, 8];
        const nivel = ['info', 'info', 'warning', 'info', 'info', 'warning', 'info'];
        const origen = ['Ender 3 V2', 'Spoolman', 'Ender 3 V2', 'Anet ET4', 'Sculpfun S30', 'Spoolman', 'Anet ET4'];
        return T('eventos').map((mensaje, i) => ({
            level: nivel[i], message: mensaje, timestamp: hace(cuando[i]), source: origen[i],
        }));
    }

    function maquinasIA() {
        return taller.impresoras.map(i => ({
            id: String(i.port), name: i.name, type: 'printer', online: true,
            status: {
                state: i.state,
                hotend: { current: i.extruder.temperature, target: i.extruder.target },
                bed: { current: i.bed.temperature, target: i.bed.target },
                job: i.job ? { progress: i.job.progress, filename: i.job.filename } : null,
            },
        }));
    }

    // ── Enlaces del proyecto ──────────────────────────────────────────
    // Lo único de este archivo que hay que tocar para cambiar a dónde
    // apuntan los botones. Un valor vacío quita ese botón: así el día que
    // sobre uno, se borra la URL y desaparece sin tocar nada más.
    const APOYO = {
        codigo: 'https://github.com/charlymigenes-ux/nopal',
        instalar: 'https://github.com/charlymigenes-ux/nopal#installation',
        apoyar: 'https://ko-fi.com/nopal_dash',
    };

    function enlace(url, texto, clase) {
        if (!url) return '';
        // rel="noopener" no es decorativo: sin él la página destino recibe
        // window.opener y puede redirigir esta pestaña.
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${clase}">${texto}</a>`;
    }

    // ── Panel de fin de recorrido ─────────────────────────────────────
    // Aparece una sola vez, y solo cuando el visitante ya recorrió cuatro
    // secciones distintas: pedir apoyo nada más entrar es mendigar; pedirlo
    // después de que alguien pausó una impresión y habló con el asistente
    // es otra conversación. Se recuerda en sessionStorage, así que recargar
    // (el reset del demo) tampoco lo repite en la misma visita.
    const VISTO = 'nopalDemoPanelFinal';
    const seccionesVistas = new Set();

    function panelFinal() {
        if (sessionStorage.getItem(VISTO) === '1' || document.getElementById('demo-panel-final')) return;
        sessionStorage.setItem(VISTO, '1');

        const fondo = document.createElement('div');
        fondo.id = 'demo-panel-final';
        fondo.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(8,10,12,.72);'
            + 'display:flex;align-items:center;justify-content:center;padding:24px;'
            + 'font:14px/1.55 system-ui,sans-serif;backdrop-filter:blur(3px);';

        fondo.innerHTML = `
            <div style="max-width:440px;background:#15181b;border:1px solid #2b3238;border-radius:14px;
                        padding:26px 26px 22px;color:#e6eaee;box-shadow:0 24px 60px rgba(0,0,0,.5);">
                <div style="font-size:26px;margin-bottom:10px;">🌵</div>
                <h2 style="margin:0 0 10px;font-size:19px;color:#fff;">${T('finTitulo')}</h2>
                <p style="margin:0 0 20px;color:#aab4bd;">${T('finTexto')}</p>
                <div style="display:flex;flex-wrap:wrap;gap:9px;">
                    ${enlace(APOYO.instalar, T('apoyoInstalar'), 'demo-cta demo-cta-principal')}
                    ${enlace(APOYO.codigo, T('apoyoCodigo'), 'demo-cta')}
                    ${enlace(APOYO.apoyar, '☕ ' + T('apoyoApoyar'), 'demo-cta')}
                </div>
                <button type="button" id="demo-panel-cerrar"
                        style="margin-top:16px;background:none;border:0;color:#7e8993;cursor:pointer;
                               font:13px system-ui,sans-serif;padding:0;">${T('finCerrar')}</button>
            </div>`;

        document.body.appendChild(fondo);
        fondo.querySelector('#demo-panel-cerrar').addEventListener('click', () => fondo.remove());
        fondo.addEventListener('click', e => { if (e.target === fondo) fondo.remove(); });
    }

    // Se cuenta la navegación por clics en el menú lateral en vez de
    // envolver switchSection(): el core la llama por su nombre global y
    // parchearla desde fuera es la clase de acoplamiento que se rompe en
    // cuanto NOPAL toque su propio arranque.
    document.addEventListener('click', evento => {
        const boton = evento.target.closest('[data-section]');
        if (!boton) return;
        seccionesVistas.add(boton.dataset.section);
        if (seccionesVistas.size >= 4) setTimeout(panelFinal, 1200);
    });


    // ── Accesorios del taller ─────────────────────────────────────────
    // Una placa ESP32 con una tira WS2812 conectada. Sin esto, "Alertas
    // visuales" abre en su estado vacío ("falta registrar una tira LED") y
    // el visitante se queda sin ver una de las cosas más vistosas que hace
    // NOPAL: pintar el estado de cada máquina en luz.
    const PLACA = {
        id: 'esp32-demo',
        name: 'ESP32 Taller',
        ip: '192.0.2.70',
        device: null,
        // catalog_id, no "catalog": el plugin busca esa clave exacta para
        // cruzar la placa con su mapa de pines (BOARD_CATALOG). Con otro
        // nombre la placa se guarda pero se dibuja sin pines.
        catalog_id: 'esp32_devkit',
        connected: true,
        manual: false,
        show: true,
        info: { board: 'ESP32-WROOM-32', firmware: 'Nopal_FF 2.6.0', protocol: 4 },
        // Se deja en null a propósito: así el plugin usa el mapa de pines de
        // su propio catálogo, que es el bueno, en vez de uno inventado aquí
        // que quedaría desfasado en cuanto el plugin cambie.
        pins: null,
    };

    const TIRA_LED = {
        id: 'led-demo',
        name: 'Tira WS2812 · banco',
        kind: 'led_strip',
        driver: 'arduino',
        on: true,
        board_id: PLACA.id,
        config: { ip: PLACA.ip, pin: 5, led_count: 30, protocol: 4, segment_capable: true },
    };

    const SENSOR_AMBIENTE = {
        id: 'amb-1',
        name: 'Sensor de taller',
        kind: 'ambient',
        driver: 'arduino',
        on: true,
        board_id: PLACA.id,
        config: { ip: PLACA.ip, pin: 16 },
        temperature: 27.2,
        humidity: 48,
        online: true,
    };

    // Los ocho estados que NOPAL sabe pintar, con su color de fábrica. Van
    // en RGB porque el editor los convierte a hex para el <input type=color>.
    const LED_ESTADOS = ['idle', 'heating', 'cooling', 'printing', 'paused', 'completed', 'error', 'offline'];
    const LED_COLORES = {
        idle: [40, 90, 60], heating: [255, 138, 40], cooling: [70, 150, 240],
        printing: [62, 200, 120], paused: [240, 190, 60], completed: [90, 230, 140],
        error: [230, 60, 60], offline: [60, 66, 72],
    };

    // ── Biblioteca y miniaturas ───────────────────────────────────────
    // Las miniaturas son piezas dibujadas, no renders de archivos reales:
    // el visor 3D del demo no tiene ningún STL que abrir, así que lo único
    // que hace falta es que cada archivo tenga una imagen coherente con su
    // nombre. Se eligen por palabra clave y, si ninguna encaja, por el largo
    // del nombre — cualquier cosa antes de repetir siempre la misma.
    const MINIATURAS = ['engranaje', 'caja', 'soporte', 'bandeja', 'adaptador', 'portacarretes'];

    function miniaturaDe(nombre) {
        const n = (nombre || '').toLowerCase();
        if (/engranaje|gear|piñon/.test(n)) return 'engranaje';
        if (/caja|box|tapa|carcasa/.test(n)) return 'caja';
        if (/soporte|mount|bracket|escuadra/.test(n)) return 'soporte';
        if (/organizador|bandeja|tray|rejilla/.test(n)) return 'bandeja';
        if (/adaptador|boquilla|cono|manguera/.test(n)) return 'adaptador';
        if (/carrete|spool|rodamiento/.test(n)) return 'portacarretes';
        return MINIATURAS[n.length % MINIATURAS.length];
    }

    const DIAS = 86400000;

    // ── Historial de trabajos ─────────────────────────────────────────
    // Un historial creíble no es una lista de éxitos: lleva cancelaciones y
    // algún fallo, que es lo que hace que el panel de estados tenga algo que
    // mostrar además del verde.
    const HISTORIAL = [
        {
            printer: 'Anet ET4',
            jobs: [
                ['soporte_camara_v2.gcode', 'completed', 4 * 3600 + 12 * 60, 1.2],
                ['organizador_tornillos.gcode', 'completed', 6 * 3600 + 41 * 60, 2.4],
                ['adaptador_manguera_50mm.gcode', 'cancelled', 22 * 60, 3.1],
                ['tapa_caja_v2.gcode', 'completed', 2 * 3600 + 8 * 60, 4.5],
                ['portacarretes_rodamiento.gcode', 'completed', 5 * 3600 + 30 * 60, 6.2],
            ],
        },
        {
            printer: 'Ender 3 V2',
            jobs: [
                ['engranaje_helicoidal_v2.gcode', 'error', 48 * 60, 1.6],
                ['soporte_placa_esp32.gcode', 'completed', 3 * 3600 + 55 * 60, 2.9],
                ['caja_estanca_tapa.gcode', 'completed', 7 * 3600 + 14 * 60, 5.1],
                ['engranaje_helicoidal.gcode', 'cancelled', 1 * 3600 + 3 * 60, 7.8],
            ],
        },
    ].map(g => ({
        printer: g.printer,
        jobs: g.jobs.map(([filename, status, dur, dias]) => ({
            filename,
            status,
            print_duration: dur,
            end_time: Math.floor((Date.now() - dias * DIAS) / 1000),
            file_url: '#',
            thumbnail_url: `static/demo/thumbs/${miniaturaDe(filename)}.webp`,
        })),
    }));

    const HISTORIAL_LASER = [
        ['llavero_logo_x12.nc', 'completed', 0.4],
        ['plantilla_grabado_llavero.nc', 'completed', 1.1],
        ['carcasa_frontal_corte.nc', 'cancelled', 2.3],
        ['regla_medidas.nc', 'completed', 3.7],
        ['placa_identificacion.nc', 'completed', 5.9],
    ].map(([filename, state, dias]) => ({
        filename,
        state,
        host: '192.0.2.41',
        completed_at: Math.floor((Date.now() - dias * DIAS) / 1000),
        snapshot: null,
    }));

    // ── Historial de trabajos con control (3D + láser + CNC) ───────────
    // GET /api/jobs/history devuelve una lista unificada ya filtrada y paginada,
    // más un resumen por tipo y si quien mira puede eliminar. Aquí se arma con
    // los mismos trabajos que ya muestran las otras pantallas, más unos de CNC.
    const PUERTO_DE = { 'Anet ET4': 7211, 'Ender 3 V2': 7213 };
    const USUARIOS_DEMO = ['demo', 'beto', '', 'demo', ''];   // '' = lo arrancó otra herramienta (Mainsail, la pantalla)
    const FALLOS_DEMO = {
        'engranaje_helicoidal_v2.gcode': 'Moonraker: klippy_shutdown',
        'grabado_placa_aluminio.nc': 'línea 214: el movimiento se sale del área de trabajo permitida',
    };
    const HISTORIAL_CNC = [
        ['dibujo_mandala_plotter.gcode', 'completed', 52 * 60, 0.7],
        ['grabado_placa_aluminio.nc', 'error', 18 * 60, 1.9],
        ['marco_logo.nc', 'incomplete', 9 * 60, 4.2],
        ['plantilla_pcb.nc', 'completed', 74 * 60, 9.0],
    ];

    function filasHistorial() {
        const ahora = Math.floor(Date.now() / 1000);
        const enBiblioteca = new Set(archivosDe('gcode', 'gcode').map(a => a.name));
        const fila = (r) => Object.assign({
            host: null, machine_id: null, port: null, error: null, thumbnail: null, thumbnail_url: null,
            file_url: null, source: 'nopal', user: '',
        }, r, {
            deletable: ['error', 'cancelled', 'incomplete'].includes(r.status),
            library: enBiblioteca.has(r.name) ? { section: 'gcode', path: r.name } : null,
        });
        const filas = [];
        let n = 0;
        HISTORIAL.forEach(g => g.jobs.forEach(j => {
            const puerto = PUERTO_DE[g.printer];
            filas.push(fila({
                id: '3d:' + puerto + ':' + j.end_time + ':' + j.filename, kind: '3d', name: j.filename,
                machine: g.printer, machine_id: 'klipper:' + puerto, port: puerto, status: j.status,
                error: FALLOS_DEMO[j.filename] || null,
                started_at: j.end_time - j.print_duration, ended_at: j.end_time, duration_s: j.print_duration,
                user: USUARIOS_DEMO[n++ % USUARIOS_DEMO.length], thumbnail_url: j.thumbnail_url, file_url: j.file_url,
                source: 'moonraker',
            }));
        }));
        HISTORIAL_LASER.forEach((j, i) => {
            const dur = (14 + i * 7) * 60;
            filas.push(fila({
                id: 'laser:' + j.filename + ':' + j.completed_at, kind: 'laser', name: j.filename,
                machine: 'Sculpfun S30', host: j.host, machine_id: 'laser:mch_demo0000000041', status: j.state,
                started_at: j.completed_at - dur, ended_at: j.completed_at, duration_s: dur,
                user: USUARIOS_DEMO[n++ % USUARIOS_DEMO.length] || 'demo',
            }));
        });
        HISTORIAL_CNC.forEach(([nombre, estado, dur, dias]) => {
            const fin = Math.floor((Date.now() - dias * DIAS) / 1000);
            filas.push(fila({
                id: 'cnc:' + nombre + ':' + fin, kind: 'cnc', name: nombre, machine: 'CNC 3018 Pro',
                host: '192.0.2.42', machine_id: 'laser:mch_demo0000000042', status: estado,
                error: FALLOS_DEMO[nombre] || null, started_at: fin - dur, ended_at: fin, duration_s: dur,
                user: USUARIOS_DEMO[n++ % USUARIOS_DEMO.length] || 'beto',
            }));
        });
        filas.sort((a, b) => (b.ended_at || b.started_at) - (a.ended_at || a.started_at));
        return { filas, ahora };
    }

    function respuestaHistorial(consulta) {
        const q = new URLSearchParams(consulta);
        const tipo = q.get('kind') || 'all';
        const dias = parseInt(q.get('days') || '30', 10);
        const texto = (q.get('q') || '').trim().toLowerCase();
        const tamanos = [8, 12, 16, 24, 48];
        const pedido = parseInt(q.get('page_size') || '8', 10);
        const tamano = tamanos.includes(pedido) ? pedido : 8;
        const { filas, ahora } = filasHistorial();
        const alcance = filas.filter(r =>
            (!dias || (r.ended_at || r.started_at) >= ahora - dias * 86400) &&
            (!texto || r.name.toLowerCase().includes(texto)));
        const mostradas = tipo === 'all' ? alcance : alcance.filter(r => r.kind === tipo);
        const resumen = { '3d': 0, laser: 0, cnc: 0 };
        alcance.forEach(r => { resumen[r.kind]++; });
        resumen.total = resumen['3d'] + resumen.laser + resumen.cnc;
        const paginas = Math.max(1, Math.ceil(mostradas.length / tamano));
        const pagina = Math.max(1, Math.min(parseInt(q.get('page') || '1', 10), paginas));
        return {
            items: mostradas.slice((pagina - 1) * tamano, pagina * tamano), total: mostradas.length,
            page: pagina, pages: paginas, page_size: tamano, summary: resumen, can_delete: true,
        };
    }

    // Registro de control: lo que un administrador dio de baja, con quién y por qué.
    function registroControl() {
        const ahora = Date.now() / 1000;
        const baja = (id, trabajo, hace, motivo) => ({
            id, job_id: 'demo:' + id, deleted_at: ahora - hace * DIAS / 1000, deleted_by: 'demo', reason: motivo,
            job: { name: trabajo[0], machine: trabajo[1], kind: trabajo[2], status: trabajo[3] },
        });
        const entradas = [
            baja('a1b2c3d4e5f6', ['prueba_calibracion_z.gcode', 'Ender 3 V2', '3d', 'cancelled'], 2.2, 'Prueba de calibración cancelada a propósito'),
            baja('f6e5d4c3b2a1', ['corte_prueba_madera.nc', 'Sculpfun S30', 'laser', 'error'], 6.5, 'Archivo equivocado: se volvió a enviar el correcto'),
        ];
        return { deletions: entradas, total: entradas.length };
    }

    // Exportar el resumen: el demo entrega un archivo de ejemplo, XML o PDF mínimo.
    function pdfMinimo(texto) {
        const flujo = 'BT /F1 14 Tf 56 780 Td (' + texto.replace(/[()\\]/g, ' ') + ') Tj ET';
        const objetos = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length ' + flujo.length + ' >>\nstream\n' + flujo + '\nendstream',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];
        let pdf = '%PDF-1.4\n';
        const desplazamientos = [];
        objetos.forEach((o, i) => { desplazamientos.push(pdf.length); pdf += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
        const xref = pdf.length;
        pdf += 'xref\n0 ' + (objetos.length + 1) + '\n0000000000 65535 f \n' +
            desplazamientos.map(d => String(d).padStart(10, '0') + ' 00000 n \n').join('') +
            'trailer\n<< /Size ' + (objetos.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
        return pdf;
    }

    function exportarHistorial(consulta) {
        const q = new URLSearchParams(consulta);
        const formato = q.get('format') === 'xml' ? 'xml' : 'pdf';
        const { items } = respuestaHistorial(consulta.replace(/page_size=\d+/, '') + '&page_size=48');
        const nombre = 'historial-trabajos-demo.' + formato;
        const cabeceras = { 'Content-Disposition': 'attachment; filename="' + nombre + '"' };
        if (formato === 'xml') {
            const filas = items.map(r => '  <trabajo tipo="' + r.kind + '" estado="' + r.status + '"><archivo>' + r.name + '</archivo><maquina>' + r.machine + '</maquina></trabajo>').join('\n');
            return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<historial_trabajos demo="true">\n' + filas + '\n</historial_trabajos>\n',
                { status: 200, headers: Object.assign({ 'Content-Type': 'application/xml' }, cabeceras) });
        }
        return new Response(pdfMinimo('NOPAL - Historial de trabajos (archivo de ejemplo del demo)'),
            { status: 200, headers: Object.assign({ 'Content-Type': 'application/pdf' }, cabeceras) });
    }

    // ── Carpetas y archivos ───────────────────────────────────────────
    // /api/browse sirve las dos bibliotecas (modelos y G-code) según su
    // parámetro `type`. Se arma desde una sola lista para que un archivo
    // .stl y su .gcode correspondiente no se contradigan entre secciones.
    const ARCHIVOS = [
        ['soporte_camara_v3', 2847113, 1.0],
        ['engranaje_helicoidal', 1204880, 2.5],
        ['caja_estanca_tapa', 984221, 3.2],
        ['organizador_tornillos', 3410992, 5.8],
        ['adaptador_manguera_50mm', 512004, 8.1],
        ['portacarretes_rodamiento', 1877340, 11.4],
        ['soporte_placa_esp32', 640118, 14.0],
        ['regla_medidas', 224910, 16.3],
    ];

    const CARPETAS = ['Proyectos', 'Repuestos', 'Clientes', 'Pruebas'];

    function biblioteca(tipo, path) {
        const ext = tipo === 'gcode' ? 'gcode' : 'stl';
        // Dentro de una carpeta no hay más carpetas: si la raíz se devolviera
        // igual en cualquier nivel, el visitante entraría en "Proyectos" y se
        // encontraría otra vez las mismas cuatro, para siempre.
        if (path) {
            const desde = path.length % 4;
            return {
                folders: [],
                files: archivosDe(tipo, ext).slice(desde, desde + 3),
            };
        }
        return {
            folders: CARPETAS.map(name => ({
                name,
                id: `${tipo}/${name}`,
                path: name,
                type: 'folder',
                file_count: 3 + name.length % 5,
            })),
            files: archivosDe(tipo, ext),
        };
    }

    function archivosDe(tipo, ext) {
        return ARCHIVOS.map(([base, size, dias], i) => ({
            id: `${tipo}/${base}.${ext}`,
            name: `${base}.${ext}`,
            path: `${base}.${ext}`,
            size: tipo === 'gcode' ? Math.round(size * 0.42) : size,
            extension: ext,
            modified: Math.floor((Date.now() - dias * DIAS) / 1000),
            material: ['PETG', 'ABS', 'PLA'][i % 3],
            file_url: '#',
            estimated_time_minutes: 45 + i * 37,
        }));
    }


    // ── Consola, cotizador y editor ───────────────────────────────────
    // Las tres secciones que quedaban en blanco. Los mensajes de consola
    // imitan un diálogo real con Klipper (comando y respuesta), porque una
    // consola vacía no enseña para qué sirve.
    const CONSOLA = [
        ['command', 'STATUS'],
        ['response', 'Klipper state: Ready'],
        ['command', 'M115'],
        ['response', 'FIRMWARE_NAME:Klipper FIRMWARE_VERSION:v0.12.0-267-g6ba1b4a'],
        ['command', 'QUERY_PROBE'],
        ['response', 'probe: open'],
        ['command', 'M105'],
        ['response', 'ok T:210.4 /210.0 B:59.8 /60.0'],
        ['command', 'SET_HEATER_TEMPERATURE HEATER=extruder TARGET=210'],
        ['response', 'ok'],
        ['response', 'Print started: soporte_camara_v3.gcode'],
        ['command', 'GET_POSITION'],
        ['response', 'mcu: stepper_x:12480 stepper_y:9376 stepper_z:2240'],
        ['response', 'toolhead: X:118.400 Y:96.750 Z:22.400 E:412.093'],
    ].map(([tipo, texto], i) => ({
        time: Math.floor(Date.now() / 1000) - (14 - i) * 37,
        type: tipo,
        message: texto,
    }));

    const MAQUINAS_PRECIO = [
        { id: 'maq-1', name: 'Anet ET4', kind: 'printer', watts: 180, rate_per_hour: 35 },
        { id: 'maq-2', name: 'Ender 3 V2', kind: 'printer', watts: 210, rate_per_hour: 35 },
        { id: 'maq-3', name: 'Sculpfun S30', kind: 'laser', watts: 90, rate_per_hour: 60 },
        { id: 'maq-4', name: 'CNC 3018 Pro', kind: 'cnc', watts: 350, rate_per_hour: 75 },
    ];

    const MATERIALES_PRECIO = [
        { id: 'mat-1', name: 'PLA', kind: 'filament', unit: 'g', unit_cost: 0.024 },
        { id: 'mat-2', name: 'PETG', kind: 'filament', unit: 'g', unit_cost: 0.031 },
        { id: 'mat-3', name: 'ABS', kind: 'filament', unit: 'g', unit_cost: 0.028 },
        { id: 'mat-4', name: 'MDF 3 mm', kind: 'sheet', unit: 'cm2', unit_cost: 0.004 },
        { id: 'mat-5', name: 'Acrílico 3 mm', kind: 'sheet', unit: 'cm2', unit_cost: 0.011 },
    ];

    const PRESUPUESTOS = [
        ['soporte_camara_v3.stl', 'Anet ET4', 'PETG', 'printer', 214.5],
        ['llavero_logo_x12.svg', 'Sculpfun S30', 'MDF 3 mm', 'laser', 96.0],
        ['engranaje_helicoidal.stl', 'Ender 3 V2', 'ABS', 'printer', 158.25],
    ].map(([archivo, maquina, material, tipo, total], i) => ({
        id: `presupuesto-${i + 1}`,
        file: archivo,
        machine: maquina,
        material,
        job_type: tipo,
        created_at: Math.floor((Date.now() - (i + 1) * 2 * DIAS) / 1000),
        status: ['sent', 'accepted', 'draft'][i],
        costs: { material: total * 0.42, machine: total * 0.38, energy: total * 0.06, margin: total * 0.14, total },
    }));

    // G-code de ejemplo para que el editor no abra en blanco: cabecera de
    // slicer y unas capas reales, que es lo que hace que las herramientas de
    // análisis de la sección tengan algo que analizar.
    const GCODE_EJEMPLO = [
        '; generado por NOPAL Live Demo',
        '; archivo: soporte_camara_v3.gcode',
        '; capa_altura = 0.2',
        '; relleno = 20%',
        '; material = PETG',
        '',
        'M190 S60          ; espera a que la cama llegue a 60 C',
        'M104 S210         ; calienta la boquilla sin esperar',
        'G28               ; home de todos los ejes',
        'G29               ; nivelado de cama',
        'M109 S210         ; ahora si, espera la boquilla',
        'G92 E0',
        'G1 Z0.200 F1200',
        '',
        '; ---- capa 1 ----',
        'G1 X20.000 Y20.000 F3000',
        'G1 X180.000 Y20.000 E12.4521 F1200',
        'G1 X180.000 Y180.000 E24.9042',
        'G1 X20.000 Y180.000 E37.3563',
        'G1 X20.000 Y20.000 E49.8084',
        '',
        '; ---- capa 2 ----',
        'G1 Z0.400 F1200',
        'G1 X22.000 Y22.000 F3000',
        'G1 X178.000 Y22.000 E61.9432 F1200',
        'G1 X178.000 Y178.000 E74.0780',
        '',
        'M104 S0           ; apaga la boquilla',
        'M140 S0           ; apaga la cama',
        'G28 X0            ; aparta el cabezal',
        'M84               ; libera los motores',
    ].join('\n');

    // ── Rutas ─────────────────────────────────────────────────────────
    const rutas = {
        '/api/auth/setup-required': () => ({ required: false }),
        '/api/auth/me': () => ({ username: 'demo', role: 'admin' }),
        '/api/system/version': () => ({ version: '1.2.0-alpha.1', demo: true }),

        '/api/printers/status': () => ({ printers: taller.impresoras.map(comoLaEsperaNopal) }),
        '/api/spoolman/printers/active-spools': () => ({ links: taller.carretes }),
        '/api/cameras': () => ({ cameras: camaras }),

        '/api/models': () => biblioteca('model').files,
        '/api/storage': () => ({ used: 18 * 1024 ** 3, free: 92 * 1024 ** 3, total: 110 * 1024 ** 3 }),
        '/api/folders': () => ({ folders: biblioteca('model').folders }),
        '/api/files': () => ({ files: biblioteca('gcode').files }),
        '/api/printers/recent-files': () => ({ printers: HISTORIAL }),
        '/api/laser/history': () => ({ jobs: HISTORIAL_LASER }),
        '/api/printers/queue/count': () => ({ count: 2 }),
        '/api/printers/schedule': () => ({ scheduled: [] }),

        '/api/ai/status': () => ({ enabled: true, model: T('modelo'), provider: 'demo' }),
        '/api/ai/enabled': () => ({ enabled: true, providers: [] }),
        '/api/ai/providers': () => ({
            enabled: true,
            providers: [{ id: 'demo', name: 'NOPAL Demo', model: T('modelo'), active: true, has_key: true }],
        }),
        '/api/ai/presets': () => ({ presets: [] }),
        '/api/ai/suggestions': () => ({
            suggestions: T('sugerencias'),
        }),
        '/api/ai/conversations': () => ({
            conversations: conversaciones().map(c => ({
                id: c.id, title: c.title, message_count: c.messages.length, updated_at: c.updated_at,
            })),
        }),
        '/api/ai/tools/get_recent_events': () => ({ events: eventosDemo() }),
        '/api/devices/registry': () => ({ machines: maquinasIA() }),

        // El panel superior del Inicio: salud, host, contadores por tipo de
        // máquina, trabajos en curso y las fichas chicas de ambiente/consumo.
        '/api/dashboard/summary': () => ({
            system: {
                services_online: 6, services_total: 6,
                uptime_seconds: 4 * 86400 + 7 * 3600 + 12 * 60,
                update_status: 'up_to_date',
            },
            host: {
                online: true,
                cpu_percent: Math.round(12 + Math.random() * 14),
                cpu_history: Array.from({ length: 20 }, () => Math.round(10 + Math.random() * 22)),
                mem_percent: 41, disk_percent: 17,
                disk_used_bytes: 18 * 1024 ** 3, disk_total_bytes: 110 * 1024 ** 3,
                load_average: 0.42,
            },
            devices: {
                printer: { online: taller.impresoras.length, total: taller.impresoras.length },
                laser: { online: 1, total: 1 },
                cnc: { online: 1, total: 1 },
                camera: { online: camaras.length, total: camaras.length },
            },
            jobs: taller.impresoras.filter(i => i.job).map(i => ({
                name: i.name, filename: i.job.filename, machine_type: 'printer',
                state: i.state, progress: Math.round(i.job.progress),
                time_remaining_s: i.job.estimated_remaining,
                current_layer: i.job.current_layer, total_layer: i.job.total_layer,
            })).concat([{
                name: 'Sculpfun S30', filename: 'llavero_logo.nc', machine_type: 'laser',
                state: 'printing', progress: Math.round(laser.progress),
                time_remaining_s: 8 * 60, current_layer: null, total_layer: null,
            }]),
            alerts: { error: 0, warning: 2, info: 3 },
            ambient: 27,
            power: { active_watts: 312 },
            maintenance: 'Boquilla Anet ET4 · 40 h de uso',
        }),

        // Láser y CNC: el registro da los nombres, el estado va por host.
        // El vocabulario es el de GRBL (Run/Idle/Hold), que es lo que NOPAL
        // traduce a "grabando / lista / pausada".
        '/api/laser/registry': () => ({ lasers: [
            { host: '192.0.2.41', name: 'Sculpfun S30', kind: 'laser' },
            { host: '192.0.2.42', name: 'CNC 3018 Pro', kind: 'cnc' },
        ] }),
        '/api/laser/jobs/active': () => ({ jobs: [{
            host: '192.0.2.41', filename: 'llavero_logo.nc',
            progress: Math.round(laser.progress), estimated_remaining: 8 * 60,
        }] }),
        '/api/laser/host': () => ({ host: '192.0.2.41' }),

        '/api/console/messages': () => ({ messages: CONSOLA }),
        '/api/macros': () => ({ macros: [
            { name: 'START_PRINT', description: 'Precalienta, hace home y purga' },
            { name: 'END_PRINT', description: 'Retrae, aparta el cabezal y enfría' },
            { name: 'PAUSE_PARK', description: 'Pausa y aparca en la esquina' },
            { name: 'LOAD_FILAMENT', description: 'Carga filamento' },
            { name: 'UNLOAD_FILAMENT', description: 'Descarga filamento' },
            { name: 'CALIBRATE_BED', description: 'Nivelado de cama en 9 puntos' },
        ] }),
        '/api/pricing/machines': () => ({ machines: MAQUINAS_PRECIO }),
        '/api/pricing/materials': () => ({ materials: MATERIALES_PRECIO }),
        '/api/pricing/quotes': () => ({ quotes: PRESUPUESTOS }),
        '/api/pricing/settings': () => ({
            settings: { currency: 'MXN', energy_cost_kwh: 1.85, margin_percent: 14, tax_percent: 16 },
        }),

        // Spoolman: el inventario completo del taller de mentira. Los
        // colores son los mismos hex que ya usan las fichas del panel, así
        // el carrete que se ve en la impresora y el de la lista coinciden.
        '/api/spoolman/config': () => ({ configured: true, url: 'http://demo.local:7912', connected: true }),
        '/api/spoolman/spools': () => ({ spools: INVENTARIO }),
        '/api/spoolman/summary': () => ({ total_spools: INVENTARIO.length, total_weight: 3821 }),
        '/api/spoolman/alerts': () => ({ alerts: [
            { level: 'warning', message: 'ABS Naranja por debajo de 300 g', spool_id: 3 },
        ] }),
        '/api/spoolman/consumption/monthly': () => ({ by_material: { PLA: 1840, PETG: 970, ABS: 412 } }),
        '/api/spoolman/reservations': () => ({ reservations: [] }),
        '/api/spoolman/moonraker-check': () => ({ printers: [] }),

        // Sensores del taller (plugin arduino-accessories): la ficha de
        // ambiente del panel y el widget de accesorios.
        '/api/accessories/status': () => ({ accessories: [TIRA_LED, SENSOR_AMBIENTE] }),
        '/api/accessories/arduino/ambient-sensor': () => ({
            board_id: PLACA.id, online: true,
            temperature: 27 + Math.round(Math.random() * 10) / 10, humidity: 48,
        }),
        // Vacío a propósito: el plugin, al no encontrar placas guardadas,
        // registra una con los pines de su propio catálogo y el POST de
        // abajo se los devuelve tal cual. Así el mapa de pines siempre es el
        // que el plugin considera correcto, sin copiarlo en este archivo.
        '/api/accessories/arduino/boards': () => ({ boards: [] }),

        // El plugin abre su asistente de primer uso si el descubrimiento
        // vuelve vacío, por muchas placas guardadas que haya. Devolver aquí
        // la placa es lo que hace que el panel arranque mostrando el taller
        // en vez del "antes de empezar". Los campos son los que mira
        // catalogIdForDiscoveredBoard() para reconocer el modelo.
        '/api/accessories/arduino/discover': () => ({ boards: [{
            ip: PLACA.ip,
            device: null,
            hostname: 'nopal-esp32',
            board: 'esp32_devkit',
            chip: 'ESP32-WROOM-32',
            model: 'ESP32 DevKit v1',
            firmware: 'Nopal_FF 2.6.0',
            relays: 1,
            pwm_led: 1,
            ws2812: { pin: 5, count: TIRA_LED.config.led_count },
            wifi: { ssid: 'TALLER', rssi: -54 },
        }] }),
        '/api/accessories/arduino/telemetry': () => ({ boards: [{
            id: PLACA.id, online: true,
            telemetry: { rssi: -54, uptime_s: 84200, free_heap: 148320, temperature: 27.2, humidity: 48 },
        }] }),
        '/api/accessories/arduino/lighting': () => ({ boards: [PLACA] }),
        '/api/accessories/power': () => ({ active_watts: 312, devices: [] }),

        // El editor de alertas visuales: la tira disponible, la escena ya
        // guardada para que abra configurado en vez de en blanco, y la
        // paleta de fábrica para los ocho estados.
        '/api/accessories/machine-led/config': () => ({
            targets: [{
                id: TIRA_LED.id, name: TIRA_LED.name, label: TIRA_LED.name,
                led_count: TIRA_LED.config.led_count,
                protocol: TIRA_LED.config.protocol,
                segment_capable: true,
            }],
            config: {
                enabled: true, accessory_id: TIRA_LED.id,
                start: 0, count: TIRA_LED.config.led_count, colors: {},
            },
            default_colors: LED_COLORES,
            states: LED_ESTADOS,
        }),
        '/api/accessories/machine-led/enabled': () => ({ enabled: true }),
        '/api/accessories/machine-led/state': () => ({ state: 'printing', color: LED_COLORES.printing }),
        '/api/accessories/arduino/list-ports': () => ({ ports: [] }),
        '/api/accessories/scenes': () => ({ scenes: [] }),
        '/api/accessories/activity': () => ({ activity: [] }),

        // Matriz LED: la pantalla del taller, conectada y con anuncios ya
        // cargados. Su panel es de los más visuales del catálogo y quedaba
        // en blanco con las respuestas genéricas.
        '/api/plugins/matriz-led/status': () => ({ configured: true, connected: true, reason: null }),
        '/api/plugins/matriz-led/config': () => ({ ip: '192.0.2.60', has_password: true, brightness: 70 }),
        '/api/plugins/matriz-led/announcements': () => ({ announcements: [
            { id: 1, name: 'Bienvenida', text: 'NOPAL', color: '#3E8E5A', group: 'Taller' },
            { id: 2, name: 'Aviso de material', text: 'ABS BAJO', color: '#D9622B', group: 'Alertas' },
            { id: 3, name: 'Fin de trabajo', text: 'LISTO', color: '#22c55e', group: 'Taller' },
        ] }),
        '/api/plugins/matriz-led/device-info': () => ({ model: 'iPixel Color 16x32', firmware: '1.4', online: true }),
        '/api/plugins/matriz-led/last-sent': () => ({ text: 'LISTO', at: new Date().toISOString() }),
        '/api/plugins/matriz-led/last-error': () => ({ error: null }),
        '/api/plugins/matriz-led/stats': () => ({ sent_today: 14, sent_total: 386 }),
    };

    // Acciones: cambian el estado de verdad. Es la diferencia entre un
    // recorrido y una captura de pantalla con botones pintados.
    const acciones = [
        [/\/api\/printers\/\d+\/pause$/, imp => { if (imp) imp.state = 'paused'; }],
        [/\/api\/printers\/\d+\/resume$/, imp => { if (imp) imp.state = 'printing'; }],
        [/\/api\/printers\/\d+\/cancel$/, imp => {
            if (!imp) return;
            imp.state = 'ready';
            imp.job = null;
            imp.extruder.target = 0;
            imp.bed.target = 0;
        }],
    ];

    // Escrituras permitidas: las que forman parte del recorrido. Todo lo
    // demás que intente MODIFICAR configuración se rechaza con un mensaje
    // claro en vez de fingir que guardó — un demo que dice "guardado" y al
    // recargar perdió todo es peor que uno que avisa que es de solo lectura.
    const ESCRITURA_OK = [
        /\/api\/printers\/\d+\/(pause|resume|cancel)$/,
        /^\/api\/accessories\/arduino\/boards$/,
        /^\/api\/ai\/ask$/,
        /^\/api\/ai\/conversations/,
        /^\/api\/ai\/tools\//,
    ];

    // El core pide las miniaturas con <img src="/api/models/thumbnail?...">, que no pasa por fetch: contra
    // el servidor estático daría 404. Se reescribe a la miniatura dibujada del demo en los tres sitios por
    // donde puede entrar una imagen: la propiedad src, innerHTML e insertAdjacentHTML.
    const RE_MINIATURA = /\/api\/(?:models|gcode)\/thumbnail\?([^"'\s>)]*)/g;
    function miniaturaDeUrl(query) {
        const ruta = new URLSearchParams(query.replace(/&amp;/g, '&')).get('path') || '';
        return 'static/demo/thumbs/' + miniaturaDe(ruta) + '.webp';
    }
    const reescribirHtml = (html) => (typeof html === 'string' ? html.replace(RE_MINIATURA, (_, q) => miniaturaDeUrl(q)) : html);
    (function () {
        const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        Object.defineProperty(HTMLImageElement.prototype, 'src', Object.assign({}, src, {
            set(valor) { src.set.call(this, reescribirHtml(valor)); },
        }));
        const inner = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        Object.defineProperty(Element.prototype, 'innerHTML', Object.assign({}, inner, {
            set(valor) { inner.set.call(this, reescribirHtml(valor)); },
        }));
        const insertar = Element.prototype.insertAdjacentHTML;
        Element.prototype.insertAdjacentHTML = function (posicion, html) { return insertar.call(this, posicion, reescribirHtml(html)); };
    })();

    function json(cuerpo, status = 200) {
        return new Response(JSON.stringify(cuerpo), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    window.fetch = async function demoFetch(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';

        // Todo lo que no sea la API (imágenes, fuentes, modelos 3D, los
        // propios scripts de los plugins) sigue saliendo por el fetch de
        // verdad contra el servidor estático.
        if (!url.startsWith('/api/')) return FETCH_REAL(input, init);

        const camino = url.split('?')[0];
        const metodo = ((init && init.method) || 'GET').toUpperCase();

        // Historial de trabajos con control, y las rutas nuevas de láser/CNC (solo lectura).
        if (metodo === 'GET') {
            const consulta = url.split('?')[1] || '';
            if (camino === '/api/jobs/history') return json(respuestaHistorial(consulta));
            if (camino === '/api/jobs/history/export') return exportarHistorial(consulta);
            if (camino === '/api/jobs/deletions') return json(registroControl());
            if (camino === '/api/laser/sd/status') return json({ present: new URLSearchParams(consulta).get('host') === '192.0.2.42' });
            if (camino === '/api/laser/job/last') return json({ job: null });
            if (camino === '/api/laser/info') {
                const cnc = new URLSearchParams(consulta).get('host') === '192.0.2.42';
                return json({ Device: cnc ? 'CNC 3018 Pro' : 'Sculpfun S30', Chip: 'ESP32', Firmware: cnc ? 'GRBL 1.1h' : 'GRBL 1.1f',
                    Description: 'Placa GRBL por WiFi' });
            }
            if (camino === '/api/laser/registry/status') return json({ lasers: rutas['/api/laser/registry']().lasers.map(l => Object.assign({ online: true }, l)) });
            // Tarjetas de Configuración que esperan una forma concreta (sin ella el recuadro revienta).
            if (camino === '/api/config-backup/groups') {
                const g = (id, label, sensitive, warning) => ({ id, label, sensitive, warning: warning || null, available: true, file_count: 1 });
                return json({ groups: [
                    g('printers', 'Impresoras 3D', false), g('laser_cnc', 'Láser y CNC', false),
                    g('logging', 'Registro (logs)', false), g('accessories', 'Accesorios y placas', false),
                    g('cameras', 'Cámaras', false), g('presets', 'Presets de temperatura', false),
                    g('pricing', 'Cotizador (precios y cotizaciones)', false), g('spoolman', 'Materiales (Spoolman)', false),
                    g('plugins', 'Plugins instalados', false),
                    g('users', 'Usuarios y contraseñas', true, 'Incluye los hashes de contraseña de todas las cuentas.'),
                    g('ai', 'NOPAL Intelligence', true, 'Incluye la clave de API de tu proveedor de IA, en claro dentro del archivo.'),
                ] });
            }
            if (camino === '/api/system/diagnostics') {
                return json({ app_version: '1.2.0-alpha', commit: null, branch: null, os: 'Debian GNU/Linux 13',
                    architecture: 'x86_64', python_version: '3.13' });
            }
        }

        for (const [patron, efecto] of acciones) {
            if (patron.test(camino)) {
                efecto(porPuerto(camino + '/'));
                return json({ success: true });
            }
        }

        if (camino === '/api/ai/ask') {
            const cuerpo = JSON.parse((init && init.body) || '{}');
            const r = respuestaIA(cuerpo.question);
            // Una respuesta instantánea delata el truco: la espera corta es
            // lo que hace que el "Pensando..." de la interfaz tenga sentido.
            await new Promise(res => setTimeout(res, 700 + Math.random() * 900));
            return json({
                answer: r.answer,
                conversation_id: cuerpo.conversation_id || 'demo-live',
                tool_calls: r.tools.map(nombre => ({ tool: nombre })),
                elapsed_ms: 1400,
            });
        }

        const conv = camino.match(/^\/api\/ai\/conversations\/(.+)$/);
        if (conv && metodo === 'GET') {
            const c = conversaciones().find(x => x.id === conv[1]);
            return c ? json(c) : json({ id: conv[1], title: '', messages: [] });
        }

        // Registrar una placa: se responde con lo mismo que llegó, más un
        // id. Es la única escritura que el demo acepta de verdad, y hace
        // falta porque sin ella el panel de accesorios se queda colgado en
        // "verificando firmware" para siempre.
        if (camino === '/api/accessories/arduino/boards' && metodo === 'POST') {
            const cuerpo = new URLSearchParams(String((init && init.body) || ''));
            let pines = null;
            try { pines = JSON.parse(cuerpo.get('pins') || 'null'); } catch (_) { pines = null; }
            return json({
                id: PLACA.id,
                catalog_id: cuerpo.get('catalog_id') || PLACA.catalog_id,
                name: cuerpo.get('name') || PLACA.name,
                pins: pines,
                device: cuerpo.get('device') || null,
                ip: cuerpo.get('ip') || PLACA.ip,
            });
        }

        if (camino === '/api/plugins' && metodo === 'GET') return json(await catalogoDePlugins());

        // Las dos bibliotecas comparten endpoint y se distinguen por `type`.
        if (camino === '/api/browse') {
            const q = new URLSearchParams(url.split('?')[1] || '');
            return json(biblioteca(q.get('type') || 'model', q.get('path') || ''));
        }

        // Miniaturas: el core las pide como imagen, no como JSON, así que
        // acá se devuelve la respuesta real del archivo dibujado en vez de
        // fabricar una — un JSON en un <img> sale como imagen rota.
        if (camino === '/api/models/thumbnail' || camino === '/api/gcode/thumbnail') {
            const ruta = new URLSearchParams(url.split('?')[1] || '').get('path') || '';
            return FETCH_REAL(`static/demo/thumbs/${miniaturaDe(ruta)}.webp`);
        }

        // El plugin de cámaras pregunta la salud de cada una por separado
        // (GET /api/cameras/{id}/health) — sin esto las dos salen listadas
        // pero en rojo, como si el visor estuviera roto.
        if (/^\/api\/cameras\/[^/]+\/health$/.test(camino)) {
            return json({ online: true, disabled: false, latency_ms: 38 });
        }
        // Las estadísticas van aparte y el inspector las formatea con
        // toLocaleString(): sin números reales tira excepción en vez de
        // mostrar un guion.
        if (/^\/api\/cameras\/[^/]+\/timelapse\/stats$/.test(camino)) {
            return json({ captures: 214, timelapses: 3, storage_bytes: 34 * 1024 ** 2, paused: false });
        }
        if (/^\/api\/cameras\/[^/]+\/captures$/.test(camino)) return json({ captures: [] });

        // El estado de láser/CNC va por host en la query: es la única ruta
        // del demo donde la respuesta depende de un parámetro, no del camino.
        if (camino === '/api/laser/status') {
            const host = new URLSearchParams(url.split('?')[1] || '').get('host');
            return json(host === '192.0.2.42'
                ? { connected: true, host, state: cnc.estado, firmware: 'GRBL 1.1h', spindle_rpm: 0, feed: 0, x: 0, y: 0, z: 0, speed: 0 }
                : { connected: true, host: '192.0.2.41', state: 'Run', firmware: 'GRBL 1.1f',
                    laser_power: 780, feed: 1400, x: 62.4, y: 38.15, z: 0, speed: 780, progress: Math.round(laser.progress) });
        }

        if (metodo !== 'GET' && !ESCRITURA_OK.some(p => p.test(camino))) {
            return json({ success: false, detail: T('soloLectura') }, 403);
        }

        if (rutas[camino]) return json(rutas[camino]());

        // Default: vacío con forma. Devolver 404 dispararía el manejo de
        // error de cada sección y llenaría el recorrido de avisos rojos por
        // funciones que en el demo simplemente no tienen datos.
        // Las claves de lista van todas presentes a propósito: varios
        // plugins hacen destructuring directo del JSON
        // (`({announcements: x} = await api(...))`) y una clave ausente les
        // deja un undefined que revienta en el primer .map/.length. Un
        // arreglo vacío los deja pintar su estado "sin datos" y seguir.
        return json({
            success: true, data: {}, links: {}, status: {}, config: {},
            items: [], printers: [], entries: [], conversations: [], events: [],
            machines: [], cameras: [], plugins: [], announcements: [], rules: [],
            alerts: [], spools: [], reservations: [], fonts: [], quotes: [],
            materials: [], jobs: [], lasers: [], files: [], folders: [],
            boards: [], ports: [], scenes: [], accessories: [], shapes: [],
            presets: [], suggestions: [], captures: [], history: [], queue: [],
        });
    };

    // ── Cartel de modo demostración ───────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        // Los estilos de los botones van en una hoja propia y no en línea:
        // los estados :hover no se pueden expresar en un atributo style.
        const hoja = document.createElement('style');
        hoja.textContent = `
            .demo-cta { display:inline-block; padding:5px 12px; border-radius:7px;
                        border:1px solid rgba(255,255,255,.45); color:#fff; text-decoration:none;
                        font:600 12px/1.3 system-ui,sans-serif; white-space:nowrap; }
            .demo-cta:hover { background:rgba(255,255,255,.16); }
            .demo-cta-principal { background:#fff; color:#1d6b41; border-color:#fff; }
            .demo-cta-principal:hover { background:#eaf5ee; }
            #demo-panel-final .demo-cta { border-color:#39424a; color:#dfe6ec; padding:8px 14px; }
            #demo-panel-final .demo-cta:hover { background:#212a31; }
            #demo-panel-final .demo-cta-principal { background:#3E8E5A; color:#fff; border-color:#3E8E5A; }
            #demo-panel-final .demo-cta-principal:hover { background:#47a066; }
            .demo-cartel-acciones { display:inline-flex; gap:8px; margin-left:14px; vertical-align:middle; }
            @media (max-width: 720px) {
                .demo-cartel-acciones { display:flex; margin:7px 0 0; justify-content:center; }
            }

            /* Altura FIJA y una sola línea. Medirla con un ResizeObserver se
               realimentaba: al reservar sitio cambiaba el layout, el cartel
               reflowaba, y el hueco crecía sin parar hasta empujar la
               cabecera fuera de la pantalla. Una constante no puede hacer eso. */
            :root { --demo-barra: 44px; }
            #demo-cartel {
                height: var(--demo-barra); display: flex; align-items: center;
                justify-content: center; gap: 14px; padding: 0 14px;
            }
            #demo-cartel > span:first-child {
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
            }
            .demo-cartel-acciones { flex: 0 0 auto; }

            /* El layout de NOPAL ocupa exactamente el alto de la pantalla y el
               scroll vive dentro de .content — por eso el hueco se reserva ahí
               y NO en el body: alargar el body empuja la cabecera fuera de
               cuadro. Los dos elementos que el core ancla abajo son fixed y no
               los mueve ningún padding, así que a esos se les suma la altura
               del cartel a su propio desplazamiento. */
            .ai-capability-dock { bottom: calc(18px + var(--demo-barra)) !important; }
            .dashboard-fixed-stack { bottom: calc(78px + var(--demo-barra)) !important; }

            @media (max-width: 720px) {
                :root { --demo-barra: 40px; }
                #demo-cartel { font-size: 11px; gap: 8px; }
            }`;
        document.head.appendChild(hoja);

        const cartel = document.createElement('div');
        cartel.id = 'demo-cartel';
        cartel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;'
            + 'background:#3E8E5A;color:#fff;font:600 13px/1.4 system-ui,sans-serif;'
            + 'letter-spacing:.02em;';

        // El botón principal es "Instalar", no "Apoyar": quien llega quiere
        // el software. Quien además quiera apoyar lo encuentra al lado.
        const acciones = () => `<span class="demo-cartel-acciones">`
            + enlace(APOYO.instalar, T('apoyoInstalar'), 'demo-cta demo-cta-principal')
            + enlace(APOYO.codigo, T('apoyoCodigo'), 'demo-cta')
            + enlace(APOYO.apoyar, '☕ ' + T('apoyoApoyar'), 'demo-cta')
            + `</span>`;

        // El texto va en su propio <span> para poder recortarlo con puntos
        // suspensivos sin tocar los botones, que nunca deben desaparecer.
        const pintar = () => { cartel.innerHTML = `<span>${T('cartel')}</span>` + acciones(); };
        pintar();
        document.body.appendChild(cartel);

        // El hueco se reserva dentro del contenedor con scroll. Se lee su
        // padding original una sola vez y se le suma la barra: así no se
        // pisa el valor que trae el core ni se depende de conocerlo.
        // El modo "hover" repliega el panel nada más cargar. Para el demo se
        // mantiene abierto los primeros tres segundos: es el resumen del
        // taller y es lo primero que conviene que se vea. Se insiste con un
        // intervalo corto porque el arranque del core lo cierra más de una
        // vez mientras termina de pintar.
        const abrirPanel = setInterval(() => window.setPanelHeroCollapsed?.(false), 200);
        setTimeout(() => {
            clearInterval(abrirPanel);
            window.setPanelHeroCollapsed?.(true);
        }, 3000);

        // El editor de G-code trabaja contra un textarea local, sin backend:
        // basta con dejarle un archivo cargado para que las herramientas de
        // análisis de la sección tengan algo que analizar en vez de abrir en
        // blanco. El evento input es lo que despierta al contador de líneas.
        const editor = document.getElementById('gcode-editor-textarea');
        if (editor && !editor.value.trim()) {
            editor.value = GCODE_EJEMPLO;
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            const nombre = document.getElementById('gcode-editor-filename');
            if (nombre) nombre.textContent = 'soporte_camara_v3.gcode';
        }

        const contenido = document.querySelector('.content');
        if (contenido) {
            const propio = getComputedStyle(contenido).paddingBottom;
            contenido.style.paddingBottom = `calc(${propio} + var(--demo-barra))`;
        }

        // El cartel se reescribe al cambiar de idioma: app.js le pone `lang`
        // al <html> cada vez, así que ese atributo es la señal más barata
        // para enterarse sin tocar su código.
        new MutationObserver(pintar)
            .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    });
})();
