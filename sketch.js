let jsonData;
let tiles = [];
let grid = [];
const DIM = 25;

function preload() {
    loadJSON('rules.json', data => {
        jsonData = data;
        jsonData.tiles.forEach(tile => {
            tile.image = loadImage(tile.image); // Load the image for the tile
        });
    });
}

function setup() {
    createCanvas(800, 800);
    initializeTiles();
    initializeGrid();
}

function initializeTiles() {
    // Create Tile objects from jsonData and add them to the tiles array
    jsonData.tiles.forEach(data => {
        let tile = new Tile(data.image, data.edges, data.rules, data.index);
        tiles.push(tile);
    });

    // Generate rotated versions of each tile and add unique rotations to the tiles array
    let initialTileCount = tiles.length;
    for (let i = 0; i < initialTileCount; i++) {
        let tempTiles = [];
        for (let j = 0; j < 4; j++) {
            tempTiles.push(tiles[i].rotate(j));
        }
        tempTiles = removeDuplicatedTiles(tempTiles); // Remove duplicate rotations
        tiles = tiles.concat(tempTiles); // Add unique rotations to the tiles array
    }

    console.log(tiles.length);
    console.table(tiles);

    // Generate the adjacency rules based on edges
    tiles.forEach(tile => tile.analyze(tiles));
}

// Function to remove duplicate tiles based on their edge patterns
function removeDuplicatedTiles(tiles) {
    const uniqueTilesMap = {};
    tiles.forEach(tile => {
        const key = tile.edges.join(','); // Create a unique key based on edges
        uniqueTilesMap[key] = tile; // Store unique tile in the map
    });
    return Object.values(uniqueTilesMap); // Return unique tiles as an array
}

// Function to initialize the grid with empty cells
function initializeGrid() {
    grid = Array(DIM * DIM).fill().map(() => new Cell(tiles.length));
}

function mousePressed() {
    initializeGrid();
}

function draw() {
    background(0);
    drawGrid();
    collapseGrid();
    propagateConstraints();
}

function drawGrid() {
    const w = width / DIM;
    const h = height / DIM;
    grid.forEach((cell, index) => {
        const i = index % DIM;
        const j = Math.floor(index / DIM);
        if (cell.collapsed) {
            image(tiles[cell.options[0]].img, i * w, j * h, w, h); // Draw collapsed tile
        } else {
            noFill();
            stroke(51);
            rect(i * w, j * h, w, h); // Draw empty cell
        }
    });
}

function collapseGrid() {
    let gridCopy = grid.filter(cell => !cell.collapsed); // Get non-collapsed cells
    if (gridCopy.length === 0) return; // Stop if all cells are collapsed

    gridCopy.sort((a, b) => a.options.length - b.options.length); // Sort by entropy
    const cell = random(gridCopy.filter(cell => cell.options.length === gridCopy[0].options.length));
    cell.collapsed = true;

    const pick = random(cell.options);
    if (pick === undefined) {
        initializeGrid(); // Restart if no valid option
        return;
    }

    cell.options = [pick];
    propagateConstraints(cell); // Start propagation from the collapsed cell
}

function propagateConstraints(cell) {
    let stack = [cell];
    while (stack.length > 0) {
        let current = stack.pop();
        let index = grid.indexOf(current);
        let neighbors = getNeighbors(index);

        neighbors.forEach(neighborIndex => {
            let neighbor = grid[neighborIndex];
            if (!neighbor.collapsed) {
                let options = Array.from({length: tiles.length}, (_, i) => i);
                const directions = [
                    {x: 0, y: -1, getValid: tile => tile.down}, // up
                    {x: 1, y: 0, getValid: tile => tile.left}, // right
                    {x: 0, y: 1, getValid: tile => tile.up}, // down
                    {x: -1, y: 0, getValid: tile => tile.right} // left
                ];

                directions.forEach(({x, y, getValid}) => {
                    const neighborNeighborIndex = neighborIndex + x + y * DIM;
                    if (neighborNeighborIndex >= 0 && neighborNeighborIndex < DIM * DIM) {
                        const neighborNeighbor = grid[neighborNeighborIndex];
                        if (neighborNeighbor.collapsed) {
                            const validOptions = neighborNeighbor.options.flatMap(option => getValid(tiles[option]));
                            checkValid(options, validOptions);
                        }
                    }
                });

                if (options.length < neighbor.options.length) {
                    neighbor.options = options;
                    stack.push(neighbor); // Add the neighbor to the stack for further propagation
                }
            }
        });
    }
}

// Function to filter valid options based on neighboring cells
function checkValid(arr, valid) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (!valid.includes(arr[i])) {
            arr.splice(i, 1); // Remove invalid option
        }
    }
}

function getNeighbors(index) {
    const i = index % DIM;
    const j = Math.floor(index / DIM);
    let neighbors = [];

    if (j > 0) neighbors.push(index - DIM); // up
    if (i < DIM - 1) neighbors.push(index + 1); // right
    if (j < DIM - 1) neighbors.push(index + DIM); // down
    if (i > 0) neighbors.push(index - 1); // left

    return neighbors;
}
