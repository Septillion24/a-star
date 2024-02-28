import { GridNode } from './GridNode';

export class CanvasManager {
	static instance: CanvasManager;

	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;

	dimensions: { canvasWidth: number; canvasHeight: number; gridWidth: number; gridHeight: number };

	constructor(
		canvas: HTMLCanvasElement,
		dimensions: { canvasWidth: number; canvasHeight: number; gridWidth: number; gridHeight: number }
	) {
		this.canvas = canvas;
		this.dimensions = dimensions;
		this.ctx = canvas.getContext('2d')!;
	}
	getCanvasManager(
		canvas: HTMLCanvasElement,
		dimensions: { canvasWidth: number; canvasHeight: number; gridWidth: number; gridHeight: number }
	) {
		return CanvasManager.instance ? CanvasManager.instance : new CanvasManager(canvas, dimensions); // Singleton
	}

	refreshCanvas(gridContent: GridNode[][], shouldDisplayHeuristicOverlay:boolean) {
		if (this.canvas !== undefined && this.ctx !== undefined) {
			this.clearCanvas();

			this.displayOverlays(shouldDisplayHeuristicOverlay);
			this.displayGridNodes(gridContent);

			this.drawGridLines();
		}
	}
	displayOverlays(shouldDisplayHeuristicOverlay:boolean) {
		if (shouldDisplayHeuristicOverlay) {
			displayHeuristicOverlay();
		}
	}

	clearCanvas() {
		this.ctx.fillStyle = 'white';
		this.ctx.fillRect(0, 0, this.dimensions.canvasWidth, this.dimensions.canvasHeight);
	}
	drawGridSquare(x: number, y: number, color: string = 'black') {
		if (x > this.dimensions.gridWidth - 1) {
			throw new Error(
				`Index out of range. ${x} is greater than max index ${this.dimensions.gridWidth - 1}`
			);
		}
		if (y > this.dimensions.gridHeight - 1) {
			throw new Error(
				`Index out of range. ${y} is greater than max index ${this.dimensions.gridHeight - 1}`
			);
		}

		this.ctx.fillStyle = color;
		const gridSizeX = this.dimensions.canvasWidth / this.dimensions.gridWidth;
		const xPos = gridSizeX * x;

		const gridSizeY = this.dimensions.canvasHeight / this.dimensions.gridHeight;
		const yPos = gridSizeY * y;

		this.ctx.fillRect(xPos, yPos, gridSizeX, gridSizeY);
	}
	drawGridLines() {
		const gridSizeX = this.dimensions.canvasWidth / this.dimensions.gridWidth;
		const gridSizeY = this.dimensions.canvasHeight / this.dimensions.gridHeight;

		for (let i = 0; i < this.dimensions.gridWidth; i++) {
			drawVerticalLine(i * gridSizeX);
		}
		for (let i = 0; i < this.dimensions.gridHeight; i++) {
			drawHorizontalLine(i * gridSizeY);
		}
		function drawVerticalLine(xPos: number) {
			this.ctx.beginPath();
			this.ctx.moveTo(xPos, 0);
			this.ctx.lineTo(xPos, this.dimensions.canvasHeight);

			this.ctx.lineWidth = 0.5;

			this.ctx.stroke();
		}
		function drawHorizontalLine(yPos: number) {
			this.ctx.beginPath();
			this.ctx.moveTo(0, yPos);
			this.ctx.lineTo(this.dimensions.canvasWidth, yPos);

			this.ctx.lineWidth = 0.5;

			this.ctx.stroke();
		}
	}
	displayGridNodes(gridContent: GridNode[][]) {
		gridContent.forEach((column: GridNode[], x) => {
			column.forEach((node: GridNode, y) => {
				if (node.contents.isWalkable) {
					this.drawGridSquare(x, y, '#646464');
				}
				if (node.contents.isStartingPoint) {
					this.drawGridSquare(x, y, '#58ff4d');
				}
				if (node.contents.isObjective) {
					this.drawGridSquare(x, y, '#4dafff');
				}
			});
		});
	}
}
