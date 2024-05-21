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
    startOver();
}

function initializeTiles() {
    // Create Tile objects from jsonData and add them to the tiles array
    jsonData.tiles.forEach(data => {
        let tile = new Tile(data.image, data.edges, data.index);
        tiles.push(tile);
    });

    // Assign indices to each tile
    tiles.forEach((tile, i) => {
        tile.index = i;
    });

    // Generate rotated versions of each tile and add unique rotations to the tiles array
    let initialTileCount = tiles.length;
    for (let i = 0; i < initialTileCount; i++) {
        let tempTiles = [];
        for (let j = 0; j < 4; j++) {
            tempTiles.push(tiles[i].rotate(j)); // Rotate tile j times
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

function startOver() {
    // Reset the grid with new cells
    grid = Array(DIM * DIM).fill().map(() => new Cell(tiles.length));
}

// Function to filter valid options based on neighboring cells
function checkValid(arr, valid) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (!valid.includes(arr[i])) {
            arr.splice(i, 1); // Remove invalid option
        }
    }
}

function mousePressed() {
    startOver();
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

    const len = gridCopy[0].options.length;
    const stopIndex = gridCopy.findIndex(cell => cell.options.length > len);
    if (stopIndex > 0) gridCopy = gridCopy.slice(0, stopIndex); // Get cells with the least entropy

    const cell = random(gridCopy);
    cell.collapsed = true;
    const pick = random(cell.options);
    if (pick === undefined) {
        startOver(); // Restart if no valid option
        return;
    }
    cell.options = [pick]; // Collapse cell to the picked option
}

function propagateConstraints() {
    grid = grid.map((cell, index) => {
        if (cell.collapsed) return cell;

        let options = Array.from({length: tiles.length}, (_, i) => i);

        const directions = [
            {x: 0, y: -1, getValid: tile => tile.down}, // up
            {x: 1, y: 0, getValid: tile => tile.left}, // right
            {x: 0, y: 1, getValid: tile => tile.up}, // down
            {x: -1, y: 0, getValid: tile => tile.right} // left
        ];

        directions.forEach(({x, y, getValid}) => {
            const neighborIndex = index + x + y * DIM;
            if (neighborIndex >= 0 && neighborIndex < DIM * DIM) {
                const neighbor = grid[neighborIndex];
                if (neighbor.collapsed) {
                    const validOptions = neighbor.options.flatMap(option => getValid(tiles[option]));
                    checkValid(options, validOptions);
                }
            }
        });

        return new Cell(options); // Return new cell with valid options
    });
}
