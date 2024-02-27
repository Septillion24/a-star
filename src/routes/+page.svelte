<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let canvasHeight: number = 700;
	let canvasWidth: number = 700;
	let gridHeight: number = 20;
	let gridWidth: number = 20;

	let ctx: CanvasRenderingContext2D;

	onMount(handleSetup);

	function handleSetup(): void {
		ctx = canvas.getContext('2d')!;
		if (ctx === undefined) {
			throw new Error('Could not get context of canvas');
		}
		clearCanvas();
	}

	function clearCanvas() {
		// ctx.clearRect(0, 0, canvasWidth, canvasHeight);
		ctx.fillStyle = 'rgba(255, 255, 255, 1)';
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);
		drawGridSquare(0, 0, 'red');
		drawGrid();
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
	function drawGrid() {
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
