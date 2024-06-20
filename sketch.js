const DIM = 8; // max 12 on laptop
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;

let jsonTiles = [];
let jsonOptions = [];
let jsonItems = [];

let tiles = [];
let items = [];
let grid = [];
let emptyCell;
let bottomCell;
let emptyItem;

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

    // Load the items from the JSON file and load the images
    loadJSON('items.json', data => {
        jsonItems = data;
        jsonItems.items.forEach(item => {
            item.directions.forEach(direction => {
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
        jsonOptions.options.seasons.forEach(season => {
            season.image = loadImage(season.imagePath);
        })
    });

    // Load the empty cell image
    emptyCell = loadImage('/assets/images/emptyTile.png');

    //load the bottom cell image
    bottomCell = loadImage('/assets/images/blockHalf.png');
}

function setup() {
    createCanvas(1024, 704) // perfect for DIM = 8
    // createCanvas(TILE_WIDTH * DIM, TILE_HEIGHT * DIM + TILE_HEIGHT*3);
    imageMode(CENTER);
    initializeTiles();
    initializeItems();
    initializeGrid();
}

function draw() {
    background(255);
    drawGrid();
    collapseGrid();
    if (grid.every(cell => cell.collapsed)) collapseItems();
}

function initializeTiles() {
    jsonTiles.tiles.forEach(tile => {
        tile.directions.forEach(direction => {
            tiles.push(new Tile(direction.image, direction.edges, tile.types));
        });
    });
    tiles.forEach(tile => tile.analyze(tiles));
}

function initializeItems() {
    jsonItems.items.forEach(item => {
        item.directions.forEach(direction => {
            items.push(new Tile(direction.image, direction.edges, item.type, item.seasons));
        });
    });
    emptyItem = new Tile(emptyCell, ["AAA", "AAA", "AAA", "AAA"], ['empty'], ["spring", "summer", "fall", "winter"]);
    items.push(emptyItem);
    items.forEach(item => item.analyze(items));
}

function initializeGrid() {
    for (let index = 0; index < DIM * DIM; index++) {
        // Calculate the indexes of the cell in the grid
        const indexX = index % DIM;
        const indexY = Math.floor(index / DIM);

        // Determine the position of the cell
        const x = (indexX - indexY) * TILE_WIDTH / 2 + width / 2;
        let y = (indexX + indexY) * TILE_HEIGHT / 2 + height / 2;

        // Create the cell
        grid[index] = new Cell(getFilteredTiles(), createVector(x, y - (DIM + 1) * TILE_HEIGHT / 2), getFilteredItems());
    }
}

function resetGrid() {
    grid.forEach((cell, index) => {
        if (cell.locked) {
            if (cell.removed) {
                grid[index] = new Cell(getFilteredTiles(), cell.position, getFilteredItems());
                grid[index].removed = true;

            } else {
                grid[index] = new Cell(cell.options, cell.position, cell.itemOptions);
            }
            grid[index].locked = true;
            grid[index].collapsed = true;
            grid[index].itemLocked = true;
            grid[index].hasItem = true;
        } else {
            grid[index] = new Cell(getFilteredTiles(), cell.position, getFilteredItems());
        }
    });

    // Propagate constraints for all locked cells after resetting the grid
    grid.forEach(cell => {
        if (cell.locked) propagateConstraints(cell);
        if (cell.itemLocked) propagateItemsConstraints(cell);

    });
}

// Function to filter options
function getFilteredTiles() {
    let newTiles = [];

    tiles.forEach(tile => {
        let isUsed = true;
        jsonOptions.options.types.forEach(type => {
            tile.types.forEach(itemType => {
                if (itemType === type.name && !type.used) {
                    isUsed = false;
                }
            });
        });
        if (isUsed) newTiles.push(tile);
    })
    return newTiles;
}

function getFilteredItems() {
    let newItems = [];

    items.forEach(item => {
        let isUsed = false;
        jsonOptions.options.seasons.forEach(season => {
            item.seasons.forEach(itemSeason => {
                if (itemSeason === season.name && season.used) {
                    isUsed = true;
                }
            });
        });
        if (isUsed) newItems.push(item);
    })
    return newItems;
}

function drawGrid() {
    grid.forEach(cell => {
        cell.update();
        cell.render();
    });
}

function mouseMoved() {
    grid.forEach(cell => {
        cell.hover(createVector(mouseX, mouseY));
    });
}

function mouseClicked() {
    grid.forEach(cell => {
        cell.deselect();
        cell.select(createVector(mouseX, mouseY));
    });
}

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

function collapseItems() {
    grid.forEach(cell => cell.itemOptions = cell.analyzeItems(cell.itemOptions));

    // Get the cells with no item
    let gridCopy = grid.filter(cell => !cell.hasItem);

    // Stop if all cells have an item
    if (gridCopy.length === 0) return;

    // Sort the grid by the number of options (entropy)
    gridCopy.sort((a, b) => a.itemOptions.length - b.itemOptions.length);

    // Get the cell with the least entropy
    const cellsWithLeastEntropy = gridCopy.filter(cell => cell.itemOptions.length === gridCopy[0].itemOptions.length);

    // Select a random cell from the cells with the least entropy
    const cell = getRandomElement(cellsWithLeastEntropy);

    // Pick a random tile from the cell's options
    const pick = getRandomElement(cell.itemOptions);

    if (pick === undefined) {
        resetGrid();
        return;
    }

    // Collapse the cell to the selected tile
    cell.hasItem = true;
    cell.itemOptions = [pick];

    // Propagate constraints
    propagateItemsConstraints(cell);
}

// Uses the adjacency information to update the options of neighboring cells
function propagateItemsConstraints(cell) {
    let stack = [cell];
    while (stack.length > 0) {
        let current = stack.pop();
        let neighbors = getNeighbors(current);

        neighbors.forEach(neighbor => {
            if (neighbor && !neighbor.hasItem) {

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
                current.itemOptions.forEach(item => {
                    validOptions = validOptions.concat(item[direction]);
                });

                // Filter the neighbor's options to only include the valid ones
                let neighborOptions = neighbor.itemOptions.filter(option => validOptions.includes(option));
                if (neighborOptions.length < neighbor.itemOptions.length) {
                    neighbor.itemOptions = neighborOptions;

                    // If the neighbor's options were reduced, add it to the stack to propagate further
                    stack.push(neighbor);
                }
            }
        });
    }
}
