const DIM = 8; // max 12 on laptop
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;

let jsonTiles = [];
let jsonOptions = [];

let tiles = [];
// let optionTiles = [];
let grid = [];
let emptyCell;
let bottomCell;

function preload() {
    // Load the tiles from the JSON file and load the images
    loadJSON('tiles.json', data => {
        jsonTiles = data;
        jsonTiles.tiles.forEach(tile => {
            tile.directions.forEach(direction => {
                direction.image = loadImage(direction.imagePath);
            });
        });
    });

    // Load the options from the JSON file and load the images
    loadJSON('options.json', data => {
        jsonOptions = data;
        jsonOptions.options.types.forEach(type => {
            type.image = loadImage(type.imagePath);
        });
    });

    // Load the empty cell image
    emptyCell = loadImage('/images/emptyTile.png');

    //load the bottom cell image
    bottomCell = loadImage('/tiles/border/cliff_blockHalf_rock_NE.png');
}

function setup() {
    createCanvas(1152, 640) // perfect for DIM = 8
    // createCanvas(TILE_WIDTH * DIM + TILE_WIDTH, TILE_HEIGHT * DIM + TILE_HEIGHT * 2);
    imageMode(CENTER);
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
            tiles.push(new Tile(direction.image, direction.edges, tile.type));
        });
        // optionTiles.push(new Tile(tile.directions[0].image, tile.directions[0].edges, tile.type))
    });
    tiles.forEach(tile => tile.analyze(tiles));
}

function initializeGrid() {
    for (let index = 0; index < DIM * DIM; index++) {
        // Get the options for the cell
        let tiles = getFilteredTiles();

        // Calculate the indexes of the cell in the grid
        const indexX = index % DIM;
        const indexY = Math.floor(index / DIM);

        // Determine the position of the cell
        const x = (indexX - indexY) * TILE_WIDTH / 2 + width / 2;
        let y = (indexX + indexY) * TILE_HEIGHT / 2 + height / 2;

        // Create the cell
        grid[index] = new Cell(tiles, createVector(x, y - (DIM + 1) * TILE_HEIGHT / 2), emptyCell);
    }
}

function resetGrid() {
    grid.forEach((cell, index) => {
        if (cell.locked) {
            if (cell.removed) {
                grid[index] = new Cell(getFilteredTiles(), cell.position, cell.options[0].image);
                grid[index].removed = true;

            } else {
                grid[index] = new Cell(cell.options, cell.position, cell.options[0].image);
            }
            grid[index].locked = true;
            grid[index].collapsed = true;
        } else {
            grid[index] = new Cell(getFilteredTiles(), cell.position, emptyCell);
        }
    });

    // Propagate constraints for all locked cells after resetting the grid
    grid.forEach(cell => {
        if (cell.locked) {
            propagateConstraints(cell);
        }
    });
}


// Function to filter options
function getFilteredTiles() {
    return tiles.filter(tile => !jsonOptions.options.types.some(type => tile.type === type.name && !type.used));
}

function drawGrid() {
    grid.forEach((cell) => {
        cell.update();
        cell.render();
    });
}

function mouseMoved() {
    grid.forEach((cell) => {
        cell.hover(createVector(mouseX, mouseY));
    });
}

function mouseClicked() {
    grid.forEach((cell) => {
        cell.deselect();
        cell.select(createVector(mouseX, mouseY));
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

    // Sort the grid by the number of options (entropy)
    gridCopy.sort((a, b) => a.options.length - b.options.length);

    // Get the cell with the least entropy
    const cellsWithLeastEntropy = gridCopy.filter(cell => cell.options.length === gridCopy[0].options.length);

    // Select a random cell from the cells with the least entropy
    const cell = getRandomElement(cellsWithLeastEntropy);

    // Pick a random tile from the cell's options
    const pick = getRandomElement(cell.options);

    if (pick === undefined) {
        resetGrid();
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
            if (neighbor && !neighbor.collapsed && !neighbor.locked) {

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
