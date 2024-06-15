function reverseString(s) {
    return s.split('').reverse().join('');
}

function compareEdge(a, b) {
    return a === reverseString(b);
}


class Tile {
    constructor(image, edges, type) {
        this.image = image;
        this.edges = edges;
        this.up = [];
        this.right = [];
        this.down = [];
        this.left = [];
        this.type = type;
    }

    analyze(tiles) {
        for (let i = 0; i < tiles.length; i++) {
            let tile = tiles[i];
            if (compareEdge(tile.edges[2], this.edges[0])) {
                this.up.push(tile);
            }
            if (compareEdge(tile.edges[3], this.edges[1])) {
                this.right.push(tile);
            }
            if (compareEdge(tile.edges[0], this.edges[2])) {
                this.down.push(tile);
            }
            if (compareEdge(tile.edges[1], this.edges[3])) {
                this.left.push(tile);
            }
        }
    }
}

