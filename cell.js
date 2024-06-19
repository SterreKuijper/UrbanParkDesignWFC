class Cell {
    constructor(options, position, image) {
        this.collapsed = false;
        this.tiles = options;
        this.options = options;
        this.position = position;
        this.image = image;

        this.offsetY = 0;
        this.hovered = false;
        this.selected = false;
        this.removed = false;
    }

    render() {
        if (!this.removed) {
            // Draw the bottom cell first
            image(bottomCell, this.position.x - bottomCell.width / 2, this.position.y - bottomCell.height / 2 + 44 + this.offsetY);
            // Draw the cell
            image(this.image, this.position.x - this.image.width / 2, this.position.y - this.image.height / 2 + this.offsetY);
        }
    }

    update() {
        if (this.collapsed) this.image = this.options[0].image;
        this.offsetY = this.hovered || this.selected ? -TILE_HEIGHT / 4 : 0;
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
        let optionsDiv = document.getElementById('cellOptions');

        this.tiles.forEach(tile => {
            let tileDiv = document.createElement('div');
            let tileImg = document.createElement('img')

            tileImg.src = imageToDataURL(cropImage(tile.image));

            tileDiv.appendChild(tileImg);
            optionsDiv.appendChild(tileDiv);
        });
    }

    removeOptions() {
        let optionsDiv = document.getElementById('cellOptions');
        optionsDiv.innerHTML = '';
    }

    setOptions(options) {
        this.options = options;
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