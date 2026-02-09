/* ═══════════════════════════════════════════════════════════════════════
 *  effects.js — Three.js 3D Universe Background for Amit Lal Portfolio
 *  Floating Spheres · Starfield · Glow · Orbit · Connections
 *  Requires: Three.js r128+ (loaded via CDN in HTML)
 *  Copyright © 2024-2025 Amit Lal. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── Configuration ────────────────────────────────────────────────
    const CONFIG = {
        navHub: {
            enabled: true,
            radius: 12,
            floatAmplitude: 0.6,
            rotateSpeed: 0.08,
            backgroundSpheres: false,
        },
        spheres: {
            count: 8,           // background orbs (if enabled)
            minRadius: 0.3,
            maxRadius: 1.8,
            spread: 25,          // spatial spread
            orbitSpeed: 0.0008,
            floatAmplitude: 0.8,
            colors: [
                0x00d4ff,  // neon cyan
                0xa855f7,  // purple
                0x22b8ff,  // azure blue
                0x3b82f6,  // deep blue
                0x06b6d4,  // teal
                0x8b5cf6,  // violet
                0xf472b6,  // pink
                0x10b981,  // emerald
            ],
        },
        stars: 3200,             // background starfield count
        clusters: 3,             // layered star clusters
        connections: {
            maxDistance: 8,
            lineOpacity: 0.12,
        },
        rings: {
            count: 4,            // orbital rings
        },
        camera: {
            fov: 60,
            near: 0.1,
            far: 600,
            z: 28,
            autoRotateSpeed: 0.06,
            minZ: 10,
            maxZ: 80,
            zoomSpeed: 2.2,
            drift: 0.35,
        },
        mouse: {
            influence: 0.0004,
            dampening: 0.95,
        },
    };

    const CATEGORY_MAP = {
        apps: { label: 'Apps & Demos', color: '#00d4ff' },
        ai: { label: 'AI / Agents', color: '#a855f7' },
        cloud: { label: 'Cloud Tools', color: '#3b82f6' },
        content: { label: 'Content & Community', color: '#f472b6' },
    };

    const NAV_NODES = [
        { label: 'SAP Digital Twin', url: 'https://sap-landscape-digital-twin.amit-lal.com/', color: 0x00d4ff, desc: '3D SAP landscape visualization', category: 'apps' },
        { label: 'Copilot ROI', url: 'https://amitlals.github.io/copilot-roi-calculator/', color: 0x00d4ff, desc: 'M365 savings calculator', category: 'apps' },
        { label: 'BTP Explorer', url: 'https://studio--btp-services-explorer.us-central1.hosted.app/login', color: 0x00d4ff, desc: 'SAP BTP services discovery', category: 'apps' },
        { label: 'Azure Status', url: 'https://aka.ms/azurestatuschecker/', color: 0x3b82f6, desc: 'Azure service health monitor', category: 'cloud' },
        { label: 'Cloud Region Advisor', url: 'https://cloudregionadvisor.amit-lal.com/', color: 0x3b82f6, desc: 'Choose optimal Azure region', category: 'cloud' },
        { label: 'SAP Azure GPT', url: 'https://chatgpt.com/g/g-P0b7jVeUn-sap-on-azure-technical-copilot', color: 0xa855f7, desc: 'SAP on Azure technical copilot', category: 'ai' },
        { label: 'Chat', action: 'chat', color: 0xa855f7, desc: 'Open the AI assistant', category: 'ai' },
        { label: 'AI 2040 Book', url: 'https://www.amazon.com/AI-2040-Artificial-Intelligence-Reshape-ebook/dp/B0DNQ1N4G1', color: 0xf472b6, desc: 'Enterprise AI roadmap and strategy', category: 'content' },
        { label: 'YouTube', url: 'https://www.youtube.com/@AI-with-AmitLal', color: 0xf472b6, desc: 'AI tutorials and demos', category: 'content' },
        { label: 'Newsletter', url: 'https://ai-with-amit.beehiiv.com/subscribe', color: 0xf472b6, desc: 'Subscribe to AI with Amit', category: 'content' },
        { label: 'LinkedIn', url: 'https://linkedin.com/in/amitlal', color: 0xf472b6, desc: 'Connect professionally', category: 'content' },
        { label: 'GitHub', url: 'https://github.com/amitlals', color: 0xf472b6, desc: 'Open-source projects and demos', category: 'content' },
        { label: 'Contact', action: 'contact', color: 0xf472b6, desc: 'Email or schedule a call', category: 'content' },
    ];

    // ─── State ────────────────────────────────────────────────────────
    let scene, camera, renderer, animationId;
    let sphereMeshes = [], starField, starClusters = [], connectionLines, ringMeshes = [];
    let navGroup, navMeshes = [], navLines, orbitParticles;
    let glowPlanes = [];
    let raycaster, pointer, hoveredNode, activeNode;
    let targetCamPos = null;
    let zoomTarget = CONFIG.camera.z;
    let dragActive = false;
    let lastDragX = 0, lastDragY = 0;
    let dragRotX = 0, dragRotY = 0;
    let tourActive = false;
    let tourIndex = 0;
    let tourTimer = null;
    let lastPinchDist = null;
    let qualityLevel = 'med';
    let navData = NAV_NODES.slice();
    let currentCategory = 'apps';
    let mouseX = 0, mouseY = 0;
    let lastMouse = { x: 0, y: 0 };
    let targetRotX = 0, targetRotY = 0;
    let running = false;
    let clock;

    // ─── Utility ──────────────────────────────────────────────────────
    function isReducedMode() {
        return document.body.classList.contains('reduced-effects');
    }
    function isMobile() {
        return window.innerWidth <= 768;
    }
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ─── Three.js Scene Setup ─────────────────────────────────────────
    function initUniverse(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof THREE === 'undefined') {
            console.warn('effects.js: THREE.js not loaded or canvas not found');
            return;
        }

        clock = new THREE.Clock();

        // Scene
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0a1a, 0.006);

        // Camera
        camera = new THREE.PerspectiveCamera(
            CONFIG.camera.fov,
            window.innerWidth / window.innerHeight,
            CONFIG.camera.near,
            CONFIG.camera.far
        );
        camera.position.z = CONFIG.camera.z;

        // Renderer
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: !isMobile(),
            alpha: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));
        renderer.setClearColor(0x000000, 0);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x112244, 0.6);
        scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(0x00d4ff, 2.5, 60);
        pointLight1.position.set(10, 8, 15);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xa855f7, 2, 50);
        pointLight2.position.set(-12, -5, 10);
        scene.add(pointLight2);

        const pointLight3 = new THREE.PointLight(0x22b8ff, 1.5, 40);
        pointLight3.position.set(0, 12, -10);
        scene.add(pointLight3);

        // Build scene elements
        createStarfield();
        createStarClusters();
        createNebula();
        createGlowPlanes();
        createOrbitalRings();
        createMilkyWay();
        if (CONFIG.navHub.enabled) {
            createNavHub();
            loadProjectNodes();
        }
        if (CONFIG.navHub.backgroundSpheres) {
            createSpheres();
            createConnectionLines();
        }

        // Events
        window.addEventListener('resize', onResize);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('click', onClick);
        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

        renderer.domElement.addEventListener('mousedown', onDragStart);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('mousemove', onDragMove);
        renderer.domElement.addEventListener('touchstart', onDragStart, { passive: true });
        document.addEventListener('touchend', onDragEnd, { passive: true });
        document.addEventListener('touchmove', onDragMove, { passive: true });

        // Start
        running = true;
        animate();
    }

    // ─── 3D Navigation Hub ─────────────────────────────────────────
    function createNavHub() {
        navGroup = new THREE.Group();
        navGroup.name = 'NavHub';
        navMeshes = [];
        navGroup.position.x = 7;

        // Core node
        const coreGeo = new THREE.SphereGeometry(1.4, 32, 32);
        const coreMat = new THREE.MeshPhongMaterial({
            color: 0x00d4ff,
            emissive: 0x00d4ff,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.55,
            shininess: 120,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        const coreLabel = createLabelSprite('Amit Lal Core', 0x00d4ff);
        coreLabel.position.set(0, 2.2, 0);
        core.add(coreLabel);
        navGroup.add(core);

        // Arrange nodes on a sphere (Fibonacci distribution)
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const n = navData.length;
        for (let i = 0; i < n; i++) {
            const y = 1 - (i / (n - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;

            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;

            const node = createNavNode(navData[i]);
            node.position.set(
                x * CONFIG.navHub.radius,
                y * CONFIG.navHub.radius,
                z * CONFIG.navHub.radius
            );
            if (node.userData.category === 'apps') node.position.multiplyScalar(1.05);
            if (node.userData.category === 'cloud') node.position.multiplyScalar(0.95);
            if (node.userData.category === 'ai') node.position.multiplyScalar(0.9);
            node.userData.baseY = node.position.y;
            node.userData.floatPhase = Math.random() * Math.PI * 2;
            navGroup.add(node);
            navMeshes.push(node);
        }

        // Lines connecting core to nodes
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.12,
            depthWrite: false,
        });
        const lineGeo = new THREE.BufferGeometry();
        const linePositions = new Float32Array(navMeshes.length * 6);
        for (let i = 0; i < navMeshes.length; i++) {
            const p = navMeshes[i].position;
            linePositions[i * 6 + 0] = 0;
            linePositions[i * 6 + 1] = 0;
            linePositions[i * 6 + 2] = 0;
            linePositions[i * 6 + 3] = p.x;
            linePositions[i * 6 + 4] = p.y;
            linePositions[i * 6 + 5] = p.z;
        }
        lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        navLines = new THREE.LineSegments(lineGeo, lineMat);
        navGroup.add(navLines);

        // Orbiting particle belt
        const beltCount = isMobile() ? 120 : 220;
        const beltGeo = new THREE.BufferGeometry();
        const beltPos = new Float32Array(beltCount * 3);
        for (let i = 0; i < beltCount; i++) {
            const angle = (i / beltCount) * Math.PI * 2;
            const radius = CONFIG.navHub.radius * 0.8 + Math.random() * 3;
            beltPos[i * 3 + 0] = Math.cos(angle) * radius;
            beltPos[i * 3 + 1] = (Math.random() - 0.5) * 1.8;
            beltPos[i * 3 + 2] = Math.sin(angle) * radius;
        }
        beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
        const beltMat = new THREE.PointsMaterial({
            color: 0x7dd3fc,
            size: 0.08,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
        });
        orbitParticles = new THREE.Points(beltGeo, beltMat);
        navGroup.add(orbitParticles);

        scene.add(navGroup);

        raycaster = new THREE.Raycaster();
        pointer = new THREE.Vector2();
        updateHubUI(null);
        emitHubData();
        applyCategoryFilter();
    }

    function rebuildNavHub(nodes) {
        navData = nodes.slice();
        if (navGroup && scene) {
            scene.remove(navGroup);
        }
        navMeshes = [];
        navLines = null;
        orbitParticles = null;
        createNavHub();
    }

    function applyCategoryFilter() {
        if (!navMeshes.length) return;
        navMeshes.forEach(function (node) {
            const cat = node.userData.category;
            node.visible = !currentCategory || currentCategory === cat;
        });
        updateNavLinesVisible();
        updateHubUI(null);
        updateTooltip(null);
    }

    function updateNavLinesVisible() {
        if (!navLines || !navMeshes.length) return;
        const positions = navLines.geometry.attributes.position.array;
        let idx = 0;
        navMeshes.forEach(function (node) {
            if (!node.visible) return;
            const p = node.position;
            positions[idx++] = 0;
            positions[idx++] = 0;
            positions[idx++] = 0;
            positions[idx++] = p.x;
            positions[idx++] = p.y;
            positions[idx++] = p.z;
        });
        navLines.geometry.setDrawRange(0, idx / 3);
        navLines.geometry.attributes.position.needsUpdate = true;
    }

    function emitHubData() {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('navhub:ready', { detail: { nodes: navData } }));
        }
    }

    function createNavNode(data) {
        let radius = 0.7;
        if (data.category === 'apps') radius = 0.85;
        if (data.category === 'ai') radius = 0.75;
        if (data.category === 'cloud') radius = 0.8;
        if (data.category === 'content') radius = 0.7;

        const geo = new THREE.SphereGeometry(radius, 24, 24);
        const mat = new THREE.MeshPhongMaterial({
            color: data.color,
            emissive: data.color,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.6,
            shininess: 120,
        });
        const mesh = new THREE.Mesh(geo, mat);

        // Glow shell
        const glowGeo = new THREE.SphereGeometry(radius * 1.35, 24, 24);
        const glowMat = new THREE.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        mesh.add(glow);

        // Halo ring (hidden until hover)
        const ringGeo = new THREE.TorusGeometry(radius * 1.5, 0.03, 12, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);

        // Soft glow sprite
        const haloGeo = new THREE.PlaneGeometry(radius * 3.1, radius * 3.1);
        const haloMat = new THREE.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = -Math.PI / 2;
        mesh.add(halo);

        // Label sprite
        const label = createLabelSprite(data.label, data.color);
        label.position.set(0, 1.2, 0);
        mesh.add(label);

        mesh.userData = Object.assign({}, data, { ring: ring, halo: halo });
        return mesh;
    }

    function hexToColor(hex) {
        if (!hex) return null;
        const clean = hex.replace('#', '');
        const num = parseInt(clean, 16);
        if (Number.isNaN(num)) return null;
        return num;
    }

    function isValidUrl(url) {
        return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
    }

    function buildNodesFromProjects(data) {
        const nodes = [];

        function addItems(list, category, fallbackColor) {
            if (!Array.isArray(list)) return;
            list.forEach(function (item) {
                if (!item || !isValidUrl(item.url)) return;
                nodes.push({
                    label: item.name,
                    url: item.url,
                    desc: item.description || item.subtitle || '',
                    color: hexToColor(item.color) || fallbackColor,
                    category: category,
                    icon: item.icon
                });
            });
        }

        addItems(data.liveDemos, 'apps', 0x00d4ff);
        addItems(data.apps, 'apps', 0x00d4ff);
        addItems(data.workshops, 'ai', 0xa855f7);
        addItems(data.articles, 'content', 0xf472b6);
        addItems(data.socialLinks, 'content', 0xf472b6);

        nodes.push({ label: 'Chat', action: 'chat', color: 0xa855f7, desc: 'Open the AI assistant', category: 'ai', icon: 'fas fa-robot' });
        nodes.push({ label: 'Contact', action: 'contact', color: 0xf472b6, desc: 'Email or schedule a call', category: 'content', icon: 'fas fa-envelope' });

        return nodes.length ? nodes : NAV_NODES;
    }

    function loadProjectNodes() {
        fetch('projects.json')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                const nodes = buildNodesFromProjects(data);
                rebuildNavHub(nodes);
            })
            .catch(function () {
                emitHubData();
            });
    }

    function createLabelSprite(text, color) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const paddingX = 18;
        const paddingY = 10;
        const fontSize = 26;
        ctx.font = '600 ' + fontSize + 'px "IBM Plex Mono", monospace';
        const textWidth = ctx.measureText(text).width;
        canvas.width = textWidth + paddingX * 2;
        canvas.height = fontSize + paddingY * 2;
        ctx.font = '600 ' + fontSize + 'px "IBM Plex Mono", monospace';
        ctx.fillStyle = 'rgba(10,14,26,0.65)';
        ctx.strokeStyle = 'rgba(0,212,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 12);
        } else {
            const r = 12;
            const w = canvas.width - 8;
            const h = canvas.height - 8;
            const x = 4, y = 4;
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
        }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        ctx.textBaseline = 'middle';
        ctx.fillText(text, paddingX, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        const scale = 0.035;
        sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
        return sprite;
    }

    function updateHubUI(node) {
        const nameEl = document.getElementById('hub-name');
        const descEl = document.getElementById('hub-desc');
        const metaEl = document.getElementById('hub-meta');
        const linkEl = document.getElementById('hub-open');

        if (!nameEl || !descEl || !linkEl) return;

        if (!node) {
            nameEl.textContent = 'Hover a node to begin';
            descEl.textContent = 'This 3D galaxy is your navigation layer — each orb is a destination.';
            if (metaEl) metaEl.textContent = 'Category: Apps & Demos';
            linkEl.href = 'https://sap-landscape-digital-twin.amit-lal.com/';
            linkEl.target = '_blank';
            linkEl.onclick = null;
            return;
        }

        nameEl.textContent = node.userData.label;
        descEl.textContent = node.userData.desc || 'Click to open destination.';
        if (metaEl) {
            const cat = CATEGORY_MAP[node.userData.category] || { label: 'General', color: '#8892a8' };
            metaEl.textContent = 'Category: ' + cat.label;
        }
        if (node.userData.url) {
            linkEl.href = node.userData.url;
            linkEl.target = '_blank';
            linkEl.textContent = 'Open ' + node.userData.label;
            linkEl.onclick = null;
        } else {
            linkEl.removeAttribute('href');
            linkEl.removeAttribute('target');
            linkEl.textContent = 'Run ' + node.userData.label;
            linkEl.onclick = function (e) {
                e.preventDefault();
                handleNodeAction(node);
            };
        }
    }

    function updateTooltip(node) {
        const tip = document.getElementById('node-tooltip');
        const tTitle = document.getElementById('node-tooltip-title');
        const tDesc = document.getElementById('node-tooltip-desc');
        const tMeta = document.getElementById('node-tooltip-meta');
        if (!tip || !tTitle || !tDesc || !tMeta) return;

        if (!node) {
            tip.classList.remove('active');
            return;
        }

        const cat = CATEGORY_MAP[node.userData.category] || { label: 'General', color: '#8892a8' };
        tTitle.textContent = node.userData.label;
        tDesc.textContent = node.userData.desc || 'Click to open destination.';
        tMeta.textContent = cat.label;
        tMeta.style.color = cat.color;

        tip.style.left = lastMouse.x + 'px';
        tip.style.top = lastMouse.y + 'px';
        tip.classList.add('active');
    }

    function handleNodeAction(node) {
        if (!node) return;
        activeNode = node;

        if (node.userData.action === 'contact') {
            const modal = document.getElementById('contact-modal');
            if (modal) modal.classList.add('active');
            return;
        }
        if (node.userData.action === 'chat') {
            const chat = document.getElementById('ai-chat-window');
            if (chat) chat.classList.add('active');
            return;
        }
        if (node.userData.url) {
            window.open(node.userData.url, '_blank');
        }
    }

    // ─── Glowing Spheres ──────────────────────────────────────────────
    function createSpheres() {
        const count = isMobile() ? Math.floor(CONFIG.spheres.count * 0.6) : CONFIG.spheres.count;

        for (let i = 0; i < count; i++) {
            const radius = CONFIG.spheres.minRadius + Math.random() * (CONFIG.spheres.maxRadius - CONFIG.spheres.minRadius);
            const color = CONFIG.spheres.colors[Math.floor(Math.random() * CONFIG.spheres.colors.length)];
            const segments = radius > 1.2 ? 32 : (radius > 0.6 ? 24 : 16);

            // Main sphere — glass-like
            const geometry = new THREE.SphereGeometry(radius, segments, segments);
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.15,
                transparent: true,
                opacity: 0.35 + Math.random() * 0.25,
                shininess: 100,
                specular: 0xffffff,
                depthWrite: false,
            });
            const mesh = new THREE.Mesh(geometry, material);

            // Random position in a sphere spread
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const dist = 3 + Math.random() * CONFIG.spheres.spread;
            mesh.position.set(
                dist * Math.sin(phi) * Math.cos(theta),
                dist * Math.sin(phi) * Math.sin(theta),
                dist * Math.cos(phi) - 10
            );

            // Glow shell
            const glowGeometry = new THREE.SphereGeometry(radius * 1.4, segments, segments);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.06 + (radius / CONFIG.spheres.maxRadius) * 0.06,
                side: THREE.BackSide,
                depthWrite: false,
            });
            const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            mesh.add(glowMesh);

            // Inner bright core
            if (radius > 0.8) {
                const coreGeo = new THREE.SphereGeometry(radius * 0.25, 12, 12);
                const coreMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.4,
                    depthWrite: false,
                });
                const coreMesh = new THREE.Mesh(coreGeo, coreMat);
                mesh.add(coreMesh);
            }

            // Store orbit data
            mesh.userData = {
                orbitRadius: dist,
                orbitSpeed: (0.3 + Math.random() * 0.7) * CONFIG.spheres.orbitSpeed * (Math.random() > 0.5 ? 1 : -1),
                floatOffset: Math.random() * Math.PI * 2,
                floatSpeed: 0.3 + Math.random() * 0.5,
                theta: theta,
                phi: phi,
                baseY: mesh.position.y,
                pulsePhase: Math.random() * Math.PI * 2,
            };

            scene.add(mesh);
            sphereMeshes.push(mesh);
        }
    }

    // ─── Starfield ────────────────────────────────────────────────────
    function createStarfield() {
        const count = isMobile() ? Math.floor(CONFIG.stars * 0.4) : CONFIG.stars;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 150;
            positions[i3 + 1] = (Math.random() - 0.5) * 150;
            positions[i3 + 2] = (Math.random() - 0.5) * 150;
            sizes[i] = Math.random() * 2 + 0.5;

            // Slight color variation: white to cyan to pale blue
            const tone = Math.random();
            colors[i3] = 0.7 + tone * 0.3;
            colors[i3 + 1] = 0.8 + tone * 0.2;
            colors[i3 + 2] = 0.9 + tone * 0.1;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.18,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            sizeAttenuation: true,
        });

        starField = new THREE.Points(geometry, material);
        scene.add(starField);
    }

    function createStarClusters() {
        const layers = CONFIG.clusters;
        for (let i = 0; i < layers; i++) {
            const count = isMobile() ? 600 : 1200;
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);

            const radius = 40 + i * 25;
            for (let j = 0; j < count; j++) {
                const i3 = j * 3;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = radius + (Math.random() - 0.5) * 10;
                positions[i3] = r * Math.sin(phi) * Math.cos(theta);
                positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i3 + 2] = r * Math.cos(phi);

                const tone = 0.6 + Math.random() * 0.4;
                colors[i3] = tone * 0.7;
                colors[i3 + 1] = tone * 0.85;
                colors[i3 + 2] = tone;
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({
                size: 0.12 + i * 0.02,
                vertexColors: true,
                transparent: true,
                opacity: 0.5 - i * 0.08,
                depthWrite: false,
            });

            const cluster = new THREE.Points(geometry, material);
            cluster.rotation.x = Math.random() * Math.PI;
            cluster.rotation.y = Math.random() * Math.PI;
            starClusters.push(cluster);
            scene.add(cluster);
        }
    }

    // ─── Nebula Glow Backdrop ───────────────────────────────────────
    function createNebula() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512; canvas.height = 512;

        const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
        grad.addColorStop(0, 'rgba(0,212,255,0.25)');
        grad.addColorStop(0.4, 'rgba(168,85,247,0.18)');
        grad.addColorStop(0.75, 'rgba(59,130,246,0.08)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const geo = new THREE.PlaneGeometry(80, 80);
        const nebula = new THREE.Mesh(geo, mat);
        nebula.position.set(0, 0, -35);
        scene.add(nebula);
    }

    // ─── Distant Milky Way Galaxy ─────────────────────────────────────
    function createMilkyWay() {
        var milkyGroup = new THREE.Group();
        milkyGroup.name = 'MilkyWay';

        // ── 1. Spiral-arm particle disk ──
        var armCount = 4;
        var particlesPerArm = isMobile() ? 1800 : 4500;
        var totalParticles = armCount * particlesPerArm;
        var positions = new Float32Array(totalParticles * 3);
        var colors = new Float32Array(totalParticles * 3);
        var sizes = new Float32Array(totalParticles);

        var galaxyRadius = 140;
        var armSpread = 0.45;        // radial scatter
        var heightSpread = 3.5;      // disk thickness
        var tightness = 1.1;         // spiral tightness

        var idx = 0;
        for (var a = 0; a < armCount; a++) {
            var armAngle = (a / armCount) * Math.PI * 2;
            for (var p = 0; p < particlesPerArm; p++) {
                var t = Math.pow(Math.random(), 0.7);   // denser near center
                var r = t * galaxyRadius;
                var spinAngle = armAngle + t * Math.PI * tightness * 2;

                // Scatter from the ideal arm curve
                var randR = (Math.random() - 0.5) * armSpread * r * 0.35;
                var randA = (Math.random() - 0.5) * armSpread * 0.9;

                var x = (r + randR) * Math.cos(spinAngle + randA);
                var z = (r + randR) * Math.sin(spinAngle + randA);
                var y = (Math.random() - 0.5) * heightSpread * (1 - t * 0.6);

                positions[idx * 3]     = x;
                positions[idx * 3 + 1] = y;
                positions[idx * 3 + 2] = z;

                // Color: warm white core → cool blue/purple arms
                var coreness = 1 - t;
                var armTone = Math.random() * 0.15;
                colors[idx * 3]     = 0.55 + coreness * 0.4 + armTone;      // R
                colors[idx * 3 + 1] = 0.55 + coreness * 0.35;               // G
                colors[idx * 3 + 2] = 0.70 + coreness * 0.25 + armTone;     // B

                sizes[idx] = (0.15 + Math.random() * 0.35) * (1 + coreness * 1.5);
                idx++;
            }
        }

        var spiralGeo = new THREE.BufferGeometry();
        spiralGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        spiralGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        spiralGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        var spiralMat = new THREE.PointsMaterial({
            size: 0.25,
            vertexColors: true,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
        });

        var spiralPoints = new THREE.Points(spiralGeo, spiralMat);
        milkyGroup.add(spiralPoints);

        // ── 2. Bright galactic core glow ──
        var coreCanvas = document.createElement('canvas');
        var coreCtx = coreCanvas.getContext('2d');
        coreCanvas.width = 256; coreCanvas.height = 256;

        var coreGrad = coreCtx.createRadialGradient(128, 128, 2, 128, 128, 128);
        coreGrad.addColorStop(0, 'rgba(255,240,220,0.9)');
        coreGrad.addColorStop(0.08, 'rgba(255,220,180,0.6)');
        coreGrad.addColorStop(0.25, 'rgba(200,170,255,0.3)');
        coreGrad.addColorStop(0.55, 'rgba(100,130,255,0.1)');
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        coreCtx.fillStyle = coreGrad;
        coreCtx.fillRect(0, 0, 256, 256);

        var coreTex = new THREE.CanvasTexture(coreCanvas);
        var corePlaneMat = new THREE.MeshBasicMaterial({
            map: coreTex,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        var corePlane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), corePlaneMat);
        milkyGroup.add(corePlane);

        // ── 3. Faint dust-lane haze (wider glow) ──
        var dustCanvas = document.createElement('canvas');
        var dustCtx = dustCanvas.getContext('2d');
        dustCanvas.width = 512; dustCanvas.height = 128;

        var dustGrad = dustCtx.createLinearGradient(0, 0, 512, 0);
        dustGrad.addColorStop(0, 'rgba(0,0,0,0)');
        dustGrad.addColorStop(0.15, 'rgba(60,80,140,0.12)');
        dustGrad.addColorStop(0.35, 'rgba(100,120,200,0.18)');
        dustGrad.addColorStop(0.5, 'rgba(140,130,210,0.22)');
        dustGrad.addColorStop(0.65, 'rgba(100,120,200,0.18)');
        dustGrad.addColorStop(0.85, 'rgba(60,80,140,0.12)');
        dustGrad.addColorStop(1, 'rgba(0,0,0,0)');
        dustCtx.fillStyle = dustGrad;
        dustCtx.fillRect(0, 0, 512, 128);

        // Vertical fade
        var vGrad = dustCtx.createLinearGradient(0, 0, 0, 128);
        vGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vGrad.addColorStop(0.35, 'rgba(0,0,0,0.15)');
        vGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        vGrad.addColorStop(0.65, 'rgba(0,0,0,0.15)');
        vGrad.addColorStop(1, 'rgba(0,0,0,0)');
        dustCtx.globalCompositeOperation = 'destination-in';
        dustCtx.fillStyle = vGrad;
        dustCtx.fillRect(0, 0, 512, 128);
        dustCtx.globalCompositeOperation = 'source-over';

        var dustTex = new THREE.CanvasTexture(dustCanvas);
        var dustMat = new THREE.MeshBasicMaterial({
            map: dustTex,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
        });
        var dustPlane = new THREE.Mesh(new THREE.PlaneGeometry(300, 50), dustMat);
        milkyGroup.add(dustPlane);

        // ── Position: far behind the main scene, tilted like a real galaxy ──
        milkyGroup.position.set(0, 15, -220);
        milkyGroup.rotation.x = -0.35;     // tilt so we see it at an angle
        milkyGroup.rotation.z = 0.25;      // slight roll for realism
        milkyGroup.rotation.y = 0.4;

        milkyGroup.userData.rotSpeed = 0.003;
        scene.add(milkyGroup);
    }

    function createGlowPlanes() {
        const colors = [0x00d4ff, 0xa855f7, 0x3b82f6];
        for (let i = 0; i < colors.length; i++) {
            const planeGeo = new THREE.PlaneGeometry(30, 30);
            const mat = new THREE.MeshBasicMaterial({
                color: colors[i],
                transparent: true,
                opacity: 0.08,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            const plane = new THREE.Mesh(planeGeo, mat);
            plane.position.set((i - 1) * 12, (i - 1) * 6, -10 - i * 6);
            plane.rotation.z = Math.random();
            glowPlanes.push(plane);
            scene.add(plane);
        }
    }

    // ─── Orbital Rings ────────────────────────────────────────────────
    function createOrbitalRings() {
        const ringConfigs = [
            { radius: 12, tube: 0.02, color: 0x00d4ff, opacity: 0.08, tiltX: 0.4, tiltZ: 0.2 },
            { radius: 18, tube: 0.015, color: 0xa855f7, opacity: 0.06, tiltX: -0.3, tiltZ: 0.5 },
            { radius: 24, tube: 0.01, color: 0x22b8ff, opacity: 0.04, tiltX: 0.6, tiltZ: -0.3 },
            { radius: 8, tube: 0.025, color: 0x06b6d4, opacity: 0.1, tiltX: -0.5, tiltZ: 0.1 },
        ];

        ringConfigs.forEach(function (cfg) {
            const geometry = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
            const material = new THREE.MeshBasicMaterial({
                color: cfg.color,
                transparent: true,
                opacity: cfg.opacity,
                side: THREE.DoubleSide,
                depthWrite: false,
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = Math.PI / 2 + cfg.tiltX;
            ring.rotation.z = cfg.tiltZ;
            ring.userData.rotSpeed = 0.001 + Math.random() * 0.002;
            scene.add(ring);
            ringMeshes.push(ring);
        });
    }

    // ─── Connection Lines Between Spheres ─────────────────────────────
    function createConnectionLines() {
        const material = new THREE.LineBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: CONFIG.connections.lineOpacity,
            depthWrite: false,
        });

        const geometry = new THREE.BufferGeometry();
        // Pre-allocate max possible lines
        const maxLines = CONFIG.spheres.count * (CONFIG.spheres.count - 1) / 2;
        const positions = new Float32Array(maxLines * 6);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);

        connectionLines = new THREE.LineSegments(geometry, material);
        scene.add(connectionLines);
    }

    function updateConnections() {
        const positions = connectionLines.geometry.attributes.position.array;
        let vertexIdx = 0;

        for (let i = 0; i < sphereMeshes.length; i++) {
            for (let j = i + 1; j < sphereMeshes.length; j++) {
                const a = sphereMeshes[i].position;
                const b = sphereMeshes[j].position;
                const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < CONFIG.connections.maxDistance) {
                    positions[vertexIdx++] = a.x;
                    positions[vertexIdx++] = a.y;
                    positions[vertexIdx++] = a.z;
                    positions[vertexIdx++] = b.x;
                    positions[vertexIdx++] = b.y;
                    positions[vertexIdx++] = b.z;
                }
            }
        }

        connectionLines.geometry.setDrawRange(0, vertexIdx / 3);
        connectionLines.geometry.attributes.position.needsUpdate = true;
    }

    // ─── Mouse Interaction ────────────────────────────────────────────
    function onMouseMove(e) {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        lastMouse.x = e.clientX;
        lastMouse.y = e.clientY;
        updatePointer(e.clientX, e.clientY);
        if (!dragActive) updateHover();
    }

    function onTouchMove(e) {
        if (e.touches.length === 1) {
            mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            mouseY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
            updateHover();
            lastPinchDist = null;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastPinchDist !== null) {
                const delta = lastPinchDist - dist;
                zoomTarget = Math.max(CONFIG.camera.minZ, Math.min(CONFIG.camera.maxZ, zoomTarget + delta * 0.02));
            }
            lastPinchDist = dist;
        }
    }

    function onWheel(e) {
        if (!camera) return;
        e.preventDefault();
        // Proportional zoom — bigger steps when far, finer when close
        const closeness = (camera.position.z - CONFIG.camera.minZ) / (CONFIG.camera.maxZ - CONFIG.camera.minZ);
        const speed = CONFIG.camera.zoomSpeed * (0.6 + closeness * 0.8);
        const delta = Math.sign(e.deltaY) * speed;
        zoomTarget = Math.max(CONFIG.camera.minZ, Math.min(CONFIG.camera.maxZ, zoomTarget + delta));
    }

    function onDragStart(e) {
        dragActive = true;
        updateTooltip(null);
        if (e.touches && e.touches.length) {
            lastDragX = e.touches[0].clientX;
            lastDragY = e.touches[0].clientY;
        } else {
            lastDragX = e.clientX;
            lastDragY = e.clientY;
        }
    }

    function onDragMove(e) {
        if (!dragActive) return;
        const x = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
        const y = e.touches && e.touches.length ? e.touches[0].clientY : e.clientY;
        const dx = x - lastDragX;
        const dy = y - lastDragY;
        lastDragX = x;
        lastDragY = y;

        dragRotY += dx * 0.0025;
        dragRotX += dy * 0.0025;
        dragRotX = Math.max(-0.6, Math.min(0.6, dragRotX));
    }

    function onDragEnd() {
        dragActive = false;
    }

    function onClick(e) {
        if (!raycaster || !pointer) return;
        updatePointer(e.clientX, e.clientY);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(navMeshes, false);
        if (hits.length) {
            handleNodeAction(hits[0].object);
        }
    }

    function updatePointer(clientX, clientY) {
        if (!pointer || !renderer) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    function updateHover() {
        if (!raycaster || !pointer || !navMeshes.length) return;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(navMeshes.filter(function (n) { return n.visible; }), false);
        const canvas = renderer && renderer.domElement;

        if (hits.length) {
            const node = hits[0].object;
            if (hoveredNode !== node) {
                if (hoveredNode) setNodeHighlight(hoveredNode, false);
                hoveredNode = node;
                activeNode = node;
                setNodeHighlight(node, true);
                updateHubUI(node);
                updateTooltip(node);
            }
            if (canvas) canvas.style.cursor = 'pointer';
            if (hoveredNode) updateTooltip(hoveredNode);
        } else {
            if (hoveredNode) setNodeHighlight(hoveredNode, false);
            hoveredNode = null;
            updateHubUI(null);
            updateTooltip(null);
            if (canvas) canvas.style.cursor = '';
        }
    }

    function setNodeHighlight(node, active) {
        if (!node || !node.material) return;
        const scale = active ? 1.25 : 1;
        node.scale.set(scale, scale, scale);
        node.material.emissiveIntensity = active ? 0.45 : 0.2;
        if (node.userData.ring) {
            node.userData.ring.material.opacity = active ? 0.55 : 0.0;
        }
        if (node.userData.halo) {
            node.userData.halo.material.opacity = active ? 0.18 : 0.0;
        }
    }

    function startTour() {
        if (!navMeshes.length) return;
        tourActive = true;
        runTourStep();
        tourTimer = setInterval(runTourStep, 3500);
    }

    function stopTour() {
        tourActive = false;
        if (tourTimer) clearInterval(tourTimer);
        tourTimer = null;
        if (hoveredNode) setNodeHighlight(hoveredNode, false);
        hoveredNode = null;
        updateHubUI(null);
    }

    function runTourStep() {
        if (!navMeshes.length) return;
        const node = navMeshes[tourIndex % navMeshes.length];
        tourIndex++;
        if (hoveredNode) setNodeHighlight(hoveredNode, false);
        hoveredNode = node;
        activeNode = node;
        setNodeHighlight(node, true);
        updateHubUI(node);
        const dir = node.position.clone().normalize();
        targetCamPos = dir.multiplyScalar(22);
    }

    function getDefaultQuality() {
        if (isMobile()) return 'low';
        if (window.devicePixelRatio && window.devicePixelRatio >= 2) return 'high';
        return 'med';
    }

    function applyQuality(level) {
        qualityLevel = level;
        if (!renderer) return;

        if (level === 'low') {
            renderer.setPixelRatio(1);
            if (starField) starField.material.opacity = 0.5;
            starClusters.forEach(function (c) { c.visible = false; });
            glowPlanes.forEach(function (p) { p.visible = false; });
            if (orbitParticles) orbitParticles.visible = false;
        } else if (level === 'med') {
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            if (starField) starField.material.opacity = 0.7;
            starClusters.forEach(function (c, i) { c.visible = i < 2; });
            glowPlanes.forEach(function (p) { p.visible = true; });
            if (orbitParticles) orbitParticles.visible = true;
        } else {
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            if (starField) starField.material.opacity = 0.85;
            starClusters.forEach(function (c) { c.visible = true; });
            glowPlanes.forEach(function (p) { p.visible = true; });
            if (orbitParticles) orbitParticles.visible = true;
        }
    }

    // ─── Resize ───────────────────────────────────────────────────────
    function onResize() {
        if (!renderer || !camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ─── Animation Loop ──────────────────────────────────────────────
    function animate() {
        if (!running) return;
        animationId = requestAnimationFrame(animate);

        const elapsed = clock.getElapsedTime();

        // Smooth camera rotation following mouse
        targetRotY += (mouseX * CONFIG.mouse.influence - targetRotY) * 0.02;
        targetRotX += (mouseY * CONFIG.mouse.influence - targetRotX) * 0.02;

        // Auto orbit + mouse influence + manual drag
        scene.rotation.y = elapsed * CONFIG.camera.autoRotateSpeed + targetRotY * 30 + dragRotY;
        scene.rotation.x = Math.sin(elapsed * 0.05) * 0.08 + targetRotX * 15 + dragRotX;

        // Slow camera drift (digital twin vibe)
        if (camera) {
            const drift = CONFIG.camera.drift;
            camera.position.x = Math.sin(elapsed * 0.08) * drift;
            camera.position.y = Math.cos(elapsed * 0.06) * (drift * 0.6);
        }

        // Nav hub rotation + float
        if (navGroup) {
            navGroup.rotation.y = elapsed * CONFIG.navHub.rotateSpeed;
            for (let i = 0; i < navMeshes.length; i++) {
                const n = navMeshes[i];
                n.position.y = n.userData.baseY + Math.sin(elapsed * 0.8 + n.userData.floatPhase) * CONFIG.navHub.floatAmplitude;
            }
            if (orbitParticles) {
                orbitParticles.rotation.y += 0.0008;
                orbitParticles.rotation.x = Math.sin(elapsed * 0.2) * 0.1;
            }
        }

        // Animate spheres
        for (let i = 0; i < sphereMeshes.length; i++) {
            const s = sphereMeshes[i];
            const d = s.userData;

            // Orbit
            d.theta += d.orbitSpeed;

            // Float up/down
            s.position.y = d.baseY + Math.sin(elapsed * d.floatSpeed + d.floatOffset) * CONFIG.spheres.floatAmplitude;

            // Gentle X drift
            s.position.x += Math.sin(elapsed * 0.2 + d.floatOffset) * 0.002;

            // Pulse opacity
            if (s.material) {
                const pulse = Math.sin(elapsed * 1.5 + d.pulsePhase) * 0.05;
                s.material.emissiveIntensity = 0.15 + pulse;
            }

            // Slow self-rotation
            s.rotation.x += 0.001;
            s.rotation.y += 0.002;
        }

        // Rotate rings
        for (let i = 0; i < ringMeshes.length; i++) {
            ringMeshes[i].rotation.z += ringMeshes[i].userData.rotSpeed;
        }

        // Rotate starfield slowly
        if (starField) {
            starField.rotation.y += 0.00015;
            starField.rotation.x += 0.00005;
        }

        // Layered clusters drift
        if (starClusters.length) {
            for (let i = 0; i < starClusters.length; i++) {
                starClusters[i].rotation.y += 0.0001 + i * 0.00005;
                starClusters[i].rotation.x += 0.00005;
            }
        }

        // Glow planes pulse
        if (glowPlanes.length) {
            for (let i = 0; i < glowPlanes.length; i++) {
                glowPlanes[i].material.opacity = 0.06 + Math.sin(elapsed * 0.6 + i) * 0.03;
            }
        }

        // Distant Milky Way slow rotation
        var mw = scene.getObjectByName('MilkyWay');
        if (mw) {
            mw.rotation.y += mw.userData.rotSpeed * 0.01;
        }

        // Update connection lines
        if (CONFIG.navHub.backgroundSpheres && connectionLines) {
            updateConnections();
        }

        // Smooth zoom with snappier easing
        if (camera) {
            const zDiff = zoomTarget - camera.position.z;
            camera.position.z += zDiff * 0.1;
            // Subtle FOV shift: wider when zoomed out, tighter when close
            const zoomFraction = (camera.position.z - CONFIG.camera.minZ) / (CONFIG.camera.maxZ - CONFIG.camera.minZ);
            camera.fov = 55 + zoomFraction * 15;
            camera.updateProjectionMatrix();
        }

        // Camera focus
        if (targetCamPos) {
            camera.position.lerp(targetCamPos, 0.05);
            camera.lookAt(0, 0, 0);
            if (camera.position.distanceTo(targetCamPos) < 0.2) targetCamPos = null;
        }

        renderer.render(scene, camera);
    }

    // ─── Start / Stop ─────────────────────────────────────────────────
    function start() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;
        if (isReducedMode() || prefersReducedMotion()) {
            canvas.style.display = 'none';
            return;
        }
        canvas.style.display = 'block';
        if (!scene) {
            initUniverse('particle-canvas');
        } else {
            running = true;
            animate();
        }
    }

    function stop() {
        running = false;
        if (animationId) cancelAnimationFrame(animationId);
        const canvas = document.getElementById('particle-canvas');
        if (canvas) canvas.style.display = 'none';
    }

    // Expose for toggle
    window._particleSystem = { start, stop };

    // Expose nav hub focus
    window._navHub = {
        focusActiveNode: function () {
            if (!activeNode) return;
            const dir = activeNode.position.clone().normalize();
            targetCamPos = dir.multiplyScalar(22);
        },
        resetView: function () {
            dragRotX = 0;
            dragRotY = 0;
            zoomTarget = CONFIG.camera.z;
            if (camera) {
                camera.position.set(0, 0, CONFIG.camera.z);
            }
            if (navGroup) {
                navGroup.rotation.set(0, 0, 0);
            }
        },
        toggleTour: function () {
            if (tourActive) {
                stopTour();
                return false;
            }
            startTour();
            return true;
        },
        setQuality: function (level) {
            applyQuality(level || 'med');
            return qualityLevel;
        },
        getDefaultQuality: function () {
            return getDefaultQuality();
        },
        setCategory: function (category) {
            currentCategory = category;
            applyCategoryFilter();
            return currentCategory;
        },
        getVisibleNodes: function () {
            return navData.filter(function (n) { return !currentCategory || currentCategory === n.category; });
        },
        zoomIn: function () {
            zoomTarget = Math.max(CONFIG.camera.minZ, zoomTarget - CONFIG.camera.zoomSpeed * 2);
        },
        zoomOut: function () {
            zoomTarget = Math.min(CONFIG.camera.maxZ, zoomTarget + CONFIG.camera.zoomSpeed * 2);
        },
    };

    // ─── Effects Toggle ───────────────────────────────────────────────
    function initEffectsToggle(buttonId) {
        var btn = document.getElementById(buttonId);
        if (!btn) return;

        // Auto-reduce on prefers-reduced-motion
        if (prefersReducedMotion()) {
            document.body.classList.add('reduced-effects');
        }

        // Restore from localStorage
        if (localStorage.getItem('reducedEffects') === 'true') {
            document.body.classList.add('reduced-effects');
        }

        updateToggleLabel(btn);

        btn.addEventListener('click', function () {
            document.body.classList.toggle('reduced-effects');
            var isReduced = document.body.classList.contains('reduced-effects');
            localStorage.setItem('reducedEffects', isReduced);
            updateToggleLabel(btn);
            isReduced ? stop() : start();
        });

        function updateToggleLabel(b) {
            var reduced = document.body.classList.contains('reduced-effects');
            b.textContent = reduced ? '⚡' : '✨';
            b.title = reduced ? 'Enable 3D Universe' : 'Reduce Effects';
        }
    }

    // ─── 3D Tilt on Cards (mouse only, not mobile) ────────────────────
    function initTiltEffect(selectors) {
        if (isMobile() || prefersReducedMotion()) return;

        const elements = document.querySelectorAll(selectors);
        elements.forEach(function (el) {
            let current = { rx: 0, ry: 0 };
            let target = { rx: 0, ry: 0 };
            let ticking = false;

            el.addEventListener('mousemove', function (e) {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                target.ry = ((x - cx) / cx) * 8;
                target.rx = -((y - cy) / cy) * 8;

                if (!ticking) {
                    ticking = true;
                    requestAnimationFrame(function lerpTilt() {
                        current.rx += (target.rx - current.rx) * 0.08;
                        current.ry += (target.ry - current.ry) * 0.08;
                        el.style.transform = 'perspective(1000px) rotateX(' + current.rx + 'deg) rotateY(' + current.ry + 'deg) translateZ(20px)';
                        if (Math.abs(target.rx - current.rx) > 0.01 || Math.abs(target.ry - current.ry) > 0.01) {
                            requestAnimationFrame(lerpTilt);
                        } else ticking = false;
                    });
                }
            });

            el.addEventListener('mouseleave', function () {
                target.rx = 0; target.ry = 0;
                if (!ticking) {
                    ticking = true;
                    requestAnimationFrame(function reset() {
                        current.rx += (0 - current.rx) * 0.08;
                        current.ry += (0 - current.ry) * 0.08;
                        el.style.transform = 'perspective(1000px) rotateX(' + current.rx + 'deg) rotateY(' + current.ry + 'deg)';
                        if (Math.abs(current.rx) > 0.01 || Math.abs(current.ry) > 0.01) {
                            requestAnimationFrame(reset);
                        } else { el.style.transform = ''; ticking = false; }
                    });
                }
            });
        });
    }

    // ─── Initialize on DOM Ready ──────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        start();
        initTiltEffect('.profile-card, .demo-card, .achievement-card, .case-study-card, .stat-card, .spotlight-section');
        applyQuality(getDefaultQuality());
    });

})();
