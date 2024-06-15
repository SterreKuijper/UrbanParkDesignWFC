const DIM = 8;
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;

let jsonTiles = [];
let jsonOptions = [];

let tiles = [];
let grid = [DIM * DIM];
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

        const indexX = index % DIM;
        const indexY = Math.floor(index / DIM);

        const x = (indexX - indexY) * TILE_WIDTH / 2 + width / 2 - imageCell.width / 2;
        let y = (indexX + indexY) * TILE_HEIGHT / 2 - imageCell.height / 2;

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
    gridCopy.sort((a, b) => a.options.length - b.options.length);

    // Get the cell with the least entropy
    gridCopy.filter(cell => cell.options.length === gridCopy[0].options.length);

    const cell = getRandomElement(gridCopy);

    // Pick a random tile from the cell's options
    const pick = getRandomElement(cell.options);

    if (pick === undefined) {
        initializeGrid();
        return;
    }

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

                // Get the index of the current cell in the grid
                const currentIndex = grid.indexOf(current);
                const neighborIndex = grid.indexOf(neighbor);

                // Determine the direction of the neighbor relative to the current cell
                let direction;
                if (neighborIndex === currentIndex - DIM) direction = "up";
                if (neighborIndex === currentIndex + DIM) direction = "down";
                if (neighborIndex === currentIndex - 1) direction = "left";
                if (neighborIndex === currentIndex + 1) direction = "right";

                // Get the valid options for the neighbor based on the current cell's selected option
                let validOptions = [];
                console.log(current.options)
                current.options.forEach(option => {
                    validOptions = validOptions.concat(option[direction]);
                });

                // Filter the neighbor's options to only include the valid ones
                let neighborOptions = neighbor.options.filter(option => validOptions.includes(option));
                if (neighborOptions.length < neighbor.options.length) {

                    neighbor.options = neighborOptions;

                    // If the neighbor's options were reduced, add it to the stack to propagate further
                    stack.push(neighbor);
                }
            }
        });
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

function getRandomElement(arr) {
    if (arr.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}
