// JavaScript is the programming language that makes webpages interactive. While HTML creates the structure and CSS creates the appearance, JavaScript controls behavior, logic, and user interactions.

// Visual Palettes: An object (a collection of key-value pairs) storing color combinations for each selectable theme.
const THEMES = {
    neon: {
        bg: '#0f172a',
        wall: '#1e293b',
        path: '#020617',
        start: '#38bdf8',
        end: '#f43f5e',
        player: '#f59e0b',
        solution: '#10b981',
        visited: '#1e1b4b'
    },
    mono: {
        bg: '#ffffff',
        wall: '#18181b',
        path: '#f4f4f5',
        start: '#2563eb',
        end: '#dc2626',
        player: '#d97706',
        solution: '#16a34a',
        visited: '#e4e4e7'
    },
    emerald: {
        bg: '#022c22',
        wall: '#064e3b',
        path: '#065f46',
        start: '#6ee7b7',
        end: '#f87171',
        player: '#fbbf24',
        solution: '#a7f3d0',
        visited: '#044e3d'
    },
    blueprint: {
        bg: '#1e3a8a',
        wall: '#60a5fa',
        path: '#172554',
        start: '#38bdf8',
        end: '#fb7185',
        player: '#facc15',
        solution: '#4ade80',
        visited: '#1d4ed8'
    }
};

// A "Pseudo-Random Number Generator" (PRNG) is a mathematical formula that generates numbers that look completely random, but are actually deterministic (meaning if you start with the same "seed" number, you will always get the exact same sequence of numbers).
// We use a classic formula called a Linear Congruential Generator (LCG).
class SeededRNG {
    // A constructor is a special function called automatically when creating a new instance of a class.
    constructor(seed) {
        // ">>> 0" is a bitwise unsigned right-shift operator. It forces whatever number is passed to become a clean 32-bit positive integer.
        this.seed = (seed >>> 0) || 1;
    }
    // Generates a floating-point decimal number between 0 (inclusive) and 1 (exclusive), mimicking JavaScript's native Math.random().
    random() {
        // Math.imul performs C-style 32-bit integer multiplication, preventing rounding inaccuracies in large numbers.
        this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
        // Dividing by 2 to the power of 32 (4294967296) scales the result into a decimal between 0 and 1.
        return this.seed / 4294967296;
    }
}

// Global random number generator instance initialized with an initial default seed of 1.
let rng = new SeededRNG(1);

// Application State: A central object that holds the current "memory" and operational variables of the application at any given moment.
const state = {
    cols: 25,                 // Number of grid columns
    rows: 25,                 // Number of grid rows
    currentSeed: 0,           // The numerical seed used for the current maze
    currentAlgo: 'dfs',       // The chosen generation algorithm
    cellSize: 20,             // Pixel width and height of each individual cell on screen
    grid: [],                 // 2D Array (a grid of rows and columns) storing all cell objects
    animating: false,         // Boolean flag (true/false) tracking if a maze is currently generating
    playing: false,           // Boolean flag tracking whether manual player mode is currently active
    playerPos: { r: 0, c: 0 },// Player coordinates: row (r) and column (c)
    moveCount: 0,             // Number of steps taken by the player
    solutionPath: [],         // Array of coordinates forming the shortest route to the exit
    showSolution: false,      // Boolean flag indicating if the solution path overlay is turned on
    theme: 'neon'             // The currently active visual color theme
};

// A "Class" is a blueprint for creating objects with shared properties. Each "Cell" represents one square on the maze board.
class Cell {
    constructor(r, c) {
        this.r = r; // Row index
        this.c = c; // Column index
        // Initially, each cell starts as a fully enclosed box with four walls.
        this.walls = { top: true, right: true, bottom: true, left: true };
        // Used by maze generation algorithms to track if they have visited this cell yet.
        this.visited = false;
    }
}

// DOM References: "DOM" stands for Document Object Model, which is the browser's internal tree representation of the HTML elements.
// document.getElementById() finds an HTML tag by its unique "id" attribute so JavaScript can read from it or modify it.
const canvas = document.getElementById('maze-canvas');
// The "2D Rendering Context" provides the actual drawing tools (lines, colors, fills) to paint on the canvas.
const ctx = canvas.getContext('2d');
const selectAlgo = document.getElementById('algorithm-select');
const selectTheme = document.getElementById('theme-select');
const inputCols = document.getElementById('input-cols');
const inputRows = document.getElementById('input-rows');
const inputSeed = document.getElementById('input-seed');
const btnRandomSeed = document.getElementById('btn-random-seed');
const inputSpeed = document.getElementById('input-speed');
const valCols = document.getElementById('val-cols');
const valRows = document.getElementById('val-rows');
const statusText = document.getElementById('status-text');
const seedIndicator = document.getElementById('seed-indicator');
const statsText = document.getElementById('stats-text');
const winBanner = document.getElementById('win-banner');
const winDetails = document.getElementById('win-details');
const btnGenerate = document.getElementById('btn-generate');
const btnPlay = document.getElementById('btn-toggle-play');
const btnSolution = document.getElementById('btn-toggle-solution');
const btnExportSvg = document.getElementById('btn-export-svg');
const btnExportPng = document.getElementById('btn-export-png');
const btnSaveCurrent = document.getElementById('btn-save-current');
const savedMazesList = document.getElementById('saved-mazes-list');

// Builds a fresh 2D array of grid cells and resizes the HTML canvas to fit them.
function initGrid(cols, rows) {
    state.cols = cols;
    state.rows = rows;
    state.grid = [];
    // Nested for-loops: The outer loop iterates through each row, and the inner loop iterates through each column in that row.
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            row.push(new Cell(r, c));
        }
        state.grid.push(row);
    }

    // Calculate cell pixel dimensions so the entire maze fits cleanly inside a 600px display area.
    const maxDim = 600;
    state.cellSize = Math.max(8, Math.floor(maxDim / Math.max(cols, rows)));
    canvas.width = state.cols * state.cellSize;
    canvas.height = state.rows * state.cellSize;
}

// Knocks down the shared wall between two adjacent cells (Cell A and Cell B) to carve a passage.
function removeWallBetween(a, b) {
    const dr = a.r - b.r; // Difference in rows
    const dc = a.c - b.c; // Difference in columns
    if (dr === 1) { a.walls.top = false; b.walls.bottom = false; }
    else if (dr === -1) { a.walls.bottom = false; b.walls.top = false; }
    if (dc === 1) { a.walls.left = false; b.walls.right = false; }
    else if (dc === -1) { a.walls.right = false; b.walls.left = false; }
}

// Finds all neighboring cells directly adjacent (up, down, left, right) to a given cell, making sure not to step outside boundary edges.
function getNeighbors(cell) {
    const neighbors = [];
    const { r, c } = cell;
    if (r > 0) neighbors.push(state.grid[r - 1][c]);
    if (r < state.rows - 1) neighbors.push(state.grid[r + 1][c]);
    if (c > 0) neighbors.push(state.grid[r][c - 1]);
    if (c < state.cols - 1) neighbors.push(state.grid[r][c + 1]);
    return neighbors;
}

// Algorithm 1: Recursive Backtracker using Depth-First Search (DFS).
// "async" means this function can run asynchronous actions (like pausing for animations) without freezing the entire browser window.
async function generateDFS(speed) {
    // A "Stack" is a Last-In, First-Out (LIFO) data structure, like a stack of plates: you add to the top and remove from the top.
    const stack = [];
    const start = state.grid[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
        // Look at the most recently added cell at the top of the stack.
        const current = stack[stack.length - 1];
        const unvisited = getNeighbors(current).filter(n => !n.visited);

        if (unvisited.length > 0) {
            // Pick a random unvisited neighbor using our seeded random number generator.
            const next = unvisited[Math.floor(rng.random() * unvisited.length)];
            removeWallBetween(current, next);
            next.visited = true;
            stack.push(next);
        } else {
            // Backtrack: when trapped with no unvisited neighbors, pop the cell off the stack to step backward.
            stack.pop();
        }

        // If speed is not instant (100), pause execution briefly to create a visible step-by-step animation.
        if (speed < 100) {
            renderMaze();
            // A "Promise" represents a value that will resolve in the future. Combined with "await", it pauses code for a set number of milliseconds.
            await new Promise(res => setTimeout(res, (100 - speed) / 2));
        }
    }
}

// Algorithm 2: Randomized Kruskal's Algorithm.
// This treats the maze as a "graph" and builds a "Spanning Tree" (a connected structure with zero loops) by joining disconnected sets of cells.
async function generateKruskal(speed) {
    // Disjoint-Set / Union-Find data structure: tracks which connected cluster of passages each cell belongs to.
    const parent = {};
    function find(idx) {
        if (parent[idx] === idx) return idx;
        parent[idx] = find(parent[idx]); // Path compression: flattens tree for faster lookups
        return parent[idx];
    }
    function union(a, b) {
        parent[find(a)] = find(b); // Merges two separate clusters into one
    }

    // List all possible interior borders (edges) between adjacent cells.
    const edges = [];
    for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
            const idx = r * state.cols + c;
            parent[idx] = idx;
            if (r < state.rows - 1) edges.push({ a: state.grid[r][c], b: state.grid[r + 1][c] });
            if (c < state.cols - 1) edges.push({ a: state.grid[r][c], b: state.grid[r][c + 1] });
        }
    }

    // Fisher-Yates Shuffle: A mathematically proven algorithm to randomly shuffle an array using our seeded RNG.
    for (let i = edges.length - 1; i > 0; i--) {
        const j = Math.floor(rng.random() * (i + 1));
        [edges[i], edges[j]] = [edges[j], edges[i]];
    }

    // Inspect each wall in randomized order. If the two cells belong to different clusters, tear down the wall between them.
    for (let edge of edges) {
        const idA = edge.a.r * state.cols + edge.a.c;
        const idB = edge.b.r * state.cols + edge.b.c;
        if (find(idA) !== find(idB)) {
            union(idA, idB);
            removeWallBetween(edge.a, edge.b);
            if (speed < 100) {
                renderMaze();
                await new Promise(res => setTimeout(res, (100 - speed) / 4));
            }
        }
    }
}

// Algorithm 3: Randomized Prim's Algorithm.
// Starts from an initial cell and grows outward like tree branches by continually connecting cells on the boundary ("frontier") to the maze.
async function generatePrim(speed) {
    const start = state.grid[0][0];
    start.visited = true;
    let frontier = [];

    // Adds neighboring cells to the exploration frontier list.
    function addFrontier(cell) {
        for (let neighbor of getNeighbors(cell)) {
            if (!neighbor.visited && !frontier.includes(neighbor)) {
                frontier.push(neighbor);
            }
        }
    }

    addFrontier(start);

    while (frontier.length > 0) {
        // Pick a random cell out of the frontier using our seeded RNG.
        const randIdx = Math.floor(rng.random() * frontier.length);
        // splice() removes the chosen cell from the array and returns it.
        const cell = frontier.splice(randIdx, 1)[0];
        const visitedNeighbors = getNeighbors(cell).filter(n => n.visited);

        if (visitedNeighbors.length > 0) {
            const chosen = visitedNeighbors[Math.floor(rng.random() * visitedNeighbors.length)];
            removeWallBetween(cell, chosen);
            cell.visited = true;
            addFrontier(cell);
        }

        if (speed < 100) {
            renderMaze();
            await new Promise(res => setTimeout(res, (100 - speed) / 2));
        }
    }
}

// Breadth-First Search (BFS) Pathfinder: Explores equally in all directions level by level. It is guaranteed to find the shortest possible path through any unweighted maze.
function solveBFS() {
    // A "Queue" is a First-In, First-Out (FIFO) structure, like a line at a grocery store checkout.
    const q = [{ r: 0, c: 0, path: [{ r: 0, c: 0 }] }];
    // A "Set" is a collection of unique values, used here for fast lookup to see if we've already searched a cell coordinate.
    const visited = new Set(['0,0']);

    while (q.length > 0) {
        // shift() removes and returns the first element in the queue.
        const { r, c, path } = q.shift();
        // Check if we have reached the bottom-right exit.
        if (r === state.rows - 1 && c === state.cols - 1) {
            state.solutionPath = path;
            return;
        }

        const cell = state.grid[r][c];
        const directions = [
            { r: r - 1, c, wall: 'top' },
            { r, c: c + 1, wall: 'right' },
            { r: r + 1, c, wall: 'bottom' },
            { r, c: c - 1, wall: 'left' }
        ];

        for (let d of directions) {
            // Only traverse through passages where walls have been carved open.
            if (!cell.walls[d.wall] && d.r >= 0 && d.r < state.rows && d.c >= 0 && d.c < state.cols) {
                const key = `${d.r},${d.c}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    // Push new neighbor into queue along with the history of the path taken to reach it.
                    q.push({ r: d.r, c: d.c, path: [...path, { r: d.r, c: d.c }] });
                }
            }
        }
    }
}

// Canvas Renderer: Clears and redraws the maze, player marker, and solution lines onto the screen.
function renderMaze() {
    const theme = THEMES[state.theme];
    const sz = state.cellSize;

    // Clear background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw remaining walls
    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = 2;

    for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
            const cell = state.grid[r][c];
            const x = c * sz;
            const y = r * sz;

            ctx.beginPath();
            if (cell.walls.top) { ctx.moveTo(x, y); ctx.lineTo(x + sz, y); }
            if (cell.walls.right) { ctx.moveTo(x + sz, y); ctx.lineTo(x + sz, y + sz); }
            if (cell.walls.bottom) { ctx.moveTo(x, y + sz); ctx.lineTo(x + sz, y + sz); }
            if (cell.walls.left) { ctx.moveTo(x, y); ctx.lineTo(x, y + sz); }
            ctx.stroke();
        }
    }

    // Draw Start square (top-left) and Exit square (bottom-right)
    ctx.fillStyle = theme.start;
    ctx.fillRect(4, 4, sz - 8, sz - 8);

    ctx.fillStyle = theme.end;
    ctx.fillRect((state.cols - 1) * sz + 4, (state.rows - 1) * sz + 4, sz - 8, sz - 8);

    // Draw Shortest Path Solution line if toggled on
    if (state.showSolution && state.solutionPath.length > 0) {
        ctx.strokeStyle = theme.solution;
        ctx.lineWidth = Math.max(2, sz / 5);
        ctx.beginPath();
        state.solutionPath.forEach((pt, idx) => {
            const px = pt.c * sz + sz / 2;
            const py = pt.r * sz + sz / 2;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
            ctx.stroke();
    }

    // Draw Interactive Player token (circle) when play mode is active
    if (state.playing) {
        ctx.fillStyle = theme.player;
        ctx.beginPath();
        ctx.arc(
            state.playerPos.c * sz + sz / 2,
            state.playerPos.r * sz + sz / 2,
            sz / 3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

// Moves the player character if the path in that direction is open (no wall).
function movePlayer(dir) {
    if (!state.playing) return;
    const { r, c } = state.playerPos;
    const cell = state.grid[r][c];

    let moved = false;
    if (dir === 'up' && !cell.walls.top) { state.playerPos.r--; moved = true; }
    else if (dir === 'down' && !cell.walls.bottom) { state.playerPos.r++; moved = true; }
    else if (dir === 'left' && !cell.walls.left) { state.playerPos.c--; moved = true; }
    else if (dir === 'right' && !cell.walls.right) { state.playerPos.c++; moved = true; }

    if (moved) {
        state.moveCount++;
        statsText.textContent = `Moves: ${state.moveCount}`;
        renderMaze();

        // Check win condition: player has reached the final bottom-right cell
        if (state.playerPos.r === state.rows - 1 && state.playerPos.c === state.cols - 1) {
            state.playing = false;
            btnPlay.textContent = 'Play Maze';
            winDetails.textContent = `Solved in ${state.moveCount} moves!`;
            winBanner.classList.remove('hidden');
            statusText.textContent = 'Status: Maze Completed!';
        }
    }
}

// Controller function that initializes and kicks off maze generation.
async function startGeneration(customSeed = null) {
    if (state.animating) return; // Prevent triggering a new generation while one is already running

    state.animating = true;
    state.playing = false;
    state.showSolution = false;
    winBanner.classList.add('hidden');
    btnPlay.textContent = 'Play Maze';
    statusText.textContent = 'Status: Generating...';

    // Seed selection: prioritize passed argument, then text input box, and fall back to random integer if empty.
    let seedVal;
    if (customSeed !== null) {
        seedVal = customSeed;
    } else if (inputSeed.value.trim() !== '') {
        seedVal = parseInt(inputSeed.value, 10);
    } else {
        seedVal = Math.floor(Math.random() * 1000000000);
    }

    state.currentSeed = seedVal;
    inputSeed.value = seedVal;
    seedIndicator.textContent = `Seed: ${seedVal}`;

    // Reset the PRNG with the chosen seed so the exact same maze can be reproduced.
    rng = new SeededRNG(seedVal);

    initGrid(parseInt(inputCols.value, 10), parseInt(inputRows.value, 10));
    const speed = parseInt(inputSpeed.value, 10);
    state.currentAlgo = selectAlgo.value;

    if (state.currentAlgo === 'dfs') await generateDFS(speed);
    else if (state.currentAlgo === 'kruskal') await generateKruskal(speed);
    else if (state.currentAlgo === 'prim') await generatePrim(speed);

    // Pre-calculate the BFS solution route in the background
    solveBFS();
    renderMaze();
    state.animating = false;
    statusText.textContent = 'Status: Generation complete';
}

// Local Storage Management:
// Instead of saving megabytes of raw canvas pixels or thousands of wall states, we only save the compact settings (seed number, rows, columns, and algorithm).
const STORAGE_KEY = 'byu_cyber110_maze_bookmarks';

function getStoredMazes() {
    try {
        // Read the serialized text string from local storage and convert it back into JavaScript objects using JSON.parse().
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveStoredMazes(list) {
    // JSON.stringify() converts JavaScript arrays and objects into a plain text string suitable for storage.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    renderSavedMazesList();
}

function bookmarkCurrentMaze() {
    const list = getStoredMazes();
    const entry = {
        id: Date.now(), // Unique identifier using current timestamp in milliseconds
        seed: state.currentSeed,
        algorithm: selectAlgo.value,
        cols: parseInt(inputCols.value, 10),
        rows: parseInt(inputRows.value, 10),
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    list.unshift(entry); // Adds the new bookmark to the start of the list
    saveStoredMazes(list.slice(0, 30)); // Limit to the 30 most recent saves to conserve space
}

function deleteStoredMaze(id) {
    const list = getStoredMazes().filter(item => item.id !== id);
    saveStoredMazes(list);
}

function loadStoredMaze(id) {
    const item = getStoredMazes().find(i => i.id === id);
    if (!item) return;

    // Restore the saved configuration back into the input fields
    selectAlgo.value = item.algorithm;
    inputCols.value = item.cols;
    inputRows.value = item.rows;
    valCols.textContent = item.cols;
    valRows.textContent = item.rows;
    inputSeed.value = item.seed;

    // Re-run generation with the restored seed
    startGeneration(item.seed);
}

// Builds the visual list of saved bookmark cards in the sidebar
function renderSavedMazesList() {
    const list = getStoredMazes();
    savedMazesList.innerHTML = '';

    if (list.length === 0) {
        savedMazesList.innerHTML = '<p class="empty-hint">No saved maze seeds yet.</p>';
        return;
    }

    list.forEach(item => {
        const el = document.createElement('div');
        el.className = 'saved-item';
        el.innerHTML = `
        <div class="saved-info">
        <span class="saved-seed">#${item.seed}</span>
        <span class="saved-meta">${item.algorithm.toUpperCase()} • ${item.cols}×${item.rows} • ${item.date}</span>
        </div>
        <div class="saved-actions">
        <button class="load" data-id="${item.id}" title="Load this seed">Load</button>
        <button class="del" data-id="${item.id}" title="Delete">✕</button>
        </div>
        `;
        savedMazesList.appendChild(el);
    });
}

// File Export Functions:
// SVG Export: Builds a pure XML text representation of lines and shapes, packaging it into a downloadable vector file.
function exportSVG() {
    const sz = state.cellSize;
    const w = state.cols * sz;
    const h = state.rows * sz;
    const theme = THEMES[state.theme];

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;
    svg += `  <rect width="100%" height="100%" fill="${theme.bg}"/>\n`;
    svg += `  <g stroke="${theme.wall}" stroke-width="2">\n`;

    for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
            const cell = state.grid[r][c];
            const x = c * sz;
            const y = r * sz;
            if (cell.walls.top) svg += `    <line x1="${x}" y1="${y}" x2="${x + sz}" y2="${y}"/>\n`;
            if (cell.walls.right) svg += `    <line x1="${x + sz}" y1="${y}" x2="${x + sz}" y2="${y + sz}"/>\n`;
            if (cell.walls.bottom) svg += `    <line x1="${x}" y1="${y + sz}" x2="${x + sz}" y2="${y + sz}"/>\n`;
            if (cell.walls.left) svg += `    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + sz}"/>\n`;
        }
    }
    svg += `  </g>\n</svg>`;

    // A "Blob" (Binary Large Object) holds raw data in memory.
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maze-seed-${state.currentSeed}-${state.cols}x${state.rows}.svg`;
    a.click();
    URL.revokeObjectURL(url); // Clean up memory
}

// PNG Export: Converts canvas pixels into a standard image data URL and triggers a browser download.
function exportPNG() {
    const link = document.createElement('a');
    link.download = `maze-seed-${state.currentSeed}-${state.cols}x${state.rows}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Event Listeners: "EventListeners" tell the browser to wait for specific user actions (like clicks, key presses, or slider changes) and then execute a designated function.
inputCols.addEventListener('input', (e) => valCols.textContent = e.target.value);
inputRows.addEventListener('input', (e) => valRows.textContent = e.target.value);
selectTheme.addEventListener('change', (e) => {
    state.theme = e.target.value;
    renderMaze();
});

btnRandomSeed.addEventListener('click', () => {
    inputSeed.value = Math.floor(Math.random() * 1000000000);
});

btnGenerate.addEventListener('click', () => startGeneration());
btnSaveCurrent.addEventListener('click', bookmarkCurrentMaze);

// "Event Delegation": Attaching a single click listener to a parent container to manage clicks on current and future child elements.
savedMazesList.addEventListener('click', (e) => {
    const id = parseInt(e.target.getAttribute('data-id'), 10);
    if (!id) return;
    if (e.target.classList.contains('del')) {
        deleteStoredMaze(id);
    } else if (e.target.classList.contains('load')) {
        loadStoredMaze(id);
    }
});

btnPlay.addEventListener('click', () => {
    if (state.animating) return;
    state.playing = !state.playing;
    if (state.playing) {
        state.playerPos = { r: 0, c: 0 };
        state.moveCount = 0;
        statsText.textContent = 'Moves: 0';
        btnPlay.textContent = 'Stop Playing';
        statusText.textContent = 'Status: Playing (Use Arrow Keys / WASD)';
        winBanner.classList.add('hidden');
    } else {
        btnPlay.textContent = 'Play Maze';
        statusText.textContent = 'Status: Standby';
    }
    renderMaze();
});

btnSolution.addEventListener('click', () => {
    state.showSolution = !state.showSolution;
    renderMaze();
});

btnExportSvg.addEventListener('click', exportSVG);
btnExportPng.addEventListener('click', exportPNG);

// Keyboard Listeners: Catches Arrow keys and W, A, S, D key presses on the visitor's keyboard for player movement.
window.addEventListener('keydown', (e) => {
    const keyMap = {
        ArrowUp: 'up', KeyW: 'up',
        ArrowDown: 'down', KeyS: 'down',
        ArrowLeft: 'left', KeyA: 'left',
        ArrowRight: 'right', KeyD: 'right'
    };
    if (keyMap[e.code]) {
        e.preventDefault(); // Prevents arrow keys from scrolling the webpage up and down while playing
        movePlayer(keyMap[e.code]);
    }
});

// Mobile / On-screen D-Pad click handlers
document.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        movePlayer(btn.getAttribute('data-dir'));
    });
});

// Initial boot sequence: runs automatically when the page finishes loading
renderSavedMazesList();
startGeneration();
