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

    distanceTo(xGoal:number,yGoal:number): number{
        const deltaX = Math.abs(this.xPos - xGoal);
        const deltaY = Math.abs(this.yPos - yGoal);

        const distance = Math.sqrt(deltaX**2 + deltaY**2); 

        return distance;
    }

}
