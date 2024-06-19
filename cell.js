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
        if (this.hasItem && !this.locked) image(this.item, this.position.x, this.position.y + this.offsetY);
    }

    update() {
        this.image = this.options[0] ? this.options[0].image : emptyCell;
        this.item = this.itemOptions[0] ? this.itemOptions[0].image : emptyCell;
        this.offsetY = this.hovered || this.selected ? -TILE_HEIGHT / 4 : 0;
    }

    analyzeItems(){
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
            this.showOptions();
        }
    }

    deselect() {
        if (this.selected) this.removeOptions();
        this.selected = false;
    }

    showOptions() {
        this.removeOptions();

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
                propagateConstraints(this);
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

    getDirection(neighbor) {
        const currentIndex = grid.indexOf(this);
        const neighborIndex = grid.indexOf(neighbor);

        if (neighborIndex === currentIndex - DIM) return "down";
        if (neighborIndex === currentIndex + DIM) return "up";
        if (neighborIndex === currentIndex - 1) return "right";
        if (neighborIndex === currentIndex + 1) return "left";

        return null;
    }

    removeOptions() {
        let optionsDiv = document.getElementById('cellOptions');
        optionsDiv.innerHTML = '';
    }
}

function cropImage(image) {
    let cropX = (image.width / 2) - TILE_WIDTH / 2;
    let cropY = (image.height / 2);

    // Crop the image using get()
    return image.get(cropX, cropY, TILE_WIDTH, TILE_HEIGHT * 2);
}

function imageToDataURL(image) {
    image.loadPixels();
    return image.canvas.toDataURL();

}