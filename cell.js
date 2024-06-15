class Cell {
    constructor(options, position, image) {
        this.collapsed = false;
        this.options = options;
        this.position = position;
        this.image = image;

        this.state = -1;

        this.offsetY = 0;
    }

    render() {
        image(this.image, this.position.x - this.image.width / 2, this.position.y - this.image.height / 2 + this.offsetY);
    }

    update() {
        if (this.collapsed) this.image = this.options[0].image;
    }

    hover(temp) {
        this.offsetY = this.isOverCell(temp) ? -5 : 0;
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
}