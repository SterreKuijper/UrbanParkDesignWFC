class Cell {
    constructor(options, position, image, attribute) {
        this.collapsed = false;
        this.options = options;
        this.position = position;
        this.image = image;

        this.state = -1;
        this.attribute = attribute;

        this.elevation = 0;
    }

    // -1 normal state
    // -2 empty state
    // 1+ other state
    updateState(state) {
        this.state = state;
        if (this.state >= 0) this.options = [this.state];
        this.collapsed = state !== -1;
    }

    setAttribute(attribute) {
        this.attribute = attribute;
    }

    render() {
        image(this.image, this.position.x - this.image.width / 2, this.position.y - this.image.height / 2 + this.elevation);
        point(this.position.x, this.position.y);
    }

    update() {
        if (this.collapsed) this.image = this.options[0].image;
    }

    hover(temp) {
        this.elevation = this.isOverCell(temp)? -5 : 0;
    }

    isOverCell(temp) {
        return (Math.abs(temp.x - this.position.x) / TILE_WIDTH + Math.abs(temp.y - this.position.y + TILE_HEIGHT/2) / TILE_HEIGHT) <= 1
    }

}
