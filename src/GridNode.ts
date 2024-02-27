export class GridNode {
	xPos: number;
	yPos: number;
	isWalkable: boolean;
	contents: {
		isWalkable: boolean;
		isObjective: boolean;
	};

	constructor(x: number, y: number, { isWalkable = true, isObjective = false } = {}) {
		this.xPos = x;
		this.yPos = y;
		this.isWalkable = isWalkable;
		this.contents = { isWalkable, isObjective };
	}
}
