class Cell {
    constructor(value) {
        this.collapsed = false;
        if (value instanceof Array) {
            this.options = value;
        } else {
            this.options = [];
            for (let i = 0; i < value; i++) {
                this.options[i] = i;
            }
        }
        this.state = 0;
    }

    updateState() {
        this.maxState = tiles.length + 1;
        this.state++;
        if (this.state > this.maxState) this.state = 0;

        this.collapsed = this.state !== 0;
        if (this.state > 1) this.options = [this.state - 2];
    }
}
