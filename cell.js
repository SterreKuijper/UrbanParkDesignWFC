class Cell {
    constructor(value, attribute) {
        this.collapsed = false;
        if (value instanceof Array) {
            this.options = value;
        } else {
            this.options = [];
            for (let i = 0; i < value; i++) {
                this.options[i] = i;
            }
        }
        this.state = -1;
        this.attribute = attribute;
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
}
