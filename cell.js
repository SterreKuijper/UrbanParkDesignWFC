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
        const posX = this.position.x;
        const posY = this.position.y + this.offsetY;

        if (this.removed) {
            image(bottomCell, posX, posY + TILE_HEIGHT, TILE_WIDTH, TILE_WIDTH);
        } else {
            if (this.collapsed) {
                if (this.locked) tint(223, 255);
                image(bottomCell, posX, posY + 44);
                image(this.image, posX, posY);
                noTint();
            } else {
                image(bottomCell, posX, posY + TILE_HEIGHT, TILE_WIDTH, TILE_WIDTH);
            }
        }
        if (this.hasItem) image(this.item, posX, posY);
    }


    update() {
        this.image = this.options[0] ? this.options[0].image : emptyCell;
        this.item = this.itemOptions[0] ? this.itemOptions[0].image : emptyCell;
        this.offsetY = this.hovered || this.selected ? -TILE_HEIGHT / 4 : 0;
    }

    analyzeItems(items) {
        if (this.collapsed) {
            return items.filter(item => {
                if (item.types.includes('empty')) return true;

                return item.types.some(itemType => {
                    return this.options[0].types.some(tileType => {
                        return tileType === itemType;
                    });
                });
            });
        } else {
            return items;
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
        if (this.selected) this.removeOptionsFromDiv('cellOptions');
        if (this.selected) this.removeOptionsFromDiv('itemOptions');
        this.selected = false;
    }

    showTileOptions() {
        const parentId = 'cellOptions';
        this.removeOptionsFromDiv(parentId);

        // Add the empty option
        addOption(parentId, 'emptyOption', 'assets/images/empty.png', () => {
            this.removed = true;
            this.locked = true;
            propagateConstraints(this, 'options', 'collapsed');
        });

        // Add the lock option
        addOption(parentId, 'lockedOption', 'assets/images/lock.png', () => {
            this.locked = true;
            this.removed = false;
            propagateConstraints(this, 'options', 'collapsed');
        });

        // Add the reset option
        addOption(parentId, 'resetOption', 'assets/images/reset.png', () => {
            this.removed = false;
            this.locked = false;
            propagateConstraints(this, 'options', 'collapsed');
        });

        // Add the tile options
        const validTiles = this.getValidBasedOnNeighbors(getFilteredTiles());
        validTiles.forEach((tile, index) => {
            addOption(parentId, 'tile' + index, imageToDataURL(cropImage(tile.image)), () => {
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
                propagateConstraints(this, 'options', 'collapsed');
            });
        });
    }

    showItemOptions() {
        const parentId = 'itemOptions';
        this.removeOptionsFromDiv(parentId);

        // Add the empty option
        addOption(parentId, 'emptyItemOption', 'assets/images/empty.png', () => {
            this.itemOptions = [emptyItem];
            this.item = emptyItem.image;
            this.itemLocked = true;
            // this.hasItem = true;
            propagateConstraints(this, parentId, 'hasItem');

        });

        // Add the lock option
        addOption(parentId, 'lockedItemOption', 'assets/images/lock.png', () => {
            this.itemLocked = true;
            propagateItemsConstraints(this);
            this.locked = true;
            this.removed = false;
            propagateConstraints(this, parentId, 'hasItem');
        });

        // Add the reset option
        addOption(parentId, 'resetItemOption', 'assets/images/reset.png', () => {
            this.itemLocked = false;
            propagateConstraints(this, parentId, 'hasItem');
        });

        // Add the tile options
        let validItems = this.analyzeItems(this.getValidBasedOnNeighbors(getFilteredItems()));
        validItems.forEach((tile, index) => {
            addOption(parentId, 'tile' + index, imageToDataURL(cropImage(tile.image, 0, -TILE_HEIGHT * 1.25, TILE_WIDTH, TILE_HEIGHT * 2.5)), () => {
                this.itemLocked = true;
                this.itemOptions = [tile];
                this.item = tile.image;
                propagateConstraints(this, parentId, 'hasItem');
                this.locked = true;
                this.removed = false;
                this.collapsed = true;
                propagateConstraints(this, parentId, 'hasItem');
            });
        });
    }

    getValidBasedOnNeighbors(valid) {
        let neighbors = getNeighbors(this);

        neighbors.forEach(neighbor => {
            if (neighbor.locked && neighbor.options.length === 1) {
                const neighborTile = neighbor.options[0];
                const direction = getDirection(this, neighbor);
                valid = valid.filter(tile => neighborTile[direction].includes(tile));
            }
        });

        return valid;

    }

    removeOptionsFromDiv(id) {
        document.getElementById(id).innerHTML = '';
    }
}

function cropImage(image, offsetX = 0, offsetY = 0, w = TILE_WIDTH, h = TILE_HEIGHT * 2) {
    let cropX = (image.width / 2) - TILE_WIDTH / 2;
    let cropY = (image.height / 2);

    // Crop the image using get()
    return image.get(cropX + offsetX, cropY + offsetY, w, h);
}

function imageToDataURL(image) {
    image.loadPixels();
    return image.canvas.toDataURL();

}