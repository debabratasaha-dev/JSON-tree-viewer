document.addEventListener('DOMContentLoaded', () => {
    const jsonInput = document.getElementById('json-input');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const renderBtn = document.getElementById('render-btn');
    const treeContainer = document.getElementById('tree-container');
    const errorMessage = document.getElementById('error-message');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    let currentJsonData = null;
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
        treeContainer.innerHTML = '';
        const rootElement = createTreeNode(data, null, true);
        treeContainer.appendChild(rootElement);
    }
    function createTreeNode(value, key = null, isRoot = false, isLast = true) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = isRoot ? 'tree-root' : 'tree-node';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        const isObject = typeof value === 'object' && value !== null;
        const isArray = Array.isArray(value);

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
        // Key
        if (key !== null) {
            const keySpan = document.createElement('span');
            keySpan.className = 'tree-key';
            keySpan.textContent = `"${key}": `;
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
                    const childNode = createTreeNode(value[k], isArray ? null : k, false, index === keys.length - 1);
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
        const children = treeContainer.querySelectorAll('.tree-children');
        const carets = treeContainer.querySelectorAll('.tree-caret:not(.hidden)');

        children.forEach(child => {
            child.classList.remove('collapsed');

            const itemDiv = child.previousElementSibling;
            const openBracketSpan = itemDiv.querySelector('.tree-bracket:first-of-type');
            const countSpan = itemDiv.querySelector('.tree-bracket:nth-of-type(2)');
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
    });
    collapseAllBtn.addEventListener('click', () => {
        if (!currentJsonData) return;

        const children = treeContainer.querySelectorAll('.tree-children');
        const carets = treeContainer.querySelectorAll('.tree-caret:not(.hidden)');

        children.forEach(child => {
            child.classList.add('collapsed');

            const itemDiv = child.previousElementSibling;
            const openBracketSpan = itemDiv.querySelector('.tree-bracket:first-of-type');
            const countSpan = itemDiv.querySelector('.tree-bracket:nth-of-type(2)');
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
