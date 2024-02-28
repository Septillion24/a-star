<script lang="ts">
	import { onMount } from 'svelte';
	import { GridNode } from '../GridNode';
	import { goto } from '$app/navigation';

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let ctx: CanvasRenderingContext2D;

	let canvasHeight: number = 700;
	let canvasWidth: number = 700;
	let gridHeight: number = 15;
	let gridWidth: number = 15;
	let unWalkableChance = 0.1;

	let gridContent: GridNode[][] = new Array(gridHeight)
		.fill(null)
		.map(() => new Array(gridWidth).fill(null)); // 2d array filled with null
	let goalNode: { x: number; y: number };
	let startNode: { x: number; y: number };
	let currentNode: { x: number; y: number };
	let openSet: GridNode[] = [];

	// display flags
	let shouldDisplayHeuristicOverlay: boolean = true;

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

		debugDisplayTable();

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
		twoDimensionalMap((node: GridNode) => {
			const fScore = calculateFScoreForNode(node);
			drawGridSquare(node.xPos, node.yPos, `${scaleToBlackBodyHex(fScore)}`);
			console.log(node.xPos);
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
	function placeRandomStartPosition() {
		const x = Math.floor(Math.random() * gridWidth);
		const y = Math.floor(Math.random() * gridHeight);
		startNode = { x, y };
		currentNode = startNode;
		gridContent[x][y] = new GridNode(x, y, { isStartingPoint: true });
	}
	function placeRandomObjectivePosition() {
		const x = Math.floor(Math.random() * gridWidth);
		const y = Math.floor(Math.random() * gridHeight);
		goalNode = { x, y };
		gridContent[x][y] = new GridNode(x, y, { isObjective: true });
	}
	function doAlgorithmStep() {
		openSet.forEach((node) => {
			node.fScore = calculateFScoreForNode(node);
		});
	}
	function calculateFScoreForNode(node: GridNode): number {
		const gScore = node.getDepthInTree();
		const hScore = node.distanceTo(startNode.x, startNode.y);

		return gScore + hScore;
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
