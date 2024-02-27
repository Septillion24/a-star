export class GridNode {
	xPos: number;
	yPos: number;
	contents: {
		isWalkable: boolean;
		isObjective: boolean;
		isStartingPoint: boolean;
	};

	constructor(
		x: number,
		y: number,
		{ isWalkable = true, isObjective = false, isStartingPoint = false } = {}
	) {
		this.xPos = x;
		this.yPos = y;
		this.contents = { isWalkable, isObjective, isStartingPoint };
	}
}
