(() => {
    'use strict';

    const PLUGIN_ID = 'font-library';
    const VERSION = '0.5.1';
    if (window.NopalPluginRegistry?.[PLUGIN_ID]) return;

    // Misma escala que usa el control manual de láser del núcleo de NOPAL
    // para convertir potencia (0-100%) a valor S de GRBL -- ver
    // LASER_POWER_S_MAX en backend/static/js/app.js.
    const LASER_S_MAX = 1000;

    const scriptUrl = document.currentScript?.src || new URL('frontend/font-library.js', window.location.href).href;
    const pluginRoot = new URL('../', scriptUrl);
    const assetUrl = relative => new URL(relative, pluginRoot).href;
    const STORAGE = {
        favorites: 'nopal.font-library.favorites',
        recent: 'nopal.font-library.recent',
        presets: 'nopal.font-library.presets'
    };

    const I18N = {
        es: {
            title: 'Biblioteca de tipografías', search: 'Buscar tipografías…', allCategories: 'Todas las categorías',
            import: 'Importar', all: 'Todas', favorites: 'Favoritas', recent: 'Recientes', preview: 'Vista previa',
            cut: 'Corte', engrave: 'Grabado', cnc: 'CNC', material: 'Material', power: 'Potencia', speed: 'Velocidad',
            passes: 'Pasadas', optimize: 'Optimizar para corte', optimizeHint: 'Prepara contornos y comprueba islas interiores',
            exportSvg: 'Exportar SVG', saveLibrary: 'Guardar', sendLaser: 'Guardar G-code', information: 'Información',
            font: 'Tipografía', style: 'Estilo', type: 'Tipo', license: 'Licencia', file: 'Archivo', quick: 'Acciones rápidas',
            createText: 'Crear texto personalizado', convert: 'Convertir a trayectos', preset: 'Guardar preset de corte',
            ready: 'Lista', readyDetail: 'Selecciona una tipografía y escribe tu texto', loading: 'Cargando tipografías…',
            noResults: 'No hay tipografías que coincidan con el filtro.', freeFonts: '20 tipografías libres · OFL 1.1',
            sans: 'Sans serif', display: 'Display', tech: 'Tecnológica', stencil: 'Stencil', serif: 'Serif', script: 'Script',
            islandWarning: 'Esta fuente puede dejar islas sueltas al cortar. Usa una Stencil o revisa los puentes.',
            cutReady: 'Fuente recomendada para corte: sus puentes conservan las islas interiores.',
            imported: 'Tipografía importada', invalidFont: 'El archivo no es una tipografía TTF/OTF válida.',
            tooLarge: 'La tipografía supera el límite de 10 MB.', exported: 'SVG exportado correctamente.',
            saved: 'SVG guardado en la Biblioteca NOPAL.', sent: 'G-code guardado en Archivos, listo para enviar a producción.',
            queuedDemo: 'Demo: se descargó el G-code porque no hay servidor NOPAL.', saveFallback: 'Demo: se descargó el SVG porque no hay servidor NOPAL.',
            presetSaved: 'Preset guardado localmente.', supports: 'Cobertura: ES · EN · DE · FR · PT-BR',
            custom: 'Importada', chars: 'Caracteres', contours: 'Contornos', dimensions: 'Dimensiones', laser: 'Láser',
            fontSize: 'Tamaño', sample: 'Nopal Labs', connected: 'Preparado para NOPAL', loadFailed: 'No se pudo cargar la tipografía.',
            refresh: 'Actualizar', help: 'Ayuda', settings: 'Configuración', favorite: 'Favorita', unfavorite: 'Quitar favorita'
        },
        en: {
            title: 'Font library', search: 'Search fonts…', allCategories: 'All categories', import: 'Import', all: 'All',
            favorites: 'Favorites', recent: 'Recent', preview: 'Preview', cut: 'Cut', engrave: 'Engrave', cnc: 'CNC',
            material: 'Material', power: 'Power', speed: 'Speed', passes: 'Passes', optimize: 'Optimize for cutting',
            optimizeHint: 'Prepare contours and check internal islands', exportSvg: 'Export SVG', saveLibrary: 'Save',
            sendLaser: 'Save G-code', information: 'Information', font: 'Font', style: 'Style', type: 'Type',
            license: 'License', file: 'File', quick: 'Quick actions', createText: 'Create custom text',
            convert: 'Convert to paths', preset: 'Save cutting preset', ready: 'Ready',
            readyDetail: 'Select a font and type your text', loading: 'Loading fonts…', noResults: 'No fonts match this filter.',
            freeFonts: '20 free fonts · OFL 1.1', sans: 'Sans serif', display: 'Display', tech: 'Technology', stencil: 'Stencil',
            serif: 'Serif', script: 'Script', islandWarning: 'This font may leave loose islands when cut. Use a Stencil font or review bridges.',
            cutReady: 'Recommended for cutting: built-in bridges retain internal islands.', imported: 'Imported font',
            invalidFont: 'The file is not a valid TTF/OTF font.', tooLarge: 'The font exceeds the 10 MB limit.',
            exported: 'SVG exported successfully.', saved: 'SVG saved to the NOPAL Library.', sent: 'G-code saved to Files, ready to send to production.',
            queuedDemo: 'Demo: G-code downloaded because no NOPAL server is available.', saveFallback: 'Demo: SVG downloaded because no NOPAL server is available.',
            presetSaved: 'Preset saved locally.', supports: 'Coverage: ES · EN · DE · FR · PT-BR', custom: 'Imported',
            chars: 'Characters', contours: 'Contours', dimensions: 'Dimensions', laser: 'Laser', fontSize: 'Size',
            sample: 'Nopal Labs', connected: 'Ready for NOPAL', loadFailed: 'The font could not be loaded.', refresh: 'Refresh',
            help: 'Help', settings: 'Settings', favorite: 'Favorite', unfavorite: 'Remove favorite'
        },
        de: {
            title: 'Schriftbibliothek', search: 'Schriften suchen…', allCategories: 'Alle Kategorien', import: 'Importieren',
            all: 'Alle', favorites: 'Favoriten', recent: 'Zuletzt', preview: 'Vorschau', cut: 'Schneiden', engrave: 'Gravieren', cnc: 'CNC',
            material: 'Material', power: 'Leistung', speed: 'Geschwindigkeit', passes: 'Durchgänge', optimize: 'Für Schnitt optimieren',
            optimizeHint: 'Konturen vorbereiten und Inneninseln prüfen', exportSvg: 'SVG exportieren', saveLibrary: 'Speichern',
            sendLaser: 'G-Code speichern', information: 'Informationen', font: 'Schriftart', style: 'Stil', type: 'Typ',
            license: 'Lizenz', file: 'Datei', quick: 'Schnellaktionen', createText: 'Eigenen Text erstellen',
            convert: 'In Pfade umwandeln', preset: 'Schnittprofil speichern', ready: 'Bereit',
            readyDetail: 'Schrift auswählen und Text eingeben', loading: 'Schriften werden geladen…', noResults: 'Keine passende Schrift gefunden.',
            freeFonts: '20 freie Schriften · OFL 1.1', sans: 'Sans Serif', display: 'Display', tech: 'Technisch', stencil: 'Schablone',
            serif: 'Serif', script: 'Handschrift', islandWarning: 'Diese Schrift kann beim Schneiden lose Innenflächen erzeugen. Schablonenschrift verwenden oder Stege prüfen.',
            cutReady: 'Für Schnitt empfohlen: integrierte Stege halten Innenflächen.', imported: 'Importierte Schrift',
            invalidFont: 'Die Datei ist keine gültige TTF/OTF-Schrift.', tooLarge: 'Die Schrift ist größer als 10 MB.',
            exported: 'SVG erfolgreich exportiert.', saved: 'SVG in der NOPAL-Bibliothek gespeichert.', sent: 'G-Code in Dateien gespeichert, bereit zum Senden an die Produktion.',
            queuedDemo: 'Demo: G-Code heruntergeladen, da kein NOPAL-Server verfügbar ist.', saveFallback: 'Demo: SVG wurde ohne NOPAL-Server heruntergeladen.',
            presetSaved: 'Profil lokal gespeichert.', supports: 'Abdeckung: ES · EN · DE · FR · PT-BR', custom: 'Importiert',
            chars: 'Zeichen', contours: 'Konturen', dimensions: 'Abmessungen', laser: 'Laser', fontSize: 'Größe',
            sample: 'Nopal Labs', connected: 'Bereit für NOPAL', loadFailed: 'Schrift konnte nicht geladen werden.', refresh: 'Aktualisieren',
            help: 'Hilfe', settings: 'Einstellungen', favorite: 'Favorit', unfavorite: 'Favorit entfernen'
        },
        fr: {
            title: 'Bibliothèque de polices', search: 'Rechercher des polices…', allCategories: 'Toutes les catégories',
            import: 'Importer', all: 'Toutes', favorites: 'Favoris', recent: 'Récentes', preview: 'Aperçu', cut: 'Découpe',
            engrave: 'Gravure', cnc: 'CNC', material: 'Matériau', power: 'Puissance', speed: 'Vitesse', passes: 'Passages',
            optimize: 'Optimiser pour la découpe', optimizeHint: 'Préparer les contours et vérifier les îlots intérieurs',
            exportSvg: 'Exporter SVG', saveLibrary: 'Enregistrer', sendLaser: 'Enregistrer le G-code', information: 'Informations',
            font: 'Police', style: 'Style', type: 'Type', license: 'Licence', file: 'Fichier', quick: 'Actions rapides',
            createText: 'Créer un texte personnalisé', convert: 'Convertir en tracés', preset: 'Enregistrer le préréglage',
            ready: 'Prêt', readyDetail: 'Sélectionnez une police et saisissez votre texte', loading: 'Chargement des polices…',
            noResults: 'Aucune police ne correspond au filtre.', freeFonts: '20 polices libres · OFL 1.1', sans: 'Sans sérif',
            display: 'Display', tech: 'Technologique', stencil: 'Pochoir', serif: 'Sérif', script: 'Manuscrite',
            islandWarning: 'Cette police peut laisser des îlots libres lors de la découpe. Utilisez une police pochoir ou vérifiez les ponts.',
            cutReady: 'Recommandée pour la découpe : les ponts intégrés retiennent les îlots.', imported: 'Police importée',
            invalidFont: 'Le fichier ne contient pas une police TTF/OTF valide.', tooLarge: 'La police dépasse la limite de 10 Mo.',
            exported: 'SVG exporté.', saved: 'SVG enregistré dans la bibliothèque NOPAL.', sent: 'G-code enregistré dans Fichiers, prêt à envoyer en production.',
            queuedDemo: 'Démo : G-code téléchargé sans serveur NOPAL.', saveFallback: 'Démo : SVG téléchargé sans serveur NOPAL.',
            presetSaved: 'Préréglage enregistré localement.', supports: 'Couverture : ES · EN · DE · FR · PT-BR', custom: 'Importée',
            chars: 'Caractères', contours: 'Contours', dimensions: 'Dimensions', laser: 'Laser', fontSize: 'Taille',
            sample: 'Nopal Labs', connected: 'Prêt pour NOPAL', loadFailed: 'Impossible de charger la police.', refresh: 'Actualiser',
            help: 'Aide', settings: 'Paramètres', favorite: 'Favori', unfavorite: 'Retirer des favoris'
        },
        'pt-BR': {
            title: 'Biblioteca de fontes', search: 'Pesquisar fontes…', allCategories: 'Todas as categorias', import: 'Importar',
            all: 'Todas', favorites: 'Favoritas', recent: 'Recentes', preview: 'Pré-visualização', cut: 'Corte', engrave: 'Gravação',
            cnc: 'CNC', material: 'Material', power: 'Potência', speed: 'Velocidade', passes: 'Passadas',
            optimize: 'Otimizar para corte', optimizeHint: 'Preparar contornos e verificar ilhas internas', exportSvg: 'Exportar SVG',
            saveLibrary: 'Salvar', sendLaser: 'Salvar G-code', information: 'Informações', font: 'Fonte', style: 'Estilo',
            type: 'Tipo', license: 'Licença', file: 'Arquivo', quick: 'Ações rápidas', createText: 'Criar texto personalizado',
            convert: 'Converter em caminhos', preset: 'Salvar predefinição de corte', ready: 'Pronto',
            readyDetail: 'Selecione uma fonte e digite o texto', loading: 'Carregando fontes…', noResults: 'Nenhuma fonte corresponde ao filtro.',
            freeFonts: '20 fontes livres · OFL 1.1', sans: 'Sem serifa', display: 'Display', tech: 'Tecnológica', stencil: 'Estêncil',
            serif: 'Serifada', script: 'Manuscrita', islandWarning: 'Esta fonte pode deixar ilhas soltas no corte. Use uma fonte estêncil ou revise as pontes.',
            cutReady: 'Recomendada para corte: as pontes integradas preservam as ilhas internas.', imported: 'Fonte importada',
            invalidFont: 'O arquivo não é uma fonte TTF/OTF válida.', tooLarge: 'A fonte excede o limite de 10 MB.',
            exported: 'SVG exportado com sucesso.', saved: 'SVG salvo na Biblioteca NOPAL.', sent: 'G-code salvo em Arquivos, pronto para enviar à produção.',
            queuedDemo: 'Demonstração: G-code baixado porque não há servidor NOPAL.', saveFallback: 'Demonstração: SVG baixado porque não há servidor NOPAL.',
            presetSaved: 'Predefinição salva localmente.', supports: 'Cobertura: ES · EN · DE · FR · PT-BR', custom: 'Importada',
            chars: 'Caracteres', contours: 'Contornos', dimensions: 'Dimensões', laser: 'Laser', fontSize: 'Tamanho',
            sample: 'Nopal Labs', connected: 'Pronto para NOPAL', loadFailed: 'Não foi possível carregar a fonte.', refresh: 'Atualizar',
            help: 'Ajuda', settings: 'Configurações', favorite: 'Favorita', unfavorite: 'Remover favorita'
        }
    };

    const WORKSHOP_I18N = {
        es: {
            title: 'Texto para fabricación', subtitle: 'Crea texto a medida y agrégalo al proyecto actual', fontCollection: 'Tipografías',
            project: 'Proyecto actual', noProject: 'Trabajo sin guardar', workArea: 'Área disponible', textEditor: 'Texto y composición',
            width: 'Ancho', height: 'Alto', lockRatio: 'Bloquear proporción', automatic: 'Automático', tracking: 'Espaciado',
            lineHeight: 'Interlineado', alignLeft: 'Alinear a la izquierda', alignCenter: 'Centrar', alignRight: 'Alinear a la derecha',
            manufacturing: 'Preparación para fabricar', kerf: 'Kerf / herramienta', bridgeWidth: 'Puente mínimo', checks: 'Comprobaciones',
            addProject: 'Agregar al proyecto', addedProject: 'Texto agregado al proyecto NOPAL.', projectFallback: 'Demo: elemento agregado al proyecto simulado.',
            editablePaths: 'Trayectos editables', exactSize: 'Medida física exacta', islandsFound: 'Posibles islas interiores',
            noIslands: 'Sin islas problemáticas', thinFeature: 'Revisar detalles menores al mínimo', withinArea: 'Cabe en el área del proyecto',
            outsideArea: 'Supera el área disponible', layerOperation: 'Operación de la capa', workshopHint: 'Arrastra para mover · usa la esquina para cambiar tamaño · rueda del mouse para zoom.',
            position: 'Posición', zoom: 'Zoom', outline: 'Contorno', outlineType: 'Tipo de contorno', solidOutline: 'Sólido', lineOutline: 'Línea', arc: 'Arco', resetArc: 'Restablecer arco'
        },
        en: {
            title: 'Text for fabrication', subtitle: 'Create measured text and add it to the current project', fontCollection: 'Fonts',
            project: 'Current project', noProject: 'Unsaved job', workArea: 'Available area', textEditor: 'Text and layout',
            width: 'Width', height: 'Height', lockRatio: 'Lock ratio', automatic: 'Automatic', tracking: 'Letter spacing',
            lineHeight: 'Line spacing', alignLeft: 'Align left', alignCenter: 'Center', alignRight: 'Align right',
            manufacturing: 'Fabrication setup', kerf: 'Kerf / tool', bridgeWidth: 'Minimum bridge', checks: 'Checks',
            addProject: 'Add to project', addedProject: 'Text added to the NOPAL project.', projectFallback: 'Demo: element added to the simulated project.',
            editablePaths: 'Editable paths', exactSize: 'Exact physical size', islandsFound: 'Possible inner islands', noIslands: 'No problematic islands',
            thinFeature: 'Review details below the minimum', withinArea: 'Fits the project area', outsideArea: 'Exceeds the available area',
            layerOperation: 'Layer operation', workshopHint: 'Drag to move · use the corner to resize · mouse wheel to zoom.', position: 'Position', zoom: 'Zoom', outline: 'Outline', outlineType: 'Outline type', solidOutline: 'Solid', lineOutline: 'Line', arc: 'Arc', resetArc: 'Reset arc'
        },
        de: {
            title: 'Text für die Fertigung', subtitle: 'Bemaßten Text erstellen und dem aktuellen Projekt hinzufügen', fontCollection: 'Schriften',
            project: 'Aktuelles Projekt', noProject: 'Ungespeicherter Auftrag', workArea: 'Verfügbarer Bereich', textEditor: 'Text und Anordnung',
            width: 'Breite', height: 'Höhe', lockRatio: 'Proportion sperren', automatic: 'Automatisch', tracking: 'Zeichenabstand',
            lineHeight: 'Zeilenabstand', alignLeft: 'Links ausrichten', alignCenter: 'Zentrieren', alignRight: 'Rechts ausrichten',
            manufacturing: 'Fertigungsvorbereitung', kerf: 'Schnittfuge / Werkzeug', bridgeWidth: 'Mindeststeg', checks: 'Prüfungen',
            addProject: 'Zum Projekt hinzufügen', addedProject: 'Text zum NOPAL-Projekt hinzugefügt.', projectFallback: 'Demo: Element zum simulierten Projekt hinzugefügt.',
            editablePaths: 'Editierbare Pfade', exactSize: 'Exaktes Fertigmaß', islandsFound: 'Mögliche Inneninseln', noIslands: 'Keine problematischen Inseln',
            thinFeature: 'Details unter Mindestmaß prüfen', withinArea: 'Passt in den Projektbereich', outsideArea: 'Überschreitet den verfügbaren Bereich',
            layerOperation: 'Ebenenoperation', workshopHint: 'Ziehen zum Verschieben · Ecke zum Skalieren · Mausrad zum Zoomen.', position: 'Position', zoom: 'Zoom', outline: 'Kontur', outlineType: 'Konturtyp', solidOutline: 'Massiv', lineOutline: 'Linie', arc: 'Bogen', resetArc: 'Bogen zurücksetzen'
        },
        fr: {
            title: 'Texte pour fabrication', subtitle: 'Créez un texte coté et ajoutez-le au projet actuel', fontCollection: 'Polices',
            project: 'Projet actuel', noProject: 'Travail non enregistré', workArea: 'Zone disponible', textEditor: 'Texte et composition',
            width: 'Largeur', height: 'Hauteur', lockRatio: 'Verrouiller les proportions', automatic: 'Automatique', tracking: 'Approche',
            lineHeight: 'Interligne', alignLeft: 'Aligner à gauche', alignCenter: 'Centrer', alignRight: 'Aligner à droite',
            manufacturing: 'Préparation de fabrication', kerf: 'Trait / outil', bridgeWidth: 'Pont minimal', checks: 'Vérifications',
            addProject: 'Ajouter au projet', addedProject: 'Texte ajouté au projet NOPAL.', projectFallback: 'Démo : élément ajouté au projet simulé.',
            editablePaths: 'Tracés modifiables', exactSize: 'Cote physique exacte', islandsFound: 'Îlots intérieurs possibles', noIslands: 'Aucun îlot problématique',
            thinFeature: 'Vérifier les détails sous le minimum', withinArea: 'Tient dans la zone du projet', outsideArea: 'Dépasse la zone disponible',
            layerOperation: 'Opération du calque', workshopHint: 'Glissez pour déplacer · coin pour redimensionner · molette pour zoomer.', position: 'Position', zoom: 'Zoom', outline: 'Contour', outlineType: 'Type de contour', solidOutline: 'Solide', lineOutline: 'Ligne', arc: 'Arc', resetArc: 'Réinitialiser l’arc'
        },
        'pt-BR': {
            title: 'Texto para fabricação', subtitle: 'Crie texto dimensionado e adicione ao projeto atual', fontCollection: 'Fontes',
            project: 'Projeto atual', noProject: 'Trabalho não salvo', workArea: 'Área disponível', textEditor: 'Texto e composição',
            width: 'Largura', height: 'Altura', lockRatio: 'Bloquear proporção', automatic: 'Automático', tracking: 'Espaçamento',
            lineHeight: 'Entrelinha', alignLeft: 'Alinhar à esquerda', alignCenter: 'Centralizar', alignRight: 'Alinhar à direita',
            manufacturing: 'Preparação para fabricar', kerf: 'Kerf / ferramenta', bridgeWidth: 'Ponte mínima', checks: 'Verificações',
            addProject: 'Adicionar ao projeto', addedProject: 'Texto adicionado ao projeto NOPAL.', projectFallback: 'Demo: elemento adicionado ao projeto simulado.',
            editablePaths: 'Caminhos editáveis', exactSize: 'Medida física exata', islandsFound: 'Possíveis ilhas internas', noIslands: 'Sem ilhas problemáticas',
            thinFeature: 'Revisar detalhes abaixo do mínimo', withinArea: 'Cabe na área do projeto', outsideArea: 'Ultrapassa a área disponível',
            layerOperation: 'Operação da camada', workshopHint: 'Arraste para mover · use o canto para redimensionar · roda do mouse para zoom.', position: 'Posição', zoom: 'Zoom', outline: 'Contorno', outlineType: 'Tipo de contorno', solidOutline: 'Sólido', lineOutline: 'Linha', arc: 'Arco', resetArc: 'Redefinir arco'
        }
    };
    Object.entries(WORKSHOP_I18N).forEach(([language, values]) => Object.assign(I18N[language], values));

    const categoryKeys = ['sans', 'display', 'tech', 'stencil', 'serif', 'script'];
    const state = {
        fonts: [], selectedId: 'bebas-neue', query: '', category: 'all', tab: 'all', text: 'NOPAL', size: 72,
        mode: 'cut', material: 'MDF 3mm', power: 85, speed: 450, passes: 1, optimize: true, zoom: 1,
        tracking: 0, lineHeight: 1.18, alignment: 'center', targetWidthMm: null, targetHeightMm: null, lockRatio: true,
        kerfMm: 0.15, bridgeWidthMm: 2, outlineMm: 0, outlineStyle: 'solid', arcDegrees: 0, project: null, positionXmm: null, positionYmm: null, positionTouched: false,
        favorites: new Set(readJson(STORAGE.favorites, [])), recent: readJson(STORAGE.recent, []),
        fontFaces: new Map(), parsedFonts: new Map(), generated: null, customCounter: 0
    };
    let root = null;
    let navButton = null;
    let languageObserver = null;
    let previewTimer = null;
    let renderSerial = 0;
    let ctrlKeyDownHandler = null;
    let ctrlKeyUpHandler = null;

    function readJson(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    }

    function lang() {
        const raw = document.documentElement.lang || localStorage.getItem('language') || 'es';
        if (raw.toLowerCase().startsWith('pt')) return 'pt-BR';
        const short = raw.slice(0, 2).toLowerCase();
        return ['es', 'en', 'de', 'fr'].includes(short) ? short : 'en';
    }

    function tr(key) { return I18N[lang()]?.[key] || I18N.en[key] || key; }
    function esc(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
    function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value))); }
    function icon(body, size = 20) { return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`; }
    function toast(message, tone = 'success') {
        if (typeof window.showToast === 'function') window.showToast(message, tone);
        else {
            const node = root?.querySelector('#fl-toast');
            if (!node) return;
            node.textContent = message; node.dataset.tone = tone; node.hidden = false;
            clearTimeout(node._timer); node._timer = setTimeout(() => { node.hidden = true; }, 3200);
        }
    }

    function moduleHtml() {
        return `<section id="font-library-section" class="view-section fl-section" style="display:none">
            <div class="fl-shell">
                <header class="fl-header">
                    <div class="fl-brand"><span class="fl-logo">T</span><div><h1 data-i18n="title"></h1><p data-i18n="subtitle"></p></div></div>
                    <div class="fl-header-actions">
                        <span class="fl-mode-pill active" data-i18n="laser"></span><span class="fl-mode-pill cnc" data-i18n="cnc"></span>
                        <button type="button" id="fl-refresh" data-title="refresh">${icon('<path d="M20 6v5h-5M4 18v-5h5M18.5 9A7 7 0 0 0 6 6.5L4 9M5.5 15A7 7 0 0 0 18 17.5l2-2.5"/>')}</button>
                        <button type="button" data-title="settings">${icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>')}</button>
                        <button type="button" data-title="help">${icon('<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.8 2c-.9.6-1.6 1-1.6 2M12 17h.01"/>')}</button>
                    </div>
                </header>

                <div class="fl-layout">
                    <main class="fl-main">
                        <section class="fl-browser-card">
                            <div class="fl-section-title fl-library-title"><h2 data-i18n="fontCollection"></h2><span data-i18n="freeFonts"></span></div>
                            <div class="fl-controls">
                                <label class="fl-search">${icon('<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>',17)}<input id="fl-search" type="search" data-placeholder="search"></label>
                                <select id="fl-category" aria-label="Category"><option value="all" data-i18n="allCategories"></option>${categoryKeys.map(key => `<option value="${key}" data-i18n="${key}"></option>`).join('')}</select>
                                <button type="button" class="fl-import-btn" id="fl-import">${icon('<path d="M12 5v14M5 12h14"/>',17)}<span data-i18n="import"></span></button>
                                <input id="fl-file" type="file" accept=".ttf,.otf,font/ttf,font/otf" hidden>
                            </div>
                            <div class="fl-tabs" role="tablist">
                                <button class="active" role="tab" data-fl-tab="all" data-i18n="all"></button>
                                <button role="tab" data-fl-tab="favorites" data-i18n="favorites"></button>
                                <button role="tab" data-fl-tab="recent" data-i18n="recent"></button>
                                <span class="fl-count" id="fl-count"></span>
                            </div>
                            <div class="fl-font-grid" id="fl-font-grid"><div class="fl-loading" data-i18n="loading"></div></div>
                        </section>

                        <section class="fl-recent-card">
                            <div class="fl-section-title"><h2 data-i18n="recent"></h2><span data-i18n="freeFonts"></span></div>
                            <div class="fl-recent-strip" id="fl-recent-strip"></div>
                        </section>
                    </main>

                    <aside class="fl-side">
                        <section class="fl-preview-card">
                            <div class="fl-project-context">
                                <span class="fl-project-icon">P</span>
                                <div><small data-i18n="project"></small><strong id="fl-project-name"></strong><span id="fl-project-meta"></span></div>
                            </div>
                            <div class="fl-section-title"><h2 data-i18n="textEditor"></h2><span data-i18n="editablePaths"></span></div>
                            <div class="fl-preview-inputs">
                                <textarea id="fl-text" rows="2" maxlength="120" data-placeholder="sample">NOPAL</textarea>
                                <label><input id="fl-size" type="number" min="8" max="240" value="72"><span>pt</span></label>
                            </div>
                            <div class="fl-type-tools">
                                <div class="fl-align-tools" role="group">
                                    <button type="button" data-fl-align="left" data-title="alignLeft">${icon('<path d="M4 6h12M4 10h16M4 14h10M4 18h14"/>',17)}</button>
                                    <button type="button" class="active" data-fl-align="center" data-title="alignCenter">${icon('<path d="M6 6h12M4 10h16M7 14h10M5 18h14"/>',17)}</button>
                                    <button type="button" data-fl-align="right" data-title="alignRight">${icon('<path d="M8 6h12M4 10h16M10 14h10M6 18h14"/>',17)}</button>
                                </div>
                                <label><span data-i18n="tracking"></span><input id="fl-tracking" type="number" min="-10" max="50" step="0.5" value="0"><i>pt</i></label>
                                <label><span data-i18n="lineHeight"></span><input id="fl-line-height" type="number" min="0.8" max="3" step="0.05" value="1.18"><i>×</i></label>
                            </div>
                            <div class="fl-dimensions-panel">
                                <div class="fl-dimension-heading"><strong data-i18n="dimensions"></strong><button type="button" id="fl-auto-size" data-i18n="automatic"></button></div>
                                <label><span data-i18n="width"></span><input id="fl-width-mm" type="number" min="1" max="3000" step="0.1"><i>mm</i></label>
                                <button type="button" id="fl-lock-ratio" class="active" data-title="lockRatio">${icon('<path d="M8 11V8a4 4 0 0 1 8 0v3M6 11h12v10H6z"/>',17)}</button>
                                <label><span data-i18n="height"></span><input id="fl-height-mm" type="number" min="1" max="3000" step="0.1"><i>mm</i></label>
                            </div>
                            <div class="fl-effects-panel">
                                <label><span data-i18n="outline"></span><input id="fl-outline" type="number" min="0" max="20" step="0.1" value="0"><i>mm</i></label>
                                <div class="fl-outline-style"><span data-i18n="outlineType"></span><button type="button" class="active" data-fl-outline-style="solid" data-i18n="solidOutline"></button><button type="button" data-fl-outline-style="line" data-i18n="lineOutline"></button></div>
                                <label><span data-i18n="arc"></span><output id="fl-arc-value">0°</output></label>
                                <button type="button" id="fl-reset-arc" data-i18n="resetArc"></button>
                            </div>
                            <div class="fl-preview-wrap">
                                <svg id="fl-preview-svg" viewBox="0 0 600 400" aria-label="Font preview"><g id="fl-preview-layer"></g><g id="fl-selection-layer"></g></svg>
                                <div class="fl-position-readout" id="fl-position-readout"></div>
                                <div class="fl-zoom-tools"><button data-fl-zoom="in">${icon('<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4M11 8v6M8 11h6"/>',17)}</button><button data-fl-zoom="out">${icon('<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4M8 11h6"/>',17)}</button><button data-fl-zoom="fit">${icon('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',17)}</button></div>
                            </div>
                            <div class="fl-operation-tabs">
                                <button class="active" data-fl-mode="cut" data-i18n="cut"></button><button data-fl-mode="engrave" data-i18n="engrave"></button><button data-fl-mode="cnc" data-i18n="cnc"></button>
                            </div>
                            <div class="fl-production-controls">
                                <label><span data-i18n="material"></span><select id="fl-material"><option>MDF 3mm</option><option>Plywood 3mm</option><option>Acrylic 3mm</option><option>Cardboard 2mm</option></select></label>
                                <div class="fl-compact-fields"><label><span data-i18n="kerf"></span><input id="fl-kerf" type="number" min="0" max="12" step="0.01" value="0.15"><i>mm</i></label><label><span data-i18n="bridgeWidth"></span><input id="fl-bridge-width" type="number" min="0.5" max="20" step="0.1" value="2"><i>mm</i></label></div>
                                <label class="fl-range"><span data-i18n="power"></span><input id="fl-power" type="range" min="1" max="100" value="85"><output id="fl-power-value">85%</output></label>
                                <label class="fl-range"><span data-i18n="speed"></span><input id="fl-speed" type="range" min="50" max="3000" step="10" value="450"><output id="fl-speed-value">450 mm/min</output></label>
                                <label><span data-i18n="passes"></span><input id="fl-passes" type="number" min="1" max="20" value="1"></label>
                                <label class="fl-switch"><span><strong data-i18n="optimize"></strong><small data-i18n="optimizeHint"></small></span><input id="fl-optimize" type="checkbox" checked><i></i></label>
                            </div>
                            <div class="fl-warning" id="fl-warning"></div>
                            <div class="fl-checks"><strong data-i18n="checks"></strong><div id="fl-check-size" class="pass"></div><div id="fl-check-islands"></div><div id="fl-check-detail"></div></div>
                            <p class="fl-workshop-hint" data-i18n="workshopHint"></p>
                            <div class="fl-primary-actions"><button id="fl-export">${icon('<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',16)}<span data-i18n="exportSvg"></span></button><button class="primary" id="fl-send">${icon('<path d="M4 17h16M6 17V9h12v8M9 9V5h6v4M12 12v2"/>',16)}<span data-i18n="sendLaser"></span></button></div>
                        </section>

                        <section class="fl-info-card">
                            <h2 data-i18n="information"></h2>
                            <dl><dt data-i18n="font"></dt><dd id="fl-info-name">—</dd><dt data-i18n="style"></dt><dd id="fl-info-style">—</dd><dt data-i18n="type"></dt><dd id="fl-info-type">—</dd><dt data-i18n="license"></dt><dd id="fl-info-license">—</dd><dt data-i18n="file"></dt><dd id="fl-info-file">—</dd></dl>
                            <p class="fl-coverage" data-i18n="supports"></p>
                            <div class="fl-metrics"><span><small data-i18n="chars"></small><strong id="fl-metric-chars">0</strong></span><span><small data-i18n="contours"></small><strong id="fl-metric-contours">0</strong></span><span><small data-i18n="dimensions"></small><strong id="fl-metric-size">—</strong></span></div>
                        </section>

                        <section class="fl-quick-card"><h2 data-i18n="quick"></h2><button id="fl-focus-text">${icon('<path d="M5 4h14M12 4v16M8 20h8"/>',17)}<span data-i18n="createText"></span></button><button id="fl-convert">${icon('<path d="m4 17 6-10 4 6 3-5 3 9ZM4 20h16"/>',17)}<span data-i18n="convert"></span></button><button id="fl-save-preset">${icon('<path d="M5 3h12l2 2v16H5zM8 3v6h8V3"/>',17)}<span data-i18n="preset"></span></button><button id="fl-save-library">${icon('<path d="M4 5h16v14H4zM8 9h8M8 13h8"/>',17)}<span data-i18n="saveLibrary"></span></button><button id="fl-add-project">${icon('<path d="M5 4h14v16H5zM9 12h6M12 9v6"/>',17)}<span data-i18n="addProject"></span></button></section>
                    </aside>
                </div>
                <footer class="fl-status"><span class="fl-status-dot"></span><strong id="fl-status-title" data-i18n="ready"></strong><span id="fl-status-detail" data-i18n="readyDetail"></span><span class="fl-status-version">v${VERSION}</span><span class="fl-status-brand">♣ NOPAL Labs</span></footer>
                <div id="fl-toast" class="fl-toast" hidden></div>
            </div>
        </section>`;
    }

    function applyLanguage() {
        if (!root) return;
        root.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = tr(node.dataset.i18n); });
        root.querySelectorAll('[data-placeholder]').forEach(node => { node.placeholder = tr(node.dataset.placeholder); });
        root.querySelectorAll('[data-title]').forEach(node => { node.title = tr(node.dataset.title); });
        if (navButton) { navButton.title = tr('title'); navButton.querySelector('span').textContent = tr('title'); }
        renderFonts(); renderRecent(); updateInfo(); updateWarning(); renderProjectContext(); updateManufacturingChecks();
    }

    async function resolveProjectContext() {
        try {
            const provider = window.NopalPluginContext;
            const value = typeof provider?.getCurrentProject === 'function' ? await provider.getCurrentProject() : provider?.currentProject;
            state.project = value || window.__NOPAL_PROJECT_CONTEXT__ || null;
            if (state.project?.material) {
                state.material = state.project.material;
                const materialSelect = root?.querySelector('#fl-material');
                if (materialSelect && [...materialSelect.options].some(option => option.value === state.material)) materialSelect.value = state.material;
            }
        } catch { state.project = null; }
        renderProjectContext();
    }

    function renderProjectContext() {
        if (!root) return;
        const project = state.project;
        root.querySelector('#fl-project-name').textContent = project?.name || tr('noProject');
        const area = project?.availableArea || project?.workArea;
        const areaText = area ? `${area.width} × ${area.height} mm` : '—';
        root.querySelector('#fl-project-meta').textContent = `${project?.machine || tr('laser')} · ${project?.material || state.material} · ${tr('workArea')}: ${areaText}`;
    }

    let openTypePromise = null;

    async function ensureOpenType() {
        if (window.opentype) return window.opentype;
        if (openTypePromise) return openTypePromise;
        openTypePromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = assetUrl('frontend/vendor/opentype.min.js');
            script.onload = () => resolve(window.opentype);
            script.onerror = () => {
                openTypePromise = null;
                reject(new Error('opentype.js'));
            };
            document.head.appendChild(script);
        });
        return openTypePromise;
    }

    async function loadCatalog() {
        setStatus(tr('loading'), tr('freeFonts'));
        const response = await fetch(assetUrl('fonts/catalog.json'));
        if (!response.ok) throw new Error('catalog');
        state.fonts = await response.json();
        renderFonts(); renderRecent();
        for (const font of state.fonts) registerFontFace(font);
        await selectFont(state.selectedId, false);
        setStatus(tr('ready'), tr('readyDetail'));
    }

    async function registerFontFace(font) {
        if (state.fontFaces.has(font.id)) return state.fontFaces.get(font.id);
        const family = `NopalFont-${font.id}`;
        let face;
        if (font.customBuffer) face = new FontFace(family, font.customBuffer.slice(0));
        else face = new FontFace(family, `url("${assetUrl(`fonts/${font.directory}/${font.file}`)}")`);
        state.fontFaces.set(font.id, face);
        document.fonts.add(face);
        face.load().then(() => renderFonts()).catch(() => {});
        return face;
    }

    function filteredFonts() {
        const query = state.query.trim().toLocaleLowerCase(lang());
        return state.fonts.filter(font => {
            if (state.category !== 'all' && font.category !== state.category) return false;
            if (state.tab === 'favorites' && !state.favorites.has(font.id)) return false;
            if (state.tab === 'recent' && !state.recent.includes(font.id)) return false;
            return !query || font.name.toLocaleLowerCase(lang()).includes(query);
        }).sort((a, b) => state.tab === 'recent' ? state.recent.indexOf(a.id) - state.recent.indexOf(b.id) : a.name.localeCompare(b.name, lang()));
    }

    function renderFonts() {
        if (!root) return;
        const fonts = filteredFonts();
        const grid = root.querySelector('#fl-font-grid');
        root.querySelector('#fl-count').textContent = `${fonts.length}/${state.fonts.length || 20}`;
        if (!fonts.length) { grid.innerHTML = `<div class="fl-empty">${esc(tr('noResults'))}</div>`; return; }
        grid.innerHTML = fonts.map(font => {
            const favorite = state.favorites.has(font.id);
            const selected = state.selectedId === font.id;
            const family = `NopalFont-${font.id}`;
            const sample = font.category === 'script' ? 'Nopal' : 'NOPAL';
            return `<article class="fl-font-card${selected ? ' selected' : ''}" data-font-id="${font.id}" tabindex="0">
                <div class="fl-card-name">${esc(font.name)}</div><div class="fl-card-sample" style="font-family:'${family}',sans-serif">${sample}</div>
                <div class="fl-card-footer"><span>${esc(tr(font.category))} · Ñ ✓</span><button type="button" data-favorite-id="${font.id}" aria-label="${esc(tr(favorite ? 'unfavorite' : 'favorite'))}" class="${favorite ? 'active' : ''}">${icon('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',17)}</button></div>
            </article>`;
        }).join('');
    }

    function renderRecent() {
        if (!root) return;
        const fonts = state.recent.map(id => state.fonts.find(font => font.id === id)).filter(Boolean).slice(0, 6);
        const strip = root.querySelector('#fl-recent-strip');
        strip.innerHTML = fonts.length ? fonts.map(font => `<button type="button" data-recent-id="${font.id}" class="${font.id === state.selectedId ? 'selected' : ''}"><small>${esc(font.name)}</small><span style="font-family:'NopalFont-${font.id}',sans-serif">Nopal</span></button>`).join('') : `<div class="fl-recent-empty">${esc(tr('readyDetail'))}</div>`;
    }

    function rememberRecent(id) {
        state.recent = [id, ...state.recent.filter(item => item !== id)].slice(0, 8);
        localStorage.setItem(STORAGE.recent, JSON.stringify(state.recent));
    }

    async function parsedFont(font) {
        if (state.parsedFonts.has(font.id)) return state.parsedFonts.get(font.id);
        await ensureOpenType();
        let buffer;
        if (font.customBuffer) buffer = font.customBuffer.slice(0);
        else {
            const response = await fetch(assetUrl(`fonts/${font.directory}/${font.file}`));
            if (!response.ok) throw new Error('font');
            buffer = await response.arrayBuffer();
        }
        const parsed = window.opentype.parse(buffer);
        state.parsedFonts.set(font.id, parsed);
        return parsed;
    }

    async function selectFont(id, addRecent = true) {
        const font = state.fonts.find(item => item.id === id);
        if (!font) return;
        state.selectedId = id;
        if (addRecent) rememberRecent(id);
        renderFonts(); renderRecent(); updateInfo(); updateWarning();
        schedulePreview(0);
    }

    function lineWidth(font, glyphs, size, tracking) {
        const scale = size / font.unitsPerEm;
        return glyphs.reduce((width, glyph, index) => {
            const kerning = index ? font.getKerningValue(glyphs[index - 1], glyph) * scale : 0;
            const advance = (glyph.advanceWidth || font.unitsPerEm) * scale;
            return width + kerning + advance + (index < glyphs.length - 1 ? tracking : 0);
        }, 0);
    }

    function combinedPath(font, text, size) {
        const path = new window.opentype.Path();
        const lines = (text || ' ').split(/\r?\n/).slice(0, 3);
        const lineHeight = size * state.lineHeight;
        lines.forEach((line, index) => {
            const glyphs = font.stringToGlyphs(line || ' ');
            const width = lineWidth(font, glyphs, size, state.tracking);
            let x = state.alignment === 'left' ? 0 : state.alignment === 'right' ? -width : -width / 2;
            const scale = size / font.unitsPerEm;
            glyphs.forEach((glyph, glyphIndex) => {
                if (glyphIndex) x += font.getKerningValue(glyphs[glyphIndex - 1], glyph) * scale;
                path.commands.push(...glyph.getPath(x, index * lineHeight, size).commands);
                x += (glyph.advanceWidth || font.unitsPerEm) * scale + (glyphIndex < glyphs.length - 1 ? state.tracking : 0);
            });
        });
        return path;
    }

    function warpPathToArc(source, degrees) {
        if (Math.abs(degrees) < .1) return source;
        const box = source.getBoundingBox();
        const width = Math.max(1, box.x2 - box.x1);
        const centerX = (box.x1 + box.x2) / 2;
        const referenceY = box.y2;
        const theta = degrees * Math.PI / 180;
        const radius = width / theta;
        const transformPoint = (x, y) => {
            const phi = ((x - centerX) / width) * theta;
            const localY = y - referenceY;
            return {
                x: centerX + radius * Math.sin(phi) - localY * Math.sin(phi),
                y: referenceY + radius * (1 - Math.cos(phi)) + localY * Math.cos(phi)
            };
        };
        const warped = new window.opentype.Path();
        warped.commands = source.commands.map(command => {
            const next = { type: command.type };
            for (const suffix of ['', '1', '2']) {
                const xKey = `x${suffix}`, yKey = `y${suffix}`;
                if (Number.isFinite(command[xKey]) && Number.isFinite(command[yKey])) {
                    const point = transformPoint(command[xKey], command[yKey]);
                    next[xKey] = point.x; next[yKey] = point.y;
                }
            }
            return next;
        });
        return warped;
    }

    async function generateModel() {
        const serial = ++renderSerial;
        const meta = state.fonts.find(font => font.id === state.selectedId);
        if (!meta) return null;
        const font = await parsedFont(meta);
        if (serial !== renderSerial) return null;
        const path = warpPathToArc(combinedPath(font, state.text || ' ', state.size), state.arcDegrees);
        const box = path.getBoundingBox();
        const width = Math.max(1, box.x2 - box.x1), height = Math.max(1, box.y2 - box.y1);
        const pad = Math.max(8, state.size * .2);
        const viewBox = [box.x1 - pad, box.y1 - pad, width + pad * 2, height + pad * 2];
        const exportViewBox = [box.x1, box.y1, width, height];
        const d = path.toPathData(2);
        const mm = 25.4 / 72;
        const naturalWidthMm = width * mm, naturalHeightMm = height * mm;
        let widthMm = state.targetWidthMm || naturalWidthMm;
        let heightMm = state.targetHeightMm || naturalHeightMm;
        if (state.lockRatio && state.targetWidthMm !== null && state.targetHeightMm === null) heightMm = widthMm * naturalHeightMm / naturalWidthMm;
        if (state.lockRatio && state.targetHeightMm !== null && state.targetWidthMm === null) widthMm = heightMm * naturalWidthMm / naturalHeightMm;
        const mode = state.mode;
        const strokeColor = mode === 'cnc' ? '#60a5fa' : '#ec4899';
        const lineOutline = state.outlineStyle === 'line';
        const hasOutline = !lineOutline && state.outlineMm > 0;
        const fill = lineOutline ? 'none' : mode === 'engrave' && !hasOutline ? '#ec4899' : 'none';
        const stroke = lineOutline ? strokeColor : mode === 'engrave' && !hasOutline ? 'none' : strokeColor;
        const strokeWidthMm = lineOutline ? .15 : hasOutline ? state.outlineMm : .2;
        const style = `fill:${fill};stroke:${stroke};stroke-width:${strokeWidthMm};vector-effect:non-scaling-stroke;stroke-linejoin:round`;
        const editable = { text:state.text,fontId:meta.id,font:meta.name,sizePt:state.size,trackingPt:state.tracking,lineHeight:state.lineHeight,alignment:state.alignment,lockRatio:state.lockRatio,arcDegrees:state.arcDegrees,positionXmm:state.positionXmm,positionYmm:state.positionYmm };
        const fabrication = { mode,material:state.material,power:state.power,speed:state.speed,passes:state.passes,kerfMm:state.kerfMm,bridgeWidthMm:state.bridgeWidthMm,outlineMm:state.outlineMm,outlineStyle:state.outlineStyle,optimize:state.optimize };
        const metadata = JSON.stringify({plugin:PLUGIN_ID,version:VERSION,editable,fabrication,dimensions:{widthMm,heightMm}});
        const exportTransform = `scale(${widthMm / width} ${heightMm / height}) translate(${-box.x1} ${-box.y1})`;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthMm.toFixed(2)} ${heightMm.toFixed(2)}" width="${widthMm.toFixed(2)}mm" height="${heightMm.toFixed(2)}mm" preserveAspectRatio="none"><metadata>${esc(metadata)}</metadata><g id="nopal-text" transform="${exportTransform}" data-operation="${mode}" data-kerf-mm="${state.kerfMm}" data-arc-deg="${state.arcDegrees}"><path d="${d}" style="${style}" fill-rule="evenodd" data-font="${esc(meta.name)}" data-mode="${mode}"/></g></svg>`;
        return { meta, font, path, d, box, viewBox, exportViewBox, naturalWidthMm, naturalHeightMm, widthMm, heightMm, svg, commands: path.commands.length, editable, fabrication };
    }

    function schedulePreview(delay = 100) {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(updatePreview, delay);
    }

    function canvasDimensions(model) {
        const area = state.project?.availableArea || state.project?.workArea;
        return area ? { width: Number(area.width), height: Number(area.height) } : {
            width: Math.max(600, model.widthMm + 100), height: Math.max(400, model.heightMm + 100)
        };
    }

    function positionModel(model, canvas) {
        if (!state.positionTouched || state.positionXmm === null || state.positionYmm === null) {
            state.positionXmm = Math.max(0, (canvas.width - model.widthMm) / 2);
            state.positionYmm = Math.max(0, (canvas.height - model.heightMm) / 2);
        }
        state.positionXmm = clamp(state.positionXmm, 0, Math.max(0, canvas.width - model.widthMm));
        state.positionYmm = clamp(state.positionYmm, 0, Math.max(0, canvas.height - model.heightMm));
        const scaleX = model.widthMm / Math.max(1, model.box.x2 - model.box.x1);
        const scaleY = model.heightMm / Math.max(1, model.box.y2 - model.box.y1);
        return `translate(${state.positionXmm} ${state.positionYmm}) scale(${scaleX} ${scaleY}) translate(${-model.box.x1} ${-model.box.y1})`;
    }

    async function updatePreview() {
        if (!root) return;
        try {
            root.querySelector('#fl-preview-layer').innerHTML = `<text x="300" y="155" text-anchor="middle" fill="#64748b">${esc(tr('loading'))}</text>`;
            const model = await generateModel();
            if (!model || !root) return;
            state.generated = model;
            const svg = root.querySelector('#fl-preview-svg');
            const canvas = canvasDimensions(model);
            state.canvas = canvas;
            svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.style.transform = `scale(${state.zoom})`;
            const lineOutline = state.outlineStyle === 'line';
            const hasOutline = !lineOutline && state.outlineMm > 0;
            const fill = lineOutline ? 'none' : state.mode === 'engrave' && !hasOutline ? '#ec4899' : 'none';
            const stroke = state.mode === 'cnc' ? '#60a5fa' : '#ec4899';
            const transform = positionModel(model, canvas);
            root.querySelector('#fl-preview-layer').setAttribute('transform', transform);
            root.querySelector('#fl-preview-layer').innerHTML = `<path d="${model.d}" fill="${fill}" stroke="${lineOutline ? stroke : state.mode === 'engrave' && !hasOutline ? 'none' : stroke}" stroke-width="${lineOutline ? .15 : hasOutline ? state.outlineMm : .3}" stroke-linejoin="round" vector-effect="non-scaling-stroke" fill-rule="evenodd"/>`;
            const handleRadius = Math.max(3.5, Math.min(canvas.width, canvas.height) / 80);
            const left = state.positionXmm, top = state.positionYmm, right = left + model.widthMm, bottom = top + model.heightMm;
            root.querySelector('#fl-selection-layer').innerHTML = `<rect class="fl-selection-box" data-fl-drag x="${left}" y="${top}" width="${model.widthMm}" height="${model.heightMm}" vector-effect="non-scaling-stroke"/>
                <circle class="fl-resize-handle" data-fl-resize="nw" cx="${left}" cy="${top}" r="${handleRadius}" vector-effect="non-scaling-stroke"/>
                <circle class="fl-resize-handle" data-fl-resize="ne" cx="${right}" cy="${top}" r="${handleRadius}" vector-effect="non-scaling-stroke"/>
                <circle class="fl-resize-handle" data-fl-resize="sw" cx="${left}" cy="${bottom}" r="${handleRadius}" vector-effect="non-scaling-stroke"/>
                <circle class="fl-resize-handle" data-fl-resize="se" cx="${right}" cy="${bottom}" r="${handleRadius}" vector-effect="non-scaling-stroke"/>
                <circle class="fl-curve-handle" data-fl-curve cx="${Math.max(handleRadius, left - handleRadius * 2.5)}" cy="${top}" r="${handleRadius * 1.08}" vector-effect="non-scaling-stroke"/>`;
            root.querySelector('#fl-arc-value').textContent = `${state.arcDegrees.toFixed(0)}°`;
            root.querySelector('#fl-position-readout').textContent = `${tr('position')}: ${state.positionXmm.toFixed(1)}, ${state.positionYmm.toFixed(1)} mm · ${tr('zoom')}: ${Math.round(state.zoom * 100)}%`;
            root.querySelector('#fl-metric-chars').textContent = [...state.text].length;
            root.querySelector('#fl-metric-contours').textContent = model.path.commands.filter(command => command.type === 'Z').length;
            root.querySelector('#fl-metric-size').textContent = `${model.widthMm.toFixed(1)} × ${model.heightMm.toFixed(1)} mm`;
            const widthField = root.querySelector('#fl-width-mm'), heightField = root.querySelector('#fl-height-mm');
            if (document.activeElement !== widthField) widthField.value = model.widthMm.toFixed(1);
            if (document.activeElement !== heightField) heightField.value = model.heightMm.toFixed(1);
            updateManufacturingChecks(model);
            setStatus(tr('ready'), `${model.meta.name} · ${model.widthMm.toFixed(1)} × ${model.heightMm.toFixed(1)} mm`);
        } catch (error) {
            console.error(error);
            root.querySelector('#fl-preview-layer').innerHTML = `<text x="300" y="155" text-anchor="middle" fill="#ef4444">${esc(tr('loadFailed'))}</text>`;
            setStatus(tr('loadFailed'), error.message, 'error');
        }
    }

    function updateInfo() {
        if (!root) return;
        const font = state.fonts.find(item => item.id === state.selectedId);
        if (!font) return;
        root.querySelector('#fl-info-name').textContent = font.name;
        root.querySelector('#fl-info-style').textContent = font.style;
        root.querySelector('#fl-info-type').textContent = tr(font.category);
        root.querySelector('#fl-info-license').textContent = font.license;
        root.querySelector('#fl-info-file').textContent = font.file;
    }

    function updateWarning() {
        if (!root) return;
        const font = state.fonts.find(item => item.id === state.selectedId);
        const warning = root.querySelector('#fl-warning');
        if (state.mode !== 'cut' || !state.optimize || !font) { warning.hidden = true; return; }
        warning.hidden = false;
        warning.className = `fl-warning ${font.cutSafe ? 'safe' : 'attention'}`;
        warning.textContent = tr(font.cutSafe ? 'cutReady' : 'islandWarning');
    }

    function updateManufacturingChecks(model = state.generated) {
        if (!root || !model) return;
        const area = state.project?.availableArea || state.project?.workArea;
        const fits = !area || (model.widthMm <= area.width && model.heightMm <= area.height);
        const font = state.fonts.find(item => item.id === state.selectedId);
        const hasIslandGlyphs = /[ABDOPQR0689@%&aegopqbd]/.test(state.text);
        const islandsSafe = state.mode !== 'cut' || font?.cutSafe || !hasIslandGlyphs;
        const estimatedFeature = model.heightMm / Math.max(12, state.size / 6);
        const detailSafe = estimatedFeature >= Math.max(0.3, state.kerfMm * 1.5);
        const setCheck = (selector, pass, message) => {
            const node = root.querySelector(selector); node.className = pass ? 'pass' : 'attention'; node.textContent = message;
        };
        setCheck('#fl-check-size', fits, tr(fits ? 'withinArea' : 'outsideArea'));
        setCheck('#fl-check-islands', islandsSafe, tr(islandsSafe ? 'noIslands' : 'islandsFound'));
        setCheck('#fl-check-detail', detailSafe, tr(detailSafe ? 'exactSize' : 'thinFeature'));
    }

    function setStatus(title, detail, tone = '') {
        if (!root) return;
        root.querySelector('#fl-status-title').textContent = title;
        root.querySelector('#fl-status-detail').textContent = detail;
        root.querySelector('.fl-status-dot').dataset.tone = tone;
    }

    function filename(extension = 'svg') {
        const base = (state.text || 'nopal-texto').trim().slice(0, 32).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
        return `${base || 'nopal-texto'}-${state.mode}.${extension}`;
    }

    async function ensureGenerated() {
        const model = await generateModel();
        if (!model) throw new Error(tr('loadFailed'));
        state.generated = model;
        return model;
    }

    function downloadFile(content, name, mime) {
        const blob = new Blob([content], { type: mime });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob); link.download = name; link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    function downloadSvg(svg, name = filename()) {
        downloadFile(svg, name, 'image/svg+xml;charset=utf-8');
    }

    async function exportSvg() {
        const model = await ensureGenerated();
        downloadSvg(model.svg); toast(tr('exported'));
    }

    async function saveToLibrary() {
        const model = await ensureGenerated();
        if (window.__FONT_LIBRARY_HARNESS__) { downloadSvg(model.svg); toast(tr('saveFallback')); return; }
        const form = new FormData();
        form.append('file', new File([model.svg], filename(), { type: 'image/svg+xml' }));
        form.append('type', 'model'); form.append('path', 'Biblioteca de tipografías');
        const response = await fetch('/api/upload', { method: 'POST', body: form });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || tr('loadFailed'));
        window.loadModelsFolder?.(''); toast(tr('saved'));
    }

    // Convierte los comandos de trazo de opentype.js (M/L/C/Q/Z, en el
    // espacio propio del path -- ver generateModel()) a subtrayectos de
    // puntos {x,y} planos, aproximando curvas Bezier cúbicas/cuadráticas
    // con segmentos de línea rectos (suficiente a la escala de un texto;
    // no es una tolerancia adaptativa, es una subdivisión fija).
    const GCODE_CURVE_STEPS = 16;

    function flattenPathCommands(commands, steps = GCODE_CURVE_STEPS) {
        const subpaths = [];
        let current = null;
        let cur = { x: 0, y: 0 };
        let start = { x: 0, y: 0 };
        for (const cmd of commands) {
            if (cmd.type === 'M') {
                current = [{ x: cmd.x, y: cmd.y }];
                subpaths.push(current);
                cur = { x: cmd.x, y: cmd.y };
                start = cur;
            } else if (cmd.type === 'L') {
                current?.push({ x: cmd.x, y: cmd.y });
                cur = { x: cmd.x, y: cmd.y };
            } else if (cmd.type === 'C') {
                for (let i = 1; i <= steps; i += 1) {
                    const t = i / steps, mt = 1 - t;
                    current?.push({
                        x: mt * mt * mt * cur.x + 3 * mt * mt * t * cmd.x1 + 3 * mt * t * t * cmd.x2 + t * t * t * cmd.x,
                        y: mt * mt * mt * cur.y + 3 * mt * mt * t * cmd.y1 + 3 * mt * t * t * cmd.y2 + t * t * t * cmd.y,
                    });
                }
                cur = { x: cmd.x, y: cmd.y };
            } else if (cmd.type === 'Q') {
                for (let i = 1; i <= steps; i += 1) {
                    const t = i / steps, mt = 1 - t;
                    current?.push({
                        x: mt * mt * cur.x + 2 * mt * t * cmd.x1 + t * t * cmd.x,
                        y: mt * mt * cur.y + 2 * mt * t * cmd.y1 + t * t * cmd.y,
                    });
                }
                cur = { x: cmd.x, y: cmd.y };
            } else if (cmd.type === 'Z') {
                current?.push({ x: start.x, y: start.y });
                cur = start;
            }
        }
        return subpaths.filter(subpath => subpath.length > 1);
    }

    // G-code real (no una simulación): sigue el contorno exacto de las
    // letras (sirve para "Corte" y trayectos de "CNC" -- para "Grabado" de
    // verdad haría falta rellenar con líneas de barrido, que no está
    // implementado todavía, así que también traza solo el contorno).
    // Convención: SVG usa Y hacia abajo (origen arriba-izquierda); G-code
    // espera Y hacia arriba (origen abajo-izquierda de la cama), por eso
    // se invierte el eje Y al convertir a milímetros.
    function buildGcodeFromModel(model) {
        const width = Math.max(1, model.box.x2 - model.box.x1);
        const height = Math.max(1, model.box.y2 - model.box.y1);
        const scaleX = model.widthMm / width, scaleY = model.heightMm / height;
        const toMm = (x, y) => ({
            x: (x - model.box.x1) * scaleX,
            y: model.heightMm - (y - model.box.y1) * scaleY,
        });
        const subpaths = flattenPathCommands(model.path.commands).map(subpath => subpath.map(point => toMm(point.x, point.y)));

        const power = clamp(state.power, 0, 100);
        const speed = Math.max(1, Number(state.speed) || 1);
        const passes = Math.max(1, Number(state.passes) || 1);
        const sValue = Math.round((power / 100) * LASER_S_MAX);
        const fmt = value => value.toFixed(3);

        const lines = [
            `; Generado por NOPAL -- plugin "Texto para fabricación" v${VERSION}`,
            `; Texto: ${(state.text || '').replace(/\r?\n/g, ' / ')}`,
            `; Fuente: ${model.meta.name} -- modo: ${state.mode} -- material: ${state.material}`,
            '; Traza el contorno de las letras (para "Grabado" real con relleno de barrido hace falta otra herramienta).',
            'G21 ; milímetros',
            'G90 ; coordenadas absolutas',
            'M5 ; láser/husillo apagado',
        ];
        for (let pass = 1; pass <= passes; pass += 1) {
            lines.push(`; -- pasada ${pass}/${passes} --`);
            for (const subpath of subpaths) {
                if (subpath.length < 2) continue;
                lines.push(`G0 X${fmt(subpath[0].x)} Y${fmt(subpath[0].y)}`);
                lines.push(`M3 S${sValue}`);
                for (let i = 1; i < subpath.length; i += 1) {
                    lines.push(`G1 X${fmt(subpath[i].x)} Y${fmt(subpath[i].y)} F${speed}`);
                }
                lines.push('M5');
            }
        }
        lines.push('G0 X0 Y0', 'M2 ; fin de programa');
        return lines.join('\n') + '\n';
    }

    async function sendToProduction() {
        const model = await ensureGenerated();
        const gcode = buildGcodeFromModel(model);
        if (window.__FONT_LIBRARY_HARNESS__) { downloadFile(gcode, filename('gcode'), 'text/plain'); toast(tr('queuedDemo')); return; }
        const form = new FormData();
        form.append('file', new File([gcode], filename('gcode'), { type: 'text/plain' }));
        form.append('type', 'gcode'); form.append('path', 'Biblioteca de tipografías');
        const response = await fetch('/api/upload', { method: 'POST', body: form });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || tr('loadFailed'));
        toast(tr('sent'));
    }

    async function addToProject() {
        const model = await ensureGenerated();
        const detail = {
            id: `text-${Date.now()}`,
            type: 'svg-text',
            name: (state.text || tr('createText')).split(/\r?\n/)[0].slice(0, 48),
            sourcePlugin: PLUGIN_ID,
            svg: model.svg,
            dimensions: { widthMm: model.widthMm, heightMm: model.heightMm },
            transform: { xMm: state.positionXmm, yMm: state.positionYmm, rotationDeg: 0 },
            editable: model.editable,
            fabrication: model.fabrication,
            layers: [{ id: 'text-operation', name: tr('layerOperation'), operation: state.mode, color: state.mode === 'cnc' ? '#60a5fa' : '#ec4899' }]
        };
        if (typeof window.NopalProject?.addElement === 'function') {
            await window.NopalProject.addElement(detail);
            toast(tr('addedProject'));
            return;
        }
        window.dispatchEvent(new CustomEvent('nopal:add-project-element', { detail, cancelable: true }));
        toast(window.__FONT_LIBRARY_HARNESS__ ? tr('projectFallback') : tr('addedProject'));
    }

    async function importFont(file) {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { toast(tr('tooLarge'), 'error'); return; }
        try {
            await ensureOpenType();
            const buffer = await file.arrayBuffer();
            const parsed = window.opentype.parse(buffer.slice(0));
            const id = `custom-${Date.now()}-${++state.customCounter}`;
            const name = parsed.names?.fontFamily?.en || parsed.names?.fullName?.en || file.name.replace(/\.(ttf|otf)$/i, '');
            const meta = { id, name, file: file.name, directory: '', category: 'custom', style: parsed.names?.fontSubfamily?.en || tr('custom'), cutSafe: false, license: tr('custom'), source: tr('custom'), customBuffer: buffer };
            state.fonts.unshift(meta); state.parsedFonts.set(id, parsed); await registerFontFace(meta); state.category = 'all'; state.tab = 'all';
            root.querySelector('#fl-category').value = 'all'; root.querySelectorAll('[data-fl-tab]').forEach(button => button.classList.toggle('active', button.dataset.flTab === 'all'));
            await selectFont(id); toast(`${tr('imported')}: ${name}`);
        } catch (error) { console.error(error); toast(tr('invalidFont'), 'error'); }
    }

    function toggleFavorite(id) {
        if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
        localStorage.setItem(STORAGE.favorites, JSON.stringify([...state.favorites]));
        renderFonts();
    }

    function setMode(mode) {
        state.mode = mode;
        root.querySelectorAll('[data-fl-mode]').forEach(button => button.classList.toggle('active', button.dataset.flMode === mode));
        updateWarning(); schedulePreview(0);
    }

    function setOutlineStyle(style) {
        state.outlineStyle = style;
        root.querySelectorAll('[data-fl-outline-style]').forEach(button => button.classList.toggle('active', button.dataset.flOutlineStyle === style));
        root.querySelector('#fl-outline').disabled = style === 'line';
        schedulePreview(0);
    }

    function applyZoom() {
        const svg = root?.querySelector('#fl-preview-svg');
        if (svg) svg.style.transform = `scale(${state.zoom})`;
        const readout = root?.querySelector('#fl-position-readout');
        if (readout && state.positionXmm !== null) readout.textContent = `${tr('position')}: ${state.positionXmm.toFixed(1)}, ${state.positionYmm.toFixed(1)} mm · ${tr('zoom')}: ${Math.round(state.zoom * 100)}%`;
    }

    function bindCanvasInteractions() {
        const svg = root.querySelector('#fl-preview-svg');
        let gesture = null;
        const deltaInCanvas = event => {
            const rect = svg.getBoundingClientRect();
            return { x: (event.clientX - gesture.clientX) * state.canvas.width / rect.width, y: (event.clientY - gesture.clientY) * state.canvas.height / rect.height };
        };
        svg.addEventListener('pointerdown', event => {
            const curve = event.target.closest('[data-fl-curve]');
            const resize = event.target.closest('[data-fl-resize]');
            const drag = event.target.closest('[data-fl-drag]') || event.target.closest('#fl-preview-layer');
            if (!curve && !resize && !drag) return;
            event.preventDefault();
            state.positionTouched = true;
            gesture = {
                mode: curve ? 'curve' : resize ? 'resize' : 'drag', corner: resize?.dataset.flResize, clientX: event.clientX, clientY: event.clientY,
                x: state.positionXmm, y: state.positionYmm, width: state.generated.widthMm, height: state.generated.heightMm, arc: state.arcDegrees
            };
            svg.setPointerCapture?.(event.pointerId);
            svg.classList.add('interacting');
        });
        svg.addEventListener('pointermove', event => {
            if (!gesture || !state.generated || !state.canvas) return;
            const delta = deltaInCanvas(event);
            if (gesture.mode === 'drag') {
                state.positionXmm = clamp(gesture.x + delta.x, 0, Math.max(0, state.canvas.width - state.generated.widthMm));
                state.positionYmm = clamp(gesture.y + delta.y, 0, Math.max(0, state.canvas.height - state.generated.heightMm));
            } else if (gesture.mode === 'curve') {
                state.arcDegrees = clamp(gesture.arc - delta.y / state.canvas.height * 360, -180, 180);
            } else {
                const west = gesture.corner.includes('w'), north = gesture.corner.includes('n');
                const proposedWidth = gesture.width + delta.x * (west ? -1 : 1);
                const proposedHeight = gesture.height + delta.y * (north ? -1 : 1);
                const maxWidth = west ? gesture.x + gesture.width : state.canvas.width - gesture.x;
                const maxHeight = north ? gesture.y + gesture.height : state.canvas.height - gesture.y;
                if (state.lockRatio) {
                    const ratio = gesture.width / gesture.height;
                    const widthFromY = proposedHeight * ratio;
                    const nextWidth = clamp(Math.abs(delta.x) > Math.abs(delta.y * ratio) ? proposedWidth : widthFromY, 1, Math.min(3000, maxWidth, maxHeight * ratio));
                    const nextHeight = nextWidth / ratio;
                    state.targetWidthMm = nextWidth;
                    state.targetHeightMm = null;
                    state.positionXmm = west ? gesture.x + gesture.width - nextWidth : gesture.x;
                    state.positionYmm = north ? gesture.y + gesture.height - nextHeight : gesture.y;
                } else {
                    const nextWidth = clamp(proposedWidth, 1, Math.min(3000, maxWidth));
                    const nextHeight = clamp(proposedHeight, 1, Math.min(3000, maxHeight));
                    state.targetWidthMm = nextWidth;
                    state.targetHeightMm = nextHeight;
                    state.positionXmm = west ? gesture.x + gesture.width - nextWidth : gesture.x;
                    state.positionYmm = north ? gesture.y + gesture.height - nextHeight : gesture.y;
                }
            }
            schedulePreview(0);
        });
        const endGesture = event => {
            if (!gesture) return;
            gesture = null; svg.releasePointerCapture?.(event.pointerId); svg.classList.remove('interacting');
        };
        svg.addEventListener('pointerup', endGesture);
        svg.addEventListener('pointercancel', endGesture);
        svg.addEventListener('wheel', event => {
            event.preventDefault();
            state.zoom = clamp(state.zoom * (event.deltaY < 0 ? 1.1 : .9), .5, 3);
            applyZoom();
        }, { passive: false });
        ctrlKeyDownHandler = event => {
            if (event.key === 'Control') root?.classList.add('curve-mode');
            if (event.ctrlKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
                event.preventDefault();
                state.arcDegrees = clamp(state.arcDegrees + (event.key === 'ArrowUp' ? 5 : -5), -180, 180);
                schedulePreview(0);
            }
        };
        ctrlKeyUpHandler = event => { if (event.key === 'Control' || event.type === 'blur') root?.classList.remove('curve-mode'); };
        window.addEventListener('keydown', ctrlKeyDownHandler);
        window.addEventListener('keyup', ctrlKeyUpHandler);
        window.addEventListener('blur', ctrlKeyUpHandler);
    }

    function bindEvents() {
        root.querySelector('#fl-search').addEventListener('input', event => { state.query = event.target.value; renderFonts(); });
        root.querySelector('#fl-category').addEventListener('change', event => { state.category = event.target.value; renderFonts(); });
        root.querySelector('#fl-import').addEventListener('click', () => root.querySelector('#fl-file').click());
        root.querySelector('#fl-file').addEventListener('change', event => { importFont(event.target.files?.[0]); event.target.value = ''; });
        root.querySelector('#fl-font-grid').addEventListener('click', event => {
            const favorite = event.target.closest('[data-favorite-id]');
            if (favorite) { event.stopPropagation(); toggleFavorite(favorite.dataset.favoriteId); return; }
            const card = event.target.closest('[data-font-id]'); if (card) selectFont(card.dataset.fontId);
        });
        root.querySelector('#fl-font-grid').addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { const card = event.target.closest('[data-font-id]'); if (card) { event.preventDefault(); selectFont(card.dataset.fontId); } } });
        root.querySelector('#fl-recent-strip').addEventListener('click', event => { const button = event.target.closest('[data-recent-id]'); if (button) selectFont(button.dataset.recentId); });
        root.querySelectorAll('[data-fl-tab]').forEach(button => button.addEventListener('click', () => { state.tab = button.dataset.flTab; root.querySelectorAll('[data-fl-tab]').forEach(item => item.classList.toggle('active', item === button)); renderFonts(); }));
        root.querySelector('#fl-text').addEventListener('input', event => { state.text = event.target.value; schedulePreview(); });
        root.querySelector('#fl-size').addEventListener('input', event => { state.size = clamp(event.target.value, 8, 240); schedulePreview(); });
        root.querySelector('#fl-tracking').addEventListener('input', event => { state.tracking = clamp(event.target.value, -10, 50); schedulePreview(); });
        root.querySelector('#fl-line-height').addEventListener('input', event => { state.lineHeight = clamp(event.target.value, .8, 3); schedulePreview(); });
        root.querySelectorAll('[data-fl-align]').forEach(button => button.addEventListener('click', () => {
            state.alignment = button.dataset.flAlign;
            root.querySelectorAll('[data-fl-align]').forEach(item => item.classList.toggle('active', item === button));
            schedulePreview(0);
        }));
        const setDimension = (axis, rawValue) => {
            const value = clamp(rawValue, 1, 3000);
            if (axis === 'width') {
                state.targetWidthMm = value;
                if (state.lockRatio) state.targetHeightMm = null;
            } else {
                state.targetHeightMm = value;
                if (state.lockRatio) state.targetWidthMm = null;
            }
            schedulePreview(0);
        };
        root.querySelector('#fl-width-mm').addEventListener('input', event => setDimension('width', event.target.value));
        root.querySelector('#fl-height-mm').addEventListener('input', event => setDimension('height', event.target.value));
        root.querySelector('#fl-lock-ratio').addEventListener('click', event => {
            state.lockRatio = !state.lockRatio;
            if (state.lockRatio && state.targetWidthMm !== null) state.targetHeightMm = null;
            event.currentTarget.classList.toggle('active', state.lockRatio); schedulePreview(0);
        });
        root.querySelector('#fl-auto-size').addEventListener('click', () => { state.targetWidthMm = null; state.targetHeightMm = null; schedulePreview(0); });
        root.querySelectorAll('[data-fl-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.flMode)));
        root.querySelector('#fl-material').addEventListener('change', event => { state.material = event.target.value; schedulePreview(); });
        root.querySelector('#fl-kerf').addEventListener('input', event => { state.kerfMm = clamp(event.target.value, 0, 12); schedulePreview(); });
        root.querySelector('#fl-bridge-width').addEventListener('input', event => { state.bridgeWidthMm = clamp(event.target.value, .5, 20); schedulePreview(); });
        root.querySelector('#fl-outline').addEventListener('input', event => { state.outlineMm = clamp(event.target.value, 0, 20); schedulePreview(0); });
        root.querySelectorAll('[data-fl-outline-style]').forEach(button => button.addEventListener('click', () => setOutlineStyle(button.dataset.flOutlineStyle)));
        root.querySelector('#fl-reset-arc').addEventListener('click', () => { state.arcDegrees = 0; schedulePreview(0); });
        root.querySelector('#fl-power').addEventListener('input', event => { state.power = Number(event.target.value); root.querySelector('#fl-power-value').textContent = `${state.power}%`; });
        root.querySelector('#fl-speed').addEventListener('input', event => { state.speed = Number(event.target.value); root.querySelector('#fl-speed-value').textContent = `${state.speed} mm/min`; });
        root.querySelector('#fl-passes').addEventListener('input', event => { state.passes = clamp(event.target.value, 1, 20); });
        root.querySelector('#fl-optimize').addEventListener('change', event => { state.optimize = event.target.checked; updateWarning(); schedulePreview(); });
        root.querySelectorAll('[data-fl-zoom]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.flZoom; state.zoom = action === 'fit' ? 1 : clamp(state.zoom + (action === 'in' ? .12 : -.12), .5, 3); applyZoom(); }));
        root.querySelector('#fl-export').addEventListener('click', () => exportSvg().catch(error => toast(error.message, 'error')));
        root.querySelector('#fl-add-project').addEventListener('click', () => addToProject().catch(error => toast(error.message, 'error')));
        root.querySelector('#fl-send').addEventListener('click', () => sendToProduction().catch(error => toast(error.message, 'error')));
        root.querySelector('#fl-save-library').addEventListener('click', () => saveToLibrary().catch(error => toast(error.message, 'error')));
        root.querySelector('#fl-focus-text').addEventListener('click', () => root.querySelector('#fl-text').focus());
        root.querySelector('#fl-convert').addEventListener('click', () => ensureGenerated().then(() => toast(tr('exported'))).catch(error => toast(error.message, 'error')));
        root.querySelector('#fl-save-preset').addEventListener('click', () => { localStorage.setItem(STORAGE.presets, JSON.stringify({material:state.material,power:state.power,speed:state.speed,passes:state.passes,mode:state.mode})); toast(tr('presetSaved')); });
        root.querySelector('#fl-refresh').addEventListener('click', () => { renderFonts(); schedulePreview(0); });
        bindCanvasInteractions();
    }

    async function mount() {
        if (document.getElementById('font-library-section')) return;
        navButton = document.createElement('button');
        navButton.type = 'button'; navButton.className = 'nav-item'; navButton.dataset.section = 'font-library'; navButton.dataset.pluginNav = PLUGIN_ID;
        navButton.innerHTML = `${icon('<path d="M5 5h14M12 5v14M8 19h8"/>',20)}<span>${esc(tr('title'))}</span>`;
        navButton.addEventListener('click', () => window.switchSection?.('font-library'));
        document.querySelector('.nav-category[data-group="plugins"] .nav-category-items')?.appendChild(navButton);
        const wrapper = document.createElement('div'); wrapper.innerHTML = moduleHtml(); root = wrapper.firstElementChild;
        (document.querySelector('.content') || document.body).appendChild(root);
        applyLanguage(); bindEvents(); updateInfo(); updateWarning();
        resolveProjectContext();
        languageObserver = new MutationObserver(applyLanguage); languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
        window.applySidebarOrder?.();
        try { await Promise.all([ensureOpenType(), loadCatalog()]); } catch (error) { console.error(error); setStatus(tr('loadFailed'), error.message, 'error'); }
    }

    function unmount() {
        clearTimeout(previewTimer); languageObserver?.disconnect(); languageObserver = null;
        if (ctrlKeyDownHandler) window.removeEventListener('keydown', ctrlKeyDownHandler);
        if (ctrlKeyUpHandler) { window.removeEventListener('keyup', ctrlKeyUpHandler); window.removeEventListener('blur', ctrlKeyUpHandler); }
        ctrlKeyDownHandler = ctrlKeyUpHandler = null;
        navButton?.remove(); document.getElementById('font-library-section')?.remove();
        root = navButton = null; state.parsedFonts.clear(); state.fontFaces.clear();
    }

    window.NopalPluginRegistry = window.NopalPluginRegistry || {};
    window.NopalPluginRegistry[PLUGIN_ID] = { mount, unmount, version: VERSION };
    mount();
})();
