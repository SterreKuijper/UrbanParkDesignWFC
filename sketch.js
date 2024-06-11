let jsonData;
let tiles = [];
let grid = [];
const DIM = 10;
let emptyCell;

// Preloads the JSON data and images for the tiles
function preload() {
    loadJSON('/tiles/3d-park/rules.json', data => {
        jsonData = data;
        jsonData.tiles.forEach(tile => {
            tile.image = loadImage(tile.imagePath); // Load the image for the tile
        });
    });
    emptyCell = loadImage('/tiles/3d-park/empty.png');
}

// Sets up the canvas and initializes the tiles and grid
function setup() {
    createCanvas(800, 500);
    initializeTiles();
    initializeGrid();
}

// Creates Tile objects from jsonData, adds unique rotations, and generates adjacency rules
function initializeTiles() {
    jsonData.tiles.forEach(data => {
        let tile = new Tile(data.image, data.edges, data.rules, data.index);
        tiles.push(tile);
    });

    console.log('Length tiles: ' + tiles.length);
    console.log('Table tiles: ');
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
    if (grid.length === 0) {
        // Initialize new cells if the grid is empty
        grid = Array(DIM * DIM).fill().map(() => new Cell(tiles.length));
    } else {
        // Update existing cells or initialize new ones if cell state is -1
        grid = grid.map(cell => (cell.state === -1 ? new Cell(tiles.length) : cell));
    }
}

// Main draw loop that handles drawing the grid, collapsing cells, and propagating constraints
function draw() {
    background(255);
    drawGrid();
    collapseGrid();
    propagateConstraints();
}

function drawGrid() {
    const w = width / DIM;
    const h = w/2;
    const depth = height / DIM + h/4;

    grid.forEach((cell, index) => {
        const imageCell = cell.collapsed ? (cell.state !== -2 ? tiles[cell.options[0]].img : emptyCell) : emptyCell;
        const scale = w / imageCell.width;
        imageCell.resize(imageCell.width * scale, imageCell.height * scale);

        const xIndex = index % DIM;
        const yIndex = Math.floor(index / DIM);

        const x = (xIndex - yIndex) * w / 2 + width / 2 - w / 2;
        let y = (xIndex + yIndex) * h / 2;
        const z = depth - imageCell.height;

        if (isOverCell(x, y, z, imageCell)) {
            y = (xIndex + yIndex) * h / 2 - 5;
        }

        image(imageCell, x, y + z); // draw the image
    });
}

function isOverCell(x, y, z, imageCell) {
    const px = mouseX;
    const py = mouseY;

    // Define the vertices of the diamond shape
    const vertices = [
        {x: x + imageCell.width / 2, y: y + z},
        {x: x + imageCell.width, y: y + z + imageCell.height / 2 - imageCell.height / 10},
        {x: x + imageCell.width / 2, y: y + z + imageCell.height - imageCell.height / 10 * 2},
        {x: x, y: y + z + imageCell.height / 2 - imageCell.height / 10}
    ];

    let isInside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;

        const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }

    return isInside;
}


function mouseClicked() {
    const w = width / DIM;
    const h = w/2;
    const depth = height / DIM + h/4;

    grid.forEach((cell, index) => {
        const imageCell = cell.collapsed ? (cell.state !== -2 ? tiles[cell.options[0]].img : emptyCell) : emptyCell;
        const scale = w / imageCell.width;
        imageCell.resize(imageCell.width * scale, imageCell.height * scale);

        const xIndex = index % DIM;
        const yIndex = Math.floor(index / DIM);

        const x = (xIndex - yIndex) * w / 2 + width / 2 - w / 2;
        let y = (xIndex + yIndex) * h / 2;
        const z = depth - imageCell.height;

        if (isOverCell(x, y, z, imageCell)) {
            showOptions(index);
        }
    });
}

function showOptions(index) {
    const options = document.getElementById('cellOptions');
    options.innerHTML = '';

    // Add empty option
    const emptyOptionDiv = document.createElement('div');
    const emptyOption = document.createElement('img');
    emptyOption.src = 'images/empty.png';
    emptyOption.width = 65;

    emptyOption.onclick = () => {
        grid[index].updateState(-2);
        removeOptions();
    }

    emptyOptionDiv.appendChild(emptyOption);
    options.appendChild(emptyOptionDiv);

    // Add lock option
    const lockOptionDiv = document.createElement('div');
    const lockOption = document.createElement('img');
    lockOption.src = 'images/lock.png';
    lockOption.width = 65;

    lockOption.onclick = () => {
        grid[index].updateState(grid[index].options[0]);
        removeOptions();
    }

    lockOptionDiv.appendChild(lockOption);
    options.appendChild(lockOptionDiv);

    // Add reset option
    const resetOptionDiv = document.createElement('div');
    const resetOption = document.createElement('img');
    resetOption.src = 'images/reset.png';
    resetOption.width = 65;

    resetOption.onclick = () => {
        grid[index].updateState(-1);
        removeOptions();
    }

    resetOptionDiv.appendChild(resetOption);
    options.appendChild(resetOptionDiv);

    jsonData.tiles.forEach(tile => {
        const optionDiv = document.createElement('div');
        const option = document.createElement('img');
        option.src = tile.imagePath;

        option.onclick = () => {
            grid[index].updateState(tile.index);
            removeOptions();
        }

        optionDiv.appendChild(option);
        options.appendChild(optionDiv);
    })
}

function removeOptions() {
    const options = document.getElementById('cellOptions');
    options.innerHTML = '';
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
