// Game State
let scene, camera, renderer, raycaster, mouse;
let board = [];
let currentPlayer = 'X';
let gameActive = true;
let scores = { X: 0, O: 0 };
let cells = [];
let gridSize = 3;
let rotationSpeed = 0;
let targetRotation = 0;
let isRotating = false;

// Touch controls
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;

// Initialize game
function init() {
    // Setup canvas
    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('canvas-container');

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(8, 8, 8);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    updateRendererSize();

    // Raycaster for mouse/touch picking
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-10, -10, -10);
    scene.add(directionalLight2);

    // Create game board
    createBoard();

    // Event listeners
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('rotate-left').addEventListener('click', () => rotateBoard(-Math.PI / 2));
    document.getElementById('rotate-right').addEventListener('click', () => rotateBoard(Math.PI / 2));

    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

function updateRendererSize() {
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function createBoard() {
    // Clear existing board
    cells.forEach(cell => scene.remove(cell.mesh));
    cells = [];
    board = [];

    // Initialize board array
    for (let x = 0; x < gridSize; x++) {
        board[x] = [];
        for (let y = 0; y < gridSize; y++) {
            board[x][y] = [];
            for (let z = 0; z < gridSize; z++) {
                board[x][y][z] = null;
            }
        }
    }

    // Create visual grid
    const cellSize = 1.8;
    const spacing = 2;
    const offset = (gridSize - 1) * spacing / 2;

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
                const material = new THREE.MeshPhongMaterial({
                    color: 0x3a86ff,
                    transparent: true,
                    opacity: 0.3,
                    emissive: 0x1a4d8f,
                    emissiveIntensity: 0.2
                });
                const cube = new THREE.Mesh(geometry, material);

                cube.position.set(
                    x * spacing - offset,
                    y * spacing - offset,
                    z * spacing - offset
                );

                // Add edge lines
                const edges = new THREE.EdgesGeometry(geometry);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0x6fb1fc,
                    linewidth: 2
                });
                const wireframe = new THREE.LineSegments(edges, lineMaterial);
                cube.add(wireframe);

                scene.add(cube);

                cells.push({
                    mesh: cube,
                    x: x,
                    y: y,
                    z: z,
                    occupied: false,
                    symbol: null
                });
            }
        }
    }
}

function onCanvasClick(event) {
    if (!gameActive || isRotating) return;

    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    handleCellSelection();
}

function onTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        isDragging = false;
    }
}

function onTouchMove(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
        const deltaX = Math.abs(event.touches[0].clientX - touchStartX);
        const deltaY = Math.abs(event.touches[0].clientY - touchStartY);

        if (deltaX > 10 || deltaY > 10) {
            isDragging = true;
        }

        if (isDragging) {
            const dx = event.touches[0].clientX - touchStartX;
            if (!isRotating) {
                targetRotation = scene.rotation.y + dx * 0.01;
            }
            touchStartX = event.touches[0].clientX;
        }
    }
}

function onTouchEnd(event) {
    event.preventDefault();

    if (!isDragging && event.changedTouches.length === 1 && gameActive && !isRotating) {
        const touch = event.changedTouches[0];
        const canvas = document.getElementById('game-canvas');
        const rect = canvas.getBoundingClientRect();

        mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        handleCellSelection();
    }

    isDragging = false;
}

function handleCellSelection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cells.map(c => c.mesh));

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const cell = cells.find(c => c.mesh === intersectedObject);

        if (cell && !cell.occupied) {
            placeSymbol(cell);
        }
    }
}

function placeSymbol(cell) {
    cell.occupied = true;
    cell.symbol = currentPlayer;
    board[cell.x][cell.y][cell.z] = currentPlayer;

    // Create symbol
    if (currentPlayer === 'X') {
        createX(cell);
    } else {
        createO(cell);
    }

    // Check win condition
    if (checkWin(currentPlayer)) {
        endGame(`Jogador ${currentPlayer} venceu!`);
        scores[currentPlayer]++;
        updateScore();
    } else if (isBoardFull()) {
        endGame('Empate!');
    } else {
        // Switch player
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updatePlayerDisplay();
    }
}

function createX(cell) {
    const material = new THREE.MeshPhongMaterial({
        color: 0xff006e,
        emissive: 0xff006e,
        emissiveIntensity: 0.3
    });

    const geometry1 = new THREE.BoxGeometry(1.5, 0.2, 0.2);
    const geometry2 = new THREE.BoxGeometry(1.5, 0.2, 0.2);

    const bar1 = new THREE.Mesh(geometry1, material);
    const bar2 = new THREE.Mesh(geometry2, material);

    bar1.rotation.z = Math.PI / 4;
    bar2.rotation.z = -Math.PI / 4;

    const xGroup = new THREE.Group();
    xGroup.add(bar1);
    xGroup.add(bar2);

    xGroup.position.copy(cell.mesh.position);
    scene.add(xGroup);
    cell.symbolMesh = xGroup;
}

function createO(cell) {
    const material = new THREE.MeshPhongMaterial({
        color: 0xffbe0b,
        emissive: 0xffbe0b,
        emissiveIntensity: 0.3
    });

    const geometry = new THREE.TorusGeometry(0.6, 0.15, 16, 32);
    const torus = new THREE.Mesh(geometry, material);

    torus.position.copy(cell.mesh.position);
    scene.add(torus);
    cell.symbolMesh = torus;
}

function checkWin(player) {
    // Check all possible winning combinations in 3D

    // Rows (horizontal lines)
    for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
            if (checkLine(player, [[0,y,z], [1,y,z], [2,y,z]])) return true;
        }
    }

    // Columns (vertical lines)
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            if (checkLine(player, [[x,0,z], [x,1,z], [x,2,z]])) return true;
        }
    }

    // Depth lines
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            if (checkLine(player, [[x,y,0], [x,y,1], [x,y,2]])) return true;
        }
    }

    // Diagonals on XY plane
    for (let z = 0; z < gridSize; z++) {
        if (checkLine(player, [[0,0,z], [1,1,z], [2,2,z]])) return true;
        if (checkLine(player, [[0,2,z], [1,1,z], [2,0,z]])) return true;
    }

    // Diagonals on XZ plane
    for (let y = 0; y < gridSize; y++) {
        if (checkLine(player, [[0,y,0], [1,y,1], [2,y,2]])) return true;
        if (checkLine(player, [[0,y,2], [1,y,1], [2,y,0]])) return true;
    }

    // Diagonals on YZ plane
    for (let x = 0; x < gridSize; x++) {
        if (checkLine(player, [[x,0,0], [x,1,1], [x,2,2]])) return true;
        if (checkLine(player, [[x,0,2], [x,1,1], [x,2,0]])) return true;
    }

    // Space diagonals
    if (checkLine(player, [[0,0,0], [1,1,1], [2,2,2]])) return true;
    if (checkLine(player, [[0,0,2], [1,1,1], [2,2,0]])) return true;
    if (checkLine(player, [[0,2,0], [1,1,1], [2,0,2]])) return true;
    if (checkLine(player, [[2,0,0], [1,1,1], [0,2,2]])) return true;

    return false;
}

function checkLine(player, positions) {
    return positions.every(([x, y, z]) => board[x][y][z] === player);
}

function isBoardFull() {
    return cells.every(cell => cell.occupied);
}

function endGame(message) {
    gameActive = false;
    showMessage(message);
    setTimeout(() => {
        hideMessage();
        resetGame();
    }, 2000);
}

function resetGame() {
    gameActive = true;
    currentPlayer = 'X';
    updatePlayerDisplay();

    // Remove symbol meshes
    cells.forEach(cell => {
        if (cell.symbolMesh) {
            scene.remove(cell.symbolMesh);
            cell.symbolMesh = null;
        }
        cell.occupied = false;
        cell.symbol = null;
    });

    // Reset board array
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                board[x][y][z] = null;
            }
        }
    }
}

function rotateBoard(angle) {
    if (isRotating) return;
    isRotating = true;
    targetRotation = scene.rotation.y + angle;
    setTimeout(() => {
        isRotating = false;
    }, 500);
}

function updatePlayerDisplay() {
    document.getElementById('player-name').textContent = currentPlayer;
}

function updateScore() {
    document.getElementById('score-x').textContent = scores.X;
    document.getElementById('score-o').textContent = scores.O;
}

function showMessage(text) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.classList.remove('hidden');
}

function hideMessage() {
    document.getElementById('message').classList.add('hidden');
}

function onWindowResize() {
    updateRendererSize();
}

function animate() {
    requestAnimationFrame(animate);

    // Smooth rotation
    if (Math.abs(targetRotation - scene.rotation.y) > 0.01) {
        scene.rotation.y += (targetRotation - scene.rotation.y) * 0.1;
    }

    // Auto-rotate slowly
    if (!isRotating && !isDragging) {
        scene.rotation.y += 0.002;
        targetRotation = scene.rotation.y;
    }

    renderer.render(scene, camera);
}

// Start the game when page loads
window.addEventListener('load', init);
