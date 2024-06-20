class Cell {
    constructor(options, position, items) {
        this.collapsed = false;
        this.hasItem = false;
        this.options = options;
        this.position = position;
        this.itemOptions = items;

        this.offsetY = 0;
        this.hovered = false;
        this.selected = false;
        this.removed = false;
        this.locked = false;
        this.itemLocked = false;
    }

    render() {
        if (this.removed) {
            image(bottomCell, this.position.x, this.position.y + TILE_HEIGHT + this.offsetY, TILE_WIDTH, TILE_WIDTH);
        } else {
            if (this.collapsed) {
                if (this.locked) tint(223, 255); // 128 is 50% transparency
                image(bottomCell, this.position.x, this.position.y + 44 + this.offsetY);
                image(this.image, this.position.x, this.position.y + this.offsetY);
                noTint(); // Reset tint to ensure no unintended tinting
            } else {
                image(bottomCell, this.position.x, this.position.y + TILE_HEIGHT + this.offsetY, TILE_WIDTH, TILE_WIDTH);
            }
        }
        if (this.hasItem) image(this.item, this.position.x, this.position.y + this.offsetY);
    }

    update() {
        this.image = this.options[0] ? this.options[0].image : emptyCell;
        this.item = this.itemOptions[0] ? this.itemOptions[0].image : emptyCell;
        this.offsetY = this.hovered || this.selected ? -TILE_HEIGHT / 4 : 0;
    }

    analyzeItems() {
        if (this.collapsed) {
            this.itemOptions = this.itemOptions.filter(item =>
                item.type === 'empty' || this.options[0].type === item.type
            );
        }
    }


    isOverCell(temp) {
        let centerX = this.position.x;
        let centerY = this.position.y + TILE_HEIGHT;

        let translatedX = Math.abs(temp.x - centerX);
        let translatedY = Math.abs(temp.y - centerY);

        // Adjust calculations to match the diamond shape
        let dx = translatedX / (TILE_WIDTH / 2);
        let dy = translatedY / (TILE_HEIGHT / 2);

        return (dx + dy) <= 1;
    }

    hover(temp) {
        this.hovered = this.isOverCell(temp);
    }

    select(temp) {
        if (this.isOverCell(temp)) {
            this.selected = true;
            this.showTileOptions();
            this.showItemOptions();
        }
    }

    deselect() {
        if (this.selected) this.removeTileOptions();
        if (this.selected) this.removeItemOptions();
        this.selected = false;
    }

    showTileOptions() {
        this.removeTileOptions();

        // Add the empty option
        const emptyOption = addElementToCellOptions('emptyOption', 'assets/images/empty.png');
        emptyOption.onclick = () => {
            this.removed = true;
            this.locked = true;
            propagateConstraints(this);
        }

        // Add the lock option
        const lockOption = addElementToCellOptions('lockedOption', 'assets/images/lock.png');
        lockOption.onclick = () => {
            this.locked = true;
            this.removed = false;
            propagateConstraints(this);
        }

        // Add the reset option
        const resetOption = addElementToCellOptions('resetOption', 'assets/images/reset.png');
        resetOption.onclick = () => {
            this.removed = false;
            this.locked = false;
            propagateConstraints(this);
        }

        // Add the tile options
        const validTiles = this.getValidTilesBasedOnNeighbors();
        validTiles.forEach((tile, index) => {
            const tileOption = addElementToCellOptions('tile' + index, imageToDataURL(cropImage(tile.image)));
            tileOption.onclick = () => {
                this.locked = true;
                this.removed = false;
                this.collapsed = true;
                this.options = [tile];
                this.image = tile.image;
                if (tile.type !== this.itemOptions[0].type) {
                    this.itemOptions = [emptyItem];
                    this.item = emptyItem.image;
                    this.itemLocked = false;
                    this.hasItem = false;
                }
                propagateConstraints(this);
            }
        });
    }

    showItemOptions() {
        this.removeItemOptions();

        // Add the empty option
        const emptyOption = addElementToCellOptions('emptyItemOption', 'assets/images/empty.png', 'itemOptions');
        emptyOption.onclick = () => {
            this.itemOptions = [emptyItem];
            this.item = emptyItem.image;
            this.itemLocked = true;
            // this.hasItem = true;
            propagateItemsConstraints(this);
        }

        // Add the lock option
        const lockOption = addElementToCellOptions('lockedItemOption', 'assets/images/lock.png', 'itemOptions');
        lockOption.onclick = () => {
            this.itemLocked = true;
            propagateItemsConstraints(this);
            this.locked = true;
            this.removed = false;
            propagateConstraints(this);
        }

        // Add the reset option
        const resetOption = addElementToCellOptions('resetItemOption', 'assets/images/reset.png', 'itemOptions');
        resetOption.onclick = () => {
            this.itemLocked = false;
            propagateItemsConstraints(this);
        }

        // Add the tile options
        let validItems = this.getValidItemsBasedOnNeighbors();
        if (this.collapsed) {
            validItems = validItems.filter(item =>
                item.type === 'empty' || this.options[0].type === item.type
            );
        }
        validItems.forEach((tile, index) => {
            const tileOption = addElementToCellOptions('tile' + index, imageToDataURL(cropImage(tile.image, 0, -TILE_HEIGHT*1.25, TILE_WIDTH, TILE_HEIGHT*2.5)), 'itemOptions');
            tileOption.onclick = () => {
                this.itemLocked = true;
                this.itemOptions = [tile];
                this.item = tile.image;
                propagateItemsConstraints(this);
            }
        });
    }


    getValidTilesBasedOnNeighbors() {
        let neighbors = getNeighbors(this);
        let validTiles = getFilteredTiles();

        neighbors.forEach(neighbor => {
            if (neighbor.locked && neighbor.options.length === 1) {
                const neighborTile = neighbor.options[0];
                const direction = this.getDirection(neighbor);
                validTiles = validTiles.filter(tile => neighborTile[direction].includes(tile));
            }
        });

        return validTiles;
    }


    getValidItemsBasedOnNeighbors() {
        let neighbors = getNeighbors(this);
        let validItems = getFilteredItems();

        neighbors.forEach(neighbor => {
            if (neighbor.locked && neighbor.options.length === 1) {
                const neighborTile = neighbor.options[0];
                const direction = this.getDirection(neighbor);
                validItems = validItems.filter(tile => neighborTile[direction].includes(tile));
            }
        });

        return validItems;
    }

    getDirection(neighbor) {
        const currentIndex = grid.indexOf(this);
        const neighborIndex = grid.indexOf(neighbor);

        if (neighborIndex === currentIndex - DIM) return "down";
        if (neighborIndex === currentIndex + DIM) return "up";
        if (neighborIndex === currentIndex - 1) return "right";
        if (neighborIndex === currentIndex + 1) return "left";

        return null;
    }

    removeTileOptions() {
        let optionsDiv = document.getElementById('cellOptions');
        optionsDiv.innerHTML = '';
    }

    removeItemOptions() {
        let optionsDiv = document.getElementById('itemOptions');
        optionsDiv.innerHTML = '';
    }
}

function cropImage(image, offsetX = 0, offsetY = 0, w = TILE_WIDTH, h = TILE_HEIGHT*2) {
    let cropX = (image.width / 2) - TILE_WIDTH / 2;
    let cropY = (image.height / 2);

    // Crop the image using get()
    return image.get(cropX + offsetX, cropY + offsetY, w, h);
}

function imageToDataURL(image) {
    image.loadPixels();
    return image.canvas.toDataURL();

}