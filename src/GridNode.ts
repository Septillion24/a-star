export class GridNode {
	xPos: number;
	yPos: number;
	fScore: number | undefined;
	previousNodeInPath: GridNode | undefined;
	nextNodeInPath: GridNode | undefined;
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

	distanceTo(xGoal: number, yGoal: number): number {
		const deltaX = Math.abs(this.xPos - xGoal);
		const deltaY = Math.abs(this.yPos - yGoal);

		const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

		return distance;
	}
	setPrevious(previous: GridNode) {
		this.previousNodeInPath = previous;
	}
	setNext(next: GridNode) {
		this.nextNodeInPath = next;
	}
	getDepthInTree(currentCount: number = 0): number {
		if (!this.previousNodeInPath) return 0;
		return this.previousNodeInPath?.getDepthInTree(currentCount) + 1;
	}
}
