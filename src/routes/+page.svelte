<script lang="ts">
	import { onMount } from 'svelte';
	import { GridNode } from '../GridNode';

	// DOM elements
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let ctx: CanvasRenderingContext2D;
	let tooltipDiv: HTMLDivElement;

	// canvas information
	let canvasHeight: number = 700;
	let canvasWidth: number = 700;
	let gridHeight: number = 15;
	let gridWidth: number = 15;
	let unWalkableChance: number = 0.1;

	// node data
	let gridContent: GridNode[][] = new Array(gridHeight)
		.fill(null)
		.map(() => new Array(gridWidth).fill(null)); // 2d array filled with null
	let goalNode: GridNode;
	let startNode: GridNode;
	let currentNode: GridNode;
	let openSet: Set<GridNode> = new Set<GridNode>();
	let closedSet: Set<GridNode> = new Set<GridNode>();
	let pathSet: Set<GridNode> = new Set<GridNode>();

	// running information
	let algorithmIntervalID: number | null = null;
	let pathCompleted: boolean = false;

	// rendering information
	let tooltipIsVisible: boolean = false;
	let tooltipContent: GridNode | null;
	let tooltipPosition: { x: number; y: number } = { x: 0, y: 0 };

	// display flags
	let overlays = {
		heuristicOverlay: false,
		setsOverlay: true
	};

	onMount(() => {
		window.addEventListener('click', handleClick);
		handleSetup();
	});
	function handleClick(event: MouseEvent) {
		if (canvas && !canvas.contains(event.target as Node)) {
			tooltipIsVisible = false;
		}
	}

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

		getNeighbors(currentNode).forEach((node: GridNode) => {
			defineNodeScore(node);
		});

		// debugDisplayTable();

		// doAlgorithmStep();

		return () => {
			resizeObserver.disconnect(); // Clean up the observer on component destroy
		};
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
			return scaleToBlackBodyHex(getNodeScore(node).f);
		});
	}
	function displaySetOverlay(node: GridNode): string {
		if (openSet.has(node)) return '#ff0000';
		if (pathSet.has(node)) return '#Faff00';
		if (closedSet.has(node)) return '#0000ff';
		else return '';
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
			if (result === '') return;
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

			displayAllOverlays();
			displayGridNodes();

			drawGridLines();
		}
	}
	function displayAllOverlays() {
		if (overlays.heuristicOverlay) {
			displayHeuristicOverlay();
		}
		if (overlays.setsOverlay) {
			displayOverlay(displaySetOverlay);
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
		startNode = gridContent[x][y];
		currentNode = startNode;
		openSet.add(gridContent[x][y]);
		gridContent[x][y] = new GridNode(x, y, { isStartingPoint: true });
	}
	function placeRandomObjectivePosition() {
		const x = Math.floor(Math.random() * gridWidth);
		const y = Math.floor(Math.random() * gridHeight);
		gridContent[x][y].contents.isObjective = true;
		goalNode = gridContent[x][y];
	}
	function doAlgorithmStep(): boolean {
		if (pathCompleted) return true;
		closedSet = new Set<GridNode>([...closedSet, currentNode]);
		openSet = new Set<GridNode>([...openSet].filter((x) => !closedSet.has(x)));

		const neighbors = getNeighbors(currentNode);
		neighbors.forEach((node) => {
			if (!openSet.has(node)) {
				defineNodeScore(node);
				openSet.add(node);
				node.previousNodeInPath = currentNode;
			}
		});
		openSet.forEach((node) => {
			if (checkIfGoalNode(node)) {
				goalNode.previousNodeInPath = currentNode;
				closedSet.add(goalNode);
				openSet = new Set<GridNode>([...openSet].filter((x) => x !== goalNode));
				doEnding(); // TODO
			}
			defineNodeScore(node);
			if (closedSet.has(node) && node.gScore! > currentNode.gScore!) {
				node.previousNodeInPath = currentNode;
			}
		});

		currentNode = Array.from(openSet).reduce((prev, curr) =>
			prev.fScore! < curr.fScore! ? prev : curr
		);

		if (openSet.size === 0) throw new Error('Open set empty!');
		refreshCanvas();
		return false;
	}
	function checkIfGoalNode(node: GridNode) {
		return node.xPos === goalNode.xPos && node.yPos === goalNode.yPos;
	}
	function doEnding() {
		pathCompleted = true;
		clearInterval(algorithmIntervalID!);

		console.log('done!');
		pathSet = new Set<GridNode>(goalNode.getPathToHere());
		console.log(goalNode.getPathToHere());
	}
	function defineNodeScore(node: GridNode) {
		if (!node || !goalNode) {
			console.error('Node or goalNode is undefined.');
			return;
		}
		node.gScore = node.getDepthInTree();
		node.hScore = node.distanceTo(goalNode.xPos, goalNode.yPos);
		node.fScore = node.gScore + node.hScore;
	}
	function getNodeScore(node: GridNode): { g: number; h: number; f: number } {
		const gScore = node.getDepthInTree();
		const hScore = node.distanceTo(goalNode.xPos, goalNode.yPos);
		const fScore = gScore + hScore;
		return { g: gScore, h: hScore, f: fScore };
	}
	function getNeighbors(
		node: GridNode,
		includeUnWalkables: boolean = false,
		includeCheckedNeighbors = false
	): GridNode[] {
		const { x, y } = { x: node.xPos, y: node.yPos };
		if (!isWithinRange({ x, y })) throw new Error(`Position out of range: ${x},${y}`);
		let neighborPositions: { x: number; y: number }[] = [
			{ x: x - 1, y: y }, // left
			{ x: x, y: y - 1 }, // up
			{ x: x + 1, y: y }, // right
			{ x: x, y: y + 1 } // down
		];
		neighborPositions = neighborPositions.filter(isWithinRange);

		if (!includeCheckedNeighbors)
			neighborPositions = neighborPositions.filter((element) => {
				return !closedSet.has(gridContent[element.x][element.y]);
			});
		if (!includeUnWalkables)
			neighborPositions = neighborPositions.filter(
				({ x, y }) => !gridContent[x][y].contents.isWalkable
			);

		const neighborNodes = neighborPositions.map((node) => {
			return gridContent[node.x][node.y];
		});
		return neighborNodes;
	}
	function isWithinRange(position: { x: number; y: number }): boolean {
		const { x, y } = position;
		if (x < 0 || x > gridWidth - 1) return false;
		if (y < 0 || y > gridHeight - 1) return false;
		return true;
	}
	function getGridSquare(gridX: number, gridY: number): GridNode {
		return gridContent[gridX][gridY];
	}
	function getGridSquareAbsolute(absoluteX: number, absoluteY: number): GridNode {
		const gridY = Math.floor(absoluteY / (canvasHeight / gridHeight));
		const gridX = Math.floor(absoluteX / (canvasWidth / gridWidth));
		return gridContent[gridX][gridY];
	}
	function placeTooltipBoxAt(gridSquare: GridNode) {
		const x = gridSquare.xPos;
		const y = gridSquare.yPos;

		const absoluteX = (x + 1) * (canvasWidth / gridWidth);
		const absoluteY = (y + 0.5) * (canvasHeight / gridHeight);

		tooltipIsVisible = true;
		tooltipContent = gridSquare;
		tooltipPosition = { x: absoluteX, y: absoluteY };
	}
	function manageCanvasClick(event: MouseEvent): void {
		const rect = canvas.getBoundingClientRect();
		const relativeX = event.clientX - rect.left;
		const relativeY = event.clientY - rect.top;
		const gridSquare = getGridSquareAbsolute(relativeX, relativeY);

		placeTooltipBoxAt(gridSquare);
	}
	$: if (canvasHeight || canvasWidth) {
		if (typeof window !== 'undefined') {
			// browser-only
			requestAnimationFrame(refreshCanvas);
		}
	}
</script>

<div class="mainContainer">
	<div class="canvasContainer" style="width: {canvasWidth}px; height: {canvasHeight}px;">
		<canvas
			bind:this={canvas}
			height={canvasHeight}
			width={canvasWidth}
			class="mainCanvas"
			on:click={manageCanvasClick}
		></canvas>
		{#if tooltipIsVisible && tooltipContent !== null}
			<div
				class="tooltip"
				bind:this={tooltipDiv}
				style={`position:absolute; top: ${tooltipPosition.y}px;left:${tooltipPosition.x}px`}
			>
				<svg width="200" height="200">
					<polygon
						style="fill:white;stroke:black;stroke-width:1"
						points="200 0, 200 200, 15 200, 15 20, 0 0, 14 0"
					/>
					<text x="20" y="20">({tooltipContent.xPos}, {tooltipContent.yPos})</text>
					<text x="20" y="40"
						>Is goal: <tspan
							class={tooltipContent.contents.isObjective ? 'tspanTrue' : 'tspanFalse'}
							>{tooltipContent.contents.isObjective}</tspan
						></text
					>
					<text x="20" y="60"
						>Is start: <tspan
							class={tooltipContent.contents.isStartingPoint ? 'tspanTrue' : 'tspanFalse'}
							>{tooltipContent.contents.isStartingPoint}</tspan
						></text
					>
					<text x="20" y="80"
						>Is walkable: <tspan
							class={!tooltipContent.contents.isWalkable ? 'tspanTrue' : 'tspanFalse'}
							>{!tooltipContent.contents.isWalkable}</tspan
						></text
					>
					<text x="20" y="110"
						>Part of path: <tspan class={pathSet.has(tooltipContent) ? 'tspanTrue' : 'tspanFalse'}
							>{pathSet.has(tooltipContent)}</tspan
						></text
					>
					<text x="20" y="130"
						>Part of set: {closedSet.has(tooltipContent) ? 'Closed set ' : ''}
						{openSet.has(tooltipContent) ? 'Open set ' : ''} 
                        {!closedSet.has(tooltipContent) && !openSet.has(tooltipContent) ? 'None' : ''}</text
					>
				</svg>
			</div>
		{/if}
	</div>
	<div style="align-self: end;">
		<a href="https://www.linkedin.com/in/noah-grosh-164769249/" target="_blank">
			<i class="fa-brands fa-linkedin socialIcon"></i>
		</a><br />
		<a href="https://github.com/Septillion24/a-star" target="_blank">
			<i class="fa-brands fa-github socialIcon"></i>
		</a><br />
	</div>
	<div>
		<button on:click={() => window.location.reload()}>Reload</button>
		<button on:click={() => toggleOverlay('heuristicOverlay')}
			>Heuristic overlay {overlays.heuristicOverlay ? 'ON' : 'OFF'}</button
		>
		<button on:click={() => toggleOverlay('setsOverlay')}
			>Sets overlay {overlays.setsOverlay ? 'ON' : 'OFF'}</button
		>
		<button
			on:click={() => {
				if (pathCompleted) return;
				if (algorithmIntervalID === null) algorithmIntervalID = setInterval(doAlgorithmStep, 50);
				else {
					clearInterval(algorithmIntervalID);
					algorithmIntervalID = null;
				}
			}}
		>
			{#if algorithmIntervalID === null}
				<i class="fa-solid fa-play"></i>
			{:else}
				<i class="fa-solid fa-pause"></i>
			{/if}
		</button>
		<button on:click={doAlgorithmStep}> Step </button>
	</div>
</div>

<style lang="scss">
	.socialIcon {
		font-size: 20pt;
		color: black;
	}
	.tooltip {
		color: black;
		position: absolute;
	}
	.mainContainer {
		display: grid;
		grid-template-columns: auto 1fr;
		column-gap: 1vmin;
		row-gap: 1vmin;
	}
	.mainCanvas {
		background-color: white;
		cursor: pointer;
	}
	.canvasContainer {
		box-shadow: 0.2vmin 0.2vmin 0.5vmin black;
		resize: both;
		// overflow: hidden;
		position: relative;
	}
	.tspanTrue {
		fill: green;
		font-weight: bold;
	}
	.tspanFalse {
		fill: red;
		font-weight: bold;
	}

	:global(body) {
		background-color: hsl(226, 17%, 55%);
	}
</style>
