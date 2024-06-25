const DIM = 8; // max 12 on laptop
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;
const RESPONSIVE_WIDTH = false;

// Arrays to store the JSON data
let jsonTiles = [];
let jsonItems = [];
let jsonOptions = [];

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
        });
        jsonOptions.options.categories.forEach(category => {
            category.image = loadImage(category.imagePath);
        });
    });

    // Load the empty cell image
    emptyCell = loadImage('/assets/images/emptyTile.png');

    //load the bottom cell image
    bottomCell = loadImage('/assets/images/blockHalf.png');
}

function setup() {
    if (RESPONSIVE_WIDTH) createCanvas(TILE_WIDTH * DIM, TILE_HEIGHT * DIM + TILE_HEIGHT * 3);
    else createCanvas(1024, 704) // perfect for DIM = 8
    imageMode(CENTER);
    initializeTiles();
    initializeItems();
    initializeGrid();
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
            items.push(new Tile(direction.image, direction.edges, item.type, item.seasons, item.category));
        });
    });
    emptyItem = new Tile(emptyCell, ["AAA", "AAA", "AAA", "AAA"], ['empty'], ["spring", "summer", "fall", "winter"], "none");
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
        grid[index] = new Cell(createVector(x, y - (DIM + 1) * TILE_HEIGHT / 2), getFilteredTiles(), getFilteredItems());
    }
}

function draw() {
    background(255);
    drawGrid();
    collapseGrid();
}

function resetGrid() {
    grid.forEach((cell, index) => {
        if (cell.locked) {
            if (cell.removed) {
                grid[index] = new Cell(cell.position, getFilteredTiles(), getFilteredItems());
                grid[index].removed = true;
            } else {
                grid[index] = new Cell(cell.position, cell.tileOptions, cell.itemOptions);
            }
            grid[index].locked = true;
            grid[index].collapsedTile = true;
            grid[index].itemLocked = true;
            grid[index].collapsedItem = true;
        } else {
            grid[index] = new Cell(cell.position, getFilteredTiles(), getFilteredItems());
        }
    });
    grid.forEach(cell => cell.analyzeItems(cell.itemOptions));

    grid.forEach(cell => {
        if (cell.locked) propagateConstraints(cell, 'tileOptions', 'collapsedTile');
        if (cell.itemLocked) propagateConstraints(cell, 'itemOptions', 'collapsedItem');
    });
}

// Function to filter options
function getFilteredTiles() {
    let newTiles = [];

    tiles.forEach(tile => {
        let isUsed = true;
        jsonOptions.options.types.forEach(type => {
            tile.types.forEach(tileType => {
                if (tileType === type.name && !type.used) {
                    isUsed = false;
                }
            });
        });
        if (isUsed) newTiles.push(tile);
    });
    newTiles.forEach(tile => tile.analyze(newTiles));
    return newTiles;
}

function getFilteredItems() {
    let newItems = [];

    items.forEach(item => {
        let isUsedCategory = false;
        jsonOptions.options.categories.forEach(category => {
            if (item.category === category.name && category.used) {
                isUsedCategory = true;
            }
        });
        let isUsedSeason = false;
        jsonOptions.options.seasons.forEach(season => {
            item.seasons.forEach(itemSeason => {
                if (itemSeason === season.name && season.used) {
                    isUsedSeason = true;
                }
            });
        });
        if ((isUsedCategory && isUsedSeason) || item.types.includes("empty")) newItems.push(item);
    });
    newItems.forEach(item => item.analyze(newItems));
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
    collapseCell('tileOptions', 'collapsedTile');
    if (grid.every(cell => cell.collapsedTile)) {
        grid.forEach(cell => cell.itemOptions = cell.analyzeItems(cell.itemOptions));
        collapseCell('itemOptions', 'collapsedItem');
    }
}

function collapseCell(optionsKey, itemKey) {
    const nonCollapsedCells = grid.filter(cell => !cell[itemKey]);

    if (nonCollapsedCells.length === 0) return;

    nonCollapsedCells.sort((a, b) => a[optionsKey].length - b[optionsKey].length);

    const minEntropy = nonCollapsedCells[0][optionsKey].length;
    const cellsWithLeastEntropy = nonCollapsedCells.filter(cell => cell[optionsKey].length === minEntropy);

    const selectedCell = getRandomElement(cellsWithLeastEntropy);
    const pick = getRandomElement(selectedCell[optionsKey]);

    if (!pick) {
        resetGrid();
        return;
    }

    selectedCell[itemKey] = true;
    selectedCell[optionsKey] = [pick];

    propagateConstraints(selectedCell, optionsKey, itemKey);
}

function propagateConstraints(cell, optionsKey, itemKey) {
    const stack = [cell];
    while (stack.length) {
        const current = stack.pop();
        const neighbors = getNeighbors(current);

        neighbors.forEach(neighbor => {
            if (neighbor && !neighbor[itemKey] && !neighbor.locked) {
                const direction = getDirection(current, neighbor);

                const validOptions = current[optionsKey].flatMap(option => option[direction]);

                const neighborOptions = neighbor[optionsKey].filter(option => validOptions.includes(option));
                if (neighborOptions.length < neighbor[optionsKey].length) {
                    neighbor[optionsKey] = neighborOptions;
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
    const neighbors = [];

    const addNeighbor = (condition, neighborIndex) => {
        if (condition) neighbors.push(grid[neighborIndex]);
    };

    addNeighbor(j > 0, index - DIM);         // up
    addNeighbor(i < DIM - 1, index + 1);     // right
    addNeighbor(j < DIM - 1, index + DIM);   // down
    addNeighbor(i > 0, index - 1);           // left

    return neighbors;
}

function getDirection(current, neighbor) {
    const currentIndex = grid.indexOf(current);
    const neighborIndex = grid.indexOf(neighbor);

    if (neighborIndex === currentIndex - DIM) return "up";
    if (neighborIndex === currentIndex + DIM) return "down";
    if (neighborIndex === currentIndex - 1) return "left";
    if (neighborIndex === currentIndex + 1) return "right";

    return null;
}

function getRandomElement(arr) {
    if (arr.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}