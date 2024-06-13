const DIM = 8;
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;

let jsonTiles = [];
let jsonOptions = [];

let tiles = [];
let grid = [DIM*DIM];
let emptyCell;

function preload() {
    // Load the tiles from the JSON file and load the images
    loadJSON('/tilesets/isometric-park/tiles.json', data => {
        jsonTiles = data;
        jsonTiles.tiles.forEach(tile => {
            tile.directions.forEach(direction => {
                direction.image = loadImage(direction.imagePath);
            });
        });
    });

    // Load the options from the JSON file and load the images
    loadJSON('/tilesets/isometric-park/options.json', data => {
        jsonOptions = data;
        jsonOptions.options.types.forEach(type => {
            type.image = loadImage(type.imagePath);
        });
    });

    // Load the empty cell image
    emptyCell = loadImage('/tilesets/isometric-park/tiles/ground_grass_NE.png');
}

function setup() {
    createCanvas(1280, 700);
    initializeTiles();
    initializeGrid();
}

function draw() {
    background(255);
    drawGrid();
    collapseGrid();
}

function initializeTiles() {
    jsonTiles.tiles.forEach(tile => {
        tile.directions.forEach(direction => {
            let newTile = new Tile(direction.image, direction.edges, tile.type);
            tiles.push(newTile);
        });
    });
    tiles.forEach(tile => tile.analyze(tiles));
}

function initializeGrid() {
    for (let i = 0; i < DIM * DIM; i++) {
        let options = [];

        tiles.forEach(tile => {
            // Check if any of the tile types are marked as used
            const isUsed = tile.type.some(tileType =>
                jsonOptions.options.types.some(optionType => optionType.name === tileType && optionType.used)
            );

            if (isUsed) {
                options.push(tile);
            }
        });

        grid[i] = new Cell(options);
    }
}

function drawGrid() {
    grid.forEach((cell, index) => {
        const imageCell = cell.collapsed ? cell.options[0].image : emptyCell;

        const xIndex = index % DIM;
        const yIndex = Math.floor(index / DIM);

        const x = (xIndex - yIndex) * TILE_WIDTH / 2 + width / 2 - imageCell.width / 2;
        let y = (xIndex + yIndex) * TILE_HEIGHT / 2 - imageCell.height / 2;

        image(imageCell, x, y);
    });
}

/**
 * Handles collapsing the least entropic cell
 * and starts the propagation of constraints
 */
function collapseGrid() {
    // Get the non-collapsed cells
    let gridCopy = grid.filter(cell => !cell.collapsed);

    // Stop if all cells are collapsed
    if (gridCopy.length === 0) return;

    // Sort the grid by the number of options
    gridCopy.sort((a, b) => calculateEntropy(a.options) - calculateEntropy(b.options));

    // Get the cell with the least entropy
    const cell = gridCopy[0];

    // Pick a random tile from the cell's options
    const pick = weightedRandom(cell.options);

    // Collapse the cell to the selected tile
    cell.collapsed = true;
    cell.options = [pick];

    // Propagate constraints
    propagateConstraints(cell);
}

// Uses the adjacency information to update the options of neighboring cells
function propagateConstraints(cell) {
    let stack = [cell];
    while (stack.length > 0) {
        let current = stack.pop();
        let neighbors = getNeighbors(current);

        neighbors.forEach(neighbor => {
            if (neighbor && !neighbor.collapsed) {
                let options = Array.from(neighbor.options);

                // Process up direction
                if (current.options[0]) {
                    let validUp = current.options[0].down;
                    checkValid(options, validUp);
                }

                // Process right direction
                if (current.options[0]) {
                    let validRight = current.options[0].left;
                    checkValid(options, validRight);
                }

                // Process down direction
                if (current.options[0]) {
                    let validDown = current.options[0].up;
                    checkValid(options, validDown);
                }

                // Process left direction
                if (current.options[0]) {
                    let validLeft = current.options[0].right;
                    checkValid(options, validLeft);
                }

                if (options.length < neighbor.options.length) {
                    neighbor.options = options;
                    stack.push(neighbor); // Add the neighbor to the stack for further propagation
                }
            }
        });
    }
}

// Filters valid options based on neighboring cells
function checkValid(arr, valid) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (!valid.includes(arr[i])) {
            arr.splice(i, 1); // Remove invalid option
        }
    }
}

// Returns the neighboring cells for a given cell
function getNeighbors(cell) {
    const index = grid.indexOf(cell);
    const i = index % DIM;
    const j = Math.floor(index / DIM);
    let neighbors = [];

    if (j > 0) neighbors.push(grid[index - DIM]); // up
    if (i < DIM - 1) neighbors.push(grid[index + 1]); // right
    if (j < DIM - 1) neighbors.push(grid[index + DIM]); // down
    if (i > 0) neighbors.push(grid[index - 1]); // left

    return neighbors;
}

// Helper function to calculate adjusted entropy
function calculateEntropy(options) {
    const totalFrequency = options.length;
    return -options.reduce((sum, option) => {
        const probability = 1 / totalFrequency;
        return sum + probability * Math.log(probability);
    }, 0);
}

// Helper function to select a tile based on equal weights
function weightedRandom(options) {
    const totalWeight = options.length;
    const randomValue = Math.random() * totalWeight;

    let cumulativeWeight = 0;
    for (let i = 0; i < options.length; i++) {
        cumulativeWeight += 1;
        if (randomValue < cumulativeWeight) {
            return options[i];
        }
    }
    return options[options.length - 1];
}
