const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let lastMove = null; // Track the last move for highlighting

// Renders the board and pieces
const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = ""; // Clear the board

    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            // Highlight the last move
            if (lastMove) {
                const { from, to } = lastMove;
                const fromRow = 8 - parseInt(from[1]);
                const fromCol = from.charCodeAt(0) - 97;
                const toRow = 8 - parseInt(to[1]);
                const toCol = to.charCodeAt(0) - 97;

                if ((fromRow === rowIndex && fromCol === squareIndex) ||
                    (toRow === rowIndex && toCol === squareIndex)) {
                    squareElement.classList.add("highlight");
                }
            }

            // If there's a piece, render it
            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                // Drag event listeners
                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            // Allow drop on all squares
            squareElement.addEventListener("dragover", (e) => e.preventDefault());

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

// Handles chess moves
const handleMove = (sourceSquare, targetSquare) => {
    const move = {
        from: `${String.fromCharCode(97 + sourceSquare.col)}${8 - sourceSquare.row}`,
        to: `${String.fromCharCode(97 + targetSquare.col)}${8 - targetSquare.row}`,
        promotion: "q", // Default promotion to queen
    };

    const result = chess.move(move);
    if (result) {
        lastMove = move; // Track the last move for highlighting
        socket.emit("move", move); // Emit the move to the server
        renderBoard();
    } else {
        console.log("Invalid move");
    }
};

// Returns Unicode for chess pieces
const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: { w: "♙", b: "♟" },
        r: { w: "♖", b: "♜" },
        n: { w: "♘", b: "♞" },
        b: { w: "♗", b: "♝" },
        q: { w: "♕", b: "♛" },
        k: { w: "♔", b: "♚" },
    };
    return unicodePieces[piece.type][piece.color] || "";
};

// Listen for player role
socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
});

// Listen for spectator updates
socket.on("spectatorRole", (fen) => {
    chess.load(fen);
    renderBoard();
});

// Listen for moves from the server
socket.on("move", (move) => {
    chess.move(move);
    lastMove = move; // Update the last move for highlighting
    renderBoard();
});

// Initial render
renderBoard();
