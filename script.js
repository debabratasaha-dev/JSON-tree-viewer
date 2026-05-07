document.addEventListener('DOMContentLoaded', () => {
    const jsonInput = document.getElementById('json-input');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const renderBtn = document.getElementById('render-btn');
    const treeContainer = document.getElementById('tree-container');
    const errorMessage = document.getElementById('error-message');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const collapseAllBtn = document.getElementById('collapse-all-btn');

    const viewListBtn = document.getElementById('view-list-btn');
    const viewGraphBtn = document.getElementById('view-graph-btn');
    const listContainer = document.getElementById('list-container');
    const graphContainer = document.getElementById('graph-container');
    const graphWrapper = document.getElementById('graph-wrapper');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    let currentJsonData = null;
    let currentView = 'list';
    let currentScale = 1;
    let translateX = 0;
    let translateY = 0;
    let currentMindmapRoot = null;
    let graphNodeId = 0;
    let hasRenderedMindmap = false;
    let hasDraggedGraph = false;
    let gestureStartScale = 1;
    let zoomRefreshTimer = null;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const MIN_GRAPH_SCALE = 0.2;
    const MAX_GRAPH_SCALE = 3;
    const USE_CRISP_GRAPH_ZOOM = 'zoom' in document.documentElement.style
        || (window.CSS && CSS.supports && CSS.supports('zoom', '1'));
    const MINDMAP_LAYOUT = {
        margin: 72,
        levelGap: 150,
        siblingGap: 28
    };

    // Theme Toggle Handler
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) {
            themeToggleBtn.textContent = '🌙';
            themeToggleBtn.title = 'Toggle Dark Mode';
        } else {
            themeToggleBtn.textContent = '☀️';
            themeToggleBtn.title = 'Toggle Light Mode';
        }
    });

    // View Toggle Handlers
    viewListBtn.addEventListener('click', () => {
        currentView = 'list';
        viewListBtn.classList.add('active');
        viewGraphBtn.classList.remove('active');
        listContainer.classList.remove('hidden');
        graphContainer.classList.add('hidden');
        zoomInBtn.classList.add('hidden');
        zoomOutBtn.classList.add('hidden');
    });

    viewGraphBtn.addEventListener('click', () => {
        currentView = 'graph';
        viewGraphBtn.classList.add('active');
        viewListBtn.classList.remove('active');
        graphContainer.classList.remove('hidden');
        listContainer.classList.add('hidden');
        zoomInBtn.classList.remove('hidden');
        zoomOutBtn.classList.remove('hidden');
        if (currentMindmapRoot) {
            requestAnimationFrame(() => drawMindmap({ resetView: !hasRenderedMindmap }));
        }
    });

    // Zoom Handlers
    function applyZoom() {
        const roundedTranslateX = Math.round(translateX);
        const roundedTranslateY = Math.round(translateY);
        const mindmapSurface = graphWrapper.querySelector('.mindmap-surface');

        graphWrapper.style.transform = `translate3d(${roundedTranslateX}px, ${roundedTranslateY}px, 0)`;

        if (!mindmapSurface) return;

        if (USE_CRISP_GRAPH_ZOOM) {
            mindmapSurface.style.zoom = currentScale;
            mindmapSurface.style.transform = '';
        } else {
            mindmapSurface.style.zoom = '';
            mindmapSurface.style.transform = `scale(${currentScale})`;
        }
    }

    function clampScale(scale) {
        return Math.min(Math.max(scale, MIN_GRAPH_SCALE), MAX_GRAPH_SCALE);
    }

    function setGraphScale(nextScale, originClientX = null, originClientY = null) {
        const clampedScale = clampScale(nextScale);
        const rect = graphContainer.getBoundingClientRect();
        const originX = originClientX === null ? rect.width / 2 : originClientX - rect.left;
        const originY = originClientY === null ? rect.height / 2 : originClientY - rect.top;
        const graphX = (originX - translateX) / currentScale;
        const graphY = (originY - translateY) / currentScale;

        currentScale = clampedScale;
        translateX = originX - graphX * currentScale;
        translateY = originY - graphY * currentScale;
        applyZoom();
        scheduleGraphRefreshAfterZoom();
    }

    function scheduleGraphRefreshAfterZoom() {
        if (currentView !== 'graph' || !currentMindmapRoot) return;

        clearTimeout(zoomRefreshTimer);
        zoomRefreshTimer = setTimeout(() => {
            drawMindmap();
            zoomRefreshTimer = null;
        }, 120);
    }

    zoomInBtn.addEventListener('click', () => {
        setGraphScale(currentScale * 1.15);
    });

    zoomOutBtn.addEventListener('click', () => {
        setGraphScale(currentScale / 1.15);
    });

    graphContainer.addEventListener('wheel', (e) => {
        if (currentView !== 'graph') return;

        e.preventDefault();
        const zoomSpeed = e.ctrlKey || e.metaKey ? 0.008 : 0.0025;
        const nextScale = currentScale * Math.exp(-e.deltaY * zoomSpeed);
        setGraphScale(nextScale, e.clientX, e.clientY);
    }, { passive: false });

    graphContainer.addEventListener('gesturestart', (e) => {
        if (currentView !== 'graph') return;
        e.preventDefault();
        gestureStartScale = currentScale;
    }, { passive: false });

    graphContainer.addEventListener('gesturechange', (e) => {
        if (currentView !== 'graph') return;
        e.preventDefault();
        setGraphScale(gestureStartScale * e.scale, e.clientX, e.clientY);
    }, { passive: false });

    // Drag to Pan Handlers
    let isDragging = false;
    let startX, startY;
    let initialTranslateX, initialTranslateY;

    graphContainer.addEventListener('mousedown', (e) => {
        if (currentView !== 'graph' || e.button !== 0) return;
        isDragging = true;
        hasDraggedGraph = false;
        graphContainer.classList.add('grabbing');
        startX = e.pageX;
        startY = e.pageY;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
    });

    graphContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        graphContainer.classList.remove('grabbing');
    });

    graphContainer.addEventListener('mouseup', () => {
        isDragging = false;
        graphContainer.classList.remove('grabbing');
        setTimeout(() => {
            hasDraggedGraph = false;
        }, 0);
    });

    graphContainer.addEventListener('mousemove', (e) => {
        if (!isDragging || currentView !== 'graph') return;
        e.preventDefault();
        const x = e.pageX;
        const y = e.pageY;
        const walkX = x - startX;
        const walkY = y - startY;
        
        if (Math.abs(walkX) > 4 || Math.abs(walkY) > 4) {
            hasDraggedGraph = true;
        }
        translateX = initialTranslateX + walkX;
        translateY = initialTranslateY + walkY;
        applyZoom();
    });

    // File Upload Handler
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Check if file is JSON
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            showError('Please upload a valid JSON file.');
            fileInput.value = '';
            fileNameDisplay.textContent = 'Upload JSON File';
            return;
        }
        fileNameDisplay.textContent = file.name;
        hideError();
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            jsonInput.value = content;
            tryRenderJSON();
        };
        reader.onerror = () => {
            showError('Error reading file.');
        };
        reader.readAsText(file);
    });
    // Render Button Handler
    renderBtn.addEventListener('click', () => {
        tryRenderJSON();
    });
    function tryRenderJSON() {
        const rawValue = jsonInput.value.trim();
        if (!rawValue) {
            showError('Please provide JSON data either by pasting or uploading a file.');
            return;
        }
        try {
            const parsedData = JSON.parse(rawValue);
            hideError();
            currentJsonData = parsedData;
            renderTree(parsedData);
            renderGraph(parsedData);
        } catch (error) {
            showError('Invalid JSON format. Please check your data.');
        }
    }
    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }
    function hideError() {
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
    }
    function renderTree(data) {
        listContainer.innerHTML = '';
        const rootElement = createTreeNode(data, null, true);
        listContainer.appendChild(rootElement);
    }
    function createTreeNode(value, key = null, isRoot = false, isLast = true, parentIsArray = false) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = isRoot ? 'tree-root' : 'tree-node';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        const isObject = typeof value === 'object' && value !== null;
        const isArray = Array.isArray(value);

        // Determine type string and icon
        let typeStr = '';
        let iconStr = '';
        let typeClass = '';
        
        if (isArray) {
            typeStr = 'ARRAY';
            iconStr = '[]';
            typeClass = 'array';
        } else if (isObject) {
            typeStr = 'OBJECT';
            iconStr = '{}';
            typeClass = 'object';
        } else if (typeof value === 'string') {
            typeStr = 'STRING';
            iconStr = 'T';
            typeClass = 'string';
        } else if (typeof value === 'number') {
            typeStr = 'NUMBER';
            iconStr = '#';
            typeClass = 'number';
        } else if (typeof value === 'boolean') {
            typeStr = 'BOOLEAN';
            if (value === true) {
                iconStr = `<svg width="18" height="10" viewBox="0 0 18 10" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><rect width="18" height="10" rx="5" fill="currentColor" fill-opacity="0.4"/><circle cx="13" cy="5" r="3" fill="currentColor"/></svg>`;
            } else {
                iconStr = `<svg width="18" height="10" viewBox="0 0 18 10" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><rect width="18" height="10" rx="5" fill="currentColor" fill-opacity="0.1"/><circle cx="5" cy="5" r="3" fill="currentColor" fill-opacity="0.5"/></svg>`;
            }
            typeClass = 'boolean';
        } else if (value === null) {
            typeStr = 'NULL';
            iconStr = '∅';
            typeClass = 'null';
        }

        // Caret
        const caret = document.createElement('span');
        caret.className = 'tree-caret';
        if (isObject) {
            caret.innerHTML = '▶';
            caret.classList.add('expanded');
        } else {
            caret.classList.add('hidden');
            caret.innerHTML = '▶';
        }
        itemDiv.appendChild(caret);

        // Icon
        const iconSpan = document.createElement('span');
        iconSpan.className = `type-icon type-icon-${typeClass}`;
        iconSpan.innerHTML = iconStr;
        itemDiv.appendChild(iconSpan);

        // Key
        if (key !== null) {
            const keySpan = document.createElement('span');
            keySpan.className = 'tree-key';
            keySpan.textContent = parentIsArray ? `${key} : ` : `"${key}" : `;
            itemDiv.appendChild(keySpan);
        }

        // Value or Bracket
        const valueSpan = document.createElement('span');

        if (isObject) {
            const openBracket = isArray ? '[' : '{';
            const closeBracket = isArray ? ']' : '}';

            valueSpan.className = 'tree-bracket';

            const keys = Object.keys(value);
            const isEmpty = keys.length === 0;
            if (isEmpty) {
                valueSpan.textContent = openBracket + closeBracket + (!isLast && !isRoot ? ',' : '');
                caret.classList.add('hidden');
                itemDiv.appendChild(valueSpan);
                nodeDiv.appendChild(itemDiv);
            } else {
                valueSpan.textContent = openBracket;
                itemDiv.appendChild(valueSpan);

                const countSpan = document.createElement('span');
                countSpan.className = 'tree-bracket';
                countSpan.style.opacity = '0.5';
                countSpan.style.fontSize = '0.8rem';
                countSpan.style.marginLeft = '0.5rem';
                countSpan.textContent = isArray ? `${keys.length} items` : `${keys.length} keys`;
                itemDiv.appendChild(countSpan);
                nodeDiv.appendChild(itemDiv);
                const childrenDiv = document.createElement('div');
                childrenDiv.className = 'tree-children';

                keys.forEach((k, index) => {
                    const childNode = createTreeNode(value[k], k, false, index === keys.length - 1, isArray);
                    childrenDiv.appendChild(childNode);
                });
                nodeDiv.appendChild(childrenDiv);
                const closeSpan = document.createElement('div');
                closeSpan.className = 'tree-item';
                closeSpan.innerHTML = `<span class="tree-caret hidden">▶</span><span class="tree-bracket">${closeBracket}${!isLast && !isRoot ? ',' : ''}</span>`;
                nodeDiv.appendChild(closeSpan);
                // Toggle logic
                const toggleNode = () => {
                    childrenDiv.classList.toggle('collapsed');
                    caret.classList.toggle('expanded');
                    if (childrenDiv.classList.contains('collapsed')) {
                        valueSpan.textContent = openBracket + ' ... ' + closeBracket + (!isLast && !isRoot ? ',' : '');
                        countSpan.style.display = 'none';
                        closeSpan.style.display = 'none';
                    } else {
                        valueSpan.textContent = openBracket;
                        countSpan.style.display = 'inline';
                        closeSpan.style.display = 'flex';
                    }
                };
                caret.addEventListener('click', toggleNode);
                if (key !== null) {
                    itemDiv.querySelector('.tree-key').addEventListener('click', toggleNode);
                    itemDiv.querySelector('.tree-key').style.cursor = 'pointer';
                } else if (isRoot) {
                    // For root, allow clicking brackets to collapse
                    valueSpan.addEventListener('click', toggleNode);
                    valueSpan.style.cursor = 'pointer';
                }
            }
        } else {
            // Primitive values
            let displayValue = '';
            if (typeof value === 'string') {
                valueSpan.className = 'tree-value-string';

                // Escape HTML tags to prevent XSS and formatting issues
                const escapedValue = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                displayValue = `"${escapedValue}"`;
                valueSpan.innerHTML = displayValue + (!isLast ? ',' : '');
            } else if (typeof value === 'number') {
                valueSpan.className = 'tree-value-number';
                displayValue = value;
                valueSpan.textContent = displayValue + (!isLast ? ',' : '');
            } else if (typeof value === 'boolean') {
                valueSpan.className = 'tree-value-boolean';
                displayValue = value;
                valueSpan.textContent = displayValue + (!isLast ? ',' : '');
            } else if (value === null) {
                valueSpan.className = 'tree-value-null';
                displayValue = 'null';
                valueSpan.textContent = displayValue + (!isLast ? ',' : '');
            }

            itemDiv.appendChild(valueSpan);
            nodeDiv.appendChild(itemDiv);
        }
        return nodeDiv;
    }
    // Expand / Collapse All
    expandAllBtn.addEventListener('click', () => {
        if (!currentJsonData) return;
        const children = listContainer.querySelectorAll('.tree-children');
        const carets = listContainer.querySelectorAll('.tree-caret:not(.hidden)');

        children.forEach(child => {
            child.classList.remove('collapsed');

            const itemDiv = child.previousElementSibling;
            const treeBrackets = itemDiv.querySelectorAll('.tree-bracket');
            const openBracketSpan = treeBrackets[0];
            const countSpan = treeBrackets[1];
            const closeSpan = child.nextElementSibling;

            if (openBracketSpan && countSpan) {
                const isArray = countSpan.textContent.includes('items');
                openBracketSpan.textContent = isArray ? '[' : '{';
                countSpan.style.display = 'inline';
            }
            if (closeSpan) {
                closeSpan.style.display = 'flex';
            }
        });
        carets.forEach(caret => caret.classList.add('expanded'));

        if (currentMindmapRoot) {
            setMindmapCollapsed(currentMindmapRoot, false);
            if (currentView === 'graph') {
                drawMindmap();
            }
        }
    });
    collapseAllBtn.addEventListener('click', () => {
        if (!currentJsonData) return;

        const children = listContainer.querySelectorAll('.tree-children');
        const carets = listContainer.querySelectorAll('.tree-caret:not(.hidden)');

        children.forEach(child => {
            child.classList.add('collapsed');

            const itemDiv = child.previousElementSibling;
            const treeBrackets = itemDiv.querySelectorAll('.tree-bracket');
            const openBracketSpan = treeBrackets[0];
            const countSpan = treeBrackets[1];
            const closeSpan = child.nextElementSibling;

            if (openBracketSpan && countSpan) {
                const isArray = countSpan.textContent.includes('items');
                const isLastText = closeSpan ? closeSpan.textContent : '';
                const hasComma = isLastText.includes(',');
                openBracketSpan.textContent = (isArray ? '[ ... ]' : '{ ... }') + (hasComma ? ',' : '');
                countSpan.style.display = 'none';
            }
            if (closeSpan) {
                closeSpan.style.display = 'none';
            }
        });
        carets.forEach(caret => caret.classList.remove('expanded'));

        if (currentMindmapRoot) {
            setMindmapCollapsed(currentMindmapRoot, true);
            if (currentView === 'graph') {
                drawMindmap();
            }
        }
    });

    function renderGraph(data) {
        graphNodeId = 0;
        currentMindmapRoot = buildMindmapNode(data, 'JSON File', true);
        hasRenderedMindmap = false;

        currentScale = 1;
        translateX = 0;
        translateY = 0;
        applyZoom();

        if (currentView === 'graph') {
            requestAnimationFrame(() => drawMindmap({ resetView: true }));
        }
    }

    function buildMindmapNode(value, key = null, isRoot = false, parentIsArray = false) {
        const isObject = typeof value === 'object' && value !== null;
        const isArray = Array.isArray(value);
        const node = {
            id: `mindmap-node-${++graphNodeId}`,
            kind: isObject ? 'container' : 'value',
            key,
            value,
            isRoot,
            parentIsArray,
            isArray,
            rows: [],
            branches: [],
            layout: {}
        };

        if (!isObject) {
            return node;
        }

        Object.keys(value).forEach((childKey) => {
            const childValue = value[childKey];
            const row = {
                key: childKey,
                value: childValue,
                rowIndex: node.rows.length,
                branch: null
            };

            if (canBranchInMindmap(childValue)) {
                row.branch = {
                    id: `${node.id}-branch-${row.rowIndex}`,
                    rowIndex: row.rowIndex,
                    collapsed: false,
                    children: buildMindmapBranchChildren(childValue, childKey, isArray)
                };
                node.branches.push(row.branch);
            }

            node.rows.push(row);
        });

        return node;
    }

    function buildMindmapBranchChildren(value, key, parentIsArray) {
        if (Array.isArray(value)) {
            return Object.keys(value).map((childKey) => buildMindmapNode(value[childKey], childKey, false, true));
        }

        return [buildMindmapNode(value, key, false, parentIsArray)];
    }

    function canBranchInMindmap(value) {
        return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
    }

    function drawMindmap(options = {}) {
        if (!currentMindmapRoot) return;

        const { resetView = false } = options;
        graphWrapper.innerHTML = '';

        const surface = document.createElement('div');
        surface.className = 'mindmap-surface';

        const connectorSvg = document.createElementNS(SVG_NS, 'svg');
        connectorSvg.classList.add('mindmap-connectors');

        const nodesLayer = document.createElement('div');
        nodesLayer.className = 'mindmap-nodes';

        surface.appendChild(connectorSvg);
        surface.appendChild(nodesLayer);
        graphWrapper.appendChild(surface);

        const elementMap = new Map();
        appendMindmapNodes(currentMindmapRoot, nodesLayer, elementMap);
        measureMindmap(currentMindmapRoot, elementMap);
        computeMindmapLayout(currentMindmapRoot);
        assignMindmapPositions(currentMindmapRoot, MINDMAP_LAYOUT.margin, MINDMAP_LAYOUT.margin);

        const surfaceWidth = currentMindmapRoot.layout.subtreeWidth + MINDMAP_LAYOUT.margin * 2;
        const surfaceHeight = currentMindmapRoot.layout.subtreeHeight + MINDMAP_LAYOUT.margin * 2;

        surface.style.width = `${surfaceWidth}px`;
        surface.style.height = `${surfaceHeight}px`;
        connectorSvg.setAttribute('width', surfaceWidth);
        connectorSvg.setAttribute('height', surfaceHeight);
        connectorSvg.setAttribute('viewBox', `0 0 ${surfaceWidth} ${surfaceHeight}`);

        positionMindmapNodes(currentMindmapRoot, elementMap);
        drawMindmapConnectors(connectorSvg, currentMindmapRoot);

        if (resetView) {
            centerMindmap(surfaceWidth, surfaceHeight);
        } else {
            applyZoom();
        }

        hasRenderedMindmap = true;
    }

    function appendMindmapNodes(node, nodesLayer, elementMap) {
        const nodeElement = createMindmapNodeElement(node);
        nodesLayer.appendChild(nodeElement);
        elementMap.set(node.id, nodeElement);

        getVisibleMindmapLinks(node).forEach(({ child }) => {
            appendMindmapNodes(child, nodesLayer, elementMap);
        });
    }

    function createMindmapNodeElement(node) {
        const nodeElement = document.createElement('div');
        nodeElement.className = `mindmap-node mindmap-${node.kind} type-${getMindmapTypeClass(node.value)}`;
        nodeElement.dataset.nodeId = node.id;

        if (node.isRoot) {
            nodeElement.classList.add('mindmap-root');
        }

        if (node.kind === 'value') {
            nodeElement.appendChild(createMindmapTypeIcon(node.value));

            const valueElement = document.createElement('span');
            valueElement.className = 'mindmap-value-text';
            valueElement.textContent = formatMindmapNodeValue(node);
            nodeElement.appendChild(valueElement);
            return nodeElement;
        }

        if (node.rows.length === 0) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'mindmap-row mindmap-empty-row';
            emptyRow.textContent = node.isArray ? 'Empty array' : 'Empty object';
            nodeElement.appendChild(emptyRow);
            return nodeElement;
        }

        node.rows.forEach((row) => {
            const rowElement = document.createElement('div');
            rowElement.className = `mindmap-row type-${getMindmapTypeClass(row.value)}`;
            rowElement.dataset.rowIndex = row.rowIndex;

            rowElement.appendChild(createMindmapTypeIcon(row.value));

            const keyElement = document.createElement('span');
            keyElement.className = 'mindmap-key';
            keyElement.textContent = `${formatMindmapKey(row.key, node.isArray)}:`;

            const valueElement = document.createElement('span');
            valueElement.className = 'mindmap-summary';
            valueElement.textContent = formatMindmapSummary(row.value);

            rowElement.appendChild(keyElement);
            rowElement.appendChild(valueElement);

            if (row.branch) {
                rowElement.classList.add('is-branch');
                rowElement.classList.toggle('is-collapsed', row.branch.collapsed);
                rowElement.setAttribute('role', 'button');
                rowElement.setAttribute('tabindex', '0');
                rowElement.setAttribute('aria-expanded', String(!row.branch.collapsed));

                const stateElement = document.createElement('span');
                stateElement.className = 'mindmap-branch-state';
                stateElement.textContent = row.branch.collapsed ? '+' : '-';
                rowElement.appendChild(stateElement);

                const toggleBranch = (event) => {
                    event.stopPropagation();
                    if (hasDraggedGraph) return;
                    row.branch.collapsed = !row.branch.collapsed;
                    drawMindmap();
                };

                rowElement.addEventListener('click', toggleBranch);
                rowElement.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleBranch(event);
                    }
                });
            }

            nodeElement.appendChild(rowElement);
        });

        return nodeElement;
    }

    function createMindmapTypeIcon(value) {
        const typeClass = getMindmapTypeClass(value);
        const typeLabel = getMindmapTypeLabel(value);
        const badgeElement = document.createElement('span');
        badgeElement.className = `mindmap-type-badge type-icon-${typeClass}`;
        badgeElement.title = typeLabel;

        const iconElement = document.createElement('span');
        iconElement.className = 'type-icon mindmap-type-icon';
        iconElement.setAttribute('aria-hidden', 'true');
        iconElement.innerHTML = getMindmapTypeIconMarkup(value);

        const labelElement = document.createElement('span');
        labelElement.className = 'mindmap-type-label';
        labelElement.textContent = typeLabel;

        badgeElement.appendChild(iconElement);
        badgeElement.appendChild(labelElement);
        return badgeElement;
    }

    function measureMindmap(node, elementMap) {
        const element = elementMap.get(node.id);
        node.layout.width = element.offsetWidth || 220;
        node.layout.height = element.offsetHeight || 80;
        node.layout.rowAnchors = [];

        if (node.kind === 'container') {
            element.querySelectorAll('.mindmap-row').forEach((rowElement) => {
                const rowIndex = Number(rowElement.dataset.rowIndex);
                if (!Number.isNaN(rowIndex)) {
                    node.layout.rowAnchors[rowIndex] = rowElement.offsetTop + rowElement.offsetHeight / 2;
                }
            });
        }

        getVisibleMindmapLinks(node).forEach(({ child }) => measureMindmap(child, elementMap));
    }

    function computeMindmapLayout(node) {
        const visibleBranches = getVisibleMindmapBranches(node);

        visibleBranches.forEach((branch) => {
            branch.children.forEach((child) => computeMindmapLayout(child));
        });

        if (!visibleBranches.length) {
            node.layout.nodeOffset = 0;
            node.layout.subtreeHeight = node.layout.height;
            node.layout.subtreeWidth = node.layout.width;
            return;
        }

        let widestChild = 0;

        visibleBranches.forEach((branch) => {
            const childrenHeight = branch.children.reduce((total, child, index) => {
                return total + child.layout.subtreeHeight + (index > 0 ? MINDMAP_LAYOUT.siblingGap : 0);
            }, 0);

            branch.layout = {
                childrenHeight,
                top: 0
            };

            branch.children.forEach((child) => {
                widestChild = Math.max(widestChild, child.layout.subtreeWidth);
            });
        });

        let previousBottom = Number.NEGATIVE_INFINITY;

        visibleBranches.forEach((branch, index) => {
            const sourceOffset = node.layout.rowAnchors[branch.rowIndex] || node.layout.height / 2;
            const desiredTop = sourceOffset - branch.layout.childrenHeight / 2;
            const top = index === 0
                ? desiredTop
                : Math.max(desiredTop, previousBottom + MINDMAP_LAYOUT.siblingGap);

            branch.layout.top = top;
            previousBottom = top + branch.layout.childrenHeight;
        });

        const minTop = Math.min(0, ...visibleBranches.map((branch) => branch.layout.top));
        const nodeOffset = minTop < 0 ? Math.abs(minTop) : 0;
        let subtreeHeight = nodeOffset + node.layout.height;

        visibleBranches.forEach((branch) => {
            branch.layout.top += nodeOffset;
            subtreeHeight = Math.max(subtreeHeight, branch.layout.top + branch.layout.childrenHeight);
        });

        node.layout.nodeOffset = nodeOffset;
        node.layout.subtreeHeight = subtreeHeight;
        node.layout.subtreeWidth = node.layout.width + MINDMAP_LAYOUT.levelGap + widestChild;
    }

    function assignMindmapPositions(node, x, y) {
        node.layout.x = x;
        node.layout.y = y + (node.layout.nodeOffset || 0);

        const visibleBranches = getVisibleMindmapBranches(node);
        if (!visibleBranches.length) return;

        const childX = x + node.layout.width + MINDMAP_LAYOUT.levelGap;

        visibleBranches.forEach((branch) => {
            let childY = y + branch.layout.top;

            branch.children.forEach((child) => {
                assignMindmapPositions(child, childX, childY);
                childY += child.layout.subtreeHeight + MINDMAP_LAYOUT.siblingGap;
            });
        });
    }

    function positionMindmapNodes(node, elementMap) {
        const element = elementMap.get(node.id);
        element.style.left = `${node.layout.x}px`;
        element.style.top = `${node.layout.y}px`;

        getVisibleMindmapLinks(node).forEach(({ child }) => positionMindmapNodes(child, elementMap));
    }

    function drawMindmapConnectors(svg, node, drawnDots = new Set()) {
        getVisibleMindmapLinks(node).forEach(({ branch, child }) => {
            const sourceX = node.layout.x + node.layout.width;
            const sourceY = node.layout.y + (node.layout.rowAnchors[branch.rowIndex] || node.layout.height / 2);
            const targetX = child.layout.x;
            const targetY = child.layout.y + child.layout.height / 2;
            const distance = Math.max(1, targetX - sourceX);
            const curve = Math.max(72, Math.min(150, distance * 0.48));

            const path = document.createElementNS(SVG_NS, 'path');
            path.classList.add('mindmap-link');
            path.setAttribute('d', `M ${sourceX} ${sourceY} C ${sourceX + curve} ${sourceY}, ${targetX - curve} ${targetY}, ${targetX} ${targetY}`);
            svg.appendChild(path);

            if (!drawnDots.has(branch.id)) {
                const dot = document.createElementNS(SVG_NS, 'circle');
                dot.classList.add('mindmap-source-dot');
                dot.setAttribute('cx', sourceX);
                dot.setAttribute('cy', sourceY);
                dot.setAttribute('r', '7');
                svg.appendChild(dot);
                drawnDots.add(branch.id);
            }

            drawMindmapConnectors(svg, child, drawnDots);
        });
    }

    function getVisibleMindmapLinks(node) {
        if (node.kind !== 'container') return [];

        return node.branches.flatMap((branch) => {
            if (branch.collapsed) return [];
            return branch.children.map((child) => ({ branch, child }));
        });
    }

    function getVisibleMindmapBranches(node) {
        if (node.kind !== 'container') return [];
        return node.branches.filter((branch) => !branch.collapsed && branch.children.length > 0);
    }

    function setMindmapCollapsed(node, collapsed) {
        if (!node || node.kind !== 'container') return;

        node.branches.forEach((branch) => {
            branch.collapsed = collapsed;
            branch.children.forEach((child) => setMindmapCollapsed(child, collapsed));
        });
    }

    function centerMindmap(surfaceWidth, surfaceHeight) {
        const containerWidth = graphContainer.clientWidth || surfaceWidth;
        const containerHeight = graphContainer.clientHeight || surfaceHeight;

        translateX = Math.max(32, (containerWidth - surfaceWidth * currentScale) / 2);
        translateY = Math.max(32, (containerHeight - surfaceHeight * currentScale) / 2);
        applyZoom();
    }

    function formatMindmapKey(key, parentIsArray) {
        return parentIsArray ? `[${key}]` : key;
    }

    function formatMindmapNodeValue(node) {
        const summary = formatMindmapSummary(node.value);

        if (node.isRoot) {
            return `${node.key}: ${summary}`;
        }

        if (node.parentIsArray) {
            return summary;
        }

        return `${node.key}: ${summary}`;
    }

    function formatMindmapSummary(value) {
        if (Array.isArray(value)) {
            return `[${value.length} ${value.length === 1 ? 'item' : 'items'}]`;
        }

        if (typeof value === 'object' && value !== null) {
            return '{}';
        }

        if (typeof value === 'string') {
            return value;
        }

        if (value === null) {
            return 'null';
        }

        return String(value);
    }

    function getMindmapTypeClass(value) {
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object' && value !== null) return 'object';
        if (typeof value === 'string') return 'string';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (value === null) return 'null';
        return 'unknown';
    }

    function getMindmapTypeLabel(value) {
        if (Array.isArray(value)) return 'Array';
        if (typeof value === 'object' && value !== null) return 'Object';
        if (typeof value === 'string') return 'String';
        if (typeof value === 'number') return 'Number';
        if (typeof value === 'boolean') return 'Boolean';
        if (value === null) return 'Null';
        return 'Unknown';
    }

    function getMindmapTypeIconMarkup(value) {
        if (Array.isArray(value)) return '[]';
        if (typeof value === 'object' && value !== null) return '{}';
        if (typeof value === 'string') return 'T';
        if (typeof value === 'number') return '#';
        if (typeof value === 'boolean') {
            return value
                ? '<svg width="18" height="10" viewBox="0 0 18 10" fill="none" xmlns="http://www.w3.org/2000/svg" class="toggle-icon-graph"><rect width="18" height="10" rx="5" fill="currentColor" fill-opacity="0.4"/><circle cx="13" cy="5" r="3" fill="currentColor"/></svg>'
                : '<svg width="18" height="10" viewBox="0 0 18 10" fill="none" xmlns="http://www.w3.org/2000/svg" class="toggle-icon-graph"><rect width="18" height="10" rx="5" fill="currentColor" fill-opacity="0.1"/><circle cx="5" cy="5" r="3" fill="currentColor" fill-opacity="0.5"/></svg>';
        }
        if (value === null) return '&empty;';
        return '?';
    }

    window.addEventListener('resize', () => {
        if (currentView === 'graph' && currentMindmapRoot) {
            drawMindmap();
        }
    });

    // Initial render with a sample
    jsonInput.value = JSON.stringify({
        "project": "JSON Tree Viewer",
        "version": 1.0,
        "isAwesome": true,
        "features": [
            "Syntax Highlighting",
            "Collapsible Nodes",
            "File Upload",
            "Responsive Design"
        ],
        "author": {
            "name": "Developer",
            "skills": ["HTML", "CSS", "JS"]
        },
        "bugs": null
    }, null, 2);
    tryRenderJSON();
});
