document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const gridSizeInput = document.getElementById('gridSize');
    const generateGridBtn = document.getElementById('generateGridBtn');
    const gridMap = document.getElementById('gridMap');
    const statusMessage = document.getElementById('statusMessage');
    
    const startStat = document.getElementById('startStat');
    const endStat = document.getElementById('endStat');
    const obsStat = document.getElementById('obsStat');
    const targetObsSpan = document.getElementById('targetObs');
    
    const policyGenBtn = document.getElementById('policyGenBtn');
    const policyEvalBtn = document.getElementById('policyEvalBtn');
    const valueIterBtn = document.getElementById('valueIterBtn');
    
    const viewModeWrapper = document.getElementById('viewModeWrapper');
    const viewPolicyBtn = document.getElementById('viewPolicyBtn');
    const viewValueBtn = document.getElementById('viewValueBtn');

    // --- State Variables ---
    let n = 5;
    let targetObstacles = n - 2;
    
    let startCellId = null;
    let endCellId = null;
    let obstacleCellIds = new Set();
    
    let currentMode = 'SET_START';
    
    // For Storing Logic data
    let storedPolicy = {}; // { cell_id: 'UP' | 'ALL' }
    let storedValues = {}; // { cell_id: 1.23 }
    let currentView = 'POLICY'; // 'POLICY' or 'VALUE'
    let hasOptimalPolicy = false;

    const STRATEGY_ARROWS = ['↑', '↓', '←', '→'];

    // --- Initialization ---
    initGrid();

    // --- Event Listeners ---
    generateGridBtn.addEventListener('click', initGrid);
    policyGenBtn.addEventListener('click', generateRandomPolicy);
    policyEvalBtn.addEventListener('click', evaluatePolicy);
    valueIterBtn.addEventListener('click', findOptimalPolicy);
    
    viewPolicyBtn.addEventListener('click', () => setViewMode('POLICY'));
    viewValueBtn.addEventListener('click', () => setViewMode('VALUE'));

    // --- Core Functions ---
    function initGrid() {
        let inputN = parseInt(gridSizeInput.value);
        if (isNaN(inputN) || inputN < 5) inputN = 5;
        if (inputN > 9) inputN = 9;
        gridSizeInput.value = inputN;
        
        n = inputN;
        targetObstacles = n - 2;
        targetObsSpan.textContent = targetObstacles;
        
        startCellId = null;
        endCellId = null;
        obstacleCellIds.clear();
        currentMode = 'SET_START';
        
        policyGenBtn.disabled = true;
        policyEvalBtn.disabled = true;
        valueIterBtn.disabled = true;
        viewModeWrapper.classList.add('hidden');
        storedPolicy = {};
        storedValues = {};
        currentView = 'POLICY';
        hasOptimalPolicy = false;
        
        renderGridUI();
        updateStatusUI();
    }

    function renderGridUI() {
        gridMap.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        gridMap.innerHTML = '';
        
        for (let i = 0; i < n * n; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.id = i;
            cell.addEventListener('click', handleCellClick);
            
            cell.style.animation = `popUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards ${(i % n) * 0.03 + Math.floor(i/n) * 0.03}s`;
            cell.style.opacity = '0';
            
            gridMap.appendChild(cell);
        }
    }

    function handleCellClick(event) {
        const cell = event.target.closest('.grid-cell');
        if (!cell) return;
        const cellId = cell.dataset.id;
        
        if (currentMode === 'READY') {
            if (obstacleCellIds.has(cellId)) {
                obstacleCellIds.delete(cellId);
                cell.classList.remove('obstacle');
                cell.innerHTML = ''; 
                currentMode = 'SET_OBSTACLE';
                updateStatusUI();
                
                policyGenBtn.disabled = true;
                policyEvalBtn.disabled = true;
                valueIterBtn.disabled = true;
                viewModeWrapper.classList.add('hidden');
                
                clearAllArrows();
            }
            return;
        }

        if (cellId === startCellId || cellId === endCellId) {
            return;
        }

        if (currentMode === 'SET_START') {
            startCellId = cellId;
            cell.classList.add('start');
            cell.innerHTML = '🟢';
            currentMode = 'SET_END';
        } else if (currentMode === 'SET_END') {
            endCellId = cellId;
            cell.classList.add('end');
            cell.innerHTML = '🔴';
            currentMode = 'SET_OBSTACLE';
        } else if (currentMode === 'SET_OBSTACLE') {
            if (obstacleCellIds.has(cellId)) {
                obstacleCellIds.delete(cellId);
                cell.classList.remove('obstacle');
            } else {
                if (obstacleCellIds.size < targetObstacles) {
                    obstacleCellIds.add(cellId);
                    cell.classList.add('obstacle');
                }
            }
            if (obstacleCellIds.size === targetObstacles) {
                currentMode = 'READY';
            }
        }
        
        cell.animate([
            { transform: 'scale(0.85)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' }
        ], { duration: 350, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });

        updateStatusUI();
    }

    function updateStatusUI() {
        startStat.className = (startCellId !== null) ? 'badge completed' : 'badge active';
        startStat.innerHTML = (startCellId !== null) ? '<span class="emoji">✅</span> Start 1/1' : '<span class="emoji">🟢</span> Start 0/1';
        
        endStat.className = (endCellId !== null) ? 'badge completed' : ((startCellId !== null) ? 'badge active' : 'badge pending');
        endStat.innerHTML = (endCellId !== null) ? '<span class="emoji">✅</span> End 1/1' : '<span class="emoji">🔴</span> End 0/1';
        
        obsStat.innerHTML = `<span class="emoji">🧱</span> Obstacles ${obstacleCellIds.size}/${targetObstacles}`;
        if (obstacleCellIds.size === targetObstacles) {
            obsStat.className = 'badge completed';
        } else {
            obsStat.className = (startCellId !== null && endCellId !== null) ? 'badge active' : 'badge pending';
        }

        if (currentMode === 'SET_START') {
            statusMessage.textContent = '👉 請點擊網格設定起始點 🟢';
        } else if (currentMode === 'SET_END') {
            statusMessage.textContent = '👉 請點擊網格設定終點 🔴';
        } else if (currentMode === 'SET_OBSTACLE') {
            statusMessage.textContent = `🧱 點擊設定障礙物 (剩餘 ${targetObstacles - obstacleCellIds.size} 個)`;
        } else if (currentMode === 'READY') {
            statusMessage.textContent = '✨ 設定完成，請選擇政策或「Find Optimal Policy」';
            policyGenBtn.disabled = false;
            valueIterBtn.disabled = false;
        }
    }

    // --- Phase 2: Policy Generation ---
    function generateRandomPolicy() {
        if (currentMode !== 'READY') return;

        viewModeWrapper.classList.add('hidden');
        storedPolicy = {};
        hasOptimalPolicy = false;
        
        const cells = document.querySelectorAll('.grid-cell');
        let delayCount = 0;

        cells.forEach((cell) => {
            const id = parseInt(cell.dataset.id);
            if (id == startCellId || id == endCellId || obstacleCellIds.has(String(id))) {
                return;
            }

            const randomArrow = STRATEGY_ARROWS[Math.floor(Math.random() * STRATEGY_ARROWS.length)];
            storedPolicy[id] = randomArrow;
            let htmlContent = `<span class="policy-arrow">${randomArrow}</span>`;

            setTimeout(() => {
                cell.innerHTML = htmlContent;
            }, delayCount * 25); 
            
            delayCount++;
        });

        setTimeout(() => {
            policyEvalBtn.disabled = false;
            statusMessage.textContent = '🎉 策略生成完畢！準備進行「Evaluate Policy」';
        }, delayCount * 25 + 400);
    }
    
    function clearAllArrows() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('optimal-path-cell');
            const id = cell.dataset.id;
            if (id != startCellId && id != endCellId && !obstacleCellIds.has(id)) {
                cell.innerHTML = '';
            }
        });
    }

    // --- Phase 3: Policy Evaluation ---
    async function evaluatePolicy() {
        if (currentMode !== 'READY') return;
        
        policyEvalBtn.disabled = true;
        policyEvalBtn.innerHTML = '<span class="btn-icon">⏳</span> Evaluating...';

        const requestData = {
            n: n,
            start_id: parseInt(startCellId),
            end_id: parseInt(endCellId),
            obstacles: Array.from(obstacleCellIds).map(id => parseInt(id)),
            policy: storedPolicy
        };

        try {
            const response = await fetch('/evaluate_policy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                storedValues = data.values;
                statusMessage.textContent = `🎯 評估完成 (迭代 ${data.iterations} 次)。您可以自由切換視圖！`;
                
                // Show view mode toggle
                viewModeWrapper.classList.remove('hidden');
                setViewMode('VALUE');
            }
        } catch (error) {
            console.error('Error evaluating policy:', error);
            statusMessage.textContent = '❌ 評估失敗，請檢查網路連線或 Console';
        } finally {
            policyEvalBtn.disabled = false;
            policyEvalBtn.innerHTML = '<span class="btn-icon">✨</span> Evaluate Policy';
        }
    }

    // --- Phase 4: HW1-3 Value Iteration ---
    async function findOptimalPolicy() {
        if (currentMode !== 'READY') return;
        
        valueIterBtn.disabled = true;
        valueIterBtn.innerHTML = '<span class="btn-icon">⏳</span> Solving...';
        
        // Hide view mode if visible
        viewModeWrapper.classList.add('hidden');

        const requestData = {
            n: n,
            start_id: parseInt(startCellId),
            end_id: parseInt(endCellId),
            obstacles: Array.from(obstacleCellIds).map(id => parseInt(id))
        };

        try {
            const response = await fetch('/value_iteration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                storedPolicy = data.policy;
                storedValues = data.values;
                hasOptimalPolicy = true;
                
                statusMessage.textContent = `👑 最佳政策已收斂 (迭代 ${data.iterations} 次)！`;
                statusMessage.style.color = '#10b981';
                
                // Show optimal policy automatically
                viewModeWrapper.classList.remove('hidden');
                setViewMode('POLICY');
                traceOptimalPath();
            }
        } catch (error) {
            console.error('Error finding optimal policy:', error);
            statusMessage.textContent = '❌ 求解失敗';
        } finally {
            valueIterBtn.disabled = false;
            valueIterBtn.innerHTML = '<span class="btn-icon">👑</span> Find Optimal Policy (HW1-3)';
            policyEvalBtn.disabled = false;
        }
    }

    function traceOptimalPath() {
        if (!hasOptimalPolicy) return;
        
        // Clear any existing path classes first
        document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('optimal-path-cell'));
        
        let pathIds = [];
        let currentId = parseInt(startCellId);
        let endIdNum = parseInt(endCellId);
        let visited = new Set();
        
        while (currentId !== endIdNum) {
            if (visited.has(currentId)) break; // Prevent loops
            visited.add(currentId);
            
            let arrow = storedPolicy[currentId];
            if (!arrow) break;
            
            if (currentId !== parseInt(startCellId)) {
                pathIds.push(currentId);
            }
            
            let r = Math.floor(currentId / n);
            let c = currentId % n;
            
            if (arrow === '↑') r--;
            else if (arrow === '↓') r++;
            else if (arrow === '←') c--;
            else if (arrow === '→') c++;
            
            let nextId = r * n + c;
            if (nextId < 0 || nextId >= n*n || obstacleCellIds.has(String(nextId))) {
                break; 
            }
            currentId = nextId;
        }
        
        pathIds.forEach((id, index) => {
            const cell = document.querySelector(`.grid-cell[data-id="${id}"]`);
            if (cell) {
                setTimeout(() => {
                    cell.classList.add('optimal-path-cell');
                }, index * 80);
            }
        });
    }

    // --- Switch between Policy Arrows and Values ---
    function setViewMode(mode) {
        currentView = mode;
        if (mode === 'POLICY') {
            viewPolicyBtn.classList.add('active');
            viewValueBtn.classList.remove('active');
        } else {
            viewValueBtn.classList.add('active');
            viewPolicyBtn.classList.remove('active');
            // Remove path highlight in VALUE mode to let heatmap show clearly
            document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('optimal-path-cell'));
        }

        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach((cell) => {
            const id = cell.dataset.id;
            if (id == startCellId || id == endCellId || obstacleCellIds.has(id)) {
                return;
            }

            if (mode === 'POLICY') {
                cell.style.background = '';
                cell.style.borderColor = '';
                
                if (storedPolicy[id]) {
                    cell.innerHTML = `<span class="policy-arrow" style="animation: none;">${storedPolicy[id]}</span>`;
                }
            } else if (mode === 'VALUE') {
                const valstr = storedValues[id] !== undefined ? storedValues[id] : "0.0";
                const val = parseFloat(valstr);
                cell.innerHTML = `<span class="value-text fadeIn">${val.toFixed(2)}</span>`;
                
                if (val > 0) {
                    const intensity = Math.min(val * 0.4, 0.5);
                    cell.style.background = `rgba(16, 185, 129, ${intensity})`;
                } else if (val < 0) {
                    const intensity = Math.min(Math.abs(val) * 0.1, 0.3);
                    cell.style.background = `rgba(239, 68, 68, ${intensity})`;
                } else {
                    cell.style.background = 'var(--surface)';
                }
                cell.style.borderColor = 'var(--border-light)';
            }
        });
        
        if (mode === 'POLICY' && hasOptimalPolicy) {
            traceOptimalPath();
        }
    }
});
