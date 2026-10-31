(() => {
    'use strict';

    const API_URL = 'api/config.php';
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
        ],
        content: {
            brandTitle: 'XaOps',
            brandSubtitle: 'Shipboard Operations Suite',
            eyebrow: 'Xaxero Shipboard Operations Suite',
            heading: 'Shipboard operations.',
            headingAccent: 'One launch point.',
            intro: 'Hotel, network, signage and camera systems, organised for the working ship.',
            status: 'Server-backed workspace',
            specialTasks: 'Special tasks',
            footer: 'Server saved. Ready when you are.'
        }
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
    const contentButton = document.getElementById('contentButton');
    const contentDialog = document.getElementById('contentDialog');
    const contentForm = document.getElementById('contentForm');
    const contentSaveError = document.getElementById('contentSaveError');
    const brandTitle = document.getElementById('brandTitle');
    const brandSubtitle = document.getElementById('brandSubtitle');
    const statusText = document.getElementById('statusText');
    const specialTasksLabel = document.getElementById('specialTasksLabel');
    const footerTagline = document.getElementById('footerTagline');
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
    let serverReady = false;
    let adminPassword = '';
    let saveInProgress = false;
    let state = freshDefaults();

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

    function cleanContent(value, fallback) {
        const content = value && typeof value === 'object' ? value : {};
        return {
            brandTitle: cleanText(content.brandTitle, fallback.brandTitle, 24),
            brandSubtitle: cleanText(content.brandSubtitle, fallback.brandSubtitle, 48),
            eyebrow: cleanText(content.eyebrow, fallback.eyebrow, 60),
            heading: cleanText(content.heading, fallback.heading, 60),
            headingAccent: cleanText(content.headingAccent, fallback.headingAccent, 60),
            intro: cleanText(content.intro, fallback.intro, 160),
            status: cleanText(content.status, fallback.status, 40),
            specialTasks: cleanText(content.specialTasks, fallback.specialTasks, 30),
            footer: cleanText(content.footer, fallback.footer, 80)
        };
    }

    function cleanState(value) {
        const fallback = freshDefaults();
        if (!value || typeof value !== 'object') return fallback;
        const sourceFunctions = Array.isArray(value.functions) ? value.functions : [];
        const sourceTasks = Array.isArray(value.tasks) ? value.tasks : fallback.tasks;
        return {
            functions: fallback.functions.map((item, index) => cleanItem(sourceFunctions[index], item, true)),
            tasks: sourceTasks.slice(0, MAX_TASKS).map((item, index) => cleanItem(item, fallback.tasks[index] || { title: 'Special task', description: '', url: 'https://xaxero.com', icon: 'link' }, false)),
            content: cleanContent(value.content, fallback.content)
        };
    }

    async function postConfig(action, password, config = null) {
        const body = { action, password };
        if (config !== null) body.config = config;
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body),
            cache: 'no-store'
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || `Server request failed (${response.status}).`);
        return payload;
    }

    async function loadState() {
        try {
            const response = await fetch(API_URL, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload) throw new Error(payload?.error || `Server request failed (${response.status}).`);
            state = cleanState(payload);
            serverReady = true;
            renderAll();
        } catch (error) {
            serverReady = false;
            showToast(`Configuration load failed: ${error.message}`);
        }
    }

    async function saveState(nextState) {
        const payload = await postConfig('save', adminPassword, nextState);
        state = cleanState(payload.config);
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
        contentButton.hidden = !setupMode;
        brandTitle.textContent = state.content.brandTitle;
        brandSubtitle.textContent = state.content.brandSubtitle;
        statusText.textContent = state.content.status;
        specialTasksLabel.textContent = state.content.specialTasks;
        footerTagline.textContent = state.content.footer;

        const eyebrowLine = makeElement('span');
        eyebrowLine.setAttribute('aria-hidden', 'true');
        introEyebrow.replaceChildren(eyebrowLine, document.createTextNode(setupMode ? 'Workspace setup' : state.content.eyebrow));
        pageTitle.replaceChildren(document.createTextNode(setupMode ? 'Make this workspace ' : `${state.content.heading} `));
        pageTitle.append(makeElement('span', '', setupMode ? 'yours.' : state.content.headingAccent));
        introCopy.textContent = setupMode
            ? 'Select a module, special task, or Page text. Changes are saved permanently on the server.'
            : state.content.intro;
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
        if (saveInProgress) {
            showToast('Please wait for the server save to finish.');
            return;
        }
        if (setupMode) {
            setupMode = false;
            adminPassword = '';
            renderAll();
            return;
        }
        if (!serverReady) {
            showToast('Server configuration is unavailable. Retrying…');
            loadState();
            return;
        }
        setupPassword.value = '';
        setupPassword.removeAttribute('aria-invalid');
        passwordError.hidden = true;
        setupDialog.showModal();
        requestAnimationFrame(() => setupPassword.focus());
    });

    setupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (saveInProgress) return;
        saveInProgress = true;
        const submitButton = setupForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
            const password = setupPassword.value;
            await postConfig('authenticate', password);
            adminPassword = password;
            setupDialog.close();
            setupMode = true;
            renderAll();
        } catch (error) {
            setupPassword.setAttribute('aria-invalid', 'true');
            passwordError.textContent = error.message;
            passwordError.hidden = false;
            setupPassword.focus();
            setupPassword.select();
        } finally {
            saveInProgress = false;
            submitButton.disabled = false;
        }
    });

    setupPassword.addEventListener('input', () => {
        setupPassword.removeAttribute('aria-invalid');
        passwordError.hidden = true;
    });

    document.getElementById('closeSetupDialog').addEventListener('click', () => setupDialog.close());
    document.getElementById('cancelSetup').addEventListener('click', () => setupDialog.close());

    contentButton.addEventListener('click', () => {
        if (saveInProgress) return;
        Object.entries(state.content).forEach(([field, value]) => {
            contentForm.elements.namedItem(field).value = value;
        });
        contentSaveError.hidden = true;
        contentDialog.showModal();
        requestAnimationFrame(() => contentForm.elements.namedItem('brandTitle').focus());
    });

    document.getElementById('closeContent').addEventListener('click', () => contentDialog.close());
    document.getElementById('cancelContent').addEventListener('click', () => contentDialog.close());
    contentDialog.addEventListener('cancel', (event) => {
        if (saveInProgress) event.preventDefault();
    });

    contentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (saveInProgress) return;
        if (!contentForm.checkValidity()) {
            contentForm.reportValidity();
            return;
        }
        const data = new FormData(contentForm);
        const content = {};
        Object.keys(state.content).forEach((field) => {
            content[field] = String(data.get(field)).trim();
        });
        const nextState = { functions: [...state.functions], tasks: [...state.tasks], content };
        const submitButton = contentForm.querySelector('button[type="submit"]');
        saveInProgress = true;
        submitButton.disabled = true;
        submitButton.textContent = 'Saving…';
        contentSaveError.hidden = true;
        try {
            await saveState(nextState);
            renderAll();
            contentDialog.close();
            showToast('Page text saved to the server');
        } catch (error) {
            contentSaveError.textContent = `Save failed: ${error.message}`;
            contentSaveError.hidden = false;
        } finally {
            saveInProgress = false;
            submitButton.disabled = false;
            submitButton.textContent = 'Save changes';
        }
    });

    resetButton.addEventListener('click', async () => {
        if (saveInProgress || !window.confirm('Restore all modules, special tasks, and page text to their defaults?')) return;
        saveInProgress = true;
        resetButton.disabled = true;
        try {
            await saveState(freshDefaults());
            renderAll();
            showToast('Default workspace restored on the server');
        } catch (error) {
            showToast(`Reset failed: ${error.message}`);
        } finally {
            saveInProgress = false;
            resetButton.disabled = false;
        }
    });

    editorForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (saveInProgress) return;
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

        const editContext = { ...editing };
        const selectedIcon = new FormData(editorForm).get('icon');
        const item = {
            title: itemTitle.value.trim(),
            description: editContext.kind === 'function' ? itemDescription.value.trim() : '',
            url,
            icon: ICONS.includes(selectedIcon) ? selectedIcon : 'link'
        };
        const nextState = { functions: [...state.functions], tasks: [...state.tasks], content: { ...state.content } };

        if (editContext.kind === 'function') {
            nextState.functions[editContext.index] = item;
        } else if (editContext.index === -1) {
            if (nextState.tasks.length >= MAX_TASKS) return;
            nextState.tasks.push(item);
        } else {
            nextState.tasks[editContext.index] = item;
        }

        saveInProgress = true;
        const submitButton = editorForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
            await saveState(nextState);
            const selector = editContext.kind === 'function'
                ? `[data-function-index="${editContext.index}"]`
                : `[data-task-index="${nextState.tasks.indexOf(item)}"]`;
            renderAll();
            closeEditor();
            requestAnimationFrame(() => document.querySelector(selector)?.focus());
            showToast(`${item.title} saved to the server`);
        } catch (error) {
            showToast(`Save failed: ${error.message}`);
        } finally {
            saveInProgress = false;
            submitButton.disabled = false;
        }
    });

    itemUrl.addEventListener('input', () => {
        itemUrl.removeAttribute('aria-invalid');
        urlError.hidden = true;
    });

    document.getElementById('closeEditor').addEventListener('click', closeEditor);
    document.getElementById('cancelEdit').addEventListener('click', closeEditor);
    editorDialog.addEventListener('cancel', (event) => {
        if (saveInProgress) {
            event.preventDefault();
            return;
        }
        editing = null;
    });
    editorDialog.addEventListener('click', (event) => {
        if (event.target !== editorDialog) return;
        const bounds = editorDialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeEditor();
    });

    deleteTask.addEventListener('click', async () => {
        if (saveInProgress || !editing || editing.kind !== 'task' || editing.index < 0) return;
        const editContext = { ...editing };
        const title = state.tasks[editContext.index].title;
        if (!window.confirm(`Remove the “${title}” special task?`)) return;
        const nextState = { functions: [...state.functions], tasks: [...state.tasks], content: { ...state.content } };
        nextState.tasks.splice(editContext.index, 1);
        saveInProgress = true;
        deleteTask.disabled = true;
        try {
            await saveState(nextState);
            renderAll();
            closeEditor();
            setupToggle.focus();
            showToast(`${title} removed from the server`);
        } catch (error) {
            showToast(`Remove failed: ${error.message}`);
        } finally {
            saveInProgress = false;
            deleteTask.disabled = false;
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && setupMode && !editorDialog.open && !contentDialog.open && !saveInProgress) {
            setupMode = false;
            adminPassword = '';
            renderAll();
            setupToggle.focus();
        }
    });

    document.getElementById('copyrightYear').textContent = String(new Date().getFullYear());
    renderAll();
    loadState();
})();
