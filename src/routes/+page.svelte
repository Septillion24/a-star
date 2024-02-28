<script lang="ts">
	import { onMount } from 'svelte';
	import { GridNode } from '../GridNode';

	// DOM elements
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let ctx: CanvasRenderingContext2D;

	// canvas information
	let canvasHeight: number = 700;
	let canvasWidth: number = 700;
	let gridHeight: number = 15;
	let gridWidth: number = 15;
	let unWalkableChance = 0.1;

	// node data
	let gridContent: GridNode[][] = new Array(gridHeight)
		.fill(null)
		.map(() => new Array(gridWidth).fill(null)); // 2d array filled with null
	let goalNode: { x: number; y: number };
	let startNode: { x: number; y: number };
	let currentNode: { x: number; y: number };
	let openSet: GridNode[] = [];
    let closedSet:GridNode[] = [];

	// display flags
	let overlays = {
		heuristicOverlay: false,
        setsOverlay: true,
	};

	onMount(() => {
		handleSetup();
	});

	function handleSetup() {
		ctx = canvas.getContext('2d')!;
		container = canvas.parentNode as HTMLDivElement;

		if (ctx === undefined) {
			throw new Error('Could not get context of canvas');
		}
		generateNodes();
		refreshCanvas();

		const resizeObserver = new ResizeObserver(() => resizeCanvas());
		resizeObserver.observe(container);

		// debugDisplayTable();
        doAlgorithmStep();
        displayOverlay(()=>"#fffff")

		return () => {
			resizeObserver.disconnect(); // Clean up the observer on component destroy
		};
	}
	function debugDisplayTable() {
		const numRows = gridContent.length;
		const numCols = gridContent[0].length;
		let tableContent = [];

		for (let col = 0; col < numCols; col++) {
			let rowObject = {};
			for (let row = 0; row < numRows; row++) {
				let rowObject: { [key: string]: any } = {};
				rowObject[`Row ${row}`] = calculateFScoreForNode(gridContent[row][col]);
			}
			tableContent.push(rowObject);
		}

		console.table(tableContent);
	}
	function twoDimensionalMap(callBack: (element: GridNode) => GridNode | void) {
		gridContent.forEach((column) => {
			column.forEach((element) => {
				const result = callBack(element);
				if (result instanceof GridNode) element = result;
			});
		});
	}
	function displayHeuristicOverlay() {
		displayOverlay((node: GridNode) => {
			const fScore = calculateFScoreForNode(node);
			return scaleToBlackBodyHex(fScore);
		});
	}
	function toggleOverlay(overlay: keyof typeof overlays) {
		overlays[overlay] = !overlays[overlay];
		refreshCanvas();
	}
	function displayOverlay(
		callBack: (node: GridNode) => string | { r: number; g: number; b: number }
	) {
		twoDimensionalMap((element: GridNode) => {
			const result = callBack(element);
            if(result === "") return;
			let colorString;
			if (typeof result === 'string') {
				colorString = result;
			} else {
				const { r, g, b } = result;
				colorString = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
			}
			drawGridSquare(element.xPos, element.yPos, colorString);
		});
	}
	function scaleToBlackBodyHex(scale: number): string {
		// Yes, I am aware that it is very overengineered.
		const temperature = 1000 + scale * 450;

		let red, green, blue: number;

		if (temperature <= 6600) {
			red = 255;
			green =
				temperature > 1000
					? Math.min(255, Math.max(0, 99.4708025861 * Math.log(temperature / 100) - 161.1195681661))
					: 0;
			blue =
				temperature >= 2000
					? Math.min(
							255,
							Math.max(0, 138.5177312231 * Math.log(temperature / 100 - 10) - 305.0447927307)
						)
					: 0;
		} else {
			red = Math.min(
				255,
				Math.max(0, 329.698727446 * Math.pow(temperature / 100 - 60, -0.1332047592))
			);
			green = Math.min(
				255,
				Math.max(0, 288.1221695283 * Math.pow(temperature / 100 - 60, -0.0755148492))
			);
			blue = 255;
		}

		const toHex = (c: number) => {
			const hex = Math.round(c).toString(16);
			return hex.length == 1 ? '0' + hex : hex;
		};

		return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
	}
	function resizeCanvas() {
		canvasWidth = container.offsetWidth;
		canvasHeight = container.offsetHeight;
		// Call any function to redraw the canvas if needed
		refreshCanvas();
	}
	function refreshCanvas() {
		if (canvas !== undefined && ctx !== undefined) {
			clearCanvas();

			displayOverlays();
			displayGridNodes();

			drawGridLines();
		}
	}
	function displayOverlays() {
		if (overlays.heuristicOverlay) {
			displayHeuristicOverlay();
		}
        if (overlays.setsOverlay) {
			displayOverlay((node:GridNode)=> openSet.includes(node) ? "#ff0000" : "")
		}
	}
	function generateNodes() {
		for (let x = 0; x < gridWidth; x++) {
			for (let y = 0; y < gridHeight; y++) {
				const isWalkable: boolean = Math.random() <= unWalkableChance ? true : false;
				gridContent[x][y] = new GridNode(x, y, { isWalkable });
			}
		}

		placeRandomStartPosition();
		placeRandomObjectivePosition();
	}
	function clearCanvas() {
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);
	}
	function drawGridSquare(x: number, y: number, color: string = 'black') {
		if (x > gridWidth - 1) {
			throw new Error(`Index out of range. ${x} is greater than max index ${gridWidth - 1}`);
		}
		if (y > gridHeight - 1) {
			throw new Error(`Index out of range. ${y} is greater than max index ${gridHeight - 1}`);
		}

		ctx.fillStyle = color;
		const gridSizeX = canvasWidth / gridWidth;
		const xPos = gridSizeX * x;

		const gridSizeY = canvasHeight / gridHeight;
		const yPos = gridSizeY * y;

		ctx.fillRect(xPos, yPos, gridSizeX, gridSizeY);
	}
	function drawGridLines() {
		const gridSizeX = canvasWidth / gridWidth;
		const gridSizeY = canvasHeight / gridHeight;

		for (let i = 0; i < gridWidth; i++) {
			drawVerticalLine(i * gridSizeX);
		}
		for (let i = 0; i < gridHeight; i++) {
			drawHorizontalLine(i * gridSizeY);
		}
		function drawVerticalLine(xPos: number) {
			ctx.beginPath();
			ctx.moveTo(xPos, 0);
			ctx.lineTo(xPos, canvasHeight);

			ctx.lineWidth = 0.5;

			ctx.stroke();
		}
		function drawHorizontalLine(yPos: number) {
			ctx.beginPath();
			ctx.moveTo(0, yPos);
			ctx.lineTo(canvasWidth, yPos);

			ctx.lineWidth = 0.5;

			ctx.stroke();
		}
	}
	function displayGridNodes() {
		gridContent.forEach((column: GridNode[], x) => {
			column.forEach((node: GridNode, y) => {
				if (node.contents.isWalkable) {
					drawGridSquare(x, y, '#646464');
				}
				if (node.contents.isStartingPoint) {
					drawGridSquare(x, y, '#58ff4d');
				}
				if (node.contents.isObjective) {
					drawGridSquare(x, y, '#4dafff');
				}
			});
		});
	}
	function placeRandomStartPosition() {
		const x = Math.floor(Math.random() * gridWidth);
		const y = Math.floor(Math.random() * gridHeight);
		startNode = { x, y };
		currentNode = startNode;
        openSet = [gridContent[x][y]];
		gridContent[x][y] = new GridNode(x, y, { isStartingPoint: true });
	}
	function placeRandomObjectivePosition() {
		const x = Math.floor(Math.random() * gridWidth);
		const y = Math.floor(Math.random() * gridHeight);
		goalNode = { x, y };
		gridContent[x][y] = new GridNode(x, y, { isObjective: true });
	}
	function doAlgorithmStep() {
		if (!openSet) throw new Error('Open set empty!');
		let bestNodeToCheck = openSet[0];

        console.log(openSet);

		openSet.forEach((node) => {
			node.fScore = calculateFScoreForNode(node);
			if (!bestNodeToCheck) bestNodeToCheck = node;
			if (node.fScore > bestNodeToCheck.fScore!) bestNodeToCheck = node;
		});
		currentNode = { x: bestNodeToCheck.xPos, y: bestNodeToCheck.yPos };
		const neighbors = getNeighbors(currentNode).map((element) => gridContent[element.x][element.y]);
        closedSet = [...closedSet, ...openSet];
        openSet = neighbors;
        console.log(openSet);
	}
	function calculateFScoreForNode(node: GridNode): number {
		const gScore = node.getDepthInTree(); 
		const hScore = node.distanceTo(goalNode.x, goalNode.y);

		return gScore + hScore;
	}
	function getNeighbors(
		position: { x: number; y: number },
		includeUnWalkables: boolean = false
	): { x: number; y: number }[] {
		const { x, y } = position;
		if (!isWithinRange(position)) throw new Error(`Position out of range: ${x},${y}`);
		let neighborPositions: { x: number; y: number }[] = [
			{ x: x - 1, y: y }, // left
			{ x: x, y: y - 1 }, // up
			{ x: x + 1, y: y }, // right
			{ x: x, y: y + 1 } // down
		];
		neighborPositions = neighborPositions.filter(isWithinRange);
        if (!includeUnWalkables)
			neighborPositions.filter(({ x, y }) => gridContent[x][y].contents.isWalkable);
		return neighborPositions;
	}
	function isWithinRange(position: { x: number; y: number }): boolean {
		const { x, y } = position;
		if (x < 0 || x > gridWidth-1) return false;
		if (y < 0 || y > gridHeight-1) return false;
		return true;
	}

	$: if (canvasHeight || canvasWidth) {
		if (typeof window !== 'undefined') {
			// browser-only
			requestAnimationFrame(refreshCanvas);
		}
	}
</script>

<div class="canvasContainer" style="width: {canvasWidth}px; height: {canvasHeight}px;">
	<canvas bind:this={canvas} height={canvasHeight} width={canvasWidth} class="mainCanvas"></canvas>
</div>
<button on:click={() => window.location.reload()}>Reload</button>
<button on:click={() => toggleOverlay('heuristicOverlay')}
	>Heuristic overlay {overlays.heuristicOverlay ? 'ON' : 'OFF'}</button
>
<button on:click={() => toggleOverlay('setsOverlay')}
	>Sets overlay {overlays.setsOverlay ? 'ON' : 'OFF'}</button
>

<style lang="scss">
	.mainCanvas {
		background-color: white;
	}
	.canvasContainer {
		box-shadow: 0.2vmin 0.2vmin 0.5vmin black;
		resize: both;
		overflow: hidden;
	}
	:global(body) {
		background-color: hsl(226, 17%, 55%);
	}
</style>
