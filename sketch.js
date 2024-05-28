let jsonData;
let tiles = [];
let grid = [];
const DIM = 25;

// Preloads the JSON data and images for the tiles
function preload() {
    loadJSON('rules.json', data => {
        jsonData = data;
        jsonData.tiles.forEach(tile => {
            tile.image = loadImage(tile.imagePath); // Load the image for the tile
        });
    });
}

// Sets up the canvas and initializes the tiles and grid
function setup() {
    createCanvas(800, 800);
    initializeTiles();
    initializeGrid();
}

// Creates Tile objects from jsonData, adds unique rotations, and generates adjacency rules
function initializeTiles() {
    let tempTiles = [];
    jsonData.tiles.forEach(data => {
        let tile = new Tile(data.image, data.edges, data.rules, data.index);
        tempTiles.push(tile);
    });

    // Generate rotated versions of each tile and add unique rotations to the tiles array
    for (let i = 0; i < tempTiles.length; i++) {
        let allTiles = [];
        for (let j = 0; j < 4; j++) {
            allTiles.push(tempTiles[i].rotate(j));
        }
        allTiles = removeDuplicatedTiles(allTiles); // Remove duplicate rotations
        tiles = tiles.concat(allTiles); // Add unique rotations to the tiles array
    }

    console.log(tiles.length);
    console.table(tiles);

    // Generate the adjacency rules based on edges
    tiles.forEach(tile => tile.analyze(tiles));
}

// Removes duplicate tiles based on their edge patterns
function removeDuplicatedTiles(tiles) {
    const uniqueTilesMap = {};
    tiles.forEach(tile => {
        const key = tile.edges.join(','); // Create a unique key based on edges
        uniqueTilesMap[key] = tile; // Store unique tile in the map
    });
    return Object.values(uniqueTilesMap); // Return unique tiles as an array
}

// Initializes the grid with empty cells
function initializeGrid() {
    grid = Array(DIM * DIM).fill().map(() => new Cell(tiles.length));
}

// // Reinitializes the grid when the mouse is pressed
// function mousePressed() {
//     initializeGrid();
// }

// Main draw loop that handles drawing the grid, collapsing cells, and propagating constraints
function draw() {
    background(0);
    drawGrid();
    collapseGrid();
    propagateConstraints();
}

// Draws the current state of the grid
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

// Handles collapsing the least entropic cell and starts the propagation of constraints
function collapseGrid() {
    let gridCopy = grid.filter(cell => !cell.collapsed); // Get non-collapsed cells
    if (gridCopy.length === 0) return; // Stop if all cells are collapsed

    // Sort grid cells by entropy considering frequency
    gridCopy.sort((a, b) => calculateEntropy(a.options) - calculateEntropy(b.options));
    const cell = random(gridCopy.filter(cell => calculateEntropy(cell.options) === calculateEntropy(gridCopy[0].options)));

    let pick = weightedRandom(cell.options);

    if (pick === undefined) {
        initializeGrid(); // Restart if no valid option
        return;
    }

    let isValid = false;
    while (!isValid) {
        if (enforceMaxAmount(tiles[pick]) && enforceMaxCluster(tiles[pick], grid.indexOf(cell))) {
            isValid = true;
        } else {
            const pickIndex = cell.options.indexOf(pick);
            if (pickIndex > -1) { // only splice array when item is found
                cell.options.splice(pickIndex, 1); // 2nd parameter means remove one item only
            }

            // If no valid pick is left, reinitialize the grid and return
            if (cell.options.length === 0) {
                initializeGrid();
                return;
            }
            // Get a new pick
            pick = weightedRandom(cell.options);
        }
    }

    cell.collapsed = true;
    cell.options = [pick];
    propagateConstraints(cell); // Start propagation from the collapsed cell
}

// Helper function to calculate adjusted entropy
function calculateEntropy(options) {
    const totalFrequency = options.reduce((sum, option) => sum + (tiles[option].rules.frequency || 1), 0);
    return -options.reduce((sum, option) => {
        const frequency = tiles[option].rules.frequency || 1;
        const probability = frequency / totalFrequency;
        return sum + probability * Math.log(probability);
    }, 0);
}

// Helper function to select a tile based on frequency weights
function weightedRandom(options) {
    const weights = options.map(option => tiles[option].rules.frequency || 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const randomValue = Math.random() * totalWeight;

    let cumulativeWeight = 0;
    for (let i = 0; i < options.length; i++) {
        cumulativeWeight += weights[i];
        if (randomValue < cumulativeWeight) {
            return options[i];
        }
    }
    return options[options.length - 1];
}

// Uses the adjacency information to update the options of neighboring cells
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

// Filters valid options based on neighboring cells
function checkValid(arr, valid) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (!valid.includes(arr[i])) {
            arr.splice(i, 1); // Remove invalid option
        }
    }
}

// Returns the indices of the neighboring cells for a given index
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

function enforceMaxAmount(tile) {
    if (tile.rules && tile.rules.maxAmount) {
        let amount = 0;
        let maxAmount = tile.rules.maxAmount
        for (let i = 0; i < grid.length; i++) {
            if (grid[i].collapsed) {
                if (tiles[grid[i].options].index === tile.index) {
                    amount++
                }
            }
            if (amount >= maxAmount) {
                return false;
            }
        }
    }
    return true;
}

function enforceMaxCluster(tile, startIndex) {
    if (tile.rules && tile.rules.maxCluster) {
        const maxCluster = tile.rules.maxCluster;
        const visited = new Set();

        function countClusterSize(index) {
            if (visited.has(index)) return 0;
            visited.add(index);

            let count = 1;
            const neighbors = getNeighbors(index);

            for (const neighborIndex of neighbors) {
                const neighborTile = grid[neighborIndex];
                if (neighborTile.collapsed && tiles[neighborTile.options[0]].index === tile.index) {
                    count += countClusterSize(neighborIndex);
                    if (count > maxCluster) return count; // Early exit if maxCluster is exceeded
                }
            }

            return count;
        }

        const clusterSize = countClusterSize(startIndex);
        return clusterSize <= maxCluster;
    }

    return true;
}
