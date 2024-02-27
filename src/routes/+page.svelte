<script lang="ts">
	import { onMount } from 'svelte';
	import { GridNode } from '../GridNode';

	let canvas: HTMLCanvasElement;
	let canvasHeight: number = 700;
	let canvasWidth: number = 700;
	let gridHeight: number = 15;
	let gridWidth: number = 15;
	let unWalkableChance = 0.1;
	let gridContent: GridNode[][] = new Array(gridHeight)
		.fill(null)
		.map(() => new Array(gridWidth).fill(null)); // 2d array filled with null

	let ctx: CanvasRenderingContext2D;

	onMount(handleSetup);

	function handleSetup(): void {
		ctx = canvas.getContext('2d')!;
		if (ctx === undefined) {
			throw new Error('Could not get context of canvas');
		}
		generateNodes();  
        refreshCanvas();
	}

    function debugDisplayTable(){
        const tableContent = gridContent.map((row) =>
        row.reduce((acc, node, index) => {
            (acc as { [key: string]: string })[`Col ${index}`] = node.isWalkable ? 'NO' : 'y'; // all this to make it easy to read in the grid
            return acc;
        }, {})
		);
		console.table(tableContent);
    }

    function refreshCanvas() {
        clearCanvas();
        displayGridNodes();
        drawGridLines();
        
    }
	function generateNodes() {
		for (let x = 0; x < gridWidth; x++) {
			for (let y = 0; y < gridHeight; y++) {
				const isWalkable: boolean = Math.random() <= unWalkableChance ? true : false;
				gridContent[x][y] = new GridNode(x, y, {isWalkable});
			}
		}
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
        gridContent.forEach((column:GridNode[],x) => {
            column.forEach((node:GridNode, y) => {
                if(node.isWalkable)
                {
                    drawGridSquare(x,y, "#646464");
                }
            });
        });
    }
</script>

<canvas
	bind:this={canvas}
	on:load={handleSetup}
	height={canvasHeight}
	width={canvasWidth}
	class="mainCanvas"
></canvas>

<style lang="scss">
	.mainCanvas {
		box-shadow: 0.2vmin 0.2vmin 0.5vmin black;
		background-color: rgb(255, 0, 0);
	}
	:global(body) {
		background-color: hsl(226, 17%, 55%);
	}
</style>
