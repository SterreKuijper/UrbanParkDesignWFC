class Cell {
    constructor(position, tileOptions, itemOptions) {
        this.collapsedTile = false;
        this.collapsedItem = false;
        this.tileOptions = tileOptions;
        this.itemOptions = itemOptions;

        this.position = position;
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
            if (this.collapsedTile) {
                if (this.locked) tint(223, 255);
                image(bottomCell, posX, posY + 44);
                image(this.image, posX, posY);
                noTint();
            } else {
                image(bottomCell, posX, posY + TILE_HEIGHT, TILE_WIDTH, TILE_WIDTH);
            }
        }
        if (this.collapsedItem) image(this.item, posX, posY);
    }

    update() {
        this.image = this.tileOptions[0] ? this.tileOptions[0].image : emptyCell;
        this.item = this.itemOptions[0] ? this.itemOptions[0].image : emptyCell;
        this.offsetY = this.hovered || this.selected ? -TILE_HEIGHT / 4 : 0;
    }

    analyzeItems(items) {
        if (this.collapsedTile) {
            return items.filter(item => {
                if (item.types.includes('empty')) return true;

                return item.types.some(itemType => {
                    return this.tileOptions[0].types.some(tileType => {
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
        if (this.selected) {
            this.removeOptionsFromDiv('tileOptions');
            this.removeOptionsFromDiv('itemOptions');
            document.getElementById('itemOptions').innerHTML = '<h2 class="open-sans-700">Select a cell to edit the tile or the item</h2>'
        }
        this.selected = false;
    }

    showTileOptions() {
        const tileOptions = 'tileOptions';
        this.removeOptionsFromDiv(tileOptions);

        document.getElementById('itemTitle').innerHTML = 'Item Options:';
        document.getElementById('tileTitle').innerHTML = 'Tile Options:';

        // Add the empty option
        addOption(tileOptions, 'emptyOption', 'assets/images/empty.png', () => {
                this.removed = true;
                this.locked = true;
                propagateConstraints(this, tileOptions, 'collapsedTile');
            },
            'Remove the entire cell.');

        // Add the lock option
        addOption(tileOptions, 'lockedOption', 'assets/images/lock.png', () => {
                this.locked = true;
                this.removed = false;
                propagateConstraints(this, tileOptions, 'collapsedTile');
            },
            'Lock the cell.');

        // Add the reset option
        addOption(tileOptions, 'resetOption', 'assets/images/reset.png', () => {
                this.removed = false;
                this.locked = false;
                propagateConstraints(this, tileOptions, 'collapsedTile');
            },
            'Reset the cell.');

        // Add the tile options
        let validTiles = this.getValidBasedOnNeighbors(getFilteredTiles(), 'tileOptions');
        let isFirst = true;
        validTiles = validTiles.filter(tile => {
            if (isFirst) {
                isFirst = false;
                return true;
            } else {
                return !tile.types.includes('grass');
            }
        });
        validTiles.forEach((tile, index) => {
            addOption(tileOptions, 'tile' + index, imageToDataURL(cropImage(tile.image)), () => {
                this.locked = true;
                this.removed = false;
                this.collapsedTile = true;
                this.tileOptions = [tile];
                this.image = tile.image;
                if (tile.type !== this.itemOptions[0].type) {
                    this.itemOptions = [emptyItem];
                    this.item = emptyItem.image;
                    this.itemLocked = false;
                    this.collapsedItem = false;
                }
                propagateConstraints(this, tileOptions, 'collapsedTile');
            });
        });
    }

    showItemOptions() {
        const itemOptions = 'itemOptions';
        this.removeOptionsFromDiv(itemOptions);

        document.getElementById('itemTitle').innerHTML = 'Item Options:';
        document.getElementById('tileTitle').innerHTML = 'Tile Options:';

        // Add the empty option
        addOption(itemOptions, 'emptyItemOption', 'assets/images/empty.png', () => {
                this.itemOptions = [emptyItem];
                this.item = emptyItem.image;
                this.itemLocked = true;
                propagateConstraints(this, itemOptions, 'collapsedItem');
            },
            'Remove the item.');

        // Add the lock option
        addOption(itemOptions, 'lockedItemOption', 'assets/images/lock.png', () => {
                this.itemLocked = true;
                propagateConstraints(this, itemOptions, 'collapsedItem');
                this.locked = true;
                this.removed = false;
                propagateConstraints(this, itemOptions, 'collapsedItem');
            },
            'Lock the item.');

        // Add the reset option
        addOption(itemOptions, 'resetItemOption', 'assets/images/reset.png', () => {
                this.itemLocked = false;
                propagateConstraints(this, itemOptions, 'collapsedItem');
            },
            'Reset the item.');

        // Add the tile options
        let validItems = this.getValidBasedOnNeighbors(getFilteredItems(), 'itemOptions');
        validItems = validItems.filter(item => {
            return item.category !== 'none';
        });
        validItems = this.analyzeItems(validItems);
        validItems.forEach((item, index) => {
            if (!this.removed) {
                addOption(itemOptions, 'item' + index, imageToDataURL(cropImage(item.image, 0, -TILE_HEIGHT * 1.25, TILE_WIDTH, TILE_HEIGHT * 2.5)), () => {
                    this.itemLocked = true;
                    this.itemOptions = [item];
                    this.item = item.image;
                    propagateConstraints(this, itemOptions, 'collapsedItem');
                    this.locked = true;
                    this.removed = false;
                    this.collapsedTile = true;
                    propagateConstraints(this, itemOptions, 'collapsedItem');
                });
            }
        });
    }

    getValidBasedOnNeighbors(valid, options) {
        let neighbors = getNeighbors(this);

        neighbors.forEach(neighbor => {
            if (neighbor.locked && neighbor[options].length === 1) {
                const neighborTile = neighbor[options][0];
                const direction = getDirection(this, neighbor);
                valid = valid.filter(tile => neighborTile[direction].includes(tile));
            }
        });

        return valid;
    }

    removeOptionsFromDiv(id) {
        document.getElementById(id).innerHTML = '';
        document.getElementById('tileTitle').innerHTML = '';
        document.getElementById('itemTitle').innerHTML = '';
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