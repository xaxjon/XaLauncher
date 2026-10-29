(() => {
    'use strict';

    const STORAGE_KEY = 'xaops.settings.v2';
    const SETUP_PASSWORD = 'admin123';
    const MAX_TASKS = 4;
    const ICONS = ['wifi', 'pos', 'slides', 'navigation', 'weather', 'flight', 'communications', 'support', 'globe', 'tools', 'link', 'grid', 'cctv', 'server'];
    const AVAILABLE_ICONS = new Set([...ICONS, 'arrow', 'edit', 'plus', 'close']);
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const defaults = {
        functions: [
            { title: 'Hotel & Gangway Operations', description: 'Paxman PMS, POS, guest manifests and SOLAS gangway tracking.', url: 'https://xaxero.com/Ship-Comms.html', icon: 'pos' },
            { title: 'Guest Wi-Fi Control', description: 'XaWiFi captive portal, guest access and session management.', url: 'https://xaxero.com/Ship-Comms.html', icon: 'wifi' },
            { title: 'Staff Network Monitoring', description: 'Staff quota enforcement and Starlink/FX bandwidth tracking.', url: 'https://xaxero.com/Ship-Comms.html', icon: 'communications' },
            { title: 'Digital Signage Management', description: 'Manage content across all seven public display screens.', url: 'https://xaxero.com/slides.html', icon: 'slides' },
            { title: 'Internal CCTV (Hotel)', description: 'Dewarped XaCamView feeds for interior hotel zones.', url: 'https://xaxero.com', icon: 'cctv' },
            { title: 'External CCTV (Bridge)', description: 'Dewarped feeds for exterior decks and navigation monitoring.', url: 'https://xaxero.com', icon: 'cctv' }
        ],
        tasks: [
            { title: 'Server status', description: '', url: 'https://xaxero.com', icon: 'server' }
        ]
    };

    const functionGrid = document.getElementById('functionGrid');
    const specialTasks = document.getElementById('specialTasks');
    const setupToggle = document.getElementById('setupToggle');
    const setupDialog = document.getElementById('setupDialog');
    const setupForm = document.getElementById('setupForm');
    const setupPassword = document.getElementById('setupPassword');
    const passwordError = document.getElementById('passwordError');
    const menuLabel = document.getElementById('menuLabel');
    const introEyebrow = document.getElementById('introEyebrow');
    const pageTitle = document.getElementById('pageTitle');
    const introCopy = document.getElementById('introCopy');
    const resetButton = document.getElementById('resetButton');
    const editorDialog = document.getElementById('editorDialog');
    const editorForm = document.getElementById('editorForm');
    const editorKind = document.getElementById('editorKind');
    const editorTitle = document.getElementById('editorTitle');
    const itemTitle = document.getElementById('itemTitle');
    const itemDescription = document.getElementById('itemDescription');
    const itemUrl = document.getElementById('itemUrl');
    const descriptionField = document.getElementById('descriptionField');
    const urlError = document.getElementById('urlError');
    const iconOptions = document.getElementById('iconOptions');
    const deleteTask = document.getElementById('deleteTask');
    const toast = document.getElementById('toast');

    let setupMode = false;
    let editing = null;
    let toastTimer;
    let state = loadState();

    function freshDefaults() {
        return JSON.parse(JSON.stringify(defaults));
    }

    function normalizeUrl(value) {
        try {
            const url = new URL(String(value).trim());
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
            return url.href;
        } catch {
            return null;
        }
    }

    function cleanText(value, fallback, maximum) {
        if (typeof value !== 'string') return fallback;
        return value.trim().slice(0, maximum) || fallback;
    }

    function cleanItem(value, fallback, isFunction) {
        const item = value && typeof value === 'object' ? value : {};
        return {
            title: cleanText(item.title, fallback.title, isFunction ? 40 : 28),
            description: isFunction ? cleanText(item.description, fallback.description, 120) : '',
            url: normalizeUrl(item.url) || fallback.url,
            icon: ICONS.includes(item.icon) ? item.icon : fallback.icon
        };
    }

    function cleanState(value) {
        const fallback = freshDefaults();
        if (!value || typeof value !== 'object') return fallback;
        const sourceFunctions = Array.isArray(value.functions) ? value.functions : [];
        const sourceTasks = Array.isArray(value.tasks) ? value.tasks : fallback.tasks;
        return {
            functions: fallback.functions.map((item, index) => cleanItem(sourceFunctions[index], item, true)),
            tasks: sourceTasks.slice(0, MAX_TASKS).map((item, index) => cleanItem(item, fallback.tasks[index] || { title: 'Special task', description: '', url: 'https://xaxero.com', icon: 'link' }, false))
        };
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? cleanState(JSON.parse(saved)) : freshDefaults();
        } catch {
            return freshDefaults();
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch {
            return false;
        }
    }

    function makeIcon(name) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        const use = document.createElementNS(SVG_NS, 'use');
        svg.setAttribute('aria-hidden', 'true');
        use.setAttribute('href', `#icon-${AVAILABLE_ICONS.has(name) ? name : 'link'}`);
        svg.append(use);
        return svg;
    }

    function makeElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function hostFor(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return 'Web page';
        }
    }

    function createFunctionCard(item, index) {
        const card = document.createElement(setupMode ? 'button' : 'a');
        card.className = 'function-card';
        card.dataset.functionIndex = String(index);
        card.setAttribute('aria-label', setupMode ? `Edit ${item.title}` : `Launch ${item.title} in a new tab`);
        if (setupMode) {
            card.type = 'button';
            card.addEventListener('click', () => openEditor('function', index));
        } else {
            card.href = item.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
        }

        const top = makeElement('div', 'card-top');
        const icon = makeElement('span', 'card-icon');
        icon.append(makeIcon(item.icon));
        const action = makeElement('span', 'card-action');
        action.append(makeElement('span', 'card-number', String(index + 1).padStart(2, '0')));
        if (setupMode) action.append(makeElement('span', 'edit-label', 'Edit'));
        action.append(makeIcon(setupMode ? 'edit' : 'arrow'));
        top.append(icon, action);

        const footer = makeElement('div', 'card-footer');
        footer.append(makeElement('span', 'card-host', setupMode ? 'Select to configure' : hostFor(item.url)));
        card.append(top, makeElement('h2', '', item.title), makeElement('p', 'card-description', item.description), footer);
        return card;
    }

    function createTaskButton(item, index) {
        const task = document.createElement(setupMode ? 'button' : 'a');
        task.className = 'special-task';
        task.dataset.taskIndex = String(index);
        task.setAttribute('aria-label', setupMode ? `Edit ${item.title}` : `Launch ${item.title} in a new tab`);
        if (setupMode) {
            task.type = 'button';
            task.addEventListener('click', () => openEditor('task', index));
        } else {
            task.href = item.url;
            task.target = '_blank';
            task.rel = 'noopener noreferrer';
        }
        task.append(makeIcon(setupMode ? 'edit' : item.icon), makeElement('span', '', item.title));
        return task;
    }

    function renderFunctions() {
        const fragment = document.createDocumentFragment();
        state.functions.forEach((item, index) => fragment.append(createFunctionCard(item, index)));
        functionGrid.replaceChildren(fragment);
    }

    function renderTasks() {
        const fragment = document.createDocumentFragment();
        state.tasks.forEach((item, index) => fragment.append(createTaskButton(item, index)));
        if (!state.tasks.length) fragment.append(makeElement('p', 'empty-tasks', setupMode ? 'Add your first special task' : 'No special tasks configured'));
        if (setupMode && state.tasks.length < MAX_TASKS) {
            const add = makeElement('button', 'add-task');
            add.type = 'button';
            add.id = 'addTask';
            add.append(makeIcon('plus'), makeElement('span', '', 'Add task'));
            add.addEventListener('click', () => openEditor('task', -1));
            fragment.append(add);
        }
        specialTasks.replaceChildren(fragment);
    }

    function renderMode() {
        document.body.classList.toggle('setup-mode', setupMode);
        setupToggle.setAttribute('aria-pressed', String(setupMode));
        setupToggle.setAttribute('aria-label', setupMode ? 'Finish setup' : 'Enter setup mode');
        menuLabel.textContent = setupMode ? 'Done' : 'Setup';
        resetButton.hidden = !setupMode;

        const eyebrowLine = makeElement('span');
        eyebrowLine.setAttribute('aria-hidden', 'true');
        introEyebrow.replaceChildren(eyebrowLine, document.createTextNode(setupMode ? 'Workspace setup' : 'Xaxero Shipboard Operations Suite'));
        pageTitle.replaceChildren(document.createTextNode(setupMode ? 'Make this workspace ' : 'Shipboard operations. '));
        pageTitle.append(makeElement('span', '', setupMode ? 'yours.' : 'One launch point.'));
        introCopy.textContent = setupMode
            ? 'Select any business function or special task to edit its details. Changes are saved on this device.'
            : 'Hotel, network, signage and camera systems, organised for the working ship.';
    }

    function renderAll() {
        renderMode();
        renderFunctions();
        renderTasks();
    }

    function renderIconOptions(selected) {
        const fragment = document.createDocumentFragment();
        ICONS.forEach((name) => {
            const label = makeElement('label', 'icon-option');
            label.title = `${name.charAt(0).toUpperCase()}${name.slice(1)} icon`;
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'icon';
            input.value = name;
            input.checked = name === selected;
            input.setAttribute('aria-label', label.title);
            label.append(input, makeIcon(name));
            fragment.append(label);
        });
        iconOptions.replaceChildren(fragment);
    }

    function openEditor(kind, index) {
        const isNew = kind === 'task' && index === -1;
        const item = isNew
            ? { title: '', description: '', url: '', icon: 'link' }
            : state[kind === 'function' ? 'functions' : 'tasks'][index];
        if (!item) return;

        editing = { kind, index };
        editorKind.textContent = kind === 'function' ? 'Business function' : 'Special task';
        editorTitle.textContent = isNew ? 'Add special task' : `Edit ${item.title}`;
        itemTitle.value = item.title;
        itemTitle.maxLength = kind === 'function' ? 40 : 28;
        itemDescription.value = item.description;
        itemDescription.required = kind === 'function';
        descriptionField.hidden = kind !== 'function';
        itemUrl.value = item.url;
        itemUrl.removeAttribute('aria-invalid');
        urlError.hidden = true;
        deleteTask.hidden = kind !== 'function' && !isNew ? false : true;
        renderIconOptions(item.icon);
        editorDialog.showModal();
        requestAnimationFrame(() => {
            itemTitle.focus();
            if (isNew) itemTitle.select();
        });
    }

    function closeEditor() {
        if (editorDialog.open) editorDialog.close();
    }

    function showToast(message) {
        clearTimeout(toastTimer);
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = setTimeout(() => {
            toast.hidden = true;
        }, 3200);
    }

    setupToggle.addEventListener('click', () => {
        if (setupMode) {
            setupMode = false;
            renderAll();
            return;
        }
        setupPassword.value = '';
        setupPassword.removeAttribute('aria-invalid');
        passwordError.hidden = true;
        setupDialog.showModal();
        requestAnimationFrame(() => setupPassword.focus());
    });

    setupForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (setupPassword.value !== SETUP_PASSWORD) {
            setupPassword.setAttribute('aria-invalid', 'true');
            passwordError.hidden = false;
            setupPassword.focus();
            setupPassword.select();
            return;
        }
        setupDialog.close();
        setupMode = true;
        renderAll();
    });

    setupPassword.addEventListener('input', () => {
        setupPassword.removeAttribute('aria-invalid');
        passwordError.hidden = true;
    });

    document.getElementById('closeSetupDialog').addEventListener('click', () => setupDialog.close());
    document.getElementById('cancelSetup').addEventListener('click', () => setupDialog.close());

    resetButton.addEventListener('click', () => {
        if (!window.confirm('Restore all business functions and special tasks to their defaults?')) return;
        state = freshDefaults();
        saveState();
        renderAll();
        showToast('Default workspace restored');
    });

    editorForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!editing || !editorForm.checkValidity()) {
            editorForm.reportValidity();
            return;
        }

        const url = normalizeUrl(itemUrl.value);
        if (!url) {
            itemUrl.setAttribute('aria-invalid', 'true');
            urlError.hidden = false;
            itemUrl.focus();
            return;
        }

        const selectedIcon = new FormData(editorForm).get('icon');
        const item = {
            title: itemTitle.value.trim(),
            description: editing.kind === 'function' ? itemDescription.value.trim() : '',
            url,
            icon: ICONS.includes(selectedIcon) ? selectedIcon : 'link'
        };

        if (editing.kind === 'function') {
            state.functions[editing.index] = item;
        } else if (editing.index === -1) {
            if (state.tasks.length >= MAX_TASKS) return;
            state.tasks.push(item);
        } else {
            state.tasks[editing.index] = item;
        }

        const saved = saveState();
        const title = item.title;
        const selector = editing.kind === 'function'
            ? `[data-function-index="${editing.index}"]`
            : `[data-task-index="${state.tasks.indexOf(item)}"]`;
        renderAll();
        closeEditor();
        requestAnimationFrame(() => document.querySelector(selector)?.focus());
        showToast(saved ? `${title} saved` : `${title} updated for this session; browser storage is unavailable`);
    });

    itemUrl.addEventListener('input', () => {
        itemUrl.removeAttribute('aria-invalid');
        urlError.hidden = true;
    });

    document.getElementById('closeEditor').addEventListener('click', closeEditor);
    document.getElementById('cancelEdit').addEventListener('click', closeEditor);
    editorDialog.addEventListener('cancel', () => {
        editing = null;
    });
    editorDialog.addEventListener('click', (event) => {
        if (event.target !== editorDialog) return;
        const bounds = editorDialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeEditor();
    });

    deleteTask.addEventListener('click', () => {
        if (!editing || editing.kind !== 'task' || editing.index < 0) return;
        const title = state.tasks[editing.index].title;
        if (!window.confirm(`Remove the “${title}” special task?`)) return;
        state.tasks.splice(editing.index, 1);
        saveState();
        renderAll();
        closeEditor();
        setupToggle.focus();
        showToast(`${title} removed`);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && setupMode && !editorDialog.open) {
            setupMode = false;
            renderAll();
            setupToggle.focus();
        }
    });

    window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY || editorDialog.open) return;
        state = loadState();
        renderAll();
    });

    document.getElementById('copyrightYear').textContent = String(new Date().getFullYear());
    renderAll();
})();
